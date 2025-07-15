import { createContext, useContext, useEffect, useState } from 'react';

// Create the context
const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Mock AuthProvider
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate a logged-in user
    const fakeUser = {
      uid: 'mock-uid-123',
      email: 'mockuser@example.com',
      displayName: 'Mock User',
      photoURL: null,
      emailVerified: true,
    };

    setTimeout(() => {
      setUser(fakeUser);
      setLoading(false);
    }, 500); // Simulate delay
  }, []);

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    login: async () => {}, // prevent .then crash
    signup: async () => {},
    logout: async () => setUser(null),
    signInWithGoogle: async () => {},
    syncUserProfile: async () => {},
    getUserFromMongoDB: async () => ({}),
    retrySync: async () => {},
    testBackendConnection: async () => ({ status: 'ok' }),
    syncStatus: 'mock',
    syncError: null,
    error: null,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
