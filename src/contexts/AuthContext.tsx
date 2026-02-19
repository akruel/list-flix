import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import type { UserProfile } from '../types';
import { supabase } from '../lib/supabase';
import { authService } from '../services/auth';

export type AuthStatus = 'loading' | 'none' | 'anonymous' | 'authenticated';

interface AuthContextValue {
  status: AuthStatus;
  user: UserProfile | null;
  refreshProfile: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithOtp: (email: string) => Promise<void>;
  continueAsGuest: () => Promise<void>;
  signOutToGuest: () => Promise<void>;
  signOutFully: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<UserProfile | null>(null);
  const updateTokenRef = useRef(0);

  const applySession = useCallback(async (session: Session | null) => {
    const token = ++updateTokenRef.current;

    if (!session) {
      setUser(null);
      setStatus('none');
      return;
    }

    const profile = await authService.getUserProfile();

    if (token !== updateTokenRef.current) {
      return;
    }

    if (!profile) {
      setUser(null);
      setStatus('none');
      return;
    }

    setUser(profile);
    setStatus(profile.isAnonymous ? 'anonymous' : 'authenticated');
  }, []);

  const refreshProfile = useCallback(async () => {
    const profile = await authService.getUserProfile();
    if (!profile) {
      setUser(null);
      setStatus('none');
      return;
    }

    setUser(profile);
    setStatus(profile.isAnonymous ? 'anonymous' : 'authenticated');
  }, []);

  useEffect(() => {
    let active = true;

    const initialize = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!active) return;
      await applySession(session);
    };

    initialize();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      void applySession(session);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [applySession]);

  const value = useMemo<AuthContextValue>(() => ({
    status,
    user,
    refreshProfile,
    signInWithGoogle: () => authService.signInWithGoogle(),
    signInWithOtp: (email: string) => authService.signInWithOtp(email),
    continueAsGuest: () => authService.signInAnonymously().then(() => undefined),
    signOutToGuest: () => authService.signOutToGuest(),
    signOutFully: () => authService.signOutFully(),
  }), [refreshProfile, status, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
