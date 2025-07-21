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
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../../context/AuthContext';

type User = {
  mongoId?: string;         // From MongoDB (_id mapped to mongoId)
  firebaseUid?: string;     // From Firebase
  uid?: string;             // Fallback for Firebase UID
  id?: string;              // General fallback
  displayName?: string;
  email?: string;
  photoURL?: string;
  emailVerified?: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
};

export default function index() {
  const [reflection, setReflection] = useState('');
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [showReflectionCard, setShowReflectionCard] = useState(false);
  const [showAIInsights, setShowAIInsights] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth() as { user: User | null };
  const [savedReflection, setSavedReflection] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const moods = ['😞', '😍', '😡', '🙂', '😭', '😌'];

  // Debug user object on component mount and when user changes
  useEffect(() => {
    console.log(' Current user object:', user);
    console.log(' User firebaseUid:', user?.firebaseUid);
    console.log(' User uid:', user?.uid);
    console.log(' User id:', user?.id);
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
    return require('../../assets/images/default-profile.jpg'); // Default profile image
  };

  // Get the user's Firebase UID from multiple possible sources
  const getUserFirebaseUid = () => {
    return user?.firebaseUid || user?.uid || user?.id;
  };

  const saveReflection = async () => {
    console.log(' Debug - saveReflection called');
    console.log(' Debug - reflection state:', reflection);
    console.log(' Debug - reflection length:', reflection.length);
    console.log(' Debug - user object:', user);
    
    const firebaseUid = getUserFirebaseUid();
    console.log(' Debug - resolved firebaseUid:', firebaseUid);

    // Check if user is authenticated
    if (!user) {
      console.log(' No user found');
      Alert.alert('Authentication Error', 'User not found. Please login again.');
      return;
    }

    // Check if we have a Firebase UID
    if (!firebaseUid) {
      console.log(' No firebaseUid found in user object');
      console.log(' Available user properties:', Object.keys(user));
      Alert.alert('Authentication Error', 'User ID not found. Please logout and login again.');
      return;
    }

    // Check if reflection is not empty
    if (!reflection.trim()) {
      console.log(' Reflection is empty or only whitespace');
      Alert.alert('Validation Error', 'Please write a reflection before saving.');
      return;
    }

    try {
      setIsLoading(true);
      console.log(' Saving reflection for user:', firebaseUid);
      
      const payload = {
        firebaseUid: firebaseUid,
        textContent: reflection.trim(),
      }; 
      console.log(' Payload:', payload);

      const apiUrl = `${process.env.EXPO_PUBLIC_API_URL}/api/journal`;
      console.log(' API URL:', apiUrl);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json' 
        },
        body: JSON.stringify(payload),
      });
    console.log(' Response status:', response.status);
    console.log(' Response ok:', response.ok);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(' Error response:', errorText);
      
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
    setSavedReflection(reflection);  // Save before clearing
    setShowReflectionCard(true); 
    setShowSuccessModal(true);
    //Alert.alert('Success', 'Reflection saved successfully!');
    setReflection('');
    setSelectedMood(null);
    

    } catch (err) {
    console.error(' API error:', err);
    
    // More specific error handling
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

  const handleReflectPress = async () => {
    console.log(' Reflect button pressed');
    await saveReflection();
    
    // Only show reflection card if save was successful (not loading anymore)
    // if (!isLoading && reflection.trim()) {
    //   setShowReflectionCard(true);
    //}
  };

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
                Hey, {getUserDisplayName()}, {"\n"}How are you doing today?
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

            {/* Mood Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Daily Mood Log</Text>
              <View style={styles.moodRow}>
                {moods.map((mood, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.moodButton,
                      selectedMood === mood && styles.moodSelected,
                    ]}
                    onPress={() => setSelectedMood(mood)}
                  >
                    <Text style={styles.moodText}>{mood}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Affirmation Section */}
            <View style={styles.affirmationSection}>
              <Text style={styles.sectionTitle}>Daily Words of affirmations</Text>
              <Text style={styles.affirmationContent}>
                You are capable of amazing things. Every step forward, no matter how small, is progress worth celebrating.
              </Text>
            </View>
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
                  <Icon name="checkmark-circle" size={50} color="#A1D1A1" />
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
                    setShowAIInsights(true);
                  }}
                >
                  <Text style={styles.insightButtonText}>Get insights</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setShowReflectionCard(true)}
                >
                  <Icon name="close-circle" size={28} color="#999" />
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
                  <Icon name="checkmark-circle" size={50} color="#A1D1A1" />
                </TouchableOpacity>

                <Text style={styles.cardDate}>
                  {new Date().getDate()}{"\n"}
                  {new Date().toLocaleDateString('en-US', { weekday: 'short' })}
                </Text>

                <View style={styles.aiCardBox}>
                  <Text style={styles.aiCardTitle}>🧠 Emotional Summary</Text>
                  <Text style={styles.aiCardText}>
                    It sounds like you had a mixed day with some challenges but also successes. You're showing resilience & how you're handling stress.
                    It sounds like you had a mixed day with some challenges but also successes. You're showing resilience & how you're handling stress.
                  </Text>
                </View>

                <View style={styles.aiCardBoxYellow}>
                  <Text style={styles.aiCardTitle}>🌙 Wellness Tip</Text>
                  <Text style={styles.aiCardText}>
                    Consider taking 5 minutes for deep breathing exercises before bed tonight to help clear your mind and prepare for restful sleep.
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
  gradient: {
    flex: 1,
    backgroundColor: '#E7B8D9',
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
    alignItems: 'center',
    marginBottom: 20,
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
    color: '#fff',
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
    backgroundColor: '#FDEFF4',
    borderRadius: 15,
    padding: 15,
  },
  affirmationSection: {
    marginBottom: 25,
    backgroundColor: '#EDF3DD',
    borderRadius: 15,
    padding: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
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
  moodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  moodButton: {
    padding: 10,
    borderRadius: 10,
  },
  moodSelected: {
    backgroundColor: '#fff',
  },
  moodText: {
    fontSize: 24,
  },
  reflectButton: {
    marginTop: 15,
    backgroundColor: '#CFD9B4',
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
});