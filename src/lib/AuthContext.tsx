import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  onAuthStateChanged, signInWithEmailAndPassword,
  signOut, type User as FirebaseUser,
} from 'firebase/auth';
import { auth } from './firebase';
import { fetchUserByEmail } from './firestore';
import { useStore } from '../store/useStore';
import type { User } from '../types';

const ROLE_ROUTES: Record<string, string> = {
  facility_manager: '/fm',
  procurement: '/procurement',
  supervisor: '/supervisor',
  finance: '/finance',
  admin: '/admin',
};

interface AuthContextValue {
  firebaseUser: FirebaseUser | null;
  appUser: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [appUser, setAppUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const storeLogin = useStore(s => s.login);
  const storeLogout = useStore(s => s.logout);
  const initFirebase = useStore(s => s.initFirebase);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser?.email) {
        const user = await fetchUserByEmail(fbUser.email);
        setAppUser(user);
        if (user) {
          storeLogin(user.id);
          const route = ROLE_ROUTES[user.role] ?? '/login';
          if (window.location.pathname === '/login') {
            window.history.pushState({}, '', route);
            window.dispatchEvent(new PopStateEvent('popstate'));
          }
        }
      } else {
        setAppUser(null);
        storeLogout();
      }
      setLoading(false);
    });
    return unsub;
  }, [storeLogin, storeLogout]);

  useEffect(() => {
    initFirebase();
  }, [initFirebase]);

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ firebaseUser, appUser, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
