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
      (user) => {
        console.log('Auth state changed:', user?.email || 'No user');
        setUser(user);
        setLoading(false);
        setError(null);
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
          saveUserToMongoDB(result.user);
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
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      await saveUserToMongoDB(userCredential.user);
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
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await saveUserToMongoDB(userCredential.user, additionalData);
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
      await promptAsync();
    } catch (error) {
      console.error('Google sign-in prompt error:', error);
      const errorMessage = 'Failed to initiate Google sign-in';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  // Logout
  const logout = async () => {
    try {
      if (!auth) {
        throw new Error('Firebase auth is not initialized');
      }
      
      setError(null);
      await signOut(auth);
    } catch (error) {
      console.error('Logout error:', error);
      const errorMessage = 'Failed to sign out';
      setError(errorMessage);
      throw new Error(errorMessage);
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

  // Save user data to MongoDB
  const saveUserToMongoDB = async (firebaseUser, additionalData = {}) => {
    try {
      const userData = {
        firebaseUid: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.displayName || additionalData.name,
        photoURL: firebaseUser.photoURL,
        phone: additionalData.phone || null,
        createdAt: new Date(),
        lastLogin: new Date()
      };

      console.log('Attempting to save user to MongoDB:', userData.email);

      // Only try to save to MongoDB if backend URL is set
      if (process.env.EXPO_PUBLIC_BACKEND_URL) {
        const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/users`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(userData),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.warn(`Failed to save user data to MongoDB: ${errorText}`);
          // Don't throw error - user can still be authenticated
        } else {
          console.log('User data saved to MongoDB successfully');
        }
      } else {
        console.log('Backend URL not set, skipping MongoDB save');
      }
    } catch (error) {
      console.error('Error saving user to MongoDB:', error);
      // Don't throw error here - user can still be authenticated even if MongoDB save fails
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
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};