import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserProfile } from '../types';
import { auth, socialSignIn, logout as firebaseLogout, syncUserProfile, googleProvider } from '../lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

interface AuthContextType {
  user: any | null;
  profile: UserProfile | null;
  loading: boolean;
  login: () => Promise<{ success: boolean; message: string }>;
  register: (email: string, password: string, name: string) => Promise<{ success: boolean; message: string }>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  profile: null, 
  loading: true,
  login: async () => ({ success: false, message: '' }),
  register: async () => ({ success: false, message: '' }),
  updateProfile: async () => {},
  logout: () => {}
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const userProfile = await syncUserProfile(firebaseUser);
          setProfile(userProfile);
        } catch (error) {
          console.error("Error syncing profile:", error);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async () => {
    try {
      const result = await socialSignIn(googleProvider);
      setUser(result.user);
      setProfile(result.profile);
      return { success: true, message: 'Logged in successfully' };
    } catch (error: any) {
      console.error("Login Error:", error);
      return { success: false, message: error.message || 'Login failed' };
    }
  };

  // Mock register for compatibility if needed, but we mostly use socialSignIn now
  const register = async (email: string, password: string, name: string) => {
    return { success: false, message: 'Please use Google Login' };
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    if (!user) return;
    
    // In a real app, this would update Firestore. lib/firebase.ts has updateUserProfile.
    // For now we just update local state if needed, but lib/firebase.ts should be the source of truth.
    setProfile(prev => prev ? { ...prev, ...data } : null);
  };

  const handleLogout = async () => {
    await firebaseLogout();
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, register, updateProfile, logout: handleLogout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
