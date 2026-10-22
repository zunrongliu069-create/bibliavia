import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Session } from '@supabase/supabase-js';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Linking, Platform } from 'react-native';
import { playerIdFor } from '../lib/bibliaviaId';
import { completeAuthCallback, resolveAuthRedirectUrl } from '../lib/authCallback';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

const GUEST_ID_KEY = 'bibliavia/guest-id/v1';
const ACCOUNTS_KEY = 'bibliavia/accounts/v1';
const newGuestId = () => `guest-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
const authRedirectUri = () =>
  resolveAuthRedirectUrl({
    development: typeof __DEV__ !== 'undefined' && __DEV__,
    developmentOrigin: process.env.EXPO_PUBLIC_AUTH_DEVELOPMENT_ORIGIN,
  });

type SyncStatus = 'local' | 'synced' | 'syncing' | 'offline';
type AuthResult = Promise<string | null>;
export type EmailCodeMode = 'connect' | 'login';
export type AuthCallbackNotice = { type: 'success' | 'error'; message: string };

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
  callbackNotice: AuthCallbackNotice | null;
  clearCallbackNotice: () => void;
  requestEmailLink: (email: string, mode: EmailCodeMode) => AuthResult;
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
  const [callbackNotice, setCallbackNotice] = useState<AuthCallbackNotice | null>(null);

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
    if (!supabase) {
      void (async () => {
        const savedGuest = await AsyncStorage.getItem(GUEST_ID_KEY);
        const id = savedGuest ?? newGuestId();
        if (!savedGuest) await AsyncStorage.setItem(GUEST_ID_KEY, id);
        if (active) {
          setGuestId(id);
          setStoredAccounts(await readAccounts());
          setReady(true);
        }
      })();
      return () => {
        active = false;
      };
    }

    const client = supabase;
    const { data } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      void rememberSession(nextSession);
    });
    const replaceCallbackUrl = (url: string) => {
      if (Platform.OS === 'web' && typeof globalThis.history?.replaceState === 'function') {
        globalThis.history.replaceState({}, '', url);
      }
    };
    const handleAuthUrl = async (url: string | null): Promise<Session | null> => {
      const result = await completeAuthCallback(client.auth, url, replaceCallbackUrl);
      if (result.kind === 'none') return null;
      if (result.kind === 'error') {
        setCallbackNotice({ type: 'error', message: result.message });
        return null;
      }
      setCallbackNotice({ type: 'success', message: 'Signed in successfully.' });
      await rememberSession(result.session);
      return result.session;
    };
    const initialize = async () => {
      const savedGuest = await AsyncStorage.getItem(GUEST_ID_KEY);
      const id = savedGuest ?? newGuestId();
      if (!savedGuest) await AsyncStorage.setItem(GUEST_ID_KEY, id);
      const accounts = await readAccounts();
      const initialUrl =
        Platform.OS === 'web' && typeof globalThis.location?.href === 'string'
          ? globalThis.location.href
          : await Linking.getInitialURL();
      let nextSession = await handleAuthUrl(initialUrl);
      if (!nextSession) nextSession = (await client.auth.getSession()).data.session;
      if (!nextSession) {
        const anonymous = await client.auth.signInAnonymously();
        nextSession = anonymous.data.session;
      }
      if (!active) return;
      setGuestId(id);
      setStoredAccounts(accounts);
      setSession(nextSession);
      await rememberSession(nextSession);
      setReady(true);
    };
    void initialize();
    const linkSubscription = Linking.addEventListener('url', ({ url }) => void handleAuthUrl(url));
    return () => {
      active = false;
      data.subscription.unsubscribe();
      linkSubscription.remove();
    };
  }, [rememberSession]);

  const requestEmailLink = useCallback(
    async (email: string, mode: EmailCodeMode) => {
      if (!supabase) return 'Cloud accounts are not configured yet.';
      const cleanEmail = email.trim().toLowerCase();
      setCallbackNotice(null);
      const result =
        mode === 'connect' && session?.user.is_anonymous
          ? await supabase.auth.updateUser(
              { email: cleanEmail },
              { emailRedirectTo: authRedirectUri() },
            )
          : await supabase.auth.signInWithOtp({
              email: cleanEmail,
              options: {
                emailRedirectTo: authRedirectUri(),
                shouldCreateUser: mode === 'connect',
              },
            });
      return result.error?.message ?? null;
    },
    [session],
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
      callbackNotice,
      clearCallbackNotice: () => setCallbackNotice(null),
      savedAccounts: storedAccounts.map((account) => ({
        userId: account.userId,
        email: account.email,
        playerId: playerIdFor(account.userId),
      })),
      requestEmailLink,
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
      callbackNotice,
      storedAccounts,
      requestEmailLink,
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
