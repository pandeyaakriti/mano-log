//@ts-nocheck
import { useFonts } from 'expo-font';
import React, { useState, useEffect } from 'react'; // Added missing imports
import { Alert, Dimensions, Image, PanResponder, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Needle from '../../assets/images/needle.svg';
import MoodApiService from '../../services/moodServices';
// Import your authentication method - adjust based on your auth system
import { getAuth, onAuthStateChanged } from 'firebase/auth'; // Firebase example
// OR import your custom auth context
// import { useAuth } from '../context/AuthContext';

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
  'disappointed': 'TIRED',
  'irritated': 'ANGRY'
};

// Intensity mapping based on mood selection (1-6 scale)
const INTENSITY_MAPPING = {
  'SAD': 5.8,
  'NEUTRAL': 4.8,      // maps to 'fine' in frontend
  'HAPPY': 3.8,
  'ANXIOUS': 2.8,   // maps to 'nervous' in frontend
  'ANGRY': 1.8,     // maps to 'disappointed' in frontend
  'TIRED': 0.8      // maps to 'irritated' in frontend
};

export default function MoodWheel() {
   const [fontsLoaded] = useFonts({
      PlusJakartaSans: require('../../assets/fonts/PlusJakartaSans.ttf'),
    });
    if (!fontsLoaded) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
          <Text>Loading fonts...</Text>
        </View>
      );
      }
  const [rotation, setRotation] = useState(0); // Fixed: UseState -> useState
  const [currentMood, setCurrentMood] = useState<string | null>(null); // Fixed: UseState -> useState
  const [isSaving, setIsSaving] = useState(false); // Fixed: UseState -> useState
  const [error, setError] = useState<string | null>(null); // Fixed: UseState -> useState
  const [currentUserId, setCurrentUserId] = useState<string | null>(null); // Fixed: UseState -> useState
  const [isInitializing, setIsInitializing] = useState(true); // Fixed: UseState -> useState
  const [authUser, setAuthUser] = useState(null); // Fixed: UseState -> useState

  // Get the logged-in user and fetch their database user ID
  useEffect(() => { // Fixed: UseEffect -> useEffect
    const initializeUser = async () => {
      console.log('Initializing user authentication...');
      setIsInitializing(true);
      setError(null);

      try {
        // Method 1: Using Firebase Auth (adjust based on your auth system)
        const auth = getAuth();
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
          if (firebaseUser) {
            console.log('Firebase user found:', firebaseUser.uid);
            setAuthUser(firebaseUser);
            
            // Fetch the user's database record using Firebase UID
            try {
              const response = await fetch(`http://192.168.137.1:5000/api/users/by-firebase/${firebaseUser.uid}`);
              console.log('User lookup response status:', response.status);
              
              if (response.ok) {
                const userData = await response.json();
                console.log('Database user found:', userData);
                
                if (userData.success && userData.data && userData.data.id) {
                  setCurrentUserId(userData.data.id);
                  console.log('Successfully set user ID:', userData.data.id);
                } else {
                  throw new Error('Invalid user data structure');
                }
              } else {
                const errorData = await response.json();
                console.log('User lookup failed:', errorData);
                
                // If user not found in database, create them
                if (response.status === 404) {
                  console.log('User not found in database, creating new user...');
                  await createUserInDatabase(firebaseUser);
                } else {
                  throw new Error(errorData.error || 'Failed to fetch user data');
                }
              }
            } catch (fetchError) {
              console.error('Error fetching user data:', fetchError);
              setError(`Failed to load user data: ${fetchError.message}`);
            }
          } else {
            console.log('No authenticated user found');
            setAuthUser(null);
            setCurrentUserId(null);
            setError('Please log in to use the mood tracker');
          }
          setIsInitializing(false);
        });

        return () => unsubscribe();

        // Method 2: Using Custom Auth Context (uncomment if using custom auth)
        /*
        const { user, isAuthenticated } = useAuth();
        
        if (isAuthenticated && user) {
          if (user.id) {
            // If you already have the database user ID
            setCurrentUserId(user.id);
            console.log('Using user ID from auth context:', user.id);
          } else if (user.firebaseUid) {
            // If you have Firebase UID, fetch the database user ID
            await fetchUserByFirebaseUid(user.firebaseUid);
          }
        } else {
          setError('Please log in to use the mood tracker');
        }
        setIsInitializing(false);
        */

      } catch (error) {
        console.error('Error during user initialization:', error);
        setError(`Authentication error: ${error.message}`);
        setIsInitializing(false);
      }
    };

    initializeUser();
  }, []);

  // Helper function to create user in database if they don't exist
  const createUserInDatabase = async (firebaseUser) => {
    try {
      console.log('Creating user in database...');
      const response = await fetch('http://192.168.137.1:5000/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firebaseUid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName,
          photoURL: firebaseUser.photoURL,
          emailVerified: firebaseUser.emailVerified,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('User created successfully:', result);
        
        if (result.user && result.user.id) {
          setCurrentUserId(result.user.id);
          console.log('New user ID set:', result.user.id);
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create user');
      }
    } catch (error) {
      console.error('Error creating user in database:', error);
      setError(`Failed to create user account: ${error.message}`);
    }
  };

  // Helper function to fetch user by Firebase UID
  const fetchUserByFirebaseUid = async (firebaseUid) => {
    try {
      const response = await fetch(`http://192.168.137.1:5000/api/users/by-firebase/${firebaseUid}`);
      
      if (response.ok) {
        const userData = await response.json();
        if (userData.success && userData.data && userData.data.id) {
          setCurrentUserId(userData.data.id);
          console.log('User ID fetched:', userData.data.id);
        }
      } else {
        throw new Error('User not found in database');
      }
    } catch (error) {
      console.error('Error fetching user by Firebase UID:', error);
      setError(`Failed to fetch user: ${error.message}`);
    }
  };

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
      setError('Please log in to save your mood');
      Alert.alert('Authentication Required', 'Please log in to save your mood');
      return;
    }

    const moodName = EMOJIS[moodIndex].name;
    const moodMessage = MESSAGES[moodIndex];
    
    setIsSaving(true);
    setError(null);
    
    try {
      const moodData = {
        moodType: MOOD_TYPE_MAPPING[moodName],
        intensity: INTENSITY_MAPPING[MOOD_TYPE_MAPPING[moodName]], // Fixed mapping chain
        note: `Mood selected: ${moodMessage}`,
        userId: currentUserId,
      };

      console.log("Sending mood data for user:", currentUserId, moodData);

      const result = await MoodApiService.saveMoodEntry(moodData);
      
      if (result && result.success) {
        setCurrentMood(moodName);
        console.log("Mood saved successfully for user:", currentUserId, result.data);
        
        // Show success message
        setTimeout(() => {
          setCurrentMood(null);
        }, 2000);
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

  // Show authentication required message
  if (!isInitializing && !authUser) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={styles.authRequiredText}>Please log in to track your mood</Text>
      </View>
    );
  }

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      {/* Success message display */}
      {currentMood && (
        <View style={styles.successContainer}>
          <Text style={styles.successText}>Mood Saved! ✨</Text>
        </View>
      )}

      {/* Error display */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => setError(null)} style={styles.dismissButton}>
            <Text style={styles.dismissText}>×</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* User info display (optional - for debugging) */}
      {/* {currentUserId && (
        <View style={styles.userInfoContainer}>
          <Text style={styles.userInfoText}>
            Logged in as: {authUser?.email || 'User'} (ID: {currentUserId.slice(-6)})
          </Text>
        </View>
      )} */}

      {/* Donut background */}
      <View style={styles.donutContainer}>
        <View style={styles.outerHalfCircle} />
        <View style={styles.innerHalfCircle} />
      </View>

      {/* Needle pointing to selected mood */}
      <View style={styles.needleIcon}>
        <Needle width={60} height={80} />
      </View>

      {/* Selected mood display */}
