import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { verses, versesForTranslation } from '../data/content';
import { characters } from '../data/characters';
import { PERIOD_MASTERY_RATIO } from '../data/periods';
import { initialMastery, scheduleReview } from '../lib/scheduler';
import { calculateXp, dailyXpAward } from '../lib/xp';
import { chestRewardFor } from '../lib/rewards';
import { levelForXp, levelRewardFor } from '../lib/level';
import { dailyFreeOfferFor, priceForShopItem } from '../lib/shop';
import type {
  CampaignId,
  CharacterId,
  ChestReward,
  ExerciseMode,
  ReviewGrade,
  ShopItem,
  UiLanguage,
  UserProgress,
  Verse,
} from '../types';

const STORAGE_KEY = 'scriptora/state/v2';
const PREVIOUS_STORAGE_KEY = 'scriptora/state/v1';
const LEGACY_STORAGE_KEY = 'memora/state/v3';
type StoredState = {
  version: 2;
  uiLanguage: UiLanguage;
  translationId: string;
  progress: UserProgress;
};

const makeProgress = (): UserProgress => ({
  retentionModelVersion: 1,
  xp: 0,
  gold: 0,
  streak: 0,
  longestStreak: 0,
  activeDates: [],
  lastPracticeDate: null,
  activeCampaign: 'romans',
  pathChapter: { romans: 1, proverbs: 1 },
  chapterOneStartVersion: 1,
  lessonProgress: {},
  characterShards: { adam: 0 },
  wildShards: 0,
  streakFreezes: 0,
  xpBoosters: {},
  goldBoosters: {},
  activeXpBoosterUntil: null,
  activeGoldBoosterUntil: null,
  collectionInitialized: true,
  targetCharacter: 'adam',
  openedChests: {},
  claimedStageRewards: {},
  claimedLevelRewards: [1],
  claimedPeriodMastery: [],
  dailyXp: {},
  lastDailyFreeClaim: null,
  rewardHistory: [],
  readVerseIds: {},
  activeReadingPlanId: null,
  readingPlanProgress: {},
  mastery: Object.fromEntries(verses.map((verse) => [verse.id, initialMastery(verse.id)])),
  reviews: [],
});

export const createInitialProgress = (): UserProgress => makeProgress();
const initialState = (): StoredState => ({
  version: 2,
  uiLanguage: 'zh-Hans',
  translationId: 'cuv-s',
  progress: makeProgress(),
});
const localDay = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const compatibleCampaign = (translationId: string, current: CampaignId): CampaignId => {
  const available = versesForTranslation(translationId);
  if (available.some((verse) => verse.bookId === current)) return current;
  return available.some((verse) => verse.bookId === 'romans')
    ? 'romans'
    : available.some((verse) => verse.bookId === 'proverbs')
      ? 'proverbs'
      : current;
};

interface AppStoreValue extends StoredState {
  hydrated: boolean;
  availableVerses: Verse[];
  setUiLanguage: (language: UiLanguage) => void;
  setTranslationId: (translationId: string) => void;
  setCampaign: (campaignId: CampaignId) => void;
  setPathChapter: (campaignId: CampaignId, chapter: number) => void;
  recordReview: (input: {
    verse: Verse;
    grade: ReviewGrade;
    mode: ExerciseMode;
    accuracy: number;
    hintsUsed: number;
    recallMs: number;
    xpOverride?: number;
  }) => number;
  setLessonProgress: (lessonId: string, exerciseIndex: number) => void;
  openChest: (rewardId: string, tier: number) => ChestReward;
  setTargetCharacter: (characterId: CharacterId) => void;
  buyCharacterShards: (characterId: CharacterId) => void;
  applyWildShard: (characterId: CharacterId) => void;
  buyShopItem: (item: ShopItem) => void;
  activateBooster: (type: 'xpBooster' | 'goldBooster', durationMinutes: 15 | 30 | 60) => void;
  claimLevelReward: (level: number) => void;
  claimPeriodMastery: (periodId: import('../types').BiblePeriodId) => void;
  claimDailyFree: () => void;
  recordReading: (items: Verse[]) => void;
  startReadingPlan: (planId: string) => void;
  completeReadingPlanDay: (planId: string, day: number) => void;
  toggleReadingPlanPause: (planId: string) => void;
  resetProgress: () => void;
}

