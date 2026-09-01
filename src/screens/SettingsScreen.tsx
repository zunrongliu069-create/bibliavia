import { Ionicons } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { Button, Card, Eyebrow } from '../components/ui';
import { translations } from '../data/content';
import { t } from '../lib/i18n';
import { uiText } from '../lib/uiText';
import { colors, radius, shadow } from '../theme';
import type { FeedbackSettings, UiLanguage } from '../types';
import { useAppStore } from '../store/AppStore';
import { useAuthStore } from '../store/AuthStore';
import type { EmailCodeMode } from '../store/AuthStore';

const languages: { id: UiLanguage; label: string }[] = [
  { id: 'en', label: 'English' },
  { id: 'sv', label: 'Svenska' },
  { id: 'zh-Hans', label: '简体中文' },
  { id: 'zh-Hant', label: '繁體中文' },
];
const feedbackOptions: Array<{
  key: keyof FeedbackSettings;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  detail: string;
}> = [
  {
    key: 'soundEffects',
    icon: 'volume-high',
    label: 'Sound effects',
    detail: 'Answers and rewards',
  },
  {
    key: 'ambientMusic',
    icon: 'musical-notes',
    label: 'Music / ambient',
    detail: 'Calm background audio',
  },
  {
    key: 'haptics',
    icon: 'phone-portrait',
    label: 'Haptics',
    detail: 'Touch feedback on supported devices',
  },
  {
    key: 'reduceMotion',
    icon: 'accessibility',
    label: 'Reduce Motion',
    detail: 'Shorter, calmer animations',
  },
];
export function SettingsScreen() {
  const store = useAppStore();
  const u = (text: string) => uiText(store.uiLanguage, text);
  const auth = useAuthStore();
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [email, setEmail] = useState('');
  const [emailCode, setEmailCode] = useState('');
  const [emailCodeMode, setEmailCodeMode] = useState<EmailCodeMode>('connect');
  const [codeSent, setCodeSent] = useState(false);
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
            {u('BIBLIAVIA ADVENTURE PROFILE')}
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
            <Eyebrow>{u('ACCOUNT')}</Eyebrow>
            <Text style={styles.accountTitle}>
              {auth.guest ? u('Guest Mode') : (auth.session?.user.email ?? u('Bibliavia account'))}
            </Text>
            <Text style={styles.syncText}>
              {auth.session
                ? store.cloudSyncStatus === 'error'
                  ? `⚠ ${u('Supabase sync failed — check your connection')}`
                  : store.cloudSyncStatus === 'syncing'
                    ? `↻ ${u('Syncing with Supabase…')}`
                    : `✓ ${u('Synced with Supabase')}`
                : `✓ ${u('Guest progress saves automatically')}`}
            </Text>
          </View>
        </View>
        {auth.guest ? (
          <>
            <Text style={styles.passwordHint}>
              {u('Connect Bibliavia ID without losing progress.')}
            </Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder={u('Email')}
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.accountInput}
            />
            {!codeSent ? (
              <>
                <Button
                  label={u('Connect Bibliavia ID')}
                  disabled={authBusy || !email.includes('@')}
                  onPress={() =>
                    runAuth(async () => {
                      setEmailCodeMode('connect');
                      const error = await auth.requestEmailCode(email, 'connect');
                      if (!error) setCodeSent(true);
                      return error ?? u('Verification code sent');
                    })
                  }
                />
                <Button
                  label={u('Sign in to existing ID')}
                  variant="secondary"
                  disabled={authBusy || !email.includes('@')}
                  onPress={() =>
                    runAuth(async () => {
                      setEmailCodeMode('login');
                      const error = await auth.requestEmailCode(email, 'login');
                      if (!error) setCodeSent(true);
                      return error ?? u('Verification code sent');
                    })
                  }
                />
              </>
            ) : (
              <>
                <TextInput
                  value={emailCode}
                  onChangeText={setEmailCode}
                  placeholder={u('6-digit verification code')}
                  keyboardType="number-pad"
                  style={styles.accountInput}
                />
                <Button
                  label={u('Verify and continue')}
                  disabled={authBusy || emailCode.trim().length < 6}
                  onPress={() =>
                    runAuth(async () => {
                      const error = await auth.verifyEmailCode(email, emailCode, emailCodeMode);
                      if (!error) {
                        setCodeSent(false);
                        setEmailCode('');
                      }
                      return error;
                    })
                  }
                />
                <Button
                  label={u('Use another email')}
                  variant="ghost"
                  onPress={() => setCodeSent(false)}
                />
              </>
            )}
            {!auth.configured && (
              <Text style={styles.authNotice}>
                {u('Cloud login activates when the Supabase environment variables are configured.')}
              </Text>
            )}
          </>
        ) : (
          <>
            <Button
              label={u('Log out to Guest')}
              variant="secondary"
              onPress={() => runAuth(auth.signOut)}
            />
            <Button
              label={u(confirmDelete ? 'Confirm delete account' : 'Delete account')}
              variant="secondary"
              onPress={() => {
                if (!confirmDelete) return setConfirmDelete(true);
                setConfirmDelete(false);
                return runAuth(auth.deleteAccount);
              }}
            />
          </>
        )}
        {authMessage && <Text style={styles.authError}>{u(authMessage)}</Text>}
        <Text selectable style={styles.userId}>
          {u('Player ID')}: {auth.playerId ?? u('loading')}
        </Text>
        {auth.savedAccounts.length > 0 && (
          <View style={styles.savedAccounts}>
            <Eyebrow>{u('SAVED ACCOUNTS')}</Eyebrow>
            {auth.savedAccounts.map((account) => (
              <View key={account.userId} style={styles.savedAccount}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.savedEmail}>{account.email}</Text>
                  <Text style={styles.savedPlayerId}>{account.playerId}</Text>
                </View>
                {account.userId !== auth.session?.user.id && (
                  <Button
                    label={u('Switch')}
                    variant="secondary"
                    onPress={() => runAuth(() => auth.switchAccount(account.userId))}
                  />
                )}
              </View>
            ))}
          </View>
        )}
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
            const enabled =
              translation.publicBuild &&
              translation.redistributionAllowed &&
              translation.contentAvailable;
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
      <View style={styles.section}>
        <Eyebrow>{u('FEEDBACK & ACCESSIBILITY')}</Eyebrow>
        <View style={styles.options}>
          {feedbackOptions.map((option) => (
            <View key={option.key} style={styles.feedbackOption}>
              <Ionicons name={option.icon} size={22} color={colors.primary} />
              <View style={styles.feedbackCopy}>
                <Text style={styles.optionText}>{u(option.label)}</Text>
                <Text style={styles.feedbackDetail}>{u(option.detail)}</Text>
              </View>
              <Switch
                accessibilityLabel={u(option.label)}
                value={store.feedbackSettings[option.key]}
                onValueChange={(enabled) => store.setFeedbackSetting(option.key, enabled)}
                trackColor={{ false: '#C8BEAA', true: '#A98BDE' }}
                thumbColor={store.feedbackSettings[option.key] ? colors.primary : '#F4EFE5'}
              />
            </View>
          ))}
        </View>
      </View>
      <Card style={styles.offline}>
        <Ionicons name="phone-portrait-outline" size={26} color={colors.mint} />
        <View style={{ flex: 1 }}>
          <Text style={styles.offlineTitle}>{u('Offline-first')}</Text>
          <Text style={styles.offlineText}>{t(store.uiLanguage, 'offline')}</Text>
        </View>
      </Card>
      <View style={styles.legal}>
        <Ionicons name="document-lock-outline" size={23} color={colors.coral} />
        <Text style={styles.legalText}>{t(store.uiLanguage, 'contentNotice')}</Text>
      </View>
      {!confirmReset ? (
        <Button
          label={u('Reset local progress')}
          variant="ghost"
          onPress={() => setConfirmReset(true)}
        />
      ) : (
        <View style={styles.reset}>
          <Text style={styles.resetText}>
            {u('This removes local XP, streaks, mastery, and review history.')}
          </Text>
          <Button
            label={u('Confirm reset')}
            variant="danger"
            onPress={() => {
              store.resetProgress();
              setConfirmReset(false);
            }}
          />
          <Button label={u('Cancel')} variant="ghost" onPress={() => setConfirmReset(false)} />
        </View>
      )}
      <Text style={styles.version}>{u('Bibliavia private MVP')} · 0.1.0</Text>
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
  savedAccounts: { gap: 8, marginTop: 4 },
  savedAccount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 9,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },
  savedEmail: { color: colors.ink, fontSize: 12, fontWeight: '800' },
  savedPlayerId: { color: colors.muted, fontSize: 9, marginTop: 2 },
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
  feedbackOption: {
    minHeight: 58,
    paddingHorizontal: 13,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  feedbackCopy: { flex: 1 },
  feedbackDetail: { fontSize: 11, color: colors.muted, marginTop: 2 },
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
