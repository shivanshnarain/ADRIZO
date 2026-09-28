"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

export type User = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  role: string;
  avatar_url?: string | null;
};

export type AuthMode = 'SIGN_IN' | 'SIGN_UP' | 'FORGOT_PASSWORD' | 'PHONE_OTP';

type AuthContextType = {
  user: User | null;
  loading: boolean;
  isAuthModalOpen: boolean;
  authModalMode: AuthMode;
  authRedirectUrl: string | null;
  openAuthModal: (mode?: AuthMode, redirectUrl?: string, onSuccess?: () => void) => void;
  closeAuthModal: () => void;
  triggerAuthSuccess: () => void;
  broadcastAuthChange: (action: 'LOGIN' | 'LOGOUT') => void;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  logout: () => Promise<void>;
  fetchUser: (force?: boolean) => Promise<void>;
  updateProfile: (profileData: Partial<User>) => Promise<{ success: boolean; error?: string }>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  isAuthModalOpen: false,
  authModalMode: 'SIGN_IN',
  authRedirectUrl: null,
  openAuthModal: () => {},
  closeAuthModal: () => {},
  triggerAuthSuccess: () => {},
  broadcastAuthChange: () => {},
  setUser: () => {},
  logout: async () => {},
  fetchUser: async () => {},
  updateProfile: async () => ({ success: false }),
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<AuthMode>('SIGN_IN');
  const [authRedirectUrl, setAuthRedirectUrl] = useState<string | null>(null);
  const authSuccessCallbackRef = React.useRef<(() => void) | null>(null);

  const broadcastAuthChange = useCallback((action: 'LOGIN' | 'LOGOUT') => {
    if (typeof window === 'undefined') return;
    try {
      if ('BroadcastChannel' in window) {
        const bc = new BroadcastChannel('adrizo_auth_channel');
        bc.postMessage({ type: 'AUTH_CHANGED', action, timestamp: Date.now() });
        bc.close();
      }
      localStorage.setItem('adrizo_auth_sync', JSON.stringify({ action, timestamp: Date.now() }));
    } catch {}
  }, []);

  const openAuthModal = useCallback((mode: AuthMode = 'SIGN_IN', redirectUrl?: string, onSuccess?: () => void) => {
    setAuthModalMode(mode);
    if (redirectUrl !== undefined) {
      setAuthRedirectUrl(redirectUrl);
    }
    if (onSuccess) {
      authSuccessCallbackRef.current = onSuccess;
    } else {
      authSuccessCallbackRef.current = null;
    }
    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
    authSuccessCallbackRef.current = null;
  }, []);

  const triggerAuthSuccess = useCallback(() => {
    if (authSuccessCallbackRef.current) {
      const cb = authSuccessCallbackRef.current;
      authSuccessCallbackRef.current = null;
      cb();
    }
  }, []);

  const inFlightFetchRef = React.useRef<Promise<void> | null>(null);
  const lastFetchTimeRef = React.useRef<number>(0);

  const fetchUser = useCallback(async (force = false) => {
    // If not forced and already fetched within last 15 seconds, reuse existing state
    if (!force && lastFetchTimeRef.current && (Date.now() - lastFetchTimeRef.current < 15000)) {
      return;
    }

    // Deduplicate concurrent in-flight requests: return existing active Promise
    if (inFlightFetchRef.current) {
      return inFlightFetchRef.current;
    }

    const fetchPromise = (async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data.authenticated) {
            setUser(data.user);
          } else {
            setUser(null);
          }
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      } finally {
        lastFetchTimeRef.current = Date.now();
        inFlightFetchRef.current = null;
        setLoading(false);
      }
    })();

    inFlightFetchRef.current = fetchPromise;
    return fetchPromise;
  }, []);

  useEffect(() => {
    // Initial authoritative fetch on mount
    fetchUser(true);

    // Cross-tab synchronization via BroadcastChannel
    let bc: BroadcastChannel | null = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        bc = new BroadcastChannel('adrizo_auth_channel');
        bc.onmessage = (e) => {
          if (e.data?.type === 'AUTH_CHANGED') {
            if (e.data.action === 'LOGIN') {
              lastFetchTimeRef.current = 0;
              fetchUser(true);
            } else if (e.data.action === 'LOGOUT') {
              setUser(null);
            }
          }
        };
      } catch {}
    }

    // Cross-tab synchronization via storage event fallback
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'adrizo_auth_sync' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed.action === 'LOGIN') {
            lastFetchTimeRef.current = 0;
            fetchUser(true);
          } else if (parsed.action === 'LOGOUT') {
            setUser(null);
          }
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorage);

    // Listen to Supabase Auth state changes for real-time reactivity
    let unsubscribeSupabase: (() => void) | undefined;
    try {
      const supabase = createClient();
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
          lastFetchTimeRef.current = 0;
          fetchUser(true);
        }
      });
      unsubscribeSupabase = () => subscription?.unsubscribe();
    } catch (e) {
      console.warn('[Supabase Auth Listener Init]', e);
    }

    // Visibility change listener for cross-tab return (throttled to 15s)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchUser(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      bc?.close();
      window.removeEventListener('storage', handleStorage);
      unsubscribeSupabase?.();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchUser]);

  const logout = async () => {
    try {
      broadcastAuthChange('LOGOUT');
      try {
        const supabase = createClient();
        await supabase.auth.signOut();
      } catch {}
      try {
        const { auth } = await import('@/lib/firebase');
        if (auth) await auth.signOut();
      } catch {}
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      window.location.href = '/';
    } catch (error) {
      console.error('Logout error', error);
      window.location.href = '/';
    }
  };

  const updateProfile = async (profileData: Partial<User>) => {
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: profileData.name,
          phone: profileData.phone,
          delivery_address: profileData.address,
          city: profileData.city,
          state: profileData.state,
          pincode: profileData.pincode,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        await fetchUser();
        broadcastAuthChange('LOGIN');
        return { success: true };
      }
      return { success: false, error: data.error || 'Failed to update profile' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error' };
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      isAuthModalOpen,
      authModalMode,
      authRedirectUrl,
      openAuthModal,
      closeAuthModal,
      triggerAuthSuccess,
      broadcastAuthChange,
      setUser,
      logout,
      fetchUser,
      updateProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