<View style={styles.labelContainer}>
  <TouchableOpacity
    style={[
      styles.centerEmojiCircle,
      isSaving && styles.centerEmojiCircleDisabled // Only dim when saving
    ]}
    onPress={() => handleSaveMood(selectedIndex)}
    disabled={isSaving} // Only disable during saving, not during auth check
  >
    <Image source={EMOJIS[selectedIndex].image} style={[{ fontFamily: 'PlusJakartaSans' }, styles.labelEmoji]} />
    
    {/* Show loading only during save, not during auth init */}
    {isSaving && (
      <View style={styles.loadingOverlay}>
        <Text style={styles.loadingText}>...</Text>
      </View>
    )}
  </TouchableOpacity>
  
  <Text style={styles.labelMessage}>{MESSAGES[selectedIndex]}</Text>
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
             isInitializing ? 'Loading...' : 
             !currentUserId ? 'Please Log In' : 
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
    overflow: 'visible',       // <--- important
  position: 'relative',
  },
  labelContainer: {
    position: 'absolute',
    top: -205,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelEmoji: {
    width: 125,
    height: 125,
    resizeMode: 'contain',
    zIndex: 10
  },
  labelMessage: {
    fontSize: 25,
    fontWeight: 'bold',
    fontFamily: 'PlusJakartaSans',
    color: '#480b70ff',
    left: 2,
    marginTop: -19,
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
    borderWidth: 0.1,
    borderRadius: 24,
    shadowColor: '#5c4b8dff',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 5,
  },
  saveButtonText: {
    color: '#480b70ff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  saveButtonDisabled: {
    opacity: 0.6,
    backgroundColor: '#f0f0f0',
  },
  centerEmojiCircle: {
    width: 127,
    top: -31,
    height: 127,
    borderRadius: 62,
    borderWidth: 1.3,
    borderColor: '#030004ff',
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
    color: '#480b70ff',
    fontWeight: 'bold',
    zIndex: 0,
  },
  successContainer: {
    position: 'absolute',
    top: -550,
    left: 20,
    right: 20,
    backgroundColor: '#f3e5f5',
    borderColor: '#9c27b0',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    zIndex: 100,
    shadowColor: '#9c27b0',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },
  successText: {
    color: '#480b70ff',
    fontSize: 16,
    fontWeight: 'bold',
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
    elevation: 20,
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
  authRequiredText: {
    fontSize: 18,
    color: '#6A4E77',
    textAlign: 'center',
    marginHorizontal: 20,
  },
  userInfoContainer: {
    position: 'absolute',
    top: -280,
    left: 20,
    right: 20,
    backgroundColor: '#e8f5e8',
    borderRadius: 8,
    padding: 8,
    zIndex: 50,
  },
  userInfoText: {
    fontSize: 12,
    color: '#4caf50',
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
    backgroundColor: '#C295BC',
    position: 'absolute',
    top: -30,
    opacity: 0.35,
  },
  innerHalfCircle: {
    width: RADIUS * 1.5,
    height: RADIUS * 1.55,
    borderRadius: RADIUS * 0.8,
    backgroundColor: '#f6fff4ff',
    position: 'absolute',
    top: 40,
    opacity: 1,
  },
});