//app/(tabs)/index.tsx
//@ts-ignore
//@ts-nocheck
import React, { useEffect, useState } from 'react';
import {
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

  useEffect(() => {
    console.log('Current user object:', user);
    console.log('User firebaseUid:', user?.firebaseUid);
    console.log('User uid:', user?.uid);
    console.log('User id:', user?.id);
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
<Svg height="700" width="100%" viewBox="0 70 1440 320" style={styles.svg}>
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
  return (
    <View style={styles.gradient}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.wrapper}>
          <ScrollView contentContainerStyle={styles.container}>
            {/* Profile Header */}
            <View style={styles.profileHeader}>
              <Image
                source={getUserProfileImage()}
                style={styles.profileImage}
              />
              <Text style={styles.greeting}>
                {"\n"}Hey, {getUserDisplayName()}, {"\n"}How are you doing today?
              </Text>
            </View>

            {/* Reflection Section */}
            <View style={styles.reflectionSection}>
              <Text style={styles.sectionTitle}>Daily Reflection</Text>
              <TextInput
                placeholder="How do you feel about your current emotions?"
                value={reflection}
                onChangeText={(text) => {
                  setReflection(text);
                }}
                style={styles.textInput}
                multiline
                numberOfLines={4}
                placeholderTextColor='#A38CBC'
              />
              <Pressable
                style={[
                  styles.reflectButton, 
                  isLoading && { opacity: 0.6 },
                  !reflection.trim() && { opacity: 0.5 }
                ]}
                onPress={handleReflectPress}
                disabled={isLoading || !reflection.trim()}
              >
                <Text style={styles.reflectButtonText}>
                  {isLoading ? 'Saving...' : 'Reflect Here'}
                </Text>
                <Icon name="arrow-forward" size={20} color="#333" />
              </Pressable>
            </View>

            {/* Streak and Mood Section */}
            <View style={styles.streakMoodContainer}>
              <View style={styles.streakRow}>
                <View style={styles.streakCard}>
                  <View style={styles.streakCardRow}>
                    <Text style={styles.streakLabel}>Longest Streak</Text>
                    <Text style={styles.streakValue}>
                      <Text style={{ fontSize: 23, fontWeight: 'bold' }}>43</Text>
                      <Text style={{ marginLeft: 2 }}>✨</Text>
                    </Text>
                  </View>
                </View>

                <View style={styles.streakCard}>
                  <View style={styles.streakCardRow}>
                    <Text style={styles.streakLabel}>Current Streak</Text>
                    <Text style={styles.streakValue}>
                      <Text style={{ fontSize: 23, fontWeight: 'bold' }}>27</Text>
                      <Text style={{ marginLeft: 2 }}>💥</Text>
                    </Text>
                  </View>
                </View>
              </View>
              </View>

            {/*daily affirmation */}
            <DailyAffirmation user= {user} selectedMood= {selectedMood || undefined} currentStreak={27} />
            
            {/*divider section */}
            <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>blog sheet</Text>
            <View style={styles.dividerLine} />
            </View>

            {/* Blog Sheet Section */}
            <View style={styles.blogSheetSection}>
              <View style={styles.blogSheetHeader}>
                <Text style={styles.blogSheetTitle}> Blog Sheet</Text>
                <View style={styles.blogLine} />
              </View>
              <View style={styles.blogInputWrapper}>
                <TextInput
                  style={styles.blogInput}
                  placeholder="Post sheet..."
                  placeholderTextColor="#999"
                  multiline
                  value={blogText}
                  onChangeText={setBlogText}
                />
                <Text style={styles.blogSubtext}>Unhinged, Raw, Honest</Text>
                <TouchableOpacity
                  style={styles.sendIcon}
                  onPress= {saveBlogPost}
                  
                >
                  <Icon name="send" size={22} color="#AF8CAF" />
                </TouchableOpacity>
                
            </View>
            </View>
            {showConfetti && (
                  <ConfettiCannon
                    count={30}
                    origin={{ x: 300, y: 0 }}
                    fadeOut
                    fallSpeed={3000}
                    explosionSpeed={500}
                    onAnimationEnd={() => setShowConfetti(false)}
                  />
                )}
              </ScrollView>
    


          {/* Bottom Navigation */}
          <View style={styles.bottomNav}>
            <TouchableOpacity onPress={() => console.log('Home')}>
              <Icon name="home-outline" size={24} color="#333" />
            </TouchableOpacity>

            <TouchableOpacity onPress={() => console.log('Chat')}>
              <Icon name="chatbubble-outline" size={24} color="#333" />
            </TouchableOpacity>

            <TouchableOpacity onPress={() => console.log('Add')}>
              <View style={styles.addButton}>
                <Icon name="add" size={24} color="#F4CBE4" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => console.log('Mood Insights')}>
              <Icon name="analytics-outline" size={24} color="#333" />
            </TouchableOpacity>

            <TouchableOpacity onPress={() => console.log('Settings')}>
              <Icon name="settings-outline" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          {/* Reflection Modal */}
          {showReflectionCard && (
            <View style={styles.overlay}>
              <View style={styles.card}>
                <View style={styles.checkIconContainer}>
                  <Icon name="checkmark-circle" size={50} color="#10B981" />
                </View>
                <Text style={styles.cardDate}>
                  {new Date().getDate()}{"\n"}
                  {new Date().toLocaleDateString('en-US', { weekday: 'short' })}
                </Text>

                <View style={styles.cardTextDisplay}>
                  <Text style={styles.cardDisplayText}>{savedReflection}</Text>
                </View>

                <TouchableOpacity
                  style={styles.insightButton}
                  onPress={() => {
                    setShowReflectionCard(false);
                    generateInsights();}}
                  disabled={insightLoading}
                >
                  <Text style={styles.insightButtonText}>{insightLoading ? 'Generating...' : 'Get insights'}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setShowReflectionCard(false)}
                >
                  <Icon name="close-circle" size={28} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* AI Insights Modal */}
          {showAIInsights && (
            <View style={styles.overlay}>
              <View style={styles.card}>
                <TouchableOpacity
                style={styles.checkIconContainer}
                onPress={() => setShowAIInsights(false)}
              >
                <Icon name="checkmark-circle" size={50} color="#10B981" />
              </TouchableOpacity>

              <Text style={styles.cardDate}>
                {new Date().getDate()}{"\n"}
                {new Date().toLocaleDateString('en-US', { weekday: 'short' })}
              </Text>

              <View style={styles.aiCardBox}>
                <Text style={styles.aiCardTitle}>🧠 Emotional Summary</Text>
                <Text style={styles.aiCardText}>
                  {aiInsight?.summary as string || 'Generating your personalized emotional summary...'}
                </Text>
              </View>

              <View style={styles.aiCardBoxYellow}>
                <Text style={styles.aiCardTitle}>🌙 Wellness Tip</Text>
                <Text style={styles.aiCardText}>
                  {aiInsight?.wellnessTip as string || 'Preparing a personalized wellness tip for you...'}
                </Text>
              </View>
            </View>
          </View>
        )} 
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  svg: {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  zIndex: -1,
  width: '100%',
  height: '100%',
},
  gradient: {
    flex: 1,
    backgroundColor: '#FAF6F6',
  },
  safeArea: {
    flex: 1,
  },
  wrapper: {
    flex: 1,
    position: 'relative',
  },
  container: {
    padding: 20,
    paddingBottom: 100,
    flexGrow: 1,
  },
  profileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    paddingHorizontal: 10,
    position: 'relative',
  },
  greetingContainer: {
    flex: 1,
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15,
    borderWidth: 3,
    borderColor: '#fff',
  },
  greeting: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#5F3F3F',
    flex: 1,

  },
  reflectionSection: {
    marginBottom: 25,
    backgroundColor: '#F7F0F3',
    borderRadius: 15,
    padding: 15,
  },
  section: {
    marginBottom: 25,
    backgroundColor: '#9791B9',
    borderRadius: 15,
    padding: 15,
  },
  affirmationSection: {
    marginBottom: 25,
    backgroundColor: '#E0E8DD',
    borderRadius: 15,
    padding: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign:'center',
    color:'#78549E'
  },
  textInput: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    textAlignVertical: 'top',
    minHeight: 100,
    fontSize: 16,
    lineHeight: 22,
  },
  // New Streak + Mood Section
  streakMoodContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 25,
  },
  streakRow: {
    flexDirection: 'row',
    gap: 20,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  streakCard: {
    backgroundColor: '#D8D5F0',
    borderRadius: 15,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 10,
    height: 70,
    justifyContent: 'center',
    width: 170,
  },
  streakCardRow: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: 10,
},
  streakLabel: {
    fontSize: 14,
    color: '#333',
    fontWeight: 'bold',
  },
  streakValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  reflectButton: {
    marginTop: 15,
    backgroundColor: '#9791B9',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  reflectButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 10,
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 10,
    backgroundColor: '#fff',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  addButton: {
    backgroundColor: '#fff',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
  },
  affirmationContent: {
    color: '#666',
    lineHeight: 22,
    fontSize: 14,
  },

  // Modal overlay
  overlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },

  // Card
  card: {
    width: '85%',
    backgroundColor: '#F8DDEB',
    borderRadius: 25,
    padding: 20,
    paddingTop: 30,
    alignItems: 'center',
    position: 'relative',
  },
  checkIconContainer: {
    position: 'absolute',
    top: -25,
    backgroundColor: '#F8DDEB',
    borderRadius: 25,
    padding: 5,
  },
  cardDate: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginBottom: 10,
  },
  cardTextDisplay: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    width: '100%',
    marginBottom: 20,
    minHeight: 80,
  },
  cardDisplayText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  cardTextInput: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 10,
    width: '100%',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  insightButton: {
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 4,
  },
  insightButtonText: {
    fontWeight: 'bold',
    color: '#D16D96',
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
  },

  // AI Insight Styles
  aiCardBox: {
    backgroundColor: '#E1F8F4',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    width: '100%',
  },
  aiCardBoxYellow: {
    backgroundColor: '#FDF3D9',
    borderRadius: 10,
    padding: 15,
    width: '100%',
  },
  aiCardTitle: {
    fontWeight: 'bold',
    marginBottom: 5,
  },
  aiCardText: {
    fontSize: 13,
    color: '#333',
    lineHeight: 18,
  },
  dividerContainer: {
  flexDirection: 'row',
  alignItems: 'center',
  marginVertical: 20,
  marginHorizontal: 10,
},

