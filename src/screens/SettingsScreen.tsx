import { Ionicons } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, Card, Eyebrow } from '../components/ui';
import { translations } from '../data/content';
import { t } from '../lib/i18n';
import { colors, radius, shadow } from '../theme';
import type { UiLanguage } from '../types';
import { useAppStore } from '../store/AppStore';
import { useAuthStore } from '../store/AuthStore';

const languages: { id: UiLanguage; label: string }[] = [
  { id: 'en', label: 'English' },
  { id: 'sv', label: 'Svenska' },
  { id: 'zh-Hans', label: '简体中文' },
  { id: 'zh-Hant', label: '繁體中文' },
];
export function SettingsScreen() {
  const store = useAppStore();
  const auth = useAuthStore();
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [authBusy, setAuthBusy] = useState(false);
  const authBusyRef = useRef(false);
  const [authMessage, setAuthMessage] = useState<string | null>(null);
  const runAuth = async (action: () => Promise<string | null>) => {
    if (authBusyRef.current) return;
    authBusyRef.current = true;
    setAuthBusy(true);
    setAuthMessage(null);
    try {
      setAuthMessage(await action());
    } finally {
      authBusyRef.current = false;
      setAuthBusy(false);
    }
  };
  return (
    <ScrollView contentContainerStyle={styles.page}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 13,
          backgroundColor: '#35205D',
          borderWidth: 2,
          borderBottomWidth: 5,
          borderColor: '#D0A64D',
          borderRadius: 28,
          padding: 17,
        }}
      >
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 16,
            backgroundColor: '#7442C8',
            borderWidth: 2,
            borderColor: '#EAC764',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="settings" size={25} color="#F2CB65" />
        </View>
        <View>
          <Text style={[styles.title, { color: colors.white }]}>
            {t(store.uiLanguage, 'settings')}
          </Text>
          <Text style={{ fontSize: 11, fontWeight: '800', color: '#D8CFEB', marginTop: 3 }}>
            SCRIPTORA ADVENTURE PROFILE
          </Text>
        </View>
      </View>
      <Card style={styles.account}>
        <View style={styles.accountHeader}>
          <Ionicons
            name={auth.guest ? 'person-outline' : 'cloud-done'}
            size={25}
            color={colors.primary}
          />
          <View style={{ flex: 1 }}>
            <Eyebrow>ACCOUNT</Eyebrow>
            <Text style={styles.accountTitle}>
              {auth.guest ? 'Guest Mode' : (auth.session?.user.email ?? 'Scriptora account')}
            </Text>
            <Text style={styles.syncText}>
              {auth.session ? '✓ Synced' : '⚠ Local only — progress stays on this device'}
            </Text>
          </View>
        </View>
        {auth.guest ? (
          <>
            <View style={styles.providerRow}>
              <View style={{ flex: 1 }}>
                <Button
                  label="Log in"
                  variant={authMode === 'login' ? 'primary' : 'secondary'}
                  onPress={() => {
                    setAuthMode('login');
                    setAuthMessage(null);
                  }}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  label="Create account"
                  variant={authMode === 'signup' ? 'primary' : 'secondary'}
                  onPress={() => {
                    setAuthMode('signup');
                    setAuthMessage(null);
                  }}
                />
              </View>
            </View>
            {authMode === 'signup' && (
              <TextInput
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Display name"
                autoCapitalize="words"
                style={styles.accountInput}
              />
            )}
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.accountInput}
            />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              secureTextEntry
              style={styles.accountInput}
            />
            {authMode === 'signup' && (
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm password"
                secureTextEntry
                style={styles.accountInput}
              />
            )}
            <Text style={styles.passwordHint}>Use at least 6 characters.</Text>
            {authMode === 'login' ? (
              <Button
                label="Log in"
                disabled={authBusy || !email.includes('@') || password.length < 6}
                onPress={() => runAuth(() => auth.signInWithEmail(email, password))}
              />
            ) : (
              <Button
                label="Create my account"
                disabled={
                  authBusy ||
                  displayName.trim().length < 2 ||
                  !email.includes('@') ||
                  password.length < 6 ||
                  password !== confirmPassword
                }
                onPress={() => runAuth(() => auth.signUpWithEmail(email, password, displayName))}
              />
            )}
            {authMode === 'signup' && (
              <Button
                label="Resend confirmation email"
                variant="secondary"
                disabled={authBusy || !email.includes('@')}
                onPress={() => runAuth(() => auth.resendConfirmation(email))}
              />
            )}
            <View style={styles.providerRow}>
              <View style={{ flex: 1 }}>
                <Button
                  label="Google"
                  variant="secondary"
                  onPress={() => runAuth(() => auth.signInWithProvider('google'))}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  label="Apple"
                  variant="secondary"
                  onPress={() => runAuth(() => auth.signInWithProvider('apple'))}
                />
              </View>
            </View>
            {!auth.configured && (
              <Text style={styles.authNotice}>
                Cloud login activates when the Supabase environment variables are configured.
              </Text>
            )}
          </>
        ) : (
          <>
            <Button label="Log out" variant="secondary" onPress={() => runAuth(auth.signOut)} />
            <Button
              label={confirmDelete ? 'Confirm delete account' : 'Delete account'}
              variant="secondary"
              onPress={() => {
                if (!confirmDelete) return setConfirmDelete(true);
                setConfirmDelete(false);
                return runAuth(auth.deleteAccount);
              }}
            />
          </>
        )}
        {authMessage && <Text style={styles.authError}>{authMessage}</Text>}
        <Text selectable style={styles.userId}>
          User ID: {auth.userId ?? 'loading'}
        </Text>
      </Card>
      <View style={styles.section}>
        <Eyebrow>{t(store.uiLanguage, 'chooseLanguage').toUpperCase()}</Eyebrow>
        <View style={styles.options}>
          {languages.map((language) => (
            <Pressable
              key={language.id}
              accessibilityRole="button"
              accessibilityLabel={language.label}
              accessibilityState={{ selected: store.uiLanguage === language.id }}
              onPress={() => store.setUiLanguage(language.id)}
              style={[styles.option, store.uiLanguage === language.id && styles.selected]}
            >
              <Text
                style={[styles.optionText, store.uiLanguage === language.id && styles.selectedText]}
              >
                {language.label}
              </Text>
              {store.uiLanguage === language.id && (
                <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
              )}
            </Pressable>
          ))}
        </View>
      </View>
      <View style={styles.section}>
        <Eyebrow>{t(store.uiLanguage, 'bibleTranslation').toUpperCase()}</Eyebrow>
        <View style={styles.options}>
          {translations.map((translation) => {
            const enabled = translation.publicBuild || translation.developmentBuild;
            return (
              <Pressable
                key={translation.id}
                accessibilityRole="button"
                accessibilityLabel={`${translation.name} ${translation.abbreviation}`}
                accessibilityState={{
                  selected: store.translationId === translation.id,
                  disabled: !enabled,
                }}
                disabled={!enabled}
                onPress={() => store.setTranslationId(translation.id)}
                style={[
                  styles.translation,
                  store.translationId === translation.id && styles.selected,
                  !enabled && styles.disabled,
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.optionText,
                      store.translationId === translation.id && styles.selectedText,
                    ]}
                  >
                    {translation.name} <Text style={styles.abbr}>{translation.abbreviation}</Text>
                  </Text>
                  <Text style={styles.license}>
                    {translation.publicBuild
                      ? translation.license
                      : t(store.uiLanguage, 'developmentMode')}
                  </Text>
                </View>
                {store.translationId === translation.id && (
                  <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                )}
              </Pressable>
            );
          })}
        </View>
      </View>
      <Card style={styles.offline}>
        <Ionicons name="phone-portrait-outline" size={26} color={colors.mint} />
        <View style={{ flex: 1 }}>
          <Text style={styles.offlineTitle}>Offline-first</Text>
          <Text style={styles.offlineText}>{t(store.uiLanguage, 'offline')}</Text>
        </View>
      </Card>
      <View style={styles.legal}>
        <Ionicons name="document-lock-outline" size={23} color={colors.coral} />
        <Text style={styles.legalText}>{t(store.uiLanguage, 'contentNotice')}</Text>
      </View>
      {!confirmReset ? (
        <Button
          label="Reset local progress"
          variant="ghost"
          onPress={() => setConfirmReset(true)}
        />
      ) : (
        <View style={styles.reset}>
          <Text style={styles.resetText}>
            This removes local XP, streaks, mastery, and review history.
          </Text>
          <Button
            label="Confirm reset"
            variant="danger"
            onPress={() => {
              store.resetProgress();
              setConfirmReset(false);
            }}
          />
          <Button label="Cancel" variant="ghost" onPress={() => setConfirmReset(false)} />
        </View>
      )}
      <Text style={styles.version}>Scriptora private MVP · 0.1.0</Text>
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  page: { padding: 20, gap: 16 },
  title: { fontSize: 30, fontWeight: '900', color: colors.ink },
  account: { gap: 11 },
  accountHeader: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  accountTitle: { fontSize: 18, fontWeight: '900', color: colors.ink, marginTop: 3 },
  syncText: { fontSize: 11, color: colors.muted, marginTop: 3 },
  accountInput: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: 13,
    backgroundColor: colors.white,
    color: colors.ink,
  },
  passwordHint: { marginTop: -4, fontSize: 10, color: colors.muted },
  providerRow: { flexDirection: 'row', gap: 9 },
  authNotice: { fontSize: 11, lineHeight: 16, color: colors.muted },
  authError: { fontSize: 12, lineHeight: 17, color: colors.coral },
  userId: { fontSize: 10, color: colors.muted },
  section: {
    gap: 10,
    padding: 14,
    backgroundColor: 'rgba(255,249,236,.94)',
    borderWidth: 2,
    borderBottomWidth: 5,
    borderColor: colors.line,
    borderRadius: radius.lg,
    ...shadow,
  },
  options: { gap: 8 },
  option: {
    minHeight: 50,
    paddingHorizontal: 15,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderBottomWidth: 4,
    borderColor: '#B99A63',
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  translation: {
    minHeight: 62,
    paddingHorizontal: 15,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderBottomWidth: 4,
    borderColor: '#B99A63',
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  disabled: { opacity: 0.48 },
  optionText: { fontWeight: '800', fontSize: 15, color: colors.inkSoft },
  selectedText: { color: colors.primary },
  abbr: { fontSize: 11, color: colors.muted },
  license: { fontSize: 11, color: colors.muted, marginTop: 3 },
  offline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    backgroundColor: colors.mintSoft,
    borderColor: '#73AF95',
  },
  offlineTitle: { fontWeight: '900', color: colors.ink },
  offlineText: { fontSize: 12, color: colors.muted, marginTop: 3 },
  legal: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    backgroundColor: '#FBE4E0',
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderBottomWidth: 4,
    borderColor: '#CE8279',
    ...shadow,
  },
  legalText: { flex: 1, fontSize: 12, lineHeight: 18, color: colors.inkSoft },
  reset: {
    gap: 9,
    padding: 14,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.line,
  },
  resetText: { fontSize: 12, color: colors.coral, textAlign: 'center' },
  version: { fontSize: 11, color: colors.muted, textAlign: 'center', marginBottom: 20 },
});
