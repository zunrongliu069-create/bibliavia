import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card, Eyebrow, ProgressBar } from '../components/ui';
import { characterById, characters, rarityColors } from '../data/characters';
import { achievementsFor } from '../lib/achievements';
import { t } from '../lib/i18n';
import { levelProgressForXp, levelRewardFor, titleTierForLevel } from '../lib/level';
import { learningSequence } from '../lib/learningSequence';
import { masteryPercent, recallRisk, retrievability } from '../lib/scheduler';
import { prioritizedDueVerses, reviewHealth, type ReviewMode } from '../lib/reviewQueue';
import { colors, radius } from '../theme';
import type { Verse } from '../types';
import { useAppStore } from '../store/AppStore';

export function HomeScreen({
  onStart,
  onReview,
  onOpenCollection,
}: {
  onStart: (verse: Verse) => void;
  onReview: (mode: ReviewMode) => void;
  onOpenCollection: () => void;
}) {
  const store = useAppStore();
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const campaignVerses = store.availableVerses.filter(
    (verse) => verse.bookId === store.progress.activeCampaign,
  );
  const orderedVerses = learningSequence(store.availableVerses);
  const due = prioritizedDueVerses(
    orderedVerses,
    store.progress.mastery,
    store.progress.reviews,
    'full',
    now,
  );
  const health = reviewHealth(orderedVerses, store.progress.mastery, now);
  const firstNew = orderedVerses.find(
    (verse) => (store.progress.mastery[verse.id]?.successfulRecalls ?? 0) === 0,
  );
  const next = due[0] ?? firstNew ?? orderedVerses[0];
  const reviewsToday = store.progress.reviews.filter((review) =>
    review.reviewedAt.startsWith(today),
  );
  const dailyXp = reviewsToday.reduce((sum, review) => sum + review.xpAwarded, 0);
  const dailyGoal = 50;
  const perfectToday = reviewsToday.some(
    (review) =>
      review.accuracy >= 0.98 &&
      review.hintsUsed === 0 &&
      ['recall', 'speak'].includes(review.mode),
  );
  const learnedToday = reviewsToday.some(
    (review) => store.progress.mastery[review.verseId]?.successfulRecalls === 1,
  );
  const questDone = [reviewsToday.length >= 3, perfectToday, learnedToday].filter(Boolean).length;
  const atRisk = useMemo(
    () =>
      store.availableVerses
        .filter((verse) => (store.progress.mastery[verse.id]?.successfulRecalls ?? 0) > 0)
        .map((verse) => ({ verse, mastery: store.progress.mastery[verse.id]! }))
        .filter(({ mastery }) => retrievability(mastery, now) < 0.78)
        .sort((a, b) => retrievability(a.mastery, now) - retrievability(b.mastery, now))
        .slice(0, 3),
    [store.availableVerses, store.progress.mastery],
  );
  const levelState = levelProgressForXp(store.progress.xp);
  const level = levelState.level;
  const titleKey = (
    {
      1: 'levelTitleBeginner',
      5: 'levelTitleLearner',
      10: 'levelTitleWalker',
      20: 'levelTitleMaster',
      35: 'levelTitleScholar',
    } as const
  )[titleTierForLevel(level)];
  const unclaimedLevel = Array.from(
    { length: Math.max(0, level - 1) },
    (_, index) => index + 2,
  ).find((item) => !store.progress.claimedLevelRewards.includes(item));
  const levelReward = unclaimedLevel ? levelRewardFor(unclaimedLevel) : null;
  const readingRatio = store.availableVerses.length
    ? store.availableVerses.filter((verse) => store.progress.readVerseIds[verse.id]).length /
      store.availableVerses.length
    : 0;
  const memoryRatio = store.availableVerses.length
    ? store.availableVerses.reduce(
        (sum, verse) => sum + masteryPercent(store.progress.mastery[verse.id]) / 100,
        0,
      ) / store.availableVerses.length
    : 0;
  const understandingRatio = store.availableVerses.length
    ? store.availableVerses.reduce(
        (sum, verse) => sum + (store.progress.mastery[verse.id]?.understandingStrength ?? 0),
        0,
      ) / store.availableVerses.length
    : 0;
  const bibleMastery = readingRatio * 0.25 + memoryRatio * 0.6 + understandingRatio * 0.15;
  const targetCharacter = characterById(store.progress.targetCharacter);
  const targetShards = store.progress.characterShards[targetCharacter.id] ?? 0;
  const recallGap = campaignVerses
    .filter((verse) => {
      const item = store.progress.mastery[verse.id];
      return (
        (item?.successfulRecalls ?? 0) > 0 &&
        (item?.recognitionStrength ?? 0) - (item?.recallStrength ?? 0) > 0.18
      );
    })
    .sort(
      (a, b) =>
        (store.progress.mastery[b.id]?.recognitionStrength ?? 0) -
        (store.progress.mastery[b.id]?.recallStrength ?? 0) -
        ((store.progress.mastery[a.id]?.recognitionStrength ?? 0) -
          (store.progress.mastery[a.id]?.recallStrength ?? 0)),
    )[0];
  const coachVerse = due[0] ?? recallGap ?? firstNew ?? next;
  const coachMessage = due.length
    ? t(store.uiLanguage, 'coachDue')
    : recallGap
      ? t(store.uiLanguage, 'coachRecall')
      : t(store.uiLanguage, 'coachNew');
  const dueSoon = campaignVerses.filter((verse) => {
    const date = new Date(store.progress.mastery[verse.id]?.dueAt ?? 0).getTime();
    return date > now.getTime() && date <= now.getTime() + 3 * 86_400_000;
  }).length;
  const mistakeCount = store.progress.reviews.filter((review) => review.accuracy < 0.55).length;
  const strongCount = campaignVerses.filter((verse) =>
    ['strong', 'mastered'].includes(store.progress.mastery[verse.id]?.stage ?? 'new'),
  ).length;
  const achievements = achievementsFor(
    store.progress,
    store.availableVerses,
    Object.fromEntries(characters.map((item) => [item.id, item.unlockCost])),
  );

  return (
    <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
      <View style={styles.heroTop}>
        <View>
          <Text style={styles.logo}>SCRIPTORA</Text>
          <Text style={styles.greeting}>{t(store.uiLanguage, 'greeting')}</Text>
        </View>
        <View style={styles.avatar}>
          <Ionicons name="sparkles" size={22} color="#F2CB65" />
        </View>
      </View>
      <Card style={styles.levelCard}>
        <View style={styles.rowBetween}>
          <View>
            <Eyebrow>{t(store.uiLanguage, 'levelProgress').toUpperCase()}</Eyebrow>
            <Text style={styles.levelTitle}>
              {t(store.uiLanguage, 'level')} {level} · {t(store.uiLanguage, titleKey)}
            </Text>
          </View>
          <View style={styles.levelShield}>
            <Text style={styles.levelShieldText}>{level}</Text>
          </View>
        </View>
        <ProgressBar value={levelState.ratio} color={colors.primary} />
        <View style={styles.rowBetween}>
          <Text style={styles.levelXp}>
            {levelState.earnedInLevel} / {levelState.requiredInLevel} XP
          </Text>
          <Text style={styles.levelRemaining}>
            {Math.max(0, levelState.nextLevelXp - store.progress.xp)}{' '}
            {t(store.uiLanguage, 'xpToNextLevel')}
          </Text>
        </View>
        {unclaimedLevel && levelReward && (
          <View style={styles.levelReward}>
            <View style={styles.levelRewardIcon}>
              <Ionicons name="gift" size={24} color={colors.gold} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.levelRewardTitle}>
                {t(store.uiLanguage, 'levelReward')} · {t(store.uiLanguage, 'level')}{' '}
                {unclaimedLevel}
              </Text>
              <Text style={styles.levelRewardCopy}>
                🪙 +{levelReward.gold}
                {levelReward.shards
                  ? `  ·  🧩 +${levelReward.shards} ${t(store.uiLanguage, 'milestoneBonus')}`
                  : ''}
                {levelReward.wildShards ? `  ·  🃏 +${levelReward.wildShards}` : ''}
                {levelReward.streakFreezes ? `  ·  🛡️ +${levelReward.streakFreezes}` : ''}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t(store.uiLanguage, 'claimReward')}
              onPress={() => store.claimLevelReward(unclaimedLevel)}
              style={({ pressed }) => [styles.claimButton, pressed && { opacity: 0.82 }]}
            >
              <Text style={styles.claimButtonText}>{t(store.uiLanguage, 'claimReward')}</Text>
            </Pressable>
          </View>
        )}
      </Card>

      <Card style={styles.dailyCard}>
        <View style={styles.rowBetween}>
          <View>
            <Eyebrow>{t(store.uiLanguage, 'dailyGoal').toUpperCase()}</Eyebrow>
            <Text style={styles.dailyValue}>
              {Math.min(dailyXp, dailyGoal)} / {dailyGoal} XP
            </Text>
          </View>
          <View style={styles.goalIcon}>
            <Ionicons
              name={dailyXp >= dailyGoal ? 'checkmark' : 'flag'}
              size={23}
              color={dailyXp >= dailyGoal ? colors.white : colors.primary}
            />
          </View>
        </View>
        <ProgressBar
          value={dailyXp / dailyGoal}
          color={dailyXp >= dailyGoal ? colors.mint : colors.gold}
        />
        <Text style={styles.dailyHint}>
          {Math.max(0, dailyGoal - dailyXp)} {t(store.uiLanguage, 'xpRemaining')}
        </Text>
      </Card>

      <View style={styles.activityRow}>
        <MiniStat
          value={store.progress.activeDates.length}
          label={t(store.uiLanguage, 'daysActive')}
        />
        <MiniStat value={store.progress.streak} label={t(store.uiLanguage, 'currentStreak')} />
        <MiniStat value={store.progress.longestStreak} label={t(store.uiLanguage, 'bestStreak')} />
      </View>

      <Card style={styles.questCard}>
        <View style={styles.rowBetween}>
          <Eyebrow>{t(store.uiLanguage, 'todaysQuest')}</Eyebrow>
          <Text style={styles.questCount}>{questDone}/3</Text>
        </View>
        <ProgressBar value={questDone / 3} color={colors.mint} />
        <View style={styles.questList}>
          <Quest done={reviewsToday.length >= 3} label={t(store.uiLanguage, 'questReview')} />
          <Quest done={perfectToday} label={t(store.uiLanguage, 'questPerfect')} />
          <Quest done={learnedToday} label={t(store.uiLanguage, 'questNew')} />
        </View>
      </Card>

      <Card style={styles.coachCard}>
        <View style={styles.coachTop}>
          <View style={styles.coachIcon}>
            <Ionicons name="compass" size={25} color={colors.white} />
          </View>
          <View style={{ flex: 1 }}>
            <Eyebrow>{t(store.uiLanguage, 'memoryCoach').toUpperCase()}</Eyebrow>
            <Text style={styles.coachTitle}>{t(store.uiLanguage, 'coachReady')}</Text>
          </View>
        </View>
        <Text style={styles.coachMessage}>{coachMessage}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={coachVerse?.reference}
          disabled={!coachVerse}
          onPress={() => coachVerse && onStart(coachVerse)}
          style={styles.coachAction}
        >
          <Text style={styles.coachReference}>{coachVerse?.reference}</Text>
          <Ionicons name="arrow-forward-circle" size={26} color={colors.primary} />
        </Pressable>
        <View style={styles.radar}>
          <RadarStat
            icon="time"
            value={dueSoon}
            label={t(store.uiLanguage, 'dueSoon')}
            color={colors.gold}
          />
          <RadarStat
            icon="warning"
            value={mistakeCount}
            label={t(store.uiLanguage, 'weakWords')}
            color={colors.coral}
          />
          <RadarStat
            icon="shield-checkmark"
            value={strongCount}
            label={t(store.uiLanguage, 'strongVerses')}
            color={colors.mint}
          />
        </View>
      </Card>

      <View style={styles.reviewHealth}>
        <View style={styles.rowBetween}>
          <Eyebrow>{t(store.uiLanguage, 'reviewHealth').toUpperCase()}</Eyebrow>
          <Text style={styles.reviewHealthValue}>{health}%</Text>
        </View>
        <ProgressBar
          value={health / 100}
          color={health >= 80 ? colors.mint : health >= 50 ? colors.gold : colors.coral}
        />
      </View>
      <Pressable
        style={({ pressed }) => [
          styles.startCard,
          pressed && { opacity: 0.9 },
          !due.length && { opacity: 0.55 },
        ]}
        onPress={() => due.length && onReview('normal')}
        disabled={!due.length}
        accessibilityRole="button"
      >
        <View style={styles.startIcon}>
          <Ionicons name="play" size={24} color={colors.primary} />
        </View>
        <View style={styles.startCopy}>
          <Eyebrow>
            {due.length
              ? `${due.length} ${t(store.uiLanguage, 'dueReview')}`
              : t(store.uiLanguage, 'noDue')}
          </Eyebrow>
          <Text style={styles.startTitle}>{t(store.uiLanguage, 'normalReview')}</Text>
          <Text style={styles.startSub}>{due[0]?.reference ?? t(store.uiLanguage, 'noDue')}</Text>
        </View>
        <Ionicons name="chevron-forward" size={26} color={colors.white} />
      </Pressable>
      <View style={styles.reviewModes}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t(store.uiLanguage, 'quickPractice')}
          style={styles.quick}
          onPress={() => due.length && onReview('quick')}
          disabled={!due.length}
        >
          <View style={styles.quickIcon}>
            <Ionicons name="flash" size={22} color={colors.gold} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.quickTitle}>{t(store.uiLanguage, 'quickPractice')}</Text>
            <Text style={styles.quickSub}>{t(store.uiLanguage, 'reviewFive')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color={colors.primary} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t(store.uiLanguage, 'fullReview')}
          style={styles.quick}
          onPress={() => due.length && onReview('full')}
          disabled={!due.length}
        >
          <View style={styles.quickIcon}>
            <Ionicons name="albums" size={22} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.quickTitle}>{t(store.uiLanguage, 'fullReview')}</Text>
            <Text style={styles.quickSub}>
              {due.length} {t(store.uiLanguage, 'dueReview')}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color={colors.primary} />
        </Pressable>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t(store.uiLanguage, 'collection')}
        onPress={onOpenCollection}
        style={({ pressed }) => [styles.collectionCard, pressed && { opacity: 0.88 }]}
      >
        <View style={styles.collectionTop}>
          <Image
            source={targetCharacter.image}
            style={[styles.targetPortrait, { borderColor: rarityColors[targetCharacter.rarity] }]}
          />
          <View style={styles.collectionCopy}>
            <Eyebrow>{t(store.uiLanguage, 'collection').toUpperCase()}</Eyebrow>
            <Text style={styles.collectionTitle}>{targetCharacter.names[store.uiLanguage]}</Text>
            <Text style={[styles.targetRarity, { color: rarityColors[targetCharacter.rarity] }]}>
              {t(store.uiLanguage, targetCharacter.rarity).toUpperCase()}
            </Text>
          </View>
          <View style={styles.collectionRight}>
            <Text style={styles.gold}>🪙 {store.progress.gold}</Text>
            <Ionicons name="chevron-forward" size={24} color={colors.primary} />
          </View>
        </View>
        <View style={styles.masterySummary}>
          <Text style={styles.shardText}>
            {t(store.uiLanguage, 'bibleMastery')} {Math.round(bibleMastery * 100)}%
          </Text>
          <ProgressBar value={bibleMastery} color={colors.primary} />
        </View>
        <View style={styles.shards}>
          <Text style={styles.shardText}>
            🧩 {targetShards} / {targetCharacter.unlockCost} {t(store.uiLanguage, 'shards')}
          </Text>
          <ProgressBar
            value={targetShards / targetCharacter.unlockCost}
            color={rarityColors[targetCharacter.rarity]}
          />
        </View>
      </Pressable>

      <View style={styles.sectionTitle}>
        <Text style={styles.h2}>{t(store.uiLanguage, 'achievements')}</Text>
        <Text style={styles.achievementCount}>
          {achievements.filter((item) => item.complete).length}/{achievements.length}
        </Text>
      </View>
      <View style={styles.achievementGrid}>
        {achievements.slice(0, 4).map((item) => (
          <View key={item.id} style={[styles.achievement, item.complete && styles.achievementDone]}>
            <Text style={styles.achievementIcon}>{item.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.achievementTitle}>{t(store.uiLanguage, item.titleKey)}</Text>
              <Text numberOfLines={2} style={styles.achievementDescription}>
                {t(store.uiLanguage, item.descriptionKey)}
              </Text>
              <View style={styles.achievementBottom}>
                <Text style={styles.achievementProgress}>
                  {item.progress}/{item.target}
                </Text>
                {item.complete && (
                  <Ionicons name="checkmark-circle" size={17} color={colors.mint} />
                )}
              </View>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.sectionTitle}>
        <Text style={styles.h2}>{t(store.uiLanguage, 'atRisk')}</Text>
        <Ionicons name="shield-checkmark-outline" size={22} color={colors.mint} />
      </View>
      {atRisk.length ? (
        atRisk.map(({ verse, mastery }) => (
          <Pressable
            key={verse.id}
            accessibilityRole="button"
            accessibilityLabel={verse.reference}
            onPress={() => onStart(verse)}
          >
            <Card style={styles.riskCard}>
              <View style={styles.rowBetween}>
                <View>
                  <Text style={styles.reference}>{verse.reference}</Text>
                  <Text style={styles.riskReason}>{t(store.uiLanguage, 'whyDue')}</Text>
                </View>
                <Text style={styles.riskValue}>{100 - recallRisk(mastery, now)}%</Text>
              </View>
              <ProgressBar value={retrievability(mastery, now)} color={colors.coral} />
            </Card>
          </Pressable>
        ))
      ) : (
        <Card>
          <Text style={styles.empty}>{t(store.uiLanguage, 'weakEmpty')}</Text>
        </Card>
      )}
      <View style={{ height: 28 }} />
    </ScrollView>
  );
}

