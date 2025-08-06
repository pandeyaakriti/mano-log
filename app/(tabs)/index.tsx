import { getAuth } from 'firebase/auth';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import Svg, { Defs, Path, Stop, LinearGradient as SvgGradient } from 'react-native-svg';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../../context/AuthContext';
import DailyAffirmation from '../components/affirmations/dailyAffirmation';
type User = {
  mongoId?: string;
  firebaseUid?: string;
  uid?: string;
  id?: string;
  displayName?: string;
  email?: string;
  photoURL?: string;
  emailVerified?: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
};
type AIInsight = {
  id: string;
  summary: string;
  wellnessTip: string; 
  modelUsed?: string;
  tokensUsed?: number;
  confidence?: number;
  createdAt?: string;
};
interface MoodStats {
  longestStreak: number;
  currentStreak: number;
  avgMoodThisWeek: string;
  avgMoodIndex: number;
  weeklyStats: {
    totalEntriesThisWeek: number;
    allMoodCountsThisWeek: number[];
  };
}
// API helper functions for streak data
const getAuthToken = async (): Promise<string | null> => {
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    if (user) {
      const token = await user.getIdToken();
      return token;
    }
    return null;
  } catch (error) {
    console.error('Error getting Firebase token:', error);
    return null;
  }
};
const getUserIdFromFirebase = async (firebaseUid: string): Promise<string | null> => {
  try {
    const response = await fetch(`${process.env.EXPO_PUBLIC_API_BASE_URL}/users/by-firebase/${firebaseUid}`);
    
    if (response.ok) {
      const userData = await response.json();
      if (userData.success && userData.data && userData.data.id) {
        return userData.data.id;
      }
    }
    
    console.error('Failed to get user ID from database');
    return null;
  } catch (error) {
    console.error('Error getting user ID:', error);
    return null;
  }
};
const fetchMoodStats = async (userId: string): Promise<MoodStats | null> => {
  try {
    const token = await getAuthToken();
    
    if (!token || !userId) {
      throw new Error('Authentication required');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(`${process.env.EXPO_PUBLIC_API_BASE_URL}/trends/stats?userId=${userId}&algorithm=latest`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'X-User-Id': userId,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data.success ? data.data : null;
  } catch (error) {
    console.error('Error fetching mood stats:', error);
    return null;
  }
};
export default function Index() {
  const [reflection, setReflection] = useState('');
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [showReflectionCard, setShowReflectionCard] = useState(false);
  const [showAIInsights, setShowAIInsights] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth() as { user: User | null };
  const [savedReflection, setSavedReflection] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [savedJournalId, setSavedJournalId] = useState<string | null>(null);
  const [aiInsight, setAiInsight] = useState<AIInsight | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [blogText, setBlogText] = useState('');
  const [showConfetti, setShowConfetti] = useState(false);
  const [showSuccessNotification, setShowSuccessNotification] = useState(false);
  const [successMessage, setSuccessMessage] = useState({ title: '', subtitle: '', icon: '' });

  // New state for streak data
  const [streakData, setStreakData] = useState<{
    longestStreak: number;
    currentStreak: number;
    loading: boolean;
    error: string | null;
  }>({
    longestStreak: 0,
    currentStreak: 0,
    loading: true,
    error: null
  });

  useEffect(() => {
    console.log('Current user object:', user);
    console.log('User firebaseUid:', user?.firebaseUid);
    console.log('User uid:', user?.uid);
    console.log('User id:', user?.id);
  }, [user]);
   // Load streak data when user is available
  useEffect(() => {
    const loadStreakData = async () => {
      if (!user) {
        setStreakData(prev => ({ ...prev, loading: false, error: 'No user found' }));
        return;
      }

      const firebaseUid = getUserFirebaseUid();
      if (!firebaseUid) {
        setStreakData(prev => ({ ...prev, loading: false, error: 'No Firebase UID found' }));
        return;
      }

      try {
        setStreakData(prev => ({ ...prev, loading: true, error: null }));
        
        // Get database user ID from Firebase UID
        const userId = await getUserIdFromFirebase(firebaseUid);
        if (!userId) {
          setStreakData(prev => ({ ...prev, loading: false, error: 'Failed to get user ID' }));
          return;
        }

        // Fetch mood stats including streak data
        const moodStats = await fetchMoodStats(userId);
        if (moodStats) {
          setStreakData({
            longestStreak: moodStats.longestStreak,
            currentStreak: moodStats.currentStreak,
            loading: false,
            error: null
          });
          console.log('Streak data loaded successfully:', {
            longest: moodStats.longestStreak,
            current: moodStats.currentStreak
          });
        } else {
          setStreakData(prev => ({ ...prev, loading: false, error: 'Failed to fetch streak data' }));
        }
      } catch (error) {
        console.error('Error loading streak data:', error);
        setStreakData(prev => ({ 
          ...prev, 
          loading: false, 
          error: 'Network error - using fallback data',
          longestStreak: 43, // Fallback values
          currentStreak: 27
        }));
      }
    };

    loadStreakData();
  }, [user]);

  const getUserDisplayName = () => {
    if (user?.displayName) return user.displayName;
    if (user?.email) return user.email.split('@')[0];
    return 'friend';
  };

  const getUserProfileImage = () => {
    if (user?.photoURL) { 
      return { uri: user.photoURL };
    }
    return require('../../assets/images/default-profile.jpg');
  };

  const getUserFirebaseUid = () => {
    return user?.firebaseUid || user?.uid || user?.id;
  };

 const saveReflection = async () => {
  console.log('Debug - saveReflection called');
  console.log('Debug - reflection state:', reflection);
  console.log('Debug - reflection length:', reflection.length);
  console.log('Debug - user object:', user);
  
  const firebaseUid = getUserFirebaseUid();
  console.log('Debug - resolved firebaseUid:', firebaseUid);

  if (!user) {
    console.log('No user found');
    Alert.alert('Authentication Error', 'User not found. Please login again.');
    return;
  }

  if (!firebaseUid) {
    console.log('No firebaseUid found in user object');
    console.log('Available user properties:', Object.keys(user));
    Alert.alert('Authentication Error', 'User ID not found. Please logout and login again.');
    return;
  }

  if (!reflection.trim()) {
    console.log('Reflection is empty or only whitespace');
    Alert.alert('Validation Error', 'Please write a reflection before saving.');
    return;
  }

  try {
    setIsLoading(true);
    console.log('Saving reflection for user:', firebaseUid);
    
    const payload = {
      firebaseUid: firebaseUid,
      textContent: reflection.trim(),
    }; 
    console.log('Payload:', payload);

    const apiUrl = `${process.env.EXPO_PUBLIC_API_BASE_URL}/journal`;
    console.log('API URL:', apiUrl);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json' 
      },
      body: JSON.stringify(payload),
    });
    
    console.log('Response status:', response.status);
    console.log('Response ok:', response.ok);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', errorText);
      
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: errorText };
      }

      Alert.alert(
        'Save Failed', 
        `Failed to save reflection: ${errorData.error || 'Unknown error'}`
      );
      return;
    }

    const data = await response.json();
    console.log('Response data:', data);
    console.log('Journal saved successfully:', data);
    const journalId = data.journal?.id || data.id;
    console.log('Extracted journal ID:', journalId);
    
    if (!journalId) {
      console.error('No journal ID found in response:', data);
      Alert.alert('Error', 'Journal saved but ID not found. Please try generating insights again.');
      return;
    }
    
    setSavedJournalId(journalId);
    setSavedReflection(reflection);
    setShowReflectionCard(true); 
    
    // Show enhanced success notification instead of Alert
    setSuccessMessage({
      title: 'Reflection Saved',
      subtitle: 'Your thoughts have been gently preserved',
      icon: 'leaf-outline'
    });
    setShowSuccessNotification(true);
    
    // Auto-hide after 2.5 seconds
    setTimeout(() => {
      setShowSuccessNotification(false);
    }, 2500);
    
    setReflection('');
    setSelectedMood(null);

  } catch (err) {
    console.error('API error:', err);
    
    let errorMessage = 'Error saving reflection. Please try again.';
    
    if ((err as Error).message === 'Network request failed') {
      errorMessage = 'Network error: Cannot connect to server. Please check your internet connection and ensure the server is running.';
    } else if ((err as Error).name === 'TypeError') {
      errorMessage = 'Connection error: Please ensure the server is running and accessible.';
    }
    Alert.alert('Network Error, check internet connection', errorMessage);
  } finally {
    setIsLoading(false);
  }
};
  
  //insights
   const generateInsights = async () => {
    if (!savedJournalId) {
      Alert.alert('Error', 'No journal entry found to generate insights for.');
      return;
    }

    try {
      setInsightLoading(true);
      console.log('Generating insights for journal ID:', savedJournalId);

      const apiUrl = `${process.env.EXPO_PUBLIC_API_BASE_URL}/journal/insight/generate/${savedJournalId}`;
      console.log('Insight API URL:', apiUrl);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json' 
        },
      });

      console.log('Insight response status:', response.status);
      console.log('Insight response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Insight error response:', errorText);
        
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: errorText };
        }

        Alert.alert(
          'Insight Generation Failed', 
          `Failed to generate insights: ${errorData.error || 'Unknown error'}`
        );
        return;
      }

      const data = await response.json();
      console.log('Insight response data:', data);

      if (data.success && data.data) {
        setAiInsight(data.data);
        setShowReflectionCard(false);
        setShowAIInsights(true);
      } else {
        throw new Error('Invalid response format');
      }

    } catch (err) {
      console.error('Insight API error:', err);
      
      let errorMessage = 'Error generating insights. Please try again.';
      
      if ((err as Error).message === 'Network request failed') {
        errorMessage = 'Network error: Cannot connect to server. Please check your internet connection.';
      } else if ((err as Error).name === 'TypeError') {
        errorMessage = 'Connection error: Please ensure the server is running and accessible.';
      }
      
      Alert.alert('Network Error', errorMessage);
    } finally {  
      setInsightLoading(false);
    }
  };

  const handleReflectPress = async () => {
    console.log('Reflect button pressed');
    await saveReflection();
  };

 //blogpost 