const AppStore = createContext<AppStoreValue | null>(null);

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<StoredState>(initialState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(STORAGE_KEY),
      AsyncStorage.getItem(PREVIOUS_STORAGE_KEY),
      AsyncStorage.getItem(LEGACY_STORAGE_KEY),
    ])
      .then(([currentRaw, previousRaw, legacyRaw]) => {
        const raw = currentRaw ?? previousRaw ?? legacyRaw;
        if (raw) {
          const saved = { ...(JSON.parse(raw) as StoredState), version: 2 as const };
          saved.progress.pathChapter = saved.progress.pathChapter ?? { romans: 1, proverbs: 1 };
          if ((saved.progress.chapterOneStartVersion ?? 0) < 1) {
            saved.progress.pathChapter = { ...saved.progress.pathChapter, romans: 1, proverbs: 1 };
            saved.progress.chapterOneStartVersion = 1;
          }
          saved.progress.lessonProgress = saved.progress.lessonProgress ?? {};
          saved.progress.gold = saved.progress.gold ?? 0;
          saved.progress.activeDates =
            saved.progress.activeDates ??
            (saved.progress.lastPracticeDate ? [saved.progress.lastPracticeDate] : []);
          if (!saved.progress.collectionInitialized) {
            saved.progress.characterShards = { adam: 0 };
            saved.progress.targetCharacter = 'adam';
            saved.progress.collectionInitialized = true;
          }
          saved.progress.characterShards = saved.progress.characterShards ?? { adam: 0 };
          saved.progress.wildShards = saved.progress.wildShards ?? 0;
          saved.progress.streakFreezes = saved.progress.streakFreezes ?? 0;
          saved.progress.xpBoosters = saved.progress.xpBoosters ?? {};
          saved.progress.goldBoosters = saved.progress.goldBoosters ?? {};
          saved.progress.activeXpBoosterUntil = saved.progress.activeXpBoosterUntil ?? null;
          saved.progress.activeGoldBoosterUntil = saved.progress.activeGoldBoosterUntil ?? null;
          saved.progress.targetCharacter = (saved.progress.targetCharacter ??
            'adam') as CharacterId;
          saved.progress.openedChests = saved.progress.openedChests ?? {};
          saved.progress.claimedStageRewards = saved.progress.claimedStageRewards ?? {};
          if (!saved.progress.claimedLevelRewards) {
            const currentLevel = levelForXp(saved.progress.xp ?? 0);
            saved.progress.claimedLevelRewards = Array.from(
              { length: Math.max(1, currentLevel - 1) },
              (_, index) => index + 1,
            );
          }
          saved.progress.claimedPeriodMastery = saved.progress.claimedPeriodMastery ?? [];
          saved.progress.dailyXp = saved.progress.dailyXp ?? {};
          saved.progress.lastDailyFreeClaim = saved.progress.lastDailyFreeClaim ?? null;
          saved.progress.rewardHistory = saved.progress.rewardHistory ?? [];
          saved.progress.readVerseIds = saved.progress.readVerseIds ?? {};
          saved.progress.activeReadingPlanId = saved.progress.activeReadingPlanId ?? null;
          saved.progress.readingPlanProgress = saved.progress.readingPlanProgress ?? {};
          if ((saved.progress.retentionModelVersion ?? 0) < 1) {
            const rebuilt: UserProgress['mastery'] = {};
            for (const review of [...(saved.progress.reviews ?? [])].sort((a, b) =>
              a.reviewedAt.localeCompare(b.reviewedAt),
            )) {
              const current =
                rebuilt[review.verseId] ??
                initialMastery(review.verseId, new Date(review.reviewedAt));
              rebuilt[review.verseId] = scheduleReview(current, {
                grade: review.grade,
                mode: review.mode,
                accuracy: review.accuracy,
                hintsUsed: review.hintsUsed,
                recallMs: review.recallMs,
                now: new Date(review.reviewedAt),
              });
            }
            saved.progress.mastery = {
              ...Object.fromEntries(
                Object.keys(saved.progress.mastery ?? {}).map((id) => [id, initialMastery(id)]),
              ),
              ...rebuilt,
            };
            saved.progress.retentionModelVersion = 1;
          }
          saved.progress.activeCampaign = compatibleCampaign(
            saved.translationId,
            saved.progress.activeCampaign,
          );
          const missing = verses.filter((verse) => !saved.progress.mastery[verse.id]);
          saved.progress.mastery = {
            ...saved.progress.mastery,
            ...Object.fromEntries(missing.map((verse) => [verse.id, initialMastery(verse.id)])),
          };
          saved.progress.mastery = Object.fromEntries(
            Object.entries(saved.progress.mastery).map(([id, old]) => {
              const fallback = initialMastery(id);
              return [
                id,
                {
                  ...fallback,
                  ...old,
                  recognitionStrength: old.recognitionStrength ?? old.averageAccuracy ?? 0,
                  recallStrength: old.recallStrength ?? 0,
                  understandingStrength: old.understandingStrength ?? 0,
                  learningStep:
                    old.learningStep ??
                    (old.stage === 'new'
                      ? 0
                      : old.stage === 'learning'
                        ? 3
                        : old.stage === 'familiar'
                          ? 7
                          : 9),
                },
              ];
            }),
          );
          setState(saved);
        }
      })
      .catch(() => undefined)
      .finally(() => setHydrated(true));
  }, []);

  useEffect(() => {
    if (hydrated) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => undefined);
  }, [state, hydrated]);

  useEffect(() => {
    if (hydrated && !state.progress.collectionInitialized)
      setState((old) => ({
        ...old,
        progress: {
          ...old.progress,
          characterShards: { david: 0 },
          targetCharacter: 'david',
          collectionInitialized: true,
        },
      }));
  }, [hydrated, state.progress.collectionInitialized]);

  const setUiLanguage = useCallback(
    (uiLanguage: UiLanguage) => setState((old) => ({ ...old, uiLanguage })),
    [],
  );
  const setTranslationId = useCallback(
    (translationId: string) =>
      setState((old) => ({
        ...old,
        translationId,
        progress: {
          ...old.progress,
          activeCampaign: compatibleCampaign(translationId, old.progress.activeCampaign),
        },
      })),
    [],
  );
  const setCampaign = useCallback(
    (activeCampaign: CampaignId) =>
      setState((old) => ({ ...old, progress: { ...old.progress, activeCampaign } })),
    [],
  );
  const setPathChapter = useCallback(
    (campaignId: CampaignId, chapter: number) =>
      setState((old) => ({
        ...old,
        progress: {
          ...old.progress,
          pathChapter: { ...old.progress.pathChapter, [campaignId]: chapter },
        },
      })),
    [],
  );
  const setLessonProgress = useCallback(
    (lessonId: string, exerciseIndex: number) =>
      setState((old) => ({
        ...old,
        progress: {
          ...old.progress,
          lessonProgress: { ...old.progress.lessonProgress, [lessonId]: exerciseIndex },
        },
      })),
    [],
  );
  const setTargetCharacter = useCallback(
    (targetCharacter: CharacterId) =>
      setState((old) => ({ ...old, progress: { ...old.progress, targetCharacter } })),
    [],
  );
  const buyCharacterShards = useCallback(
    (characterId: CharacterId) =>
      setState((old) => {
        const price = 500;
        if (old.progress.gold < price) return old;
        return {
          ...old,
          progress: {
            ...old.progress,
            gold: old.progress.gold - price,
            characterShards: {
              ...old.progress.characterShards,
              [characterId]: (old.progress.characterShards[characterId] ?? 0) + 5,
            },
          },
        };
      }),
    [],
  );
  const buyShopItem = useCallback((item: ShopItem) => {
    const price = priceForShopItem(item);
    if (!price) return;
    setState((old) => {
      if (old.progress.gold < price) return old;
      const progress = { ...old.progress, gold: old.progress.gold - price };
      if (item.type === 'wildShard') progress.wildShards += 1;
      else if (item.type === 'streakFreeze') progress.streakFreezes += 1;
      else {
        const inventory = item.type === 'xpBooster' ? 'xpBoosters' : 'goldBoosters';
        progress[inventory] = {
          ...progress[inventory],
          [String(item.durationMinutes)]:
            (progress[inventory][String(item.durationMinutes)] ?? 0) + 1,
        };
      }
      return { ...old, progress };
    });
  }, []);
  const applyWildShard = useCallback(
    (characterId: CharacterId) =>
      setState((old) => {
        if (old.progress.wildShards < 1) return old;
        return {
          ...old,
          progress: {
            ...old.progress,
            wildShards: old.progress.wildShards - 1,
            characterShards: {
              ...old.progress.characterShards,
              [characterId]: (old.progress.characterShards[characterId] ?? 0) + 1,
            },
          },
        };
      }),
    [],
  );
  const activateBooster = useCallback(
    (type: 'xpBooster' | 'goldBooster', durationMinutes: 15 | 30 | 60) =>
      setState((old) => {
        const inventory = type === 'xpBooster' ? 'xpBoosters' : 'goldBoosters';
        const count = old.progress[inventory][String(durationMinutes)] ?? 0;
        if (!count) return old;
        const activeKey = type === 'xpBooster' ? 'activeXpBoosterUntil' : 'activeGoldBoosterUntil';
        const current = old.progress[activeKey];
        const start =
          current && Date.parse(current) > Date.now() ? Date.parse(current) : Date.now();
        return {
          ...old,
          progress: {
            ...old.progress,
            [inventory]: {
              ...old.progress[inventory],
              [String(durationMinutes)]: count - 1,
            },
            [activeKey]: new Date(start + durationMinutes * 60_000).toISOString(),
          },
        };
      }),
    [],
  );
  const claimLevelReward = useCallback(
    (level: number) =>
      setState((old) => {
        const safeLevel = Math.floor(level);
        if (
          safeLevel < 2 ||
          safeLevel > levelForXp(old.progress.xp) ||
          old.progress.claimedLevelRewards.includes(safeLevel)
        )
          return old;
        const reward = levelRewardFor(safeLevel);
        const target = old.progress.targetCharacter;
        return {
          ...old,
          progress: {
            ...old.progress,
            gold: old.progress.gold + reward.gold,
            wildShards: old.progress.wildShards + reward.wildShards,
            streakFreezes: old.progress.streakFreezes + reward.streakFreezes,
            characterShards: reward.shards
              ? {
                  ...old.progress.characterShards,
                  [target]: (old.progress.characterShards[target] ?? 0) + reward.shards,
                }
              : old.progress.characterShards,
            claimedLevelRewards: [...old.progress.claimedLevelRewards, safeLevel].sort(
              (a, b) => a - b,
            ),
          },
        };
      }),
    [],
  );
  const claimPeriodMastery: AppStoreValue['claimPeriodMastery'] = useCallback((periodId) => {
    setState((old) => {
      if (old.progress.claimedPeriodMastery.includes(periodId)) return old;
      const members = characters.filter((character) => character.period === periodId);
      const unlocked = members.filter(
        (character) => (old.progress.characterShards[character.id] ?? 0) >= character.unlockCost,
      ).length;
      if (!members.length || unlocked / members.length < PERIOD_MASTERY_RATIO) return old;
      return {
        ...old,
        progress: {
          ...old.progress,
          gold: old.progress.gold + 150,
          wildShards: old.progress.wildShards + 10,
          claimedPeriodMastery: [...old.progress.claimedPeriodMastery, periodId],
        },
      };
    });
  }, []);
  const claimDailyFree = useCallback(() => {
    setState((old) => {
      const today = localDay(new Date());
      if (old.progress.lastDailyFreeClaim === today) return old;
      const dayNumber = Math.floor(Date.now() / 86_400_000);
      const reward = dailyFreeOfferFor(dayNumber);
      const target = old.progress.targetCharacter;
      return {
        ...old,
        progress: {
          ...old.progress,
          gold: old.progress.gold + (reward.kind === 'gold' ? 75 : reward.kind === 'chest' ? 5 : 0),
          wildShards: old.progress.wildShards + (reward.kind === 'wildShards' ? 5 : 0),
          characterShards:
            reward.kind === 'chest'
              ? {
                  ...old.progress.characterShards,
                  [target]: (old.progress.characterShards[target] ?? 0) + 3,
                }
              : old.progress.characterShards,
          openedChests:
            reward.kind === 'chest'
              ? {
                  ...old.progress.openedChests,
                  '1': (old.progress.openedChests['1'] ?? 0) + 1,
                }
              : old.progress.openedChests,
          lastDailyFreeClaim: today,
        },
      };
    });
  }, []);
  const openChest = useCallback(
    (rewardId: string, tier: number) => {
      const reward = chestRewardFor(rewardId, tier, state.progress.targetCharacter);
      setState((old) => {
        if (old.progress.claimedStageRewards[rewardId]) return old;
        const baseGold = reward.rewards
          .filter((item) => item.type === 'gold')
          .reduce((sum, item) => sum + ('amount' in item ? item.amount : 0), 0);
        const gold =
          old.progress.activeGoldBoosterUntil &&
          Date.parse(old.progress.activeGoldBoosterUntil) > Date.now()
            ? baseGold * 2
            : baseGold;
        const wildShards = reward.rewards
          .filter((item) => item.type === 'wildShards')
          .reduce((sum, item) => sum + ('amount' in item ? item.amount : 0), 0);
        const streakFreezes = reward.rewards
          .filter((item) => item.type === 'streakFreeze')
          .reduce((sum, item) => sum + ('amount' in item ? item.amount : 0), 0);
        const shardGrants = reward.rewards.flatMap((item) =>
          item.type === 'characterShards' ? item.characters : [],
        );
        const characterShards = shardGrants.reduce(
          (all, item) => ({
            ...all,
            [item.characterId]: (all[item.characterId] ?? 0) + item.amount,
          }),
          { ...old.progress.characterShards },
        );
        const xpBoosters = reward.rewards.reduce(
          (all, item) =>
            item.type === 'xpBooster'
              ? {
                  ...all,
                  [String(item.durationMinutes)]: (all[String(item.durationMinutes)] ?? 0) + 1,
                }
              : all,
          { ...old.progress.xpBoosters },
        );
        const goldBoosters = reward.rewards.reduce(
          (all, item) =>
            item.type === 'goldBooster'
              ? {
                  ...all,
                  [String(item.durationMinutes)]: (all[String(item.durationMinutes)] ?? 0) + 1,
                }
              : all,
          { ...old.progress.goldBoosters },
        );
        return {
          ...old,
          progress: {
            ...old.progress,
            gold: old.progress.gold + gold,
            wildShards: old.progress.wildShards + wildShards,
            streakFreezes: old.progress.streakFreezes + streakFreezes,
            characterShards,
            xpBoosters,
            goldBoosters,
            openedChests: {
              ...old.progress.openedChests,
              [String(reward.tier)]: (old.progress.openedChests[String(reward.tier)] ?? 0) + 1,
            },
            claimedStageRewards: { ...old.progress.claimedStageRewards, [rewardId]: true },
            rewardHistory: [...old.progress.rewardHistory.slice(-99), reward],
          },
        };
      });
      return reward;
    },
    [state.progress.targetCharacter],
  );
  const recordReading = useCallback(
    (items: Verse[]) =>
      setState((old) => {
        const unread = items.filter((verse) => !old.progress.readVerseIds[verse.id]);
        if (!unread.length) return old;
        const today = localDay(new Date());
        const award = dailyXpAward(unread.length, old.progress.dailyXp[today] ?? 0);
        return {
          ...old,
          progress: {
            ...old.progress,
            xp: old.progress.xp + award,
            dailyXp: {
              ...old.progress.dailyXp,
              [today]: (old.progress.dailyXp[today] ?? 0) + award,
            },
            activeDates: old.progress.activeDates.includes(today)
              ? old.progress.activeDates
              : [...old.progress.activeDates, today],
            readVerseIds: {
              ...old.progress.readVerseIds,
              ...Object.fromEntries(unread.map((verse) => [verse.id, true])),
            },
          },
        };
      }),
    [],
  );
  const startReadingPlan = useCallback(
    (planId: string) =>
      setState((old) => ({
        ...old,
        progress: {
          ...old.progress,
          activeReadingPlanId: planId,
          readingPlanProgress: {
            ...old.progress.readingPlanProgress,
            [planId]: old.progress.readingPlanProgress[planId] ?? {
              planId,
              startedAt: new Date().toISOString(),
              completedDays: [],
              paused: false,
            },
          },
        },
      })),
    [],
  );
  const completeReadingPlanDay = useCallback(
    (planId: string, day: number) =>
      setState((old) => {
        const current = old.progress.readingPlanProgress[planId];
        if (!current || current.completedDays.includes(day)) return old;
        const today = localDay(new Date());
        const award = dailyXpAward(5, old.progress.dailyXp[today] ?? 0);
        return {
          ...old,
          progress: {
            ...old.progress,
            xp: old.progress.xp + award,
            dailyXp: {
              ...old.progress.dailyXp,
              [today]: (old.progress.dailyXp[today] ?? 0) + award,
            },
            activeDates: old.progress.activeDates.includes(today)
              ? old.progress.activeDates
              : [...old.progress.activeDates, today],
            readingPlanProgress: {
              ...old.progress.readingPlanProgress,
              [planId]: {
                ...current,
                paused: false,
                completedDays: [...current.completedDays, day].sort((a, b) => a - b),
              },
            },
          },
        };
      }),
    [],
  );
  const toggleReadingPlanPause = useCallback(
    (planId: string) =>
      setState((old) => {
        const current = old.progress.readingPlanProgress[planId];
        if (!current) return old;
        return {
          ...old,
          progress: {
            ...old.progress,
            readingPlanProgress: {
              ...old.progress.readingPlanProgress,
              [planId]: { ...current, paused: !current.paused },
            },
          },
        };
      }),
    [],
  );
  const resetProgress = useCallback(
    () => setState((old) => ({ ...old, progress: makeProgress() })),
    [],
  );

  const recordReview: AppStoreValue['recordReview'] = useCallback((input) => {
    let awarded = 0;
    setState((old) => {
      const now = new Date();
      const current = old.progress.mastery[input.verse.id] ?? initialMastery(input.verse.id, now);
      const baseXp = input.xpOverride ?? calculateXp({ ...input, mastery: current });
      const baseAward =
        old.progress.activeXpBoosterUntil &&
        Date.parse(old.progress.activeXpBoosterUntil) > now.getTime()
          ? baseXp * 2
          : baseXp;
      const next = scheduleReview(current, { ...input, now });
      const today = localDay(now);
      awarded = dailyXpAward(baseAward, old.progress.dailyXp[today] ?? 0);
      const yesterday = localDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
      const streak =
        old.progress.lastPracticeDate === today
          ? old.progress.streak
          : old.progress.lastPracticeDate === yesterday
            ? old.progress.streak + 1
            : 1;
      return {
        ...old,
        progress: {
          ...old.progress,
          xp: old.progress.xp + awarded,
          dailyXp: {
            ...old.progress.dailyXp,
            [today]: (old.progress.dailyXp[today] ?? 0) + awarded,
          },
          streak,
          longestStreak: Math.max(streak, old.progress.longestStreak),
          activeDates: old.progress.activeDates.includes(today)
            ? old.progress.activeDates
            : [...old.progress.activeDates, today],
          lastPracticeDate: today,
          mastery: { ...old.progress.mastery, [input.verse.id]: next },
          reviews: [
            ...old.progress.reviews.slice(-499),
            {
              id: `${input.verse.id}-${now.getTime()}`,
              verseId: input.verse.id,
              reviewedAt: now.toISOString(),
              grade: input.grade,
              mode: input.mode,
              accuracy: input.accuracy,
              hintsUsed: input.hintsUsed,
              recallMs: input.recallMs,
              xpAwarded: awarded,
            },
          ],
        },
      };
    });
    return awarded;
  }, []);

  const value = useMemo<AppStoreValue>(
    () => ({
      ...state,
      hydrated,
      availableVerses: versesForTranslation(state.translationId),
      setUiLanguage,
      setTranslationId,
      setCampaign,
      setPathChapter,
      setLessonProgress,
      openChest,
      setTargetCharacter,
      buyCharacterShards,
      applyWildShard,
      buyShopItem,
      activateBooster,
      claimLevelReward,
      claimPeriodMastery,
      claimDailyFree,
      recordReading,
      startReadingPlan,
      completeReadingPlanDay,
      toggleReadingPlanPause,
      recordReview,
      resetProgress,
    }),
    [
      state,
      hydrated,
      setUiLanguage,
      setTranslationId,
      setCampaign,
      setPathChapter,
      setLessonProgress,
      openChest,
      setTargetCharacter,
      buyCharacterShards,
      applyWildShard,
      buyShopItem,
      activateBooster,
      claimLevelReward,
      claimPeriodMastery,
      claimDailyFree,
      recordReading,
      startReadingPlan,
      completeReadingPlanDay,
      toggleReadingPlanPause,
      recordReview,
      resetProgress,
    ],
  );
  return <AppStore.Provider value={value}>{children}</AppStore.Provider>;
}

export function useAppStore(): AppStoreValue {
  const value = useContext(AppStore);
  if (!value) throw new Error('useAppStore must be used inside AppStoreProvider');
  return value;
}