function Quest({ done, label }: { done: boolean; label: string }) {
  return (
    <View style={styles.quest}>
      <Ionicons
        name={done ? 'checkmark-circle' : 'ellipse-outline'}
        size={22}
        color={done ? colors.mint : colors.muted}
      />
      <Text style={[styles.questLabel, done && styles.questDone]}>{label}</Text>
    </View>
  );
}
function MiniStat({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.miniStat}>
      <Text style={styles.miniValue}>{value}</Text>
      <Text style={styles.miniLabel}>{label}</Text>
    </View>
  );
}
function RadarStat({
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
    <View style={styles.radarStat}>
      <Ionicons name={icon} size={18} color={color} />
      <Text style={styles.radarValue}>{value}</Text>
      <Text numberOfLines={2} style={styles.radarLabel}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { padding: 20, gap: 16 },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    backgroundColor: '#35205D',
    borderWidth: 2,
    borderBottomWidth: 5,
    borderColor: '#D0A64D',
    borderRadius: radius.lg,
    padding: 17,
  },
  logo: { fontSize: 13, fontWeight: '900', color: '#F2CB65', letterSpacing: 2.2 },
  greeting: { fontSize: 27, fontWeight: '900', color: colors.white, marginTop: 4 },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#7442C8',
    borderWidth: 2,
    borderColor: '#EAC764',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stats: {
    flexDirection: 'row',
    backgroundColor: '#17132E',
    borderWidth: 2,
    borderBottomWidth: 5,
    borderColor: '#7B4BBB',
    borderRadius: radius.lg,
    padding: 18,
    justifyContent: 'space-around',
  },
  stat: { flex: 1, alignItems: 'center', gap: 2, minHeight: 64 },
  statValue: { color: colors.white, fontSize: 22, fontWeight: '900' },
  statLabel: { color: '#BDBACD', fontSize: 11, fontWeight: '700', textAlign: 'center' },
  levelDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primary,
    borderWidth: 1,
    borderColor: '#F2CB65',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 3,
  },
  levelNumber: { color: colors.white, fontWeight: '900' },
  levelCard: { gap: 12, backgroundColor: '#F4F1FF' },
  levelTitle: { fontSize: 20, fontWeight: '900', color: colors.ink, marginTop: 4 },
  levelShield: {
    width: 48,
    height: 48,
    borderRadius: 15,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '4deg' }],
  },
  levelShieldText: { color: colors.white, fontSize: 22, fontWeight: '900' },
  levelXp: { fontSize: 11, fontWeight: '900', color: colors.primary },
  levelRemaining: { fontSize: 10, fontWeight: '700', color: colors.muted },
  levelReward: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: 11,
    borderWidth: 1,
    borderColor: '#E6DCF8',
  },
  levelRewardIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFF6D7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelRewardTitle: { fontSize: 12, fontWeight: '900', color: colors.ink },
  levelRewardCopy: { fontSize: 11, fontWeight: '800', color: colors.gold, marginTop: 3 },
  claimButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  claimButtonText: { color: colors.white, fontSize: 10, fontWeight: '900' },
  dailyCard: { gap: 12 },
  dailyValue: { fontSize: 20, fontWeight: '900', color: colors.ink, marginTop: 4 },
  goalIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dailyHint: { fontSize: 11, color: colors.muted },
  activityRow: { flexDirection: 'row', gap: 8 },
  miniStat: {
    flex: 1,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    padding: 11,
    alignItems: 'center',
  },
  miniValue: { fontSize: 20, fontWeight: '900', color: colors.ink },
  miniLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: colors.muted,
    textAlign: 'center',
    marginTop: 3,
  },
  questCard: { gap: 14 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  questCount: { fontWeight: '900', color: colors.mint },
  questList: { gap: 9 },
  quest: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  questLabel: { fontSize: 14, color: colors.inkSoft, fontWeight: '600' },
  questDone: { textDecorationLine: 'line-through', color: colors.muted },
  coachCard: { gap: 13, backgroundColor: '#F1EEFF' },
  coachTop: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  coachIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coachTitle: { fontSize: 18, fontWeight: '900', color: colors.ink, marginTop: 3 },
  coachMessage: { fontSize: 14, lineHeight: 21, color: colors.inkSoft },
  coachAction: {
    minHeight: 52,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.primarySoft,
  },
  coachReference: { fontSize: 16, fontWeight: '900', color: colors.primary },
  radar: { flexDirection: 'row', gap: 8 },
  radarStat: {
    flex: 1,
    minHeight: 82,
    backgroundColor: colors.white,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 7,
  },
  radarValue: { fontSize: 18, fontWeight: '900', color: colors.ink, marginTop: 2 },
  radarLabel: { fontSize: 9, fontWeight: '700', color: colors.muted, textAlign: 'center' },
  reviewHealth: {
    gap: 9,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    padding: 14,
  },
  reviewHealthValue: { fontSize: 18, fontWeight: '900', color: colors.ink },
  reviewModes: { gap: 9 },
  startCard: {
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  startIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startCopy: { flex: 1 },
  startTitle: { color: colors.white, fontSize: 17, fontWeight: '900', marginTop: 4 },
  startSub: { color: '#DCD7FF', fontSize: 13, marginTop: 3 },
  quick: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quickIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF5D9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickTitle: { fontSize: 15, fontWeight: '900', color: colors.ink },
  quickSub: { fontSize: 12, color: colors.muted, marginTop: 3 },
  collectionCard: {
    gap: 13,
    backgroundColor: '#FFFAE9',
    borderRadius: radius.md,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.line,
  },
  collectionTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  targetPortrait: { width: 64, height: 76, borderRadius: radius.sm, borderWidth: 2 },
  collectionCopy: { flex: 1 },
  collectionRight: { alignItems: 'flex-end', gap: 12 },
  collectionTitle: { fontSize: 18, fontWeight: '900', color: colors.ink, marginTop: 4 },
  targetRarity: { fontSize: 10, fontWeight: '900', marginTop: 3, letterSpacing: 0.8 },
  gold: { fontSize: 16, fontWeight: '900', color: colors.gold },
  masterySummary: { gap: 7 },
  shards: { gap: 7 },
  shardText: { fontSize: 12, fontWeight: '800', color: colors.inkSoft },
  sectionTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  h2: { fontSize: 19, fontWeight: '900', color: colors.ink },
  achievementCount: { fontSize: 13, fontWeight: '900', color: colors.primary },
  achievementGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  achievement: {
    width: '48%',
    flexGrow: 1,
    minHeight: 112,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    padding: 12,
    flexDirection: 'row',
    gap: 9,
    opacity: 0.72,
  },
  achievementDone: { opacity: 1, borderColor: colors.mint, backgroundColor: colors.mintSoft },
  achievementIcon: { fontSize: 25 },
  achievementTitle: { fontSize: 13, fontWeight: '900', color: colors.ink },
  achievementDescription: { fontSize: 10, lineHeight: 14, color: colors.muted, marginTop: 3 },
  achievementBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 7,
  },
  achievementProgress: { fontSize: 10, fontWeight: '900', color: colors.primary },
  riskCard: { gap: 12, marginBottom: 10 },
  reference: { fontWeight: '900', color: colors.ink, fontSize: 16 },
  riskReason: { fontSize: 12, color: colors.muted, marginTop: 3, maxWidth: 240 },
  riskValue: { fontSize: 19, fontWeight: '900', color: colors.coral },
  empty: { color: colors.muted, textAlign: 'center', lineHeight: 21 },
});
