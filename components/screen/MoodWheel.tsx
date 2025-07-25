//@ts-nocheck
import React, { useEffect, useState } from 'react';
import { Alert, Dimensions, Image, PanResponder, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Needle from '../../assets/images/needle.svg';
import MoodApiService from '../../services/moodServices';

const { width, height } = Dimensions.get('window');
const RADIUS = width * 0.270;

const EMOJIS = [
  { name: 'sad', image: require('../../assets/images/sad.png') },
  { name: 'fine', image: require('../../assets/images/fine.png') },
  { name: 'happy', image: require('../../assets/images/happy.png') },
  { name: 'nervous', image: require('../../assets/images/nervous.png') },
  { name: 'disappointed', image: require('../../assets/images/disappointed.png') },
  { name: 'irritated', image: require('../../assets/images/irritated.png') },
];

const ANGLE_STEP = Math.PI / (EMOJIS.length - 1);
const REPEAT_COUNT = 100;
const LOOP_EMOJIS = Array(REPEAT_COUNT).fill(EMOJIS).flat();
const CENTER_OFFSET = Math.floor(LOOP_EMOJIS.length / 2);

const MESSAGES = ["Sad", "Fine", "Happy!", "Nervous", "Disappointed", "Irritated"];

// Updated mapping to match your Prisma schema MoodType enum
const MOOD_TYPE_MAPPING = {
  'sad': 'SAD',
  'fine': 'NEUTRAL',
  'happy': 'HAPPY',
  'nervous': 'ANXIOUS',
  'disappointed': 'SAD',
  'irritated': 'ANGRY'
};

// Intensity mapping based on mood selection (1-10 scale)
const INTENSITY_MAPPING = {
  'sad': 3,
  'fine': 5,
  'happy': 8,
  'nervous': 4,
  'disappointed': 2,
  'irritated': 6
};

export default function MoodWheel({ userId = null, firebaseUid = null }) {
  const [rotation, setRotation] = useState(0);
  const [currentMood, setCurrentMood] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [initializationStatus, setInitializationStatus] = useState('Starting...');

  // Initialize user ID on component mount
  useEffect(() => {
    const initializeUserId = async () => {
      console.log('Starting user initialization...', { userId, firebaseUid });
      setIsInitializing(true);
      setError(null);

      try {
        // Case 1: Direct userId provided
        if (userId) {
          console.log('Using provided userId:', userId);
          setInitializationStatus('Validating user ID...');
          
          // Validate the userId by checking if user exists
          try {
            const response = await fetch(`http://192.168.137.1:5000/api/moodtrack/validate-user/${userId}`);
            if (response.ok) {
              setCurrentUserId(userId);
              console.log('User ID validated successfully');
              return;
            } else {
              console.log('User ID validation failed, status:', response.status);
              throw new Error('Invalid user ID');
            }
          } catch (validationError) {
            console.log('User validation failed, continuing with provided ID anyway:', validationError);
            // Continue with the provided userId even if validation fails
            setCurrentUserId(userId);
            return;
          }
        }

        // Case 2: Firebase UID provided - fetch user by firebaseUid
        if (firebaseUid) {
          console.log('Fetching user by firebaseUid:', firebaseUid);
          setInitializationStatus('Finding user account...');
          
          try {
            const response = await fetch(`http://192.168.137.1:5000/api/users/by-firebase/${firebaseUid}`);
            console.log('Firebase user lookup response status:', response.status);
            
            if (response.ok) {
              const userData = await response.json();
              console.log('User found by firebaseUid:', userData);
              if (userData.success && userData.data && userData.data.id) {
                setCurrentUserId(userData.data.id);
                console.log('Successfully set user ID from firebase lookup:', userData.data.id);
                return;
              } else {
                throw new Error('Invalid user data structure');
              }
            } else {
              const errorData = await response.json();
              console.log('Firebase user lookup failed:', errorData);
              throw new Error(errorData.error || 'User not found by Firebase UID');
            }
          } catch (fetchError) {
            console.error('Error fetching user by firebaseUid:', fetchError);
            setError(`Failed to find user account: ${fetchError.message}`);
            return;
          }
        }

        // Case 3: No user info provided - create test user (development only)
        console.log('No user info provided, creating test user...');
        setInitializationStatus('Creating test user...');
        
        try {
          const response = await fetch('http://192.168.137.1:5000/api/moodtrack/test-user', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            }
          });
          
          console.log('Test user creation response status:', response.status);
          
          if (response.ok) {
            const result = await response.json();
            console.log('Test user creation result:', result);
            
            if (result.success && result.data && result.data.id) {
              setCurrentUserId(result.data.id);
              console.log('Test user created successfully:', result.data.id);
              return;
            } else {
              throw new Error('Invalid test user creation response');
            }
          } else {
            const errorData = await response.json();
            console.log('Test user creation failed:', errorData);
            throw new Error(errorData.error || 'Failed to create test user');
          }
        } catch (testUserError) {
          console.error('Failed to create test user:', testUserError);
          setError(`Failed to initialize: ${testUserError.message}`);
          return;
        }

      } catch (error) {
        console.error('Unexpected error during initialization:', error);
        setError(`Initialization failed: ${error.message}`);
      } finally {
        setIsInitializing(false);
        setInitializationStatus('');
      }
    };

    initializeUserId();
  }, [userId, firebaseUid]);

  // Clear error when user interacts
  const clearError = () => {
    if (error) setError(null);
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => {
      clearError();
      return true;
    },
    onPanResponderMove: (_, gestureState) => {
      let newRotation = rotation - gestureState.dx * 0.01;
      setRotation(newRotation);
    },
    onPanResponderRelease: (_, gestureState) => {
      let newRotation = rotation - gestureState.dx * 0.01;
      const snapped = Math.round(newRotation / ANGLE_STEP);
      setRotation(snapped * ANGLE_STEP);
    },
  });

  let selectedIndex = Math.round(rotation / ANGLE_STEP) % EMOJIS.length;
  if (selectedIndex < 0) selectedIndex += EMOJIS.length;

  const handleSaveMood = async (moodIndex: number) => {
    // Validate userId
    if (!currentUserId) {
      setError('User ID is required to save mood');
      Alert.alert('Error', 'Please log in to save your mood');
      return;
    }

    const moodName = EMOJIS[moodIndex].name;
    const moodMessage = MESSAGES[moodIndex];
    
    setIsSaving(true);
    setError(null);
    
    try {
      const moodData = {
        moodType: MOOD_TYPE_MAPPING[moodName],
        intensity: INTENSITY_MAPPING[moodName],
        note: `Mood selected: ${moodMessage}`,
        userId: currentUserId,
      };

      console.log("Sending mood data:", moodData);

      const result = await MoodApiService.saveMoodEntry(moodData);
      
      if (result && result.success) {
        setCurrentMood(moodName);
        console.log("Mood saved successfully!", result.data);
        
        Alert.alert(
          'Mood Saved!', 
          `Your ${moodMessage.toLowerCase()} mood has been recorded.`,
          [{ text: 'OK', style: 'default' }]
        );
      } else {
        throw new Error(result?.error || 'Unknown error occurred');
      }
    } catch (error) {
      console.error("Failed to save mood:", error);
      let errorMessage = 'Failed to save mood. Please try again.';
      
      // Handle specific error messages
      if (error.message.includes('Invalid userId format')) {
        errorMessage = 'Invalid user ID. Please log in again.';
      } else if (error.message.includes('User not found')) {
        errorMessage = 'User not found. Please log in again.';
      } else if (error.message.includes('Invalid mood type')) {
        errorMessage = 'Invalid mood selection. Please try again.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
      
      Alert.alert(
        'Save Failed', 
        errorMessage, 
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Retry', onPress: () => handleSaveMood(moodIndex) }
        ]
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleEmojiPress = (emojiIndex: number) => {
    clearError();
    const originalIndex = emojiIndex % EMOJIS.length;
    handleSaveMood(originalIndex);
  };

  const isDisabled = isSaving || isInitializing || !currentUserId;

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      {/* Error display */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => setError(null)} style={styles.dismissButton}>
            <Text style={styles.dismissText}>×</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Initialization status display */}
      {isInitializing && (
        <View style={styles.initializationContainer}>
          <Text style={styles.initializationText}>{initializationStatus}</Text>
        </View>
      )}

      {/* Debug info */}
      {__DEV__ && (
        <View style={styles.debugContainer}>
          <Text style={styles.debugText}>
            UserId: {currentUserId ? currentUserId.slice(-8) : 'null'} | 
            Firebase: {firebaseUid ? firebaseUid.slice(-8) : 'null'} |
            Initializing: {isInitializing ? 'yes' : 'no'}
          </Text>
        </View>
      )}

      {/* Donut background */}
      <View style={styles.donutContainer}>
        <View style={styles.outerHalfCircle} />
        <View style={styles.innerHalfCircle} />
      </View>

      {/* Needle pointing to selected mood */}
      <View style={styles.needleIcon}>
        <Needle width={60} height={80} fill="#6A4E77" />
      </View>

      {/* Selected mood display */}
      <View style={styles.labelContainer}>
        <TouchableOpacity 
          style={[
            styles.centerEmojiCircle,
            isDisabled && styles.centerEmojiCircleDisabled
          ]}
          onPress={() => handleSaveMood(selectedIndex)}
          disabled={isDisabled}
        >
          <Image source={EMOJIS[selectedIndex].image} style={styles.labelEmoji} />
          {(isSaving || isInitializing) && (
            <View style={styles.loadingOverlay}>
              <Text style={styles.loadingText}>...</Text>
            </View>
          )}
        </TouchableOpacity>
        <Text style={styles.labelMessage}>{MESSAGES[selectedIndex]}</Text>
        {isInitializing && (
          <Text style={styles.warningText}>Please wait, initializing...</Text>
        )}
        {!isInitializing && !currentUserId && (
          <Text style={styles.warningText}>Failed to initialize user</Text>
        )}
      </View>

      {/* Emoji Wheel */}
      {LOOP_EMOJIS.map((emoji, i) => {
        const angle = ANGLE_STEP * (i - CENTER_OFFSET);
        const posAngle = angle - rotation;
        if (Math.abs(posAngle) > Math.PI / 2 + 0.5) return null;

        const x = RADIUS * Math.cos(posAngle - Math.PI / 2);
        const y = RADIUS * Math.sin(posAngle - Math.PI / 2);
        const isSelected = Math.abs(posAngle) < ANGLE_STEP / 2;

        return (
          <TouchableOpacity
            key={i + emoji.name}
            onPress={() => handleEmojiPress(i)}
            disabled={isDisabled}
            style={{
              position: 'absolute',
              left: width / 2 + x - (isSelected ? 25 : 18),
              top: RADIUS + y - (isSelected ? 25 : 18),
              width: isSelected ? 60 : 35,
              height: isSelected ? 60 : 35,
              opacity: isDisabled ? 0.5 : 1,
            }}
          >
            <Image
              source={emoji.image}
              style={{
                width: '100%',
                height: '100%',
                opacity: isSelected ? 1 : 0.5,
                resizeMode: 'contain',
              }}
            />
          </TouchableOpacity>
        );
      })}

      {/* Save Button */}
      <View style={styles.saveButtonWrapper}>
        <TouchableOpacity
          style={[
            styles.saveButtonContainer,
            isDisabled && styles.saveButtonDisabled
          ]}
          onPress={() => handleSaveMood(selectedIndex)}
          disabled={isDisabled}
        >
          <Text style={styles.saveButtonText}>
            {isSaving ? 'Saving...' : 
             isInitializing ? 'Initializing...' : 
             !currentUserId ? 'Failed to Initialize' : 
             'Save Mood'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width,
    height: RADIUS * 3,
  },
  labelContainer: {
    position: 'absolute',
    top: -170,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelEmoji: {
    width: 87,
    height: 87,
    resizeMode: 'contain',
  },
  labelMessage: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#6A4E77',
    left: 2,
    marginTop: -17,
  },
  needleIcon: {
    position: 'absolute',
    top: 40,
    left: width / 1.58 - 80,
    zIndex: 10,
    transform: [{ rotate: '-93deg' }],
  },
  saveButtonWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButtonContainer: {
    backgroundColor: '#fffcdbff',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderWidth: 0.2,
    borderRadius: 24,
    shadowColor: '#B197FC',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 5,
  },
  saveButtonText: {
    color: '#6A4E77',
    fontSize: 18,
    fontWeight: 'bold',
  },
  saveButtonDisabled: {
    opacity: 0.6,
    backgroundColor: '#f0f0f0',
  },
  centerEmojiCircle: {
    width: 92,
    top: -30,
    height: 92,
    borderRadius: 45,
    borderWidth: 1.3,
    borderColor: '#6A4E77',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6A4E77',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    elevation: 8,
  },
  centerEmojiCircleDisabled: {
    opacity: 0.5,
    borderColor: '#ccc',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 45,
  },
  loadingText: {
    fontSize: 24,
    color: '#6A4E77',
    fontWeight: 'bold',
  },
  warningText: {
    fontSize: 14,
    color: '#ff6b6b',
    marginTop: 5,
    textAlign: 'center',
  },
  errorContainer: {
    position: 'absolute',
    top: -220,
    left: 20,
    right: 20,
    backgroundColor: '#ffebee',
    borderColor: '#f44336',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 100,
  },
  errorText: {
    flex: 1,
    color: '#c62828',
    fontSize: 14,
  },
  dismissButton: {
    marginLeft: 8,
    padding: 4,
  },
  dismissText: {
    color: '#c62828',
    fontSize: 18,
    fontWeight: 'bold',
  },
  initializationContainer: {
    position: 'absolute',
    top: -200,
    left: 20,
    right: 20,
    backgroundColor: '#e3f2fd',
    borderColor: '#2196f3',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    zIndex: 100,
  },
  initializationText: {
    color: '#1565c0',
    fontSize: 14,
    textAlign: 'center',
  },
  debugContainer: {
    position: 'absolute',
    top: -250,
    left: 20,
    right: 20,
    backgroundColor: '#f5f5f5',
    borderRadius: 4,
    padding: 8,
    zIndex: 50,
  },
  debugText: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
  },
  donutContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: width,
    height: RADIUS * 2,
    alignItems: 'center',
    justifyContent: 'flex-start',
    zIndex: 0,
  },
  outerHalfCircle: {
    width: RADIUS * 2.54,
    height: RADIUS * 2.54,
    borderRadius: RADIUS * 1.5,
    backgroundColor: '#7d847796',
    position: 'absolute',
    top: -30,
    opacity: 0.35,
  },
  innerHalfCircle: {
    width: RADIUS * 1.5,
    height: RADIUS * 1.55,
    borderRadius: RADIUS * 0.8,
    backgroundColor: '#fcdefcff',
    position: 'absolute',
    top: 40,
    opacity: 1,
  },
});