import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { fetchUserByAuthId } from './db';
import { useStore } from '../store/useStore';
import type { User } from '../types';

interface AuthContextValue {
  supabaseUser: SupabaseUser | null;
  appUser: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [appUser, setAppUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const initializedForRef = useRef<string | null>(null);
  const storeLogin = useStore(state => state.login);
  const storeLogout = useStore(state => state.logout);
  const initSupabase = useStore(state => state.initSupabase);

  useEffect(() => {
    const resolveUser = async (authUser: SupabaseUser | null) => {
      setSupabaseUser(authUser);
      if (!authUser?.email) {
        initializedForRef.current = null;
        setAppUser(null);
        storeLogout();
        setLoading(false);
        return;
      }
      try {
        const profile = await fetchUserByAuthId(authUser.id);
        if (!profile) {
          initializedForRef.current = null;
          await supabase.auth.signOut();
          return;
        }
        setAppUser(profile);
        // Populate currentUser immediately — portal pages read it before the
        // users fetch inside initSupabase resolves.
        useStore.setState({ currentUser: profile, activeSiteId: profile.siteId ?? null });
        if (initializedForRef.current !== profile.id) {
          initializedForRef.current = profile.id;
          // Fire-and-forget: the shell renders immediately; data streams in
          // via realtime subscriptions. The /login route redirects itself.
          void initSupabase(profile.id);
        } else {
          storeLogin(profile.id);
        }
      } catch (error) {
        console.error('[auth] failed to load profile or data:', error);
        initializedForRef.current = null;
        setAppUser(null);
        await supabase.auth.signOut().catch(() => undefined);
      } finally {
        setLoading(false);
      }
    };

    void supabase.auth.getUser().then(({ data }) => resolveUser(data.user));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => { void resolveUser(session?.user ?? null); });
    return () => data.subscription.unsubscribe();
  }, [initSupabase, storeLogin, storeLogout]);

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/login` });
    if (error) throw error;
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  return <AuthContext.Provider value={{ supabaseUser, appUser, loading, login, resetPassword, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
