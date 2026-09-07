import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import {
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { FeedbackOverlay } from './src/components/FeedbackOverlay';
import { JourneyScreen } from './src/screens/JourneyScreen';
import { CollectionScreen } from './src/screens/CollectionScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { LibraryScreen } from './src/screens/LibraryScreen';
import { ReviewScreen } from './src/screens/ReviewScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { AppStoreProvider, useAppStore } from './src/store/AppStore';
import { AuthStoreProvider } from './src/store/AuthStore';
import { t } from './src/lib/i18n';
import { uiText } from './src/lib/uiText';
import { levelForXp, levelRewardFor, xpForLevel } from './src/lib/level';
import { prioritizedDueVerses, type ReviewMode } from './src/lib/reviewQueue';
import { recallEligibleVerses } from './src/lib/pathProgress';
import { pathDefinitions } from './src/data/paths';
import { colors, shadow } from './src/theme';
import type { Verse } from './src/types';

type Tab = 'home' | 'campaign' | 'collection' | 'settings';
const icons: Record<Tab, keyof typeof Ionicons.glyphMap> = {
  home: 'home',
  campaign: 'map',
  collection: 'albums',
  settings: 'settings',
};

const calendarDays = (year: number, month: number) => {
  const offset = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  return [...Array(offset).fill(null), ...Array.from({ length: days }, (_, index) => index + 1)];
};

function Shell() {
  const store = useAppStore();
  const u = (text: string) => uiText(store.uiLanguage, text);
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('home');
  const [pathView, setPathView] = useState<'journey' | 'reader'>('journey');
  const [hudPanel, setHudPanel] = useState<'streak' | 'levels' | 'inventory' | null>(null);
  const [calendarOffset, setCalendarOffset] = useState(0);
  const [libraryPassage, setLibraryPassage] = useState<{
    label: string;
    verses: Verse[];
  } | null>(null);
  const [review, setReview] = useState<{
    verses: Verse[];
    kind: 'lesson' | 'challenge' | 'chapterQuiz' | ReviewMode;
  } | null>(null);
  const startLesson = (verse: Verse) => setReview({ verses: [verse], kind: 'lesson' });
  const startReview = (kind: ReviewMode) => {
    const eligible = recallEligibleVerses(
      pathDefinitions,
      store.progress.pathStates,
      store.availableVerses,
    );
    const verses = prioritizedDueVerses(
      eligible,
      store.progress.mastery,
      store.progress.reviews,
      kind,
    );
    if (verses.length) setReview({ verses, kind });
  };
  const startChallenge = (
    pathVerses?: Verse[],
    kind: 'challenge' | 'chapterQuiz' = 'challenge',
  ) => {
    if (pathVerses?.length) {
      setReview({ verses: pathVerses, kind });
      return;
    }
    const due = prioritizedDueVerses(
      store.availableVerses,
      store.progress.mastery,
      store.progress.reviews,
      'full',
    );
    const verses = due.length ? due : store.availableVerses.slice(0, 5);
    if (verses.length) setReview({ verses, kind: 'challenge' });
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
    collection: t(store.uiLanguage, 'collection'),
    settings: t(store.uiLanguage, 'settings'),
  };
  const currentLevel = levelForXp(store.progress.xp);
  const calendarDate = new Date();
  calendarDate.setMonth(calendarDate.getMonth() + calendarOffset);
  const calendarYear = calendarDate.getFullYear();
  const calendarMonth = calendarDate.getMonth();
  const activeDates = new Set(store.progress.activeDates);
  const locale = { en: 'en-US', sv: 'sv-SE', 'zh-Hans': 'zh-CN', 'zh-Hant': 'zh-TW' }[
    store.uiLanguage
  ];
  const monthLabel = calendarDate.toLocaleDateString(locale, {
    month: 'long',
    year: 'numeric',
  });
  const screen =
    tab === 'home' ? (
      <HomeScreen
        onStart={startLesson}
        onReview={startReview}
        onOpenCollection={() => setTab('collection')}
        onOpenVerses={() => {
          setLibraryPassage(null);
          setPathView('reader');
          setTab('campaign');
        }}
        onOpenPaths={() => setTab('campaign')}
      />
    ) : tab === 'campaign' && pathView === 'journey' ? (
      <JourneyScreen
        onBrowseBible={() => {
          setLibraryPassage(null);
          setPathView('reader');
        }}
        onRead={(passage) => {
          store.setTranslationId(passage.versionId);
          setLibraryPassage({ label: passage.label, verses: passage.verses });
          setPathView('reader');
        }}
        onMemorize={startLesson}
        onChallenge={startChallenge}
      />
    ) : tab === 'campaign' ? (
      <LibraryScreen
        onStart={startLesson}
        initialPassage={libraryPassage}
        onBack={() => {
          setLibraryPassage(null);
          setPathView('journey');
        }}
      />
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
            icon="star"
            value={store.progress.xp}
            label={`${t(store.uiLanguage, 'xp')} · ${t(store.uiLanguage, 'level')} ${currentLevel}`}
            color="#F3CB61"
            onPress={() => setHudPanel('levels')}
          />
          <HudItem
            icon="flame"
            value={store.progress.streak}
            label={`${t(store.uiLanguage, 'currentStreak')} · ${activeDates.size} ${u('total days')}`}
            color="#FF9B32"
            onPress={() => setHudPanel('streak')}
          />
          <HudItem
            icon="cash"
            value={store.progress.gold}
            label={t(store.uiLanguage, 'gold')}
            color="#F3CB61"
            onPress={() => setHudPanel('inventory')}
          />
        </View>
        {hudPanel && (
          <View style={styles.hudOverlay}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setHudPanel(null)} />
            <View style={styles.hudPanel}>
              <View style={styles.hudPanelHeader}>
                <View>
                  <Text style={styles.hudPanelEyebrow}>BIBLIAVIA</Text>
                  <Text style={styles.hudPanelTitle}>
                    {u(
                      hudPanel === 'streak'
                        ? 'Streak calendar'
                        : hudPanel === 'inventory'
                          ? 'Inventory'
                          : 'Level Path',
                    )}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={u('Close')}
                  onPress={() => setHudPanel(null)}
                >
                  <Ionicons name="close-circle" size={30} color="#F3CB61" />
                </Pressable>
              </View>
              {hudPanel === 'streak' ? (
                <View>
                  <View style={styles.calendarHeader}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={u('Previous month')}
                      onPress={() => setCalendarOffset((value) => value - 1)}
                    >
                      <Ionicons name="chevron-back" size={22} color="#F3CB61" />
                    </Pressable>
                    <Text style={styles.monthLabel}>{monthLabel}</Text>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={u('Next month')}
                      onPress={() => setCalendarOffset((value) => value + 1)}
                    >
                      <Ionicons name="chevron-forward" size={22} color="#F3CB61" />
                    </Pressable>
                  </View>
                  <View style={styles.calendarGrid}>
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                      <Text key={`${day}-${index}`} style={styles.weekDay}>
                        {day}
                      </Text>
                    ))}
                    {calendarDays(calendarYear, calendarMonth).map((day, index) => {
                      const key = day
                        ? `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                        : `empty-${index}`;
                      const active = day ? activeDates.has(key) : false;
                      return (
                        <View
                          key={key}
                          style={[styles.calendarDay, active && styles.calendarDayActive]}
                        >
                          <Text
                            style={[styles.calendarDayText, active && styles.calendarDayTextActive]}
                          >
                            {day ?? ''}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                  <View style={styles.streakTotals}>
                    <View style={styles.streakTotalCard}>
                      <Text style={styles.streakTotalValue}>{store.progress.streak}</Text>
                      <Text style={styles.streakTotalLabel}>{u('CURRENT STREAK')}</Text>
                    </View>
                    <View style={styles.streakTotalCard}>
                      <Text style={styles.streakTotalValue}>{activeDates.size}</Text>
                      <Text style={styles.streakTotalLabel}>{u('TOTAL DAYS USED')}</Text>
                    </View>
                  </View>
                </View>
              ) : hudPanel === 'inventory' ? (
                <View style={styles.inventoryGrid}>
                  {[
                    ['🪙', t(store.uiLanguage, 'gold'), store.progress.gold],
                    ['🃏', u('Wild Shards'), store.progress.wildShards],
                    ['◆', u('Fragments'), store.progress.fragments],
                    ['🛡️', u('Streak Freezes'), store.progress.streakFreezes],
                    [
                      '⚡',
                      u('XP Boosters'),
                      Object.values(store.progress.xpBoosters).reduce(
                        (sum, count) => sum + count,
                        0,
                      ),
                    ],
                    [
                      '✨',
                      u('Gold Boosters'),
                      Object.values(store.progress.goldBoosters).reduce(
                        (sum, count) => sum + count,
                        0,
                      ),
                    ],
                  ].map(([icon, label, value]) => (
                    <View key={String(label)} style={styles.inventoryItem}>
                      <Text style={styles.inventoryIcon}>{icon}</Text>
                      <Text style={styles.inventoryValue}>{value}</Text>
                      <Text style={styles.inventoryLabel}>{label}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <ScrollView style={styles.levelScroll} showsVerticalScrollIndicator={false}>
                  {Array.from({ length: 10 }, (_, index) => currentLevel + index + 1).map(
                    (level) => {
                      const reward = levelRewardFor(level);
                      const xpLeft = Math.max(0, xpForLevel(level) - store.progress.xp);
                      return (
                        <View
                          key={level}
                          style={[styles.levelRow, reward.milestone && styles.levelRowMilestone]}
                        >
                          <View style={styles.levelBadge}>
                            <Text style={styles.levelBadgeText}>{level}</Text>
                          </View>
                          <View style={styles.levelCopy}>
                            <Text style={styles.levelTitle}>
                              {u('Level')} {level}
                            </Text>
                            <Text style={styles.levelReward}>
                              🪙 {reward.gold}
                              {reward.shards ? ` · 🧩 ${reward.shards}` : ''}
                              {reward.wildShards ? ` · 🃏 ${reward.wildShards}` : ''}
                              {reward.streakFreezes ? ` · 🛡️ ${reward.streakFreezes}` : ''}
                            </Text>
                          </View>
                          <Text style={styles.levelXp}>
                            {xpLeft} {u('XP left')}
                          </Text>
                        </View>
                      );
                    },
                  )}
                </ScrollView>
              )}
            </View>
          </View>
        )}
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
              onPress={() => {
                if (item === 'campaign') {
                  setLibraryPassage(null);
                  setPathView('journey');
                }
                setTab(item);
              }}
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
      <FeedbackOverlay />
    </SafeAreaView>
  );
}
function HudItem({
  icon,
  value,
  label,
  color,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: number;
  label: string;
  color: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={label}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [styles.hudItem, pressed && styles.navPressed]}
    >
      <Ionicons name={icon} size={17} color={color} />
      <View style={styles.hudCopy}>
        <Text style={styles.hudValue}>{value}</Text>
        <Text numberOfLines={1} style={styles.hudLabel}>
          {label}
        </Text>
      </View>
    </Pressable>
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
  hudCopy: { minWidth: 0, maxWidth: 110 },
  hudLabel: {
    fontSize: 7,
    lineHeight: 9,
    fontWeight: '900',
    textTransform: 'uppercase',
    color: '#CFC8E0',
  },
  hudOverlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 100,
    justifyContent: 'flex-start',
    paddingTop: 66,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(13, 9, 27, 0.66)',
  },
  hudPanel: {
    maxHeight: '76%',
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#A27AD0',
    backgroundColor: '#21183B',
    padding: 16,
    ...shadow,
  },
  hudPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  hudPanelEyebrow: { color: '#AFA5C6', fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  hudPanelTitle: { color: colors.white, fontFamily: 'Georgia', fontSize: 25, fontWeight: '800' },
  inventoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  inventoryItem: {
    width: '48%',
    minHeight: 104,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderRadius: 14,
    backgroundColor: '#2A2046',
    borderWidth: 1,
    borderColor: '#5F438B',
  },
  inventoryIcon: { fontSize: 25 },
  inventoryValue: { color: '#F3CB61', fontSize: 21, fontWeight: '900', marginTop: 3 },
  inventoryLabel: { color: '#CFC8E0', fontSize: 9, fontWeight: '800', marginTop: 2 },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  monthLabel: { color: '#F6EEDC', fontSize: 15, fontWeight: '800', textTransform: 'capitalize' },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  weekDay: {
    width: '14.285%',
    textAlign: 'center',
    color: '#AFA5C6',
    fontSize: 10,
    fontWeight: '900',
    marginBottom: 7,
  },
  calendarDay: {
    width: '14.285%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
  },
  calendarDayActive: { backgroundColor: '#F0C65B' },
  calendarDayText: { color: '#E8E0F2', fontSize: 13, fontWeight: '700' },
  calendarDayTextActive: { color: '#291641', fontWeight: '900' },
  streakTotals: { flexDirection: 'row', gap: 9, marginTop: 14 },
  streakTotalCard: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 12,
    padding: 10,
    backgroundColor: '#2A2046',
    borderWidth: 1,
    borderColor: '#5F438B',
  },
  streakTotalValue: { color: '#F3CB61', fontSize: 22, fontWeight: '900' },
  streakTotalLabel: { color: '#CFC8E0', fontSize: 8, fontWeight: '900', marginTop: 2 },
  levelScroll: { maxHeight: 480 },
  levelRow: {
    minHeight: 66,
    marginBottom: 8,
    padding: 9,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#5F438B',
    backgroundColor: '#2A2046',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  levelRowMilestone: { borderColor: '#F0C65B', backgroundColor: '#35264D' },
  levelBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#5F438B',
    borderWidth: 2,
    borderColor: '#C9A7ED',
  },
  levelBadgeText: { color: colors.white, fontSize: 16, fontWeight: '900' },
  levelCopy: { flex: 1 },
  levelTitle: { color: colors.white, fontSize: 13, fontWeight: '900' },
  levelReward: { color: '#E8D8A8', marginTop: 3, fontSize: 11, fontWeight: '700' },
  levelXp: { color: '#F3CB61', fontSize: 10, fontWeight: '900' },
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
