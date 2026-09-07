import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, Card, Eyebrow, ProgressBar } from '../components/ui';
import { characterById, characters, rarityColors } from '../data/characters';
import { getReferencedPassage } from '../data/content';
import { biblePeriods, highestUnlockedPeriodForLevel } from '../data/periods';
import { beatTitle, pathDefinitions, pathTitle } from '../data/paths';
import { readingPlanById } from '../data/readingPlans';
import { achievementsFor } from '../lib/achievements';
import {
  ACHIEVEMENT_REWARDS,
  DAILY_GOAL_REWARD,
  DAILY_GOAL_XP,
  DAILY_QUEST_REWARD,
  activityDay,
} from '../lib/activityRewards';
import { t } from '../lib/i18n';
import { uiText } from '../lib/uiText';
import { levelProgressForXp, levelRewardFor, titleTierForLevel } from '../lib/level';
import { learningSequence } from '../lib/learningSequence';
import { masteryPercent, recallRisk, retrievability } from '../lib/scheduler';
import { nextPathBeat, pathProgressRatio, recallEligibleVerses } from '../lib/pathProgress';
import { nextPathAction, pathResumeSummary } from '../lib/pathGuidance';
import { prioritizedDueVerses, reviewHealth, type ReviewMode } from '../lib/reviewQueue';
import { colors, radius } from '../theme';
import type { Verse } from '../types';
import { useAppStore } from '../store/AppStore';

