import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { Platform, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { CampaignScreen } from './src/screens/CampaignScreen';
import { CollectionScreen } from './src/screens/CollectionScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { LibraryScreen } from './src/screens/LibraryScreen';
import { ReviewScreen } from './src/screens/ReviewScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { AppStoreProvider, useAppStore } from './src/store/AppStore';
import { AuthStoreProvider } from './src/store/AuthStore';
import { t } from './src/lib/i18n';
import { levelForXp } from './src/lib/level';
import { prioritizedDueVerses, type ReviewMode } from './src/lib/reviewQueue';
import { colors, shadow } from './src/theme';
import type { Verse } from './src/types';

type Tab = 'home' | 'campaign' | 'library' | 'collection' | 'settings';
const icons: Record<Tab, keyof typeof Ionicons.glyphMap> = {
  home: 'home',
  campaign: 'map',
  library: 'book',
  collection: 'albums',
  settings: 'settings',
};
function Shell() {
  const store = useAppStore();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('home');
  const [review, setReview] = useState<{ verses: Verse[]; kind: 'lesson' | ReviewMode } | null>(
    null,
  );
  const startLesson = (verse: Verse) => setReview({ verses: [verse], kind: 'lesson' });
  const startReview = (kind: ReviewMode) => {
    const verses = prioritizedDueVerses(
      store.availableVerses,
      store.progress.mastery,
      store.progress.reviews,
      kind,
    );
    if (verses.length) setReview({ verses, kind });
  };
  if (review)
    return (
      <ReviewScreen
        initialVerse={review.verses[0]!}
        reviewVerses={review.verses}
        kind={review.kind}
        onClose={() => setReview(null)}
      />
    );
  const labels: Record<Tab, string> = {
    home: t(store.uiLanguage, 'home'),
    campaign: t(store.uiLanguage, 'campaign'),
    library: t(store.uiLanguage, 'library'),
    collection: t(store.uiLanguage, 'collection'),
    settings: t(store.uiLanguage, 'settings'),
  };
  const screen =
    tab === 'home' ? (
      <HomeScreen
        onStart={startLesson}
        onReview={startReview}
        onOpenCollection={() => setTab('collection')}
      />
    ) : tab === 'campaign' ? (
      <CampaignScreen onStart={startLesson} />
    ) : tab === 'library' ? (
      <LibraryScreen onStart={startLesson} />
    ) : tab === 'collection' ? (
      <CollectionScreen />
    ) : (
      <SettingsScreen />
    );
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.app}>
        <View style={styles.globalHud}>
          <HudItem
            icon="flame"
            value={store.progress.streak}
            label={t(store.uiLanguage, 'currentStreak')}
            color="#FF9B32"
          />
          <HudItem
            icon="calendar"
            value={new Set(store.progress.activeDates).size}
            label={t(store.uiLanguage, 'daysActive')}
            color="#63D7FF"
          />
          <HudItem
            icon="star"
            value={store.progress.xp}
            label={`${t(store.uiLanguage, 'xp')} · ${t(store.uiLanguage, 'level')} ${levelForXp(store.progress.xp)}`}
            color="#F3CB61"
          />
          <HudItem
            icon="cash"
            value={store.progress.gold}
            label={t(store.uiLanguage, 'gold')}
            color="#F3CB61"
          />
        </View>
        <View style={styles.content}>{screen}</View>
        <View style={[styles.nav, styles.gameNav, { paddingBottom: Math.max(insets.bottom, 8) }]}>
          {(Object.keys(icons) as Tab[]).map((item) => (
            <Pressable
              key={item}
              style={({ pressed }) => [
                styles.navItem,
                item === tab && styles.gameNavActive,
                pressed && styles.navPressed,
              ]}
              onPress={() => setTab(item)}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === item }}
              accessibilityLabel={labels[item]}
            >
              <Ionicons
                name={
                  tab === item
                    ? icons[item]
                    : (`${icons[item]}-outline` as keyof typeof Ionicons.glyphMap)
                }
                size={23}
                color={tab === item ? '#F3CB61' : '#AAA4BC'}
              />
              <Text
                style={[
                  styles.navText,
                  styles.gameNavText,
                  tab === item && styles.gameNavTextActive,
                ]}
              >
                {labels[item]}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}
function HudItem({
  icon,
  value,
  label,
  color,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: number;
  label: string;
  color: string;
}) {
  return (
    <View style={styles.hudItem}>
      <Ionicons name={icon} size={17} color={color} />
      <View>
        <Text style={styles.hudValue}>{value}</Text>
        <Text numberOfLines={1} style={styles.hudLabel}>
          {label}
        </Text>
      </View>
    </View>
  );
}
export default function App() {
  return (
    <SafeAreaProvider>
      <AuthStoreProvider>
        <AppStoreProvider>
          <StatusBar style="dark" />
          <Shell />
        </AppStoreProvider>
      </AuthStoreProvider>
    </SafeAreaProvider>
  );
}
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  app: {
    flex: 1,
    backgroundColor: colors.paper,
    alignSelf: 'center',
    width: '100%',
    maxWidth: 820,
    ...Platform.select({
      web: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.line },
    }),
  },
  globalHud: {
    minHeight: 58,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 7,
    paddingVertical: 6,
    backgroundColor: '#17132E',
    borderBottomWidth: 2,
    borderBottomColor: '#7B4BBB',
    zIndex: 20,
  },
  hudItem: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 4,
    backgroundColor: '#21183B',
    borderWidth: 1.5,
    borderBottomWidth: 3,
    borderColor: '#5F438B',
    borderRadius: 13,
    ...shadow,
  },
  hudValue: { fontSize: 14, lineHeight: 16, fontWeight: '900', color: colors.white },
  hudLabel: {
    maxWidth: 58,
    fontSize: 7,
    lineHeight: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
    color: '#CFC8E0',
  },
  content: { flex: 1 },
  nav: {
    minHeight: 66,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    flexDirection: 'row',
    paddingTop: 8,
  },
  gameNav: { backgroundColor: '#17132E', borderTopWidth: 2, borderTopColor: '#7B4BBB' },
  gameNavActive: {
    backgroundColor: '#3E2568',
    borderTopWidth: 2,
    borderTopColor: '#F0C65B',
    borderRadius: 10,
    marginHorizontal: 3,
  },
  navItem: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, minHeight: 50 },
  navPressed: { opacity: 0.75 },
  navText: { fontSize: 10, fontWeight: '700', color: colors.muted },
  navActive: { color: colors.primary },
  gameNavText: { color: '#AAA4BC' },
  gameNavTextActive: { color: '#F3CB61' },
});