const saveBlogPost = async () => {
  console.log('Debug - saveBlogPost called');
  console.log('Debug - blogText state:', blogText);
  console.log('Debug - blogText length:', blogText.length);
  
  const firebaseUid = getUserFirebaseUid();
  console.log('Debug - resolved firebaseUid:', firebaseUid);

  if (!user) {
    console.log('No user found');
    Alert.alert('Authentication Error', 'User not found. Please login again.');
    return;
  }

  if (!firebaseUid) {
    console.log('No firebaseUid found in user object');
    Alert.alert('Authentication Error', 'User ID not found. Please logout and login again.');
    return;
  }

  if (!blogText.trim()) {
    console.log('Blog text is empty or only whitespace');
    Alert.alert('Validation Error', 'Please write something before posting.');
    return;
  }

  try {
    setIsLoading(true);
    console.log('Saving blog post for user:', firebaseUid);
    
    const payload = {
      firebaseUid: firebaseUid,
      textContent: blogText.trim(),
      tags: [] // Add tags if needed
    };
    console.log('Blog payload:', payload);

    const apiUrl = `${process.env.EXPO_PUBLIC_API_BASE_URL}/blogsheet`;
    console.log('Blog API URL:', apiUrl);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json' 
      },
      body: JSON.stringify(payload),
    });
    
    console.log('Blog response status:', response.status);
    console.log('Blog response ok:', response.ok);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Blog error response:', errorText);
      
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: errorText };
      }

      Alert.alert(
        'Post Failed', 
        `Failed to save blog post: ${errorData.error || 'Unknown error'}`
      );
      return;
    }

    const data = await response.json();
    console.log('Blog response data:', data);
    console.log('Blog post saved successfully:', data);
    
    // Show enhanced success notification and confetti
    setShowConfetti(true);
    setSuccessMessage({
      title: 'Moment Shared',
      subtitle: 'Your heart\'s expression has been shared',
      icon: 'cloud-outline'
    });
    setShowSuccessNotification(true);
    
    // Auto-hide after 2.5 seconds
    setTimeout(() => {
      setShowSuccessNotification(false);
    }, 3500);
    
    setBlogText(''); // Clear the input

  } catch (err) {
    console.error('Blog API error:', err);
    
    let errorMessage = 'Error saving blog post. Please try again.';
    
    if ((err as Error).message === 'Network request failed') {
      errorMessage = 'Network error: Cannot connect to server. Please check your internet connection.';
    } else if ((err as Error).name === 'TypeError') {
      errorMessage = 'Connection error: Please ensure the server is running and accessible.';
    }
    Alert.alert('Network Error', errorMessage);
  } finally {
    setIsLoading(false);
  }
};