dividerLine: {
  flex: 1,
  height: 1,
  backgroundColor: '#AF8CAF',
  opacity: 0.5,
},

dividerText: {
  marginHorizontal: 10,
  fontSize: 12,
  fontStyle: 'italic',
  color: '#AF8CAF',
},
  //blogsheet
 blogSheetSection: {
  backgroundColor: '#E4E5E6',
  borderRadius: 15,
  padding: 15,
  marginBottom: 25,
  marginHorizontal: 10,
  borderWidth: 1,
  borderColor: '#E5D0F2',
  shadowColor: '#C2A6D3',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.2,
  shadowRadius: 4,
  elevation: 2,
},
blogSheetHeader: {
  marginBottom: 10,
},
blogSheetTitle: {
  fontSize: 16,
  fontWeight: 'bold',
  color: '#5F3F3F',
  textAlign: 'left',
  marginBottom: 4,
},
blogLine: {
  height: 2,
  backgroundColor: '#AF8CAF',
  borderRadius: 1,
  width: 70,
},
blogInputWrapper: {
  backgroundColor: '#E4DDEA',
  borderRadius: 12,
  padding: 12,
  position: 'relative',
  minHeight: 80,
  marginTop: 5,
  shadowColor: '#BBAACD',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 3,
  elevation: 1,
},
blogInput: {
  fontSize: 15,
  minHeight: 60,
  color: '#333',
  paddingRight: 40,
  lineHeight: 22,
},
blogSubtext: {
  fontSize: 12,
  color: '#7F7F7F',
  marginTop: 6,
},
sendIcon: {
  position: 'absolute',
  bottom: 15,
  right: 15,
  backgroundColor: '#F6F0F9',
  borderRadius: 20,
  padding: 6,
  shadowColor: '#AF8CAF',
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.2,
  shadowRadius: 2,
  elevation: 1,
},
});

