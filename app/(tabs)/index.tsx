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
  View
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
      setShowSuccessModal(true);
      Alert.alert('Success', 'Reflection saved successfully!');
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
    
    // Show success feedback
    setShowConfetti(true);
    Alert.alert('Success', 'Blog post saved successfully!');
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
          {/* Enhanced Profile Header */}
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
                Hello, {getUserDisplayName()} 👋
              </Text>
              <Text style={styles.subGreeting}>
                How are you feeling today?
              </Text>
            </View>
          </View>

          {/* Enhanced Reflection Section */}
          <View style={styles.reflectionSection}>
            <View style={styles.sectionHeader}>
              <Icon name="journal" size={20} color="#8B5FBF" />
              <Text style={styles.sectionTitle}>Daily Reflection</Text>
            </View>
            <View style={styles.textInputContainer}>
              <TextInput
                placeholder="Take a moment to reflect on your emotions and thoughts..."
                value={reflection}
                onChangeText={(text) => {
                  setReflection(text);
                }}
                style={styles.textInput}
                multiline
                numberOfLines={4}
                placeholderTextColor='#D5AFC7'
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
                  <Icon name="arrow-forward" size={18} color="#fff" />
                </>
              )}
            </Pressable>
          </View>

          {/* Enhanced Streak Section */}
          <View style={styles.streakContainer}>
            <View style={styles.sectionHeader}>
              <Icon name="flame" size={20} color="#FF6B35" />
              <Text style={styles.sectionTitle}>Your Progress</Text>
            </View>
            <View style={styles.streakRow}>
              <View style={styles.streakCard}>
                <View style={styles.streakCardHeader}>
                  <Icon name="trophy" size={24} color="#FFD700" />
                  <Text style={styles.streakLabel}>Best Streak</Text>
                </View>
                {streakData.loading ? (
                  <ActivityIndicator size="small" color="#8B5FBF" style={styles.loadingSpinner} />
                ) : (
                  <Text style={styles.streakValue}>
                    {streakData.longestStreak} days
                  </Text>
                )}
              </View>

              <View style={styles.streakCard}>
                <View style={styles.streakCardHeader}>
                  <Icon name="flash" size={24} color="#FF6B35" />
                  <Text style={styles.streakLabel}>Current</Text>
                </View>
                {streakData.loading ? (
                  <ActivityIndicator size="small" color="#8B5FBF" style={styles.loadingSpinner} />
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

          {/* Daily Affirmation with enhanced styling */}
          <View style={styles.affirmationWrapper}>
            <DailyAffirmation user={user} selectedMood={selectedMood || undefined} currentStreak={27} />
          </View>
          
          {/* Enhanced Divider */}
          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <View style={styles.dividerTextContainer}>
              <Icon name="create" size={16} color="#8B5FBF" />
              <Text style={styles.dividerText}>Quick Thoughts</Text>
            </View>
            <View style={styles.dividerLine} />
          </View>

          {/* Enhanced Blog Sheet Section */}
          <View style={styles.blogSheetSection}>
            <View style={styles.blogSheetHeader}>
              <View style={styles.sectionHeader}>
                <Icon name="chatbubbles" size={20} color="#8B5FBF" />
                <Text style={styles.sectionTitle}>Blog Sheet</Text>
              </View>
              <Text style={styles.blogSheetSubtitle}>Share your raw, honest thoughts</Text>
            </View>
            <View style={styles.blogInputWrapper}>
              <TextInput
                style={styles.blogInput}
                placeholder="What's on your mind right now?"
                placeholderTextColor="#9CA3AF"
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
                    <ActivityIndicator size="small" color="#8B5FBF" />
                  ) : (
                    <Icon name="send" size={18} color={blogText.trim() ? "#8B5FBF" : "#9CA3AF"} />
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
          
          {showConfetti && (
            <ConfettiCannon
              count={50}
              origin={{ x: 200, y: 0 }}
              fadeOut
              fallSpeed={2000}
              explosionSpeed={350}
              onAnimationEnd={() => setShowConfetti(false)}
            />
          )}
        </ScrollView>

        {/* Enhanced Bottom Navigation */}
        <View style={styles.bottomNav}>
          <TouchableOpacity style={styles.navItem} onPress={() => console.log('Home')}>
            <Icon name="home" size={24} color="#8B5FBF" />
            <Text style={styles.navLabel}>Home</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navItem} onPress={() => console.log('Chat')}>
            <Icon name="chatbubble-outline" size={24} color="#9CA3AF" />
            <Text style={[styles.navLabel, styles.navLabelInactive]}>Chat</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.addButton} onPress={() => console.log('Add')}>
            <Icon name="add" size={28} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.navItem} onPress={() => console.log('Mood Insights')}>
            <Icon name="analytics-outline" size={24} color="#9CA3AF" />
            <Text style={[styles.navLabel, styles.navLabelInactive]}>Insights</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.navItem} onPress={() => console.log('Settings')}>
            <Icon name="settings-outline" size={24} color="#9CA3AF" />
            <Text style={[styles.navLabel, styles.navLabelInactive]}>Settings</Text>
          </TouchableOpacity>
        </View>

        {/* Enhanced Reflection Modal */}
        {showReflectionCard && (
          <View style={styles.overlay}>
            <View style={styles.modal}>
              <View style={styles.modalHeader}>
                <View style={styles.successIcon}>
                  <Icon name="checkmark" size={32} color="#fff" />
                </View>
                <Text style={styles.modalTitle}>Reflection Saved!</Text>
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
                  <Icon name="bulb" size={18} color="#fff" style={styles.buttonIcon} />
                  <Text style={styles.insightButtonText}>
                    {insightLoading ? 'Generating...' : 'Get AI Insights'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.dismissButton}
                  onPress={() => setShowReflectionCard(false)}
                >
                  <Text style={styles.dismissButtonText}>Dismiss</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowReflectionCard(false)}
              >
                <Icon name="close" size={24} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Enhanced AI Insights Modal */}
        {showAIInsights && (
          <View style={styles.overlay}>
            <View style={styles.modal}>
              <View style={styles.modalHeader}>
                <View style={styles.aiIcon}>
                  <Icon name="brain-outline" size={32} color="#fff" />
                </View>
                <Text style={styles.modalTitle}>Your AI Insights</Text>
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
                    <Icon name="analytics" size={20} color="#10B981" />
                    <Text style={styles.insightTitle}>Emotional Summary</Text>
                  </View>
                  <Text style={styles.insightText}>
                    {aiInsight?.summary || 'Generating your personalized emotional summary...'}
                  </Text>
                </View>

                <View style={styles.insightCard}>
                  <View style={styles.insightHeader}>
                    <Icon name="leaf" size={20} color="#F59E0B" />
                    <Text style={styles.insightTitle}>Wellness Tip</Text>
                  </View>
                  <Text style={styles.insightText}>
                    {aiInsight?.wellnessTip || 'Preparing a personalized wellness tip for you...'}
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
                <Icon name="close" size={24} color="#9CA3AF" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Enhanced Loading Overlay */}
        {insightLoading && (
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingContainer}>
              <View style={styles.loadingIcon}>
                <ActivityIndicator size="large" color="#d8a7c6ff" />
              </View>
              <Text style={styles.loadingTitle}>Analyzing your reflection...</Text>
              <Text style={styles.loadingSubtitle}>This may take a few moments</Text>
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
    backgroundColor: '#ffffff',
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

  // Enhanced Profile Header
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
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  subGreeting: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '400',
  },

  // Section Headers
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 8,
  },

  // Enhanced Reflection Section
  reflectionSection: {
    marginBottom: 28,
    backgroundColor: '#e5dfe4ff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#8B5FBF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  textInputContainer: {
    position: 'relative',
  },
  textInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
    textAlignVertical: 'top',
    minHeight: 120,
    fontSize: 16,
    lineHeight: 24,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    color: '#1F2937',
  },
  characterCount: {
    position: 'absolute',
    bottom: 12,
    right: 16,
    fontSize: 12,
    color: '#9CA3AF',
    backgroundColor: '#fff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  reflectButton: {
    marginTop: 16,
    backgroundColor: '#a79ba5ff',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8B5FBF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  reflectButtonLoading: {
    opacity: 0.8,
  },
  reflectButtonDisabled: {
    backgroundColor: '#d1c6cfff',
    shadowOpacity: 0,
  },
  reflectButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginRight: 8,
  },

  // Enhanced Streak Section
  streakContainer: {
    marginBottom: 28,
  },
  streakRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  streakCard: {
    backgroundColor: '#D8D5F0',
    borderRadius: 20,
    padding: 20,
    flex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  streakCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  streakLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
    marginLeft: 8,
  },
  streakValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
  },
  loadingSpinner: {
    marginVertical: 8,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
    fontWeight: '500',
  },

  // Affirmation Wrapper
  affirmationWrapper: {
    marginBottom: 28,
  },

  // Enhanced Divider
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    marginHorizontal: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#ddbaebff',
  },
  dividerTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dividerText: {
    marginLeft: 6,
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },

  // Enhanced Blog Sheet Section
  blogSheetSection: {
    backgroundColor: '#E4E5E6',
    borderRadius: 20,
    padding: 20,
    marginBottom: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  blogSheetHeader: {
    marginBottom: 16,
  },
  blogSheetSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
    fontStyle: 'italic',
  },
  blogInputWrapper: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    minHeight: 100,
  },
  blogInput: {
    fontSize: 16,
    color: '#1F2937',
    lineHeight: 22,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  blogFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  blogCharCount: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  sendButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },

  // Enhanced Bottom Navigation
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 8,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
  },
  navItem: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  navLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#8B5FBF',
    marginTop: 4,
  },
  navLabelInactive: {
    color: '#9CA3AF',
  },
  addButton: {
    backgroundColor: '#8B5FBF',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -28,
    shadowColor: '#8B5FBF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },

  // Enhanced Modal Styles
  overlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    paddingHorizontal: 20,
  },
  modal: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 24,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  aiIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#8B5FBF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalDate: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  modalContent: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  savedReflectionText: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
    textAlign: 'center',
  },
  modalActions: {
    gap: 12,
  },
  insightButton: {
    backgroundColor: '#8B5FBF',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8B5FBF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  insightButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  buttonIcon: {
    marginRight: 8,
  },
  dismissButton: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  dismissButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 8,
  },

  // AI Insights Specific Styles
  insightsContainer: {
    maxHeight: 400,
    marginBottom: 24,
  },
  insightCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 8,
  },
  insightText: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },

  // Enhanced Loading Overlay
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingContainer: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    marginHorizontal: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 12,
  },
  loadingIcon: {
    marginBottom: 20,
  },
  loadingTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  loadingSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
});