return (
    <View style={styles.mainContainer}>
      <SafeAreaView style={styles.container}>
        {/* SVG Background - UNCHANGED */}
        <Svg height="700" width="100%" viewBox="0 70 1440 320" style={styles.svgBackground}>
          <Defs>
            <SvgGradient id="waveGradient" x1="0%" y1="80%" x2="100%" y2="20%" gradientTransform="rotate(45)">
              <Stop offset="18%" stopColor="#9791B9" />
              <Stop offset="51%" stopColor="#DDA8D6" />
              <Stop offset="52%" stopColor="#E0ACD8" />
              <Stop offset="70%" stopColor="#F8D3EF" />
              <Stop offset="100%" stopColor="#FFF9D3" />
            </SvgGradient>
          </Defs>
          <Path
            fill="url(#waveGradient)"
            d="
              M0,-700 H1440 V64 L1380,64 
              C1320,64 1200,64 1080,64 
              C960,64 840,64 720,64 
              C600,64 480,64 360,64 
              C240,64 120,64 60,64 
              L0,64 
              L0,0 
              Z
              M0,64
              L63,120
              C120,170,240,240,360,230
              C480,220,600,160,720,140
              C840,120,960,140,1080,170
              C1200,200,1320,240,1380,260
              L1440,280
              L1440,64
            "
          />
        </Svg>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Profile Header */}
           <View style={styles.profileHeader}>
            <View style={styles.profileImageContainer}>
              <Image
                source={getUserProfileImage()}
                style={styles.profileImage}
              />
              <View style={styles.onlineIndicator} />
            </View>
            <View style={styles.greetingContainer}>
              <Text style={styles.greeting}>
                Welcome, {getUserDisplayName()} ✨
              </Text>
              <Text style={styles.subGreeting}>
                Take a moment to center yourself
              </Text>
            </View>
          </View>

          {/* Reflection Section */}
          <View style={styles.reflectionSection}>
            <View style={styles.sectionHeader}>
              <Icon name="leaf-outline" size={20} color="#7C9885" />
              <Text style={styles.sectionTitle}>Mindful Reflection</Text>
            </View>
            <View style={styles.textInputContainer}>
              <TextInput
                placeholder="Let your thoughts flow gently here..."
                value={reflection}
                onChangeText={(text) => {
                  setReflection(text);
                }}
                style={styles.textInput}
                multiline
                numberOfLines={4}
                placeholderTextColor='#B4A5A0'
              />
              <Text style={styles.characterCount}>
                {reflection.length}/500
              </Text>
            </View>
            <Pressable
              style={[
                styles.reflectButton, 
                isLoading && styles.reflectButtonLoading,
                !reflection.trim() && styles.reflectButtonDisabled
              ]}
              onPress={handleReflectPress}
              disabled={isLoading || !reflection.trim()}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Text style={styles.reflectButtonText}>
                    Save Reflection
                  </Text>
                  <Icon name="heart-outline" size={18} color="#fff" />
                </>
              )}
            </Pressable>
          </View>

          {/* Progress Section */}
          <View style={styles.streakContainer}>
            <View style={styles.sectionHeader}>
              <Icon name="sunny-outline" size={20} color="#E8A87C" />
              <Text style={styles.sectionTitle}>Your Journey</Text>
            </View>
            <View style={styles.streakRow}>
              <View style={styles.streakCard}>
                <View style={styles.streakCardHeader}>
                  <Icon name="ribbon-outline" size={22} color="#B8860B" />
                  <Text style={styles.streakLabel}>Personal Best</Text>
                </View>
                {streakData.loading ? (
                  <ActivityIndicator size="small" color="#7C9885" style={styles.loadingSpinner} />
                ) : (
                  <Text style={styles.streakValue}>
                    {streakData.longestStreak} days
                  </Text>
                )}
              </View>

              <View style={styles.streakCard}>
                <View style={styles.streakCardHeader}>
                  <Icon name="today-outline" size={22} color="#E8A87C" />
                  <Text style={styles.streakLabel}>Current</Text>
                </View>
                {streakData.loading ? (
                  <ActivityIndicator size="small" color="#7C9885" style={styles.loadingSpinner} />
                ) : (
                  <Text style={styles.streakValue}>
                    {streakData.currentStreak} days
                  </Text>
                )}
              </View>
            </View>
            {streakData.error && (
              <Text style={styles.errorText}>{streakData.error}</Text>
            )}
          </View>

          {/* Daily Affirmation  */}
          <View style={styles.affirmationWrapper}>
            <DailyAffirmation user={user} selectedMood={selectedMood || undefined} currentStreak={27} />
          </View>
          
          {/* Divider */}
          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <View style={styles.dividerTextContainer}>
              <Icon name="sparkles-outline" size={16} color="#7C9885" />
              <Text style={styles.dividerText}>Moments</Text>
            </View>
            <View style={styles.dividerLine} />
          </View>

          {/* blogsheet Section */}
          <View style={styles.blogSheetSection}>
            <View style={styles.blogSheetHeader}>
              <View style={styles.sectionHeader}>
                <Icon name="cloud-outline" size={20} color="#7C9885" />
                <Text style={styles.sectionTitle}>Express Yourself</Text>
              </View>
              <Text style={styles.blogSheetSubtitle}>Share whats in your heart</Text>
            </View>
            <View style={styles.blogInputWrapper}>
              <TextInput
                style={styles.blogInput}
                placeholder="What gentle thoughts are with you today?"
                placeholderTextColor="#B4A5A0"
                multiline
                value={blogText}
                onChangeText={setBlogText}
                maxLength={280}
              />
              <View style={styles.blogFooter}>
                <Text style={styles.blogCharCount}>{blogText.length}/280</Text>
                <TouchableOpacity
                  style={[styles.sendButton, !blogText.trim() && styles.sendButtonDisabled]}
                  onPress={saveBlogPost}
                  disabled={!blogText.trim() || isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#7C9885" />
                  ) : (
                    <Icon name="paper-plane-outline" size={18} color={blogText.trim() ? "#7C9885" : "#B4A5A0"} />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
          
          {showConfetti && (
            <ConfettiCannon
              count={30}
              origin={{ x: 200, y: 0 }}
              fadeOut
              fallSpeed={1500}
              explosionSpeed={300}
              colors={['#7C9885', '#E8A87C', '#B8860B', '#D4C5B9']}
              onAnimationEnd={() => setShowConfetti(false)}
            />
          )}
          {/* Enhanced Success Notification */}
          {showSuccessNotification && (
            <View style={styles.successOverlay}>
              <View style={styles.successNotification}>
                <View style={styles.successIconContainer}>
                  <View style={styles.successIconCircle}>
                    <Icon name={successMessage.icon} size={32} color="#fff" />
                  </View>
                  <View style={styles.successRipple} />
                </View>
                <Text style={styles.successTitle}>{successMessage.title}</Text>
                <Text style={styles.successSubtitle}>{successMessage.subtitle}</Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Calm Bottom Navigation */}
        <View style={styles.bottomNav}>
          <TouchableOpacity style={styles.navItem} onPress={() => console.log('Home')}>
            <Icon name="home-outline" size={24} color="#7C9885" />
            <Text style={styles.navLabel}>Home</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navItem} onPress={() => console.log('Chat')}>
            <Icon name="chatbubble-outline" size={24} color="#B4A5A0" />
            <Text style={[styles.navLabel, styles.navLabelInactive]}>Chat</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.addButton} onPress={() => console.log('Add')}>
            <Icon name="add" size={28} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.navItem} onPress={() => console.log('Mood Insights')}>
            <Icon name="bar-chart-outline" size={24} color="#B4A5A0" />
            <Text style={[styles.navLabel, styles.navLabelInactive]}>Insights</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navItem} onPress={() => console.log('Settings')}>
            <Icon name="settings-outline" size={24} color="#B4A5A0" />
            <Text style={[styles.navLabel, styles.navLabelInactive]}>Settings</Text>
          </TouchableOpacity>
        </View>

        {/* Peaceful Reflection Modal */}
        {showReflectionCard && (
          <View style={styles.overlay}>
            <View style={styles.modal}>
              <View style={styles.modalHeader}>
                <View style={styles.successIcon}>
                  <Icon name="checkmark-circle-outline" size={32} color="#fff" />
                </View>
                <Text style={styles.modalTitle}>Reflection Saved</Text>
                <Text style={styles.modalDate}>
                  {new Date().toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </Text>
              </View>

              <View style={styles.modalContent}>
                <Text style={styles.savedReflectionText}>{savedReflection}</Text>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.insightButton}
                  onPress={() => {
                    setShowReflectionCard(false);
                    generateInsights();
                  }}
                  disabled={insightLoading}
                >
                  <Icon name="bulb-outline" size={18} color="#fff" style={styles.buttonIcon} />
                  <Text style={styles.insightButtonText}>
                    {insightLoading ? 'Creating...' : 'Get Insights'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.dismissButton}
                  onPress={() => setShowReflectionCard(false)}
                >
                  <Text style={styles.dismissButtonText}>Close</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowReflectionCard(false)}
              >
                <Icon name="close" size={24} color="#B4A5A0" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Serene AI Insights Modal */}
        {showAIInsights && (
          <View style={styles.overlay}>
            <View style={styles.modal}>
              <View style={styles.modalHeader}>
                <View style={styles.aiIcon}>
                  <Icon name="flower-outline" size={32} color="#fff" />
                </View>
                <Text style={styles.modalTitle}>Your Insights</Text>
                <Text style={styles.modalDate}>
                  {new Date().toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </Text>
              </View>

              <ScrollView style={styles.insightsContainer} showsVerticalScrollIndicator={false}>
                <View style={styles.insightCard}>
                  <View style={styles.insightHeader}>
                    <Icon name="heart-outline" size={20} color="#7C9885" />
                    <Text style={styles.insightTitle}>Emotional Summary</Text>
                  </View>
                  <Text style={styles.insightText}>
                    {aiInsight?.summary || 'Gently creating your personalized insights...'}
                  </Text>
                </View>

                <View style={styles.insightCard}>
                  <View style={styles.insightHeader}>
                    <Icon name="leaf-outline" size={20} color="#E8A87C" />
                    <Text style={styles.insightTitle}>Wellness Guidance</Text>
                  </View>
                  <Text style={styles.insightText}>
                    {aiInsight?.wellnessTip || 'Preparing personalized wellness guidance for you...'}
                  </Text>
                </View>
              </ScrollView>

              <TouchableOpacity
                style={styles.dismissButton}
                onPress={() => setShowAIInsights(false)}
              >
                <Text style={styles.dismissButtonText}>Close</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowAIInsights(false)}
              >
                <Icon name="close" size={24} color="#B4A5A0" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Gentle Loading Overlay */}
        {insightLoading && (
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingContainer}>
              <View style={styles.loadingIcon}>
                <ActivityIndicator size="large" color="#7C9885" />
              </View>
              <Text style={styles.loadingTitle}>Creating your insights...</Text>
              <Text style={styles.loadingSubtitle}>Taking a moment to understand</Text>
            </View>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#FEFEFE',
  },
  container: {
    flex: 1,
  },
  svgBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 0,
  },
  scrollContent: {
    paddingTop: 100, 
    paddingHorizontal: 20,
    paddingBottom: 120, 
    zIndex: 2,
  },

  // Calming Profile Header
 profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
    paddingHorizontal: 4,
    zIndex: 3,
  },
  profileImageContainer: {
    position: 'relative',
    marginRight: 16,
  },
  profileImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#fff',
  },
  greetingContainer: {
    flex: 1,

  },
  greeting: {
    fontSize: 22,
    fontWeight: '500',
    color: '#2D3E2F',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  subGreeting: {
    fontSize: 15,
    color: '#595555ff',
    fontWeight: '300',
    lineHeight: 20,
  },

  // Section Headers
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '500',
    color: '#2D3E2F',
    marginLeft: 10,
    letterSpacing: 0.2,
  },

  // Peaceful Reflection Section
  reflectionSection: {
    marginBottom: 32,
    backgroundColor: '#e5dfe4ff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#7C9885',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(124, 152, 133, 0.1)',
  },
  textInputContainer: {
    position: 'relative',
  },
  textInput: {
    backgroundColor: '#FAFBFA',
    borderRadius: 20,
    padding: 20,
    textAlignVertical: 'top',
    minHeight: 120,
    fontSize: 16,
    lineHeight: 24,
    borderWidth: 1,
    borderColor: 'rgba(124, 152, 133, 0.15)',
    color: '#2D3E2F',
    fontWeight: '300',
  },
  characterCount: {
    position: 'absolute',
    bottom: 16,
    right: 20,
    fontSize: 12,
    color: '#B4A5A0',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  reflectButton: {
    marginTop: 20,
    backgroundColor: '#a79ba5ff',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#a79ba5ff',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  reflectButtonLoading: {
    opacity: 0.8,
  },
  reflectButtonDisabled: {
    backgroundColor: '#bcafbaff',
    shadowOpacity: 0,
  },
  reflectButtonText: {
    fontSize: 16,
    fontWeight: '400',
    color: '#fff',
    marginRight: 8,
    letterSpacing: 0.3,
  },

  // Gentle Progress Section
  streakContainer: {
    marginBottom: 32,
  },
  streakRow: {
    flexDirection: 'row',
    gap: 20,
    alignItems: 'center',
    justifyContent: 'space-between',
    //gap: 16,
  },
  streakCard: {
    backgroundColor: 'rgba(234, 228, 243, 1)',
    borderRadius: 20,
    padding: 20,
    flex: 1,
    shadowColor: '#7C9885',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(124, 152, 133, 0.1)',
  },
  streakCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  streakLabel: {
    fontSize: 14,
    color: '#7C9885',
    fontWeight: '400',
    marginLeft: 8,
    letterSpacing: 0.2,
  },
  streakValue: {
    fontSize: 22,
    fontWeight: '300',
    color: '#2D3E2F',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  loadingSpinner: {
    marginVertical: 8,
  },
  errorText: {
    color: '#D4756B',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 12,
    fontWeight: '300',
  },

  // Affirmation Wrapper
  affirmationWrapper: {
    marginBottom: 32,
  },

  // Serene Divider
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
    marginHorizontal: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(78, 72, 151, 0.2)',
  },
  dividerTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 236, 250, 0.9)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(124, 152, 133, 0.15)',
  },
  dividerText: {
    marginLeft: 8,
    fontSize: 13,
    fontWeight: '300',
    color: '#7C9885',
    letterSpacing: 0.3,
  },

  // Peaceful Expression Section
  blogSheetSection: {
    backgroundColor: 'rgba(215, 212, 216, 0.99)',
    borderRadius: 24,
    padding: 24,
    marginBottom: 32,
    shadowColor: '#7C9885',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(124, 152, 133, 0.1)',
  },
  blogSheetHeader: {
    marginBottom: 16,
  },
  blogSheetSubtitle: {
    fontSize: 14,
    color: '#8b8482ff',
    marginTop: 4,
    fontWeight: '300',
    fontStyle: 'italic',
    letterSpacing: 0.2,
  },
  blogInputWrapper: {
    backgroundColor: '#FAFBFA',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(124, 152, 133, 0.15)',
    minHeight: 100,
  },
  blogInput: {
    fontSize: 16,
    color: '#2D3E2F',
    lineHeight: 22,
    minHeight: 60,
    textAlignVertical: 'top',
    fontWeight: '300',
  },
  blogFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  blogCharCount: {
    fontSize: 12,
    color: '#B4A5A0',
    fontWeight: '300',
  },
  sendButton: {
    backgroundColor: 'rgba(124, 152, 133, 0.1)',
    borderRadius: 16,
    padding: 10,
    shadowColor: '#9c8f9eff',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },

  // Calm Bottom Navigation
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 12,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderTopColor: 'rgba(124, 152, 133, 0.1)',
    shadowColor: '#7C9885',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 5,
  },
  navItem: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  navLabel: {
    fontSize: 12,
    fontWeight: '300',
    color: '#7C9885',
    marginTop: 4,
    letterSpacing: 0.3,
  },
  navLabelInactive: {
    color: '#B4A5A0',
  },
  addButton: {
    backgroundColor: '#7C9885',
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -26,
    shadowColor: '#7C9885',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },

  // Peaceful Modal Styles
  overlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(45, 62, 47, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    paddingHorizontal: 20,
  },
  modal: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FEFEFE',
    borderRadius: 28,
    padding: 28,
    position: 'relative',
    shadowColor: '#7C9885',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(124, 152, 133, 0.1)',
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  successIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#7C9885',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  aiIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E8A87C',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '400',
    color: '#2D3E2F',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  modalDate: {
    fontSize: 14,
    color: '#B4A5A0',
    textAlign: 'center',
    fontWeight: '300',
  },
  modalContent: {
    backgroundColor: '#FAFBFA',
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(124, 152, 133, 0.1)',
  },
  savedReflectionText: {
    fontSize: 15,
    color: '#2D3E2F',
    lineHeight: 22,
    textAlign: 'center',
    fontWeight: '300',
  },
  modalActions: {
    gap: 12,
  },
  insightButton: {
    backgroundColor: '#b0a8beff',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#927c98ff',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  insightButtonText: {
    fontSize: 16,
    fontWeight: '400',
    color: '#fff',
    letterSpacing: 0.3,
  },
  buttonIcon: {
    marginRight: 8,
  },
  dismissButton: {
    backgroundColor: 'rgba(124, 152, 133, 0.1)',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(124, 152, 133, 0.15)',
  },
  dismissButtonText: {
    fontSize: 16,
    fontWeight: '300',
    color: '#7C9885',
    letterSpacing: 0.2,
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    padding: 8,
  },

  // AI Insights Specific Styles
  insightsContainer: {
    maxHeight: 380,
    marginBottom: 24,
  },
  insightCard: {
    backgroundColor: '#FAFBFA',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(124, 152, 133, 0.1)',
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: '400',
    color: '#2D3E2F',
    marginLeft: 10,
    letterSpacing: 0.2,
  },
  insightText: {
    fontSize: 14,
    color: '#7C9885',
    lineHeight: 20,
    fontWeight: '300',
  },

  // Gentle Loading Overlay
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(45, 62, 47, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingContainer: {
    backgroundColor: '#FEFEFE',
    borderRadius: 28,
    padding: 36,
    alignItems: 'center',
    marginHorizontal: 40,
    shadowColor: '#7C9885',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(124, 152, 133, 0.1)',
  },
  loadingIcon: {
    marginBottom: 24,
  },
  loadingTitle: {
    fontSize: 17,
    fontWeight: '400',
    color: '#2D3E2F',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  loadingSubtitle: {
    fontSize: 14,
    color: '#B4A5A0',
    textAlign: 'center',
    fontWeight: '300',
  },
  successOverlay: {
  position: 'absolute',
  top: 0,
  bottom: 0,
  left: 0,
  right: 0,
  backgroundColor: 'rgba(45, 62, 47, 0.3)',
  justifyContent: 'center',
  alignItems: 'center',
  zIndex: 1001,
  paddingHorizontal: 20,
},
successNotification: {
  backgroundColor: '#FEFEFE',
  borderRadius: 28,
  padding: 36,
  alignItems: 'center',
  minWidth: 280,
  shadowColor: '#7C9885',
  shadowOffset: { width: 0, height: 12 },
  shadowOpacity: 0.25,
  shadowRadius: 24,
  elevation: 12,
  borderWidth: 1,
  borderColor: 'rgba(124, 152, 133, 0.1)',
},
successIconContainer: {
  position: 'relative',
  marginBottom: 24,
  alignItems: 'center',
  justifyContent: 'center',
},
successIconCircle: {
  width: 72,
  height: 72,
  borderRadius: 36,
  backgroundColor: '#7C9885',
  justifyContent: 'center',
  alignItems: 'center',
  shadowColor: '#7C9885',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.3,
  shadowRadius: 12,
  elevation: 6,
},
successRipple: {
  position: 'absolute',
  width: 90,
  height: 90,
  borderRadius: 45,
  backgroundColor: 'rgba(124, 152, 133, 0.2)',
  opacity: 0.6,
},
successTitle: {
  fontSize: 22,
  fontWeight: '500',
  color: '#2D3E2F',
  marginBottom: 8,
  textAlign: 'center',
  letterSpacing: 0.3,
},
successSubtitle: {
  fontSize: 15,
  color: '#7C9885',
  textAlign: 'center',
  fontWeight: '300',
  lineHeight: 20,
  letterSpacing: 0.2,
},
});

