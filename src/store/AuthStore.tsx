import AsyncStorage from '@react-native-async-storage/async-storage';
import { makeRedirectUri } from 'expo-auth-session';
import type { Session } from '@supabase/supabase-js';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Linking } from 'react-native';
import { playerIdFor } from '../lib/bibliaviaId';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

const GUEST_ID_KEY = 'bibliavia/guest-id/v1';
const ACCOUNTS_KEY = 'bibliavia/accounts/v1';
const newGuestId = () => `guest-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;

type SyncStatus = 'local' | 'synced' | 'syncing' | 'offline';
type AuthResult = Promise<string | null>;
export type EmailCodeMode = 'connect' | 'login';

interface StoredAccount {
  userId: string;
  email: string;
  accessToken: string;
  refreshToken: string;
}

export interface SavedAccount {
  userId: string;
  email: string;
  playerId: string;
}

interface AuthStoreValue {
  ready: boolean;
  configured: boolean;
  session: Session | null;
  userId: string | null;
  playerId: string | null;
  guest: boolean;
  syncStatus: SyncStatus;
  savedAccounts: SavedAccount[];
  requestEmailCode: (email: string, mode: EmailCodeMode) => AuthResult;
  verifyEmailCode: (email: string, code: string, mode: EmailCodeMode) => AuthResult;
  switchAccount: (userId: string) => AuthResult;
  forgetAccount: (userId: string) => Promise<void>;
  signOut: () => AuthResult;
  deleteAccount: () => AuthResult;
}

const AuthStore = createContext<AuthStoreValue | null>(null);

const readAccounts = async (): Promise<StoredAccount[]> => {
  const raw = await AsyncStorage.getItem(ACCOUNTS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as StoredAccount[];
  } catch {
    return [];
  }
};

export function AuthStoreProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [guestId, setGuestId] = useState<string | null>(null);
  const [storedAccounts, setStoredAccounts] = useState<StoredAccount[]>([]);

  const rememberSession = useCallback(async (next: Session | null) => {
    if (!next?.user.email || next.user.is_anonymous) return;
    const accounts = await readAccounts();
    const saved: StoredAccount = {
      userId: next.user.id,
      email: next.user.email,
      accessToken: next.access_token,
      refreshToken: next.refresh_token,
    };
    const updated = [...accounts.filter((item) => item.userId !== saved.userId), saved];
    await AsyncStorage.setItem(ACCOUNTS_KEY, JSON.stringify(updated));
    setStoredAccounts(updated);
  }, []);

  useEffect(() => {
    let active = true;
    const initialize = async () => {
      const savedGuest = await AsyncStorage.getItem(GUEST_ID_KEY);
      const id = savedGuest ?? newGuestId();
      if (!savedGuest) await AsyncStorage.setItem(GUEST_ID_KEY, id);
      const accounts = await readAccounts();
      let nextSession: Session | null = null;
      if (supabase) {
        nextSession = (await supabase.auth.getSession()).data.session;
        if (!nextSession) {
          const anonymous = await supabase.auth.signInAnonymously();
          nextSession = anonymous.data.session;
        }
      }
      if (!active) return;
      setGuestId(id);
      setStoredAccounts(accounts);
      setSession(nextSession);
      await rememberSession(nextSession);
      setReady(true);
    };
    void initialize();
    if (!supabase)
      return () => {
        active = false;
      };
    const client = supabase;
    const { data } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      void rememberSession(nextSession);
    });
    const openLink = async (url: string | null) => {
      const code = url ? new URL(url).searchParams.get('code') : null;
      if (code) await client.auth.exchangeCodeForSession(code);
    };
    void Linking.getInitialURL().then(openLink);
    const linkSubscription = Linking.addEventListener('url', ({ url }) => void openLink(url));
    return () => {
      active = false;
      data.subscription.unsubscribe();
      linkSubscription.remove();
    };
  }, [rememberSession]);

  const requestEmailCode = useCallback(
    async (email: string, mode: EmailCodeMode) => {
      if (!supabase) return 'Cloud accounts are not configured yet.';
      const cleanEmail = email.trim().toLowerCase();
      const result =
        mode === 'connect' && session?.user.is_anonymous
          ? await supabase.auth.updateUser({ email: cleanEmail })
          : await supabase.auth.signInWithOtp({
              email: cleanEmail,
              options: {
                emailRedirectTo: makeRedirectUri({ scheme: 'scriptora' }),
                shouldCreateUser: mode === 'connect',
              },
            });
      return result.error?.message ?? null;
    },
    [session],
  );

  const verifyEmailCode = useCallback(
    async (email: string, code: string, mode: EmailCodeMode) => {
      if (!supabase) return 'Cloud accounts are not configured yet.';
      const cleanCode = code.replace(/\D/g, '').slice(0, 6);
      if (cleanCode.length !== 6) return 'Enter the 6-digit verification code.';
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: cleanCode,
        type: mode === 'connect' ? 'email_change' : 'email',
      });
      if (error) return error.message;
      await rememberSession(data.session);
      return null;
    },
    [rememberSession],
  );

  const switchAccount = useCallback(
    async (userId: string) => {
      if (!supabase) return 'Cloud accounts are not configured yet.';
      const account = (await readAccounts()).find((item) => item.userId === userId);
      if (!account) return 'Saved account not found.';
      const { data, error } = await supabase.auth.setSession({
        access_token: account.accessToken,
        refresh_token: account.refreshToken,
      });
      if (error) return error.message;
      await rememberSession(data.session);
      return null;
    },
    [rememberSession],
  );

  const forgetAccount = useCallback(async (userId: string) => {
    const updated = (await readAccounts()).filter((item) => item.userId !== userId);
    await AsyncStorage.setItem(ACCOUNTS_KEY, JSON.stringify(updated));
    setStoredAccounts(updated);
  }, []);

  const signOut = useCallback(async () => {
    if (supabase) {
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      if (error) return error.message;
      const anonymous = await supabase.auth.signInAnonymously();
      if (anonymous.error) return anonymous.error.message;
      setSession(anonymous.data.session);
    } else {
      const id = newGuestId();
      await AsyncStorage.setItem(GUEST_ID_KEY, id);
      setGuestId(id);
    }
    return null;
  }, []);

  const deleteAccount = useCallback(async () => {
    if (!supabase || !session || session.user.is_anonymous) return 'You must be logged in.';
    const userId = session.user.id;
    const { error } = await supabase.functions.invoke('delete-account');
    if (error) return error.message;
    await forgetAccount(userId);
    await supabase.auth.signOut({ scope: 'local' });
    const anonymous = await supabase.auth.signInAnonymously();
    setSession(anonymous.data.session);
    return anonymous.error?.message ?? null;
  }, [session, forgetAccount]);

  const userId = session?.user.id ?? guestId;
  const guest = !session || Boolean(session.user.is_anonymous);
  const value = useMemo<AuthStoreValue>(
    () => ({
      ready,
      configured: isSupabaseConfigured,
      session,
      userId,
      playerId: userId ? playerIdFor(userId) : null,
      guest,
      syncStatus: session ? 'synced' : 'local',
      savedAccounts: storedAccounts.map((account) => ({
        userId: account.userId,
        email: account.email,
        playerId: playerIdFor(account.userId),
      })),
      requestEmailCode,
      verifyEmailCode,
      switchAccount,
      forgetAccount,
      signOut,
      deleteAccount,
    }),
    [
      ready,
      session,
      userId,
      guest,
      storedAccounts,
      requestEmailCode,
      verifyEmailCode,
      switchAccount,
      forgetAccount,
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
