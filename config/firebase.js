// config/firebase.js (mocked for UI testing)
export const auth = {
  currentUser: null,
  signInWithEmailAndPassword: async (email, password) => {
    auth.currentUser = { email, uid: 'mock-uid', emailVerified: true };
    return { user: auth.currentUser };
  },
  createUserWithEmailAndPassword: async (email, password) => {
    auth.currentUser = { email, uid: 'mock-uid', emailVerified: false };
    return { user: auth.currentUser };
  },
  signOut: async () => {
    auth.currentUser = null;
  },
  onAuthStateChanged: (callback) => {
    setTimeout(() => callback(auth.currentUser), 500); // Simulate async
    return () => {}; // noop unsubscribe
  },
};
