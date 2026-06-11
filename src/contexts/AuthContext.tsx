import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { loginUser, logoutUser, UserProfile, isFirebaseConfigured, auth } from '@/firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';

interface AuthContextType {
  isAuthenticated: boolean;
  user: UserProfile | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const stored = sessionStorage.getItem('billing_user');
    return stored ? JSON.parse(stored) : null;
  });
  const [loading, setLoading] = useState(true);
  const isInitialMount = useRef(true);

  // Sync auth state if using real Firebase
  useEffect(() => {
    if (isFirebaseConfigured && auth) {
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          try {
            const stored = sessionStorage.getItem('billing_user');
            if (stored) {
              const parsed = JSON.parse(stored);
              if (parsed.uid === firebaseUser.uid) {
                setUser(parsed);
                setLoading(false);
                isInitialMount.current = false;
                return;
              }
            } else if (isInitialMount.current) {
              // ONLY on initial mount (app open): if no sessionStorage, sign them out of Firebase
              isInitialMount.current = false;
              await signOut(auth);
              setUser(null);
              setLoading(false);
              return;
            }
            
            // If they are logging in right now (not initial mount), let the login action handle it
            if (!isInitialMount.current) {
              setLoading(false);
              return;
            }

            // Fallback default profile creation on initial load
            const defaultProfile: UserProfile = {
              uid: firebaseUser.uid,
              name: firebaseUser.displayName || 'User',
              email: firebaseUser.email || '',
              role: (firebaseUser.email?.includes('superadmin') ? 'superadmin' : 'admin') as any,
              createdAt: new Date().toISOString()
            };
            setUser(defaultProfile);
            sessionStorage.setItem('billing_user', JSON.stringify(defaultProfile));
          } catch (err) {
            console.error("Error restoring user profile:", err);
          }
        } else {
          // Firebase says no user logged in — clear session
          setUser(null);
          sessionStorage.removeItem('billing_user');
        }
        isInitialMount.current = false;
        setLoading(false);
      });
      return unsubscribe;
    } else {
      setLoading(false);
    }
  }, []); // Run once on mount only

  const login = useCallback(async (email: string, password: string) => {
    try {
      setLoading(true);
      const profile = await loginUser(email, password);
      setUser(profile);
      sessionStorage.setItem('billing_user', JSON.stringify(profile));
      return true;
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      setLoading(true);
      await logoutUser();
      setUser(null);
      sessionStorage.removeItem('billing_user');
      // Force redirect to login — ensures no panel flickers after logout
      window.location.replace('/login');
    } catch (error) {
      console.error('Logout failed:', error);
      setLoading(false);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated: !!user, user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
