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

export type AuthMode = 'SIGN_IN' | 'SIGN_UP' | 'FORGOT_PASSWORD';

type AuthContextType = {
  user: User | null;
  loading: boolean;
  isAuthModalOpen: boolean;
  authModalMode: AuthMode;
  authRedirectUrl: string | null;
  openAuthModal: (mode?: AuthMode, redirectUrl?: string) => void;
  closeAuthModal: () => void;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>;
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

  const openAuthModal = useCallback((mode: AuthMode = 'SIGN_IN', redirectUrl?: string) => {
    setAuthModalMode(mode);
    if (redirectUrl !== undefined) {
      setAuthRedirectUrl(redirectUrl);
    }
    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
  }, []);

  const fetchUser = useCallback(async () => {
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
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();

    // Listen to Supabase Auth state changes for real-time reactivity
    let unsubscribeSupabase: (() => void) | undefined;
    try {
      const supabase = createClient();
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
          fetchUser();
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
        }
      });
      unsubscribeSupabase = () => subscription?.unsubscribe();
    } catch (e) {
      console.warn('[Supabase Auth Listener Init]', e);
    }

    // Window focus and visibility change listener for instant cross-tab sync
    const handleSync = () => {
      if (document.visibilityState === 'visible') {
        fetchUser();
      }
    };

    window.addEventListener('focus', handleSync);
    document.addEventListener('visibilitychange', handleSync);

    return () => {
      unsubscribeSupabase?.();
      window.removeEventListener('focus', handleSync);
      document.removeEventListener('visibilitychange', handleSync);
    };
  }, [fetchUser]);

  const logout = async () => {
    try {
      try {
        const supabase = createClient();
        await supabase.auth.signOut();
      } catch {
        // Ignored
      }
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
