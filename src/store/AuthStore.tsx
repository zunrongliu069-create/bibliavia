import AsyncStorage from '@react-native-async-storage/async-storage';
import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import type { Session } from '@supabase/supabase-js';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

WebBrowser.maybeCompleteAuthSession();

const GUEST_ID_KEY = 'scriptora/guest-id/v1';
const newGuestId = () => `guest-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;

type SyncStatus = 'local' | 'synced' | 'syncing' | 'offline';
type AuthResult = Promise<string | null>;

interface AuthStoreValue {
  ready: boolean;
  configured: boolean;
  session: Session | null;
  userId: string | null;
  guest: boolean;
  syncStatus: SyncStatus;
  signInWithEmail: (email: string, password: string) => AuthResult;
  signUpWithEmail: (email: string, password: string, displayName: string) => AuthResult;
  resendConfirmation: (email: string) => AuthResult;
  signInWithProvider: (provider: 'google' | 'apple') => AuthResult;
  signOut: () => AuthResult;
  deleteAccount: () => AuthResult;
}

const AuthStore = createContext<AuthStoreValue | null>(null);

export function AuthStoreProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [guestId, setGuestId] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(GUEST_ID_KEY)
      .then(async (saved) => {
        const id = saved ?? newGuestId();
        if (!saved) await AsyncStorage.setItem(GUEST_ID_KEY, id);
        setGuestId(id);
        if (supabase) {
          const result = await supabase.auth.getSession();
          setSession(result.data.session);
        }
      })
      .finally(() => setReady(true));
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    if (!supabase) return 'Cloud accounts are not configured yet.';
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    return error?.message ?? null;
  }, []);

  const signUpWithEmail = useCallback(
    async (email: string, password: string, displayName: string) => {
      if (!supabase) return 'Cloud accounts are not configured yet.';
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: makeRedirectUri({ scheme: 'scriptora' }),
          data: { name: displayName.trim() },
        },
      });
      if (error) {
        const message = error.message.toLowerCase();
        if (message.includes('database error') || message.includes('unexpected_failure'))
          return 'The account was probably already created. Check your confirmation email or log in.';
        return error.message;
      }
      return data.session ? null : 'Check your email and confirm the account, then log in.';
    },
    [],
  );

  const resendConfirmation = useCallback(async (email: string) => {
    if (!supabase) return 'Cloud accounts are not configured yet.';
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim(),
      options: { emailRedirectTo: makeRedirectUri({ scheme: 'scriptora' }) },
    });
    return error?.message ?? 'Confirmation email sent.';
  }, []);

  const signInWithProvider = useCallback(async (provider: 'google' | 'apple') => {
    if (!supabase) return 'Cloud accounts are not configured yet.';
    const redirectTo = makeRedirectUri({ scheme: 'scriptora' });
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo, skipBrowserRedirect: Platform.OS !== 'web' },
    });
    if (error) return error.message;
    if (Platform.OS === 'web') return null;
    if (!data.url) return 'The sign-in provider did not return a login URL.';
    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type !== 'success')
      return result.type === 'cancel' ? null : 'Sign-in was interrupted.';
    const code = new URL(result.url).searchParams.get('code');
    if (!code) return 'The sign-in response did not contain an authorization code.';
    const exchange = await supabase.auth.exchangeCodeForSession(code);
    return exchange.error?.message ?? null;
  }, []);

  const signOut = useCallback(async () => {
    if (!supabase) return null;
    const { error } = await supabase.auth.signOut();
    return error?.message ?? null;
  }, []);

  const deleteAccount = useCallback(async () => {
    if (!supabase || !session) return 'You must be logged in.';
    const { error } = await supabase.functions.invoke('delete-account');
    if (error) return error.message;
    await AsyncStorage.removeItem(`scriptora/state/v2/${session.user.id}`);
    await supabase.auth.signOut({ scope: 'local' });
    return null;
  }, [session]);

  const value = useMemo<AuthStoreValue>(
    () => ({
      ready,
      configured: isSupabaseConfigured,
      session,
      userId: session?.user.id ?? guestId,
      guest: !session,
      syncStatus: session ? 'synced' : 'local',
      signInWithEmail,
      signUpWithEmail,
      resendConfirmation,
      signInWithProvider,
      signOut,
      deleteAccount,
    }),
    [
      ready,
      session,
      guestId,
      signInWithEmail,
      signUpWithEmail,
      resendConfirmation,
      signInWithProvider,
      signOut,
      deleteAccount,
    ],
  );
  return <AuthStore.Provider value={value}>{children}</AuthStore.Provider>;
}

export function useAuthStore(): AuthStoreValue {
  const value = useContext(AuthStore);
  if (!value) throw new Error('useAuthStore must be used inside AuthStoreProvider');
  return value;
}