export function HomeScreen({
  onStart,
  onReview,
  onOpenCollection,
  onOpenVerses,
  onOpenPaths,
}: {
  onStart: (verse: Verse) => void;
  onReview: (mode: ReviewMode) => void;
  onOpenCollection: () => void;
  onOpenVerses: () => void;
  onOpenPaths: () => void;
}) {
  const store = useAppStore();
  const [showMore, setShowMore] = useState(false);
  const u = (text: string) => uiText(store.uiLanguage, text);
  const now = new Date();
  const today = activityDay(now);
  const campaignVerses = store.availableVerses.filter(
    (verse) => verse.bookId === store.progress.activeCampaign,
  );
  const orderedVerses = learningSequence(store.availableVerses);
  const allPaths = pathDefinitions;
  const homePaths = (store.progress.activePathIds ?? [])
    .map((id) => allPaths.find((path) => path.id === id))
    .filter((path): path is NonNullable<typeof path> => Boolean(path))
    .slice(0, 3);
  const focusedPath =
    allPaths.find((path) => path.id === store.progress.focusedPathId) ?? homePaths[0];
  const focusedBeat = focusedPath
    ? nextPathBeat(focusedPath, store.progress.pathStates?.[focusedPath.id])
    : undefined;
  const focusedPathState = focusedPath ? store.progress.pathStates?.[focusedPath.id] : undefined;
  const focusedAction = focusedPath
    ? nextPathAction(focusedPath, focusedPathState, store.uiLanguage)
    : undefined;
  const focusedReference =
    focusedBeat?.passage ?? focusedBeat?.passages?.[0] ?? focusedPath?.passage;
  const focusedVerses =
    focusedPath && focusedReference
      ? getReferencedPassage(focusedPath.bibleVersionId ?? store.translationId, focusedReference)
      : [];
  const recallVerses = recallEligibleVerses(
    pathDefinitions,
    store.progress.pathStates,
    orderedVerses,
  );
  const due = prioritizedDueVerses(
    recallVerses,
    store.progress.mastery,
    store.progress.reviews,
    'full',
    now,
  );
  const health = reviewHealth(recallVerses, store.progress.mastery, now);
  const firstNew = (focusedVerses.length ? focusedVerses : orderedVerses).find(
    (verse) =>
      !store.progress.completedLessonIds.includes(verse.id) &&
      (store.progress.mastery[verse.id]?.successfulRecalls ?? 0) === 0,
  );
  const next = due[0] ?? firstNew ?? orderedVerses[0];
  const reviewsToday = store.progress.reviews.filter(
    (review) => activityDay(new Date(review.reviewedAt)) === today,
  );
  const dailyXp = store.progress.dailyXp[today] ?? 0;
  const dailyGoal = DAILY_GOAL_XP;
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
  const todayComplete = dailyXp >= dailyGoal && questDone === 3;
  const dailyFocus =
    reviewsToday.length < 3
      ? {
          label: t(store.uiLanguage, 'questReview'),
          action: () => (due.length ? onReview('quick') : next && onStart(next)),
        }
      : !perfectToday
        ? { label: t(store.uiLanguage, 'questPerfect'), action: () => next && onStart(next) }
        : { label: t(store.uiLanguage, 'questNew'), action: () => next && onStart(next) };
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
  const currentPeriod = biblePeriods[highestUnlockedPeriodForLevel(level) - 1]!;
  const activePlan = store.progress.activeReadingPlanId
    ? readingPlanById(store.progress.activeReadingPlanId)
    : undefined;
  const activePlanProgress = activePlan
    ? store.progress.readingPlanProgress[activePlan.id]
    : undefined;
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
  const continueVerse = firstNew ?? due[0] ?? recallGap ?? orderedVerses[0];
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
          <Text style={styles.logo}>BIBLIAVIA</Text>
          <Text style={styles.greeting}>{t(store.uiLanguage, 'greeting')}</Text>
        </View>
        <View style={styles.avatar}>
          <Ionicons name="sparkles" size={22} color="#F2CB65" />
        </View>
      </View>

      <View style={styles.todayActions}>
        <View style={styles.todayActionColumn}>
          <Text style={styles.homeSectionLabel}>{u('CONTINUE TODAY')}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              focusedPath && focusedAction
                ? `${focusedAction.label}: ${focusedAction.detail}`
                : todayComplete
                  ? u("Today's goals complete")
                  : `Continue ${continueVerse?.reference ?? ''}`
            }
            disabled={!focusedPath && !continueVerse}
            onPress={() => {
              if (focusedPath) {
                store.focusPath(focusedPath.id);
                onOpenPaths();
              } else if (continueVerse) onStart(continueVerse);
            }}
            style={({ pressed }) => [styles.continueToday, pressed && { opacity: 0.86 }]}
          >
            <View style={styles.continueIcon}>
              <Ionicons name={todayComplete ? 'checkmark' : 'play'} size={21} color="#2B1748" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.continueTitle} numberOfLines={1}>
                {focusedPath && focusedAction
                  ? `${focusedAction.label}: ${focusedAction.detail}`
                  : todayComplete
                    ? u("Today's goals complete")
                    : (continueVerse?.reference ?? u('Choose a verse'))}
              </Text>
              <Text style={styles.continueSub} numberOfLines={2}>
                {focusedPath
                  ? `${pathTitle(focusedPath, store.uiLanguage)} · ${pathResumeSummary(focusedPath, focusedPathState, store.uiLanguage)}`
                  : todayComplete
                    ? `${u('Continue optionally with')} ${continueVerse?.reference ?? ''}`
                    : u('Continue your next focused activity')}
              </Text>
            </View>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={u("Read today's passage")}
            onPress={onOpenVerses}
            style={({ pressed }) => [styles.readToday, pressed && { opacity: 0.86 }]}
          >
            <View style={styles.readTodayIcon}>
              <Ionicons name="book-outline" size={19} color={colors.primary} />
            </View>
            <Text style={styles.readTodayTitle} numberOfLines={2}>
              {u("Read today's passage")}
            </Text>
          </Pressable>
        </View>

        <View style={styles.todayActionColumn}>
          <Text style={styles.homeSectionLabel}>{u('QUICK ACTIONS')}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t(store.uiLanguage, 'quickPractice')}
            style={styles.quick}
            onPress={() => due.length && onReview('quick')}
            disabled={!due.length}
          >
            <View style={styles.quickIcon}>
              <Ionicons name="flash" size={20} color={colors.gold} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.quickTitle}>{t(store.uiLanguage, 'quickPractice')}</Text>
              <Text style={styles.quickSub}>{t(store.uiLanguage, 'reviewFive')}</Text>
            </View>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t(store.uiLanguage, 'fullReview')}
            style={styles.quick}
            onPress={() => due.length && onReview('full')}
            disabled={!due.length}
          >
            <View style={styles.quickIcon}>
              <Ionicons name="albums" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.quickTitle}>{t(store.uiLanguage, 'fullReview')}</Text>
              <Text style={styles.quickSub}>
                {due.length} {t(store.uiLanguage, 'dueReview')}
              </Text>
            </View>
          </Pressable>
        </View>
      </View>

      {homePaths.length > 0 && (
        <View style={styles.homePaths}>
          <View style={styles.rowBetween}>
            <Text style={styles.homeSectionLabel}>{u('YOUR NEXT STEPS')}</Text>
            <Pressable accessibilityRole="button" onPress={onOpenPaths}>
              <Text style={styles.pathsLink}>{u('View Paths')} →</Text>
            </Pressable>
          </View>
          {homePaths.map((path) => {
            const state = store.progress.pathStates?.[path.id];
            return (
              <Pressable
                key={path.id}
                accessibilityRole="button"
                accessibilityLabel={`${pathTitle(path, store.uiLanguage)}. ${Math.round(pathProgressRatio(path, state) * 100)}%`}
                onPress={onOpenPaths}
                style={styles.homePathCard}
              >
                <View style={styles.homePathIcon}>
                  <Ionicons name="navigate" size={18} color={colors.white} />
                </View>
                <View style={styles.homePathCopy}>
                  <Text numberOfLines={1} style={styles.homePathTitle}>
                    {pathTitle(path, store.uiLanguage)}
                  </Text>
                  <Text numberOfLines={1} style={styles.homePathDetail}>
                    {(nextPathBeat(path, state) &&
                      beatTitle(nextPathBeat(path, state)!, store.uiLanguage)) ??
                      u('Path complete')}
                  </Text>
                  <ProgressBar value={pathProgressRatio(path, state)} color={colors.gold} />
                </View>
                <Text style={styles.homePathPercent}>
                  {Math.round(pathProgressRatio(path, state) * 100)}%
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

      <Text style={styles.homeSectionLabel}>{u("TODAY'S PROGRESS")}</Text>
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
                {unclaimedLevel % 60 === 0 ? `  ·  ◆ +1 ${u('Fragment')}` : ''}
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
        <View style={styles.progressDivider} />
        <View style={styles.compactProgressRow}>
          <View style={styles.compactProgressCopy}>
            <Text style={styles.compactProgressTitle}>
              {t(store.uiLanguage, 'dailyGoal').toUpperCase()}
            </Text>
            <Text style={styles.compactProgressValue}>
              {Math.min(dailyXp, dailyGoal)} / {dailyGoal} XP
            </Text>
          </View>
          <View style={styles.compactBar}>
            <ProgressBar
              value={dailyXp / dailyGoal}
              color={dailyXp >= dailyGoal ? colors.mint : colors.gold}
            />
          </View>
          <Ionicons
            name={dailyXp >= dailyGoal ? 'checkmark-circle' : 'flag-outline'}
            size={20}
            color={dailyXp >= dailyGoal ? colors.mint : colors.gold}
          />
        </View>
        <View style={styles.compactProgressRow}>
          <View style={styles.compactProgressCopy}>
            <Text style={styles.compactProgressTitle}>{t(store.uiLanguage, 'todaysQuest')}</Text>
            <Text style={styles.compactProgressValue}>{questDone}/3</Text>
          </View>
          <View style={styles.compactBar}>
            <ProgressBar value={questDone / 3} color={colors.mint} />
          </View>
          <Ionicons
            name={questDone === 3 ? 'checkmark-circle' : 'list-outline'}
            size={20}
            color={questDone === 3 ? colors.mint : colors.primary}
          />
        </View>
        {dailyXp >= dailyGoal && !store.progress.claimedDailyGoals.includes(today) && (
          <Button
            label={`${t(store.uiLanguage, 'claimReward')} · 🪙 ${DAILY_GOAL_REWARD.gold}`}
            variant="secondary"
            onPress={store.claimDailyGoalReward}
          />
        )}
        {questDone === 3 && !store.progress.claimedDailyQuests.includes(today) && (
          <Button
            label={`${t(store.uiLanguage, 'claimReward')} · 🪙 ${DAILY_QUEST_REWARD.gold}`}
            variant="secondary"
            onPress={store.claimDailyQuestReward}
          />
        )}
      </Card>

      <Pressable
        accessibilityRole="button"
        onPress={() => setShowMore((value) => !value)}
        style={styles.moreButton}
      >
        <Text style={styles.moreButtonText}>{u(showMore ? 'Show less' : 'Show more')}</Text>
        <Ionicons
          name={showMore ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={colors.primary}
        />
      </Pressable>

      {showMore && (
        <>
          <View style={styles.activityRow}>
            <MiniStat
              value={store.progress.activeDates.length}
              label={t(store.uiLanguage, 'daysActive')}
            />
            <MiniStat value={store.progress.streak} label={t(store.uiLanguage, 'currentStreak')} />
            <MiniStat
              value={store.progress.longestStreak}
              label={t(store.uiLanguage, 'bestStreak')}
            />
          </View>
          <Card style={styles.questCard}>
            <View style={styles.rowBetween}>
              <Eyebrow>{t(store.uiLanguage, 'todaysQuest')}</Eyebrow>
              <Text style={styles.questCount}>{questDone}/3</Text>
            </View>
            {questDone < 3 && (
              <Pressable
                accessibilityRole="button"
                onPress={dailyFocus.action}
                style={styles.focus}
              >
                <Ionicons name="sparkles" size={19} color={colors.primary} />
                <View style={styles.focusCopy}>
                  <Text style={styles.focusEyebrow}>{u("TODAY'S FOCUS")}</Text>
                  <Text style={styles.focusTitle}>{dailyFocus.label}</Text>
                  <Text style={styles.focusHint}>{u("Optional · advances today's quest")}</Text>
                </View>
                <Ionicons name="arrow-forward" size={18} color={colors.primary} />
              </Pressable>
            )}
            <View style={styles.questList}>
              <Quest done={reviewsToday.length >= 3} label={t(store.uiLanguage, 'questReview')} />
              <Quest done={perfectToday} label={t(store.uiLanguage, 'questPerfect')} />
              <Quest done={learnedToday} label={t(store.uiLanguage, 'questNew')} />
            </View>
          </Card>
          <Text style={styles.homeSectionLabel}>{u('MEMORIZATION PROGRESS')}</Text>
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
              <Text style={styles.startSub}>
                {due[0]?.reference ?? t(store.uiLanguage, 'noDue')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={26} color={colors.white} />
          </Pressable>
          <Text style={styles.homeSectionLabel}>{u('CHARACTER + CURRENT PERIOD')}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t(store.uiLanguage, 'collection')}
            onPress={onOpenCollection}
            style={({ pressed }) => [styles.collectionCard, pressed && { opacity: 0.88 }]}
          >
            <View style={styles.collectionTop}>
              <Image
                source={targetCharacter.image}
                style={[
                  styles.targetPortrait,
                  { borderColor: rarityColors[targetCharacter.rarity] },
                ]}
              />
              <View style={styles.collectionCopy}>
                <Eyebrow>{t(store.uiLanguage, 'collection').toUpperCase()}</Eyebrow>
                <Text style={styles.collectionTitle}>
                  {targetCharacter.names[store.uiLanguage]}
                </Text>
                <Text style={styles.currentPeriodText}>
                  {currentPeriod.icon} {currentPeriod.names[store.uiLanguage]}
                </Text>
                <Text
                  style={[styles.targetRarity, { color: rarityColors[targetCharacter.rarity] }]}
                >
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

          <Text style={styles.homeSectionLabel}>{u('READING PLAN')}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={u('Choose a Reading Plan')}
            onPress={onOpenVerses}
            style={({ pressed }) => [styles.readingPlanCard, pressed && { opacity: 0.86 }]}
          >
            <View
              style={[styles.planIcon, { backgroundColor: activePlan?.color ?? colors.primary }]}
            >
              <Text style={styles.planIconText}>{activePlan?.icon ?? '📖'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.planEyebrow}>
                {u(activePlan ? 'CONTINUE READING' : 'START A CHALLENGE')}
              </Text>
              <Text style={styles.planTitle}>
                {activePlan?.title[store.uiLanguage] ?? u('Choose a Reading Plan')}
              </Text>
              <Text style={styles.planSub}>
                {activePlan && activePlanProgress
                  ? `${activePlanProgress.completedDays.length}/${activePlan.durationDays} daily goals complete`
                  : 'Visual goals · daily progress · rewards'}
              </Text>
              {activePlan && activePlanProgress && (
                <ProgressBar
                  value={activePlanProgress.completedDays.length / activePlan.durationDays}
                  color={activePlan.color}
                />
              )}
            </View>
            <Ionicons name="chevron-forward" size={23} color={colors.primary} />
          </Pressable>

          <Text style={styles.homeSectionLabel}>{u('RECOMMENDED')}</Text>
          <View style={styles.sectionTitle}>
            <Text style={styles.h2}>{t(store.uiLanguage, 'achievements')}</Text>
            <Text style={styles.achievementCount}>
              {achievements.filter((item) => item.complete).length}/{achievements.length}
            </Text>
          </View>
          <View style={styles.achievementGrid}>
            {achievements.map((item) => (
              <View
                key={item.id}
                style={[styles.achievement, item.complete && styles.achievementDone]}
              >
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
                  {item.complete && ACHIEVEMENT_REWARDS[item.id] && (
                    <Pressable
                      accessibilityRole="button"
                      disabled={store.progress.claimedAchievements.includes(item.id)}
                      onPress={() => store.claimAchievementReward(item.id)}
                      style={styles.achievementClaim}
                    >
                      <Text style={styles.achievementClaimText}>
                        {store.progress.claimedAchievements.includes(item.id)
                          ? u('Reward claimed')
                          : `${t(store.uiLanguage, 'claimReward')} · 🪙 ${ACHIEVEMENT_REWARDS[item.id]!.gold}${ACHIEVEMENT_REWARDS[item.id]!.fragments ? ` · ◆ ${ACHIEVEMENT_REWARDS[item.id]!.fragments}` : ''}`}
                      </Text>
                    </Pressable>
                  )}
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
        </>
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
  homeSectionLabel: {
    marginTop: 4,
    color: colors.primary,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.1,
  },
  todayActions: { flexDirection: 'row', alignItems: 'stretch', gap: 9 },
  todayActionColumn: { flex: 1, gap: 7 },
  homePaths: {
    gap: 9,
    padding: 13,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: '#C5A55F',
    backgroundColor: '#FFF7E5',
  },
  pathsLink: { color: colors.primary, fontSize: 11, fontWeight: '900' },
  homePathCard: {
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
  },
  homePathIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  homePathCopy: { flex: 1, gap: 3 },
  homePathTitle: { color: colors.ink, fontSize: 13, fontWeight: '900' },
  homePathDetail: { color: colors.muted, fontSize: 10 },
  homePathPercent: { color: colors.primary, fontSize: 13, fontWeight: '900' },
  continueToday: {
    minHeight: 79,
    borderRadius: radius.lg,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F2CA60',
    borderWidth: 1,
    borderColor: '#AE7926',
  },
  continueIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF8DF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueTitle: { color: '#2B1748', fontSize: 14, fontWeight: '900' },
  continueSub: { color: '#644C2F', fontSize: 9, lineHeight: 12, marginTop: 2 },
  readToday: {
    minHeight: 58,
    borderRadius: radius.lg,
    padding: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
  },
  readTodayIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  readTodayTitle: { flex: 1, color: colors.ink, fontSize: 12, fontWeight: '900' },
  readTodaySub: { color: colors.muted, fontSize: 10, marginTop: 3 },
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
  progressDivider: { height: 1, backgroundColor: colors.line, marginVertical: 2 },
  compactProgressRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  compactProgressCopy: { width: 104 },
  compactProgressTitle: { color: colors.muted, fontSize: 9, fontWeight: '900' },
  compactProgressValue: { color: colors.ink, fontSize: 12, fontWeight: '900', marginTop: 1 },
  compactBar: { flex: 1 },
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
  moreButton: {
    minHeight: 42,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  moreButtonText: { color: colors.primary, fontWeight: '900' },
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
  focus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 11,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },
  focusCopy: { flex: 1, gap: 1 },
  focusEyebrow: { color: colors.primary, fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
  focusTitle: { color: colors.ink, fontSize: 13, fontWeight: '900' },
  focusHint: { color: colors.muted, fontSize: 10 },
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
  currentPeriodText: { color: colors.inkSoft, fontSize: 10, fontWeight: '800', marginTop: 2 },
  targetRarity: { fontSize: 10, fontWeight: '900', marginTop: 3, letterSpacing: 0.8 },
  gold: { fontSize: 16, fontWeight: '900', color: colors.gold },
  masterySummary: { gap: 7 },
  shards: { gap: 7 },
  shardText: { fontSize: 12, fontWeight: '800', color: colors.inkSoft },
  readingPlanCard: {
    minHeight: 92,
    borderRadius: radius.lg,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F7F1FF',
    borderWidth: 1,
    borderColor: '#D8C8ED',
  },
  planIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planIconText: { fontSize: 25 },
  planEyebrow: { color: colors.primary, fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  planTitle: { color: colors.ink, fontSize: 16, fontWeight: '900', marginTop: 2 },
  planSub: { color: colors.muted, fontSize: 10, marginTop: 3, marginBottom: 6 },
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
  achievementClaim: {
    alignSelf: 'flex-start',
    marginTop: 7,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  achievementClaimText: { color: colors.primary, fontSize: 9, fontWeight: '900' },
  achievementProgress: { fontSize: 10, fontWeight: '900', color: colors.primary },
  riskCard: { gap: 12, marginBottom: 10 },
  reference: { fontWeight: '900', color: colors.ink, fontSize: 16 },
  riskReason: { fontSize: 12, color: colors.muted, marginTop: 3, maxWidth: 240 },
  riskValue: { fontSize: 19, fontWeight: '900', color: colors.coral },
  empty: { color: colors.muted, textAlign: 'center', lineHeight: 21 },
});
