import { createContext, useState, useEffect } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updatePassword as firebaseUpdatePassword,
  updateProfile,
} from 'firebase/auth';
import { auth } from '../lib/firebaseClient';

const normalizeSession = (user) => (user ? { user } : null);

export const AuthContext = createContext({
  user: null,
  session: null,
  loading: true,
  signUp: async () => ({ data: { user: null, session: null }, error: null }),
  signIn: async () => ({ data: { user: null, session: null }, error: null }),
  signOut: async () => ({ error: null }),
  resetPassword: async () => ({ error: null }),
  updatePassword: async () => ({ error: null }),
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return undefined;
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setSession(normalizeSession(currentUser));
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signUp = async (email, password, fullName) => {
    try {
      if (!auth) {
        throw new Error('Firebase is not configured. Add VITE_FIREBASE_* values in .env.local.');
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);

      if (fullName) {
        await updateProfile(userCredential.user, { displayName: fullName });
      }

      return {
        data: {
          user: userCredential.user,
          session: normalizeSession(userCredential.user),
        },
        error: null,
      };
    } catch (error) {
      return {
        data: { user: null, session: null },
        error,
      };
    }
  };

  const signIn = async (email, password) => {
    try {
      if (!auth) {
        throw new Error('Firebase is not configured. Add VITE_FIREBASE_* values in .env.local.');
      }

      const userCredential = await signInWithEmailAndPassword(auth, email, password);

      return {
        data: {
          user: userCredential.user,
          session: normalizeSession(userCredential.user),
        },
        error: null,
      };
    } catch (error) {
      return {
        data: { user: null, session: null },
        error,
      };
    }
  };

  const signOut = async () => {
    try {
      if (!auth) {
        return { error: null };
      }

      await firebaseSignOut(auth);
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const resetPassword = async (email, redirectTo) => {
    try {
      if (!auth) {
        throw new Error('Firebase is not configured. Add VITE_FIREBASE_* values in .env.local.');
      }

      await sendPasswordResetEmail(auth, email, redirectTo ? { url: redirectTo } : undefined);
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const updatePassword = async (newPassword) => {
    try {
      if (!auth || !auth.currentUser) {
        throw new Error('No authenticated user found.');
      }

      await firebaseUpdatePassword(auth.currentUser, newPassword);
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
