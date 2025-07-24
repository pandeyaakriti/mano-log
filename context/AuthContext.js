// Enhanced AuthContext.js with improved debugging and sync reliability

import * as AuthSession from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';

import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import { createContext, useContext, useEffect, useState } from 'react';
import { auth } from '../config/firebase';

console.log('Redirect URI:', AuthSession.makeRedirectUri({ useProxy: true }));
WebBrowser.maybeCompleteAuthSession();

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [syncStatus, setSyncStatus] = useState('idle'); // 'idle', 'syncing', 'success', 'error'
  const [syncError, setSyncError] = useState(null); // Separate error for sync issues

  // Google Sign-In configuration
  const [, response, promptAsync] = Google.useAuthRequest({
    expoClientId: process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  });

  useEffect(() => {
    if (!auth) {
      console.error('Firebase auth is not initialized');
      setError('Firebase auth is not initialized');
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(
      auth, 
      async (user) => {
        console.log('Auth state changed:', user?.email || 'No user');
        setUser(user);
        setLoading(false);
        setError(null);
        
        // Sync user on auth state change if user exists
        if (user) {
          console.log('User authenticated, attempting sync to Prisma...');
          try {
            await saveUserToMongoDB(user);
            console.log('✅ User successfully synced to Prisma');
          } catch (syncError) {
            console.error('❌ Failed to sync user to Prisma:', syncError);
            setSyncError(syncError.message);
          }
        } else {
          setSyncStatus('idle');
          setSyncError(null);
        }
      }, 
      (error) => {
        console.error('Auth state change error:', error);
        setError(error.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  // Handle Google Sign-In response
  useEffect(() => {
    if (response?.type === 'success') {
      const { authentication } = response;
      const credential = GoogleAuthProvider.credential(
        authentication.idToken,
        authentication.accessToken
      );
      
      signInWithCredential(auth, credential)
        .then((result) => {
          console.log('Google sign-in successful:', result.user.email);
          // saveUserToMongoDB is called in onAuthStateChanged
        })
        .catch((error) => {
          console.error('Google sign-in error:', error);
          setError(error.message);
        });
    } else if (response?.type === 'error') {
      console.error('Google auth error:', response.error);
      setError(response.error?.message || 'Google authentication failed');
    }
  }, [response]);

  // Email/Password Login
  const login = async (email, password) => {
    try {
      if (!auth) {
        throw new Error('Firebase auth is not initialized');
      }
      
      setError(null);
      setSyncError(null);
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      // saveUserToMongoDB is called in onAuthStateChanged
      return userCredential;
    } catch (error) {
      console.error('Login error:', error);
      const errorMessage = getFirebaseErrorMessage(error);
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // Email/Password Signup
  const signup = async (email, password, additionalData = {}) => {
    try {
      if (!auth) {
        throw new Error('Firebase auth is not initialized');
      }
      
      setError(null);
      setSyncError(null);
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      // Pass additional data for new user creation
      await saveUserToMongoDB(userCredential.user, additionalData, true);
      return userCredential;
    } catch (error) {
      console.error('Signup error:', error);
      const errorMessage = getFirebaseErrorMessage(error);
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // Google Sign-In
  const signInWithGoogle = async () => {
    try {
      if (!auth) {
        throw new Error('Firebase auth is not initialized');
      }
      
      setError(null);
      setSyncError(null);
      await promptAsync();
    } catch (error) {
      console.error('Google sign-in prompt error:', error);
      const errorMessage = 'Failed to initiate Google sign-in';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // Logout
  // const logout = async () => {
  //   try {
  //     if (!auth) {
  //       throw new Error('Firebase auth is not initialized');
  //     }
      
  //     setError(null);
  //     setSyncError(null);
  //     setSyncStatus('idle');
  //     await signOut(auth);
  //   } catch (error) {
  //     console.error('Logout error:', error);
  //     const errorMessage = 'Failed to sign out';
  //     setError(errorMessage);
  //     throw new Error(errorMessage);
  //   }
  // };
  const logout = async () => {
  try {
    await signOut(auth); // Firebase signOut
    // Clear any stored user data
    // Navigate to login page
    router.replace('/auth/login');
  } catch (error) {
    throw error;
  }
};

  // Enhanced function to sync user profile data
  const syncUserProfile = async (profileData) => {
    if (!user) {
      throw new Error('No authenticated user');
    }

    try {
      setSyncStatus('syncing');
      setSyncError(null);
      
      const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
      if (!backendUrl) {
        throw new Error('Backend URL not configured in environment variables');
      }

      console.log('Syncing user profile to:', `${backendUrl}/api/users/${user.uid}`);

      const response = await fetch(`${backendUrl}/api/users/${user.uid}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...profileData,
          lastUpdated: new Date().toISOString()
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      setSyncStatus('success');
      console.log('✅ User profile synced successfully:', result);
      return result;
    } catch (error) {
      console.error('❌ Error syncing user profile:', error);
      setSyncStatus('error');
      setSyncError(error.message);
      throw error;
    }
  };

  // Function to get user data from MongoDB
  const getUserFromMongoDB = async (firebaseUid) => {
    try {
      const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
      if (!backendUrl) {
        console.warn('Backend URL not configured');
        return null;
      }

      console.log('Fetching user from Prisma:', `${backendUrl}/api/users/${firebaseUid}`);

      const response = await fetch(`${backendUrl}/api/users/${firebaseUid}`);
      
      if (response.ok) {
        const userData = await response.json();
        console.log('✅ User fetched from Prisma:', userData.email);
        return userData;
      } else if (response.status === 404) {
        console.log('User not found in Prisma database');
        return null;
      } else {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
    } catch (error) {
      console.error('❌ Error fetching user from Prisma:', error);
      return null;
    }
  };

  // Helper function to convert Firebase errors to user-friendly messages
  const getFirebaseErrorMessage = (error) => {
    switch (error.code) {
      case 'auth/user-not-found':
        return 'No account found with this email address';
      case 'auth/wrong-password':
        return 'Incorrect password';
      case 'auth/email-already-in-use':
        return 'An account with this email already exists';
      case 'auth/weak-password':
        return 'Password should be at least 6 characters';
      case 'auth/invalid-email':
        return 'Please enter a valid email address';
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Please try again later';
      case 'auth/network-request-failed':
        return 'Network error. Please check your connection';
      default:
        return error.message || 'An unexpected error occurred';
    }
  };

  // Enhanced save user data to MongoDB with better error handling
  const saveUserToMongoDB = async (firebaseUser, additionalData = {}, isNewUser = false) => {
    setSyncStatus('syncing');
    setSyncError(null);
    
    try {
      const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
      
      // Check if backend URL is configured
      if (!backendUrl) {
        throw new Error('EXPO_PUBLIC_BACKEND_URL is not configured in environment variables');
      }

      console.log('🔄 Attempting to save user to Prisma...');
      console.log('Backend URL:', backendUrl);
      console.log('User email:', firebaseUser.email);
      console.log('Is new user:', isNewUser);

      const userData = {
        firebaseUid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName || additionalData.name || null,
        photoURL: firebaseUser.photoURL || null,
        phone: additionalData.phone || null,
        emailVerified: firebaseUser.emailVerified,
        lastLogin: new Date().toISOString(),
        ...additionalData
      };

      // Add createdAt only for new users
      if (isNewUser) {
        userData.createdAt = new Date().toISOString();
      }

      // Remove undefined values
      Object.keys(userData).forEach(key => 
        userData[key] === undefined && delete userData[key]
      );

      console.log('Payload being sent:', JSON.stringify(userData, null, 2));

      const response = await fetch(`${backendUrl}/api/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Server response:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ User saved to Prisma successfully:', result);
      
      setSyncStatus('success');
      return result;
    } catch (error) {
      console.error('❌ Error saving user to Prisma:', error);
      setSyncStatus('error');
      setSyncError(error.message);
      
      // For debugging: log the full error
      console.error('Full error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      
      // Re-throw the error so calling code can handle it
      throw error;
    }
  };

  // Function to retry failed sync operations
  const retrySync = async () => {
    if (user) {
      console.log('🔄 Retrying sync for user:', user.email);
      try {
        await saveUserToMongoDB(user);
        console.log('✅ Retry sync successful');
      } catch (error) {
        console.error('❌ Retry sync failed:', error);
        throw error;
      }
    } else {
      throw new Error('No user to sync');
    }
  };

  // Function to test backend connectivity
  const testBackendConnection = async () => {
    try {
      const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
      if (!backendUrl) {
        throw new Error('Backend URL not configured');
      }

      console.log('Testing backend connection:', `${backendUrl}/health`);
      
      const response = await fetch(`${backendUrl}/health`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      console.log('✅ Backend connection successful:', result);
      return result;
    } catch (error) {
      console.error('❌ Backend connection failed:', error);
      throw error;
    }
  };

  const value = {
    user,
    login,
    signup,
    signInWithGoogle,
    logout,
    loading,
    error,
    syncStatus,
    syncError, // Separate sync error
    isAuthenticated: !!user,
    syncUserProfile,
    getUserFromMongoDB,
    retrySync,
    testBackendConnection // New function to test connectivity
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};