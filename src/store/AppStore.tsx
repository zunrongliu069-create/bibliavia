import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isBibleVersionEnabled, versesForTranslation } from '../data/content';
import { characters } from '../data/characters';
import { PERIOD_MASTERY_RATIO } from '../data/periods';
import { readingPlanById } from '../data/readingPlans';
import { initialMastery, scheduleReview } from '../lib/scheduler';
import { calculateXp, dailyXpAward } from '../lib/xp';
import { chestRewardFor } from '../lib/rewards';
import { levelForXp, levelRewardFor } from '../lib/level';
import {
  CHARACTER_SHARD_OFFER,
  dailyFreeOfferFor,
  priceForCharacterShards,
  priceForShopItem,
} from '../lib/shop';
import {
  ACHIEVEMENT_REWARDS,
  DAILY_GOAL_REWARD,
  DAILY_GOAL_XP,
  DAILY_QUEST_REWARD,
  dailyQuestCount,
} from '../lib/activityRewards';
import { achievementsFor } from '../lib/achievements';
import { heroCapacity, heroSlotCost } from '../lib/heroSlots';
import { journeyBeatById } from '../data/journeyBeats';
import { beatTitle, pathById, pathForBook, pathForReadingPlan, pathTitle } from '../data/paths';
import {
  activatePath,
  applyActivityToProgress,
  type PathProgressResult,
} from '../lib/pathProgress';
import { pathRewardFor, type PathReward } from '../lib/pathRewards';
import { nextPathAction } from '../lib/pathGuidance';
import { supabase } from '../lib/supabase';
import { uiText } from '../lib/uiText';
import { useAuthStore } from './AuthStore';
import type {
  CampaignId,
  CharacterId,
  ChestReward,
  ExerciseMode,
  FeedbackEvent,
  FeedbackSettings,
  BiblePassageReference,
  PathActivityType,
  ReviewGrade,
  ShopItem,
  UiLanguage,
  UserProgress,
  Verse,
} from '../types';

type StoredState = {
  version: 2;
  uiLanguage: UiLanguage;
  translationId: string;
  feedbackSettings: FeedbackSettings;
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
  pathStates: {},
  activePathIds: [],
  customPaths: [],
  focusedPathId: null,
  pathChapter: { romans: 1, proverbs: 1 },
  chapterOneStartVersion: 1,
  lessonProgress: {},
  completedLessonIds: [],
  characterShards: { adam: 100 },
  wildShards: 0,
  streakFreezes: 0,
  xpBoosters: {},
  goldBoosters: {},
  activeXpBoosterUntil: null,
  activeGoldBoosterUntil: null,
  collectionInitialized: true,
  targetCharacter: 'adam',
  fragments: 0,
  unlockedHeroSlots: 0,
  activeCharacters: ['adam'],
  openedChests: {},
  claimedStageRewards: {},
  claimedLevelRewards: [1],
  claimedJourneyBeats: [],
  claimedPeriodMastery: [],
  claimedDailyGoals: [],
  claimedDailyQuests: [],
  claimedAchievements: [],
  dailyXp: {},
  lastDailyFreeClaim: null,
  rewardHistory: [],
  readVerseIds: {},
  activeReadingPlanId: null,
  readingPlanProgress: {},
  mastery: {},
  reviews: [],
});

export const createInitialProgress = (): UserProgress => makeProgress();
const initialState = (): StoredState => ({
  version: 2,
  uiLanguage: 'zh-Hans',
  translationId: 'cuv-s',
  feedbackSettings: {
    soundEffects: true,
    ambientMusic: false,
    haptics: true,
    reduceMotion: false,
  },
  progress: makeProgress(),
});
const localDay = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const canonicalVerseId = (id: string): string =>
  id
    .replace(/^cuv-s-rom-(\d+)-(\d+)$/, 'cuv-s-romans-$1-$2')
    .replace(/^cuv-t-rom-(\d+)-(\d+)$/, 'cuv-t-romans-$1-$2')
    .replace(/^webp-rom-(\d+)-(\d+)$/, 'webp-romans-$1-$2')
    .replace(/^cuv-s-proverbs-(\d+)$/, 'cuv-s-proverbs-1-$1')
    .replace(/^webp-romans-(\d+)$/, 'webp-romans-1-$1')
    .replace(/^webp-proverbs-(\d+)$/, 'webp-proverbs-1-$1')
    .replace(/^webp-pro-(\d+)-(\d+)$/, 'webp-proverbs-$1-$2');
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
  cloudSyncStatus: 'guest' | 'syncing' | 'synced' | 'error';
  availableVerses: Verse[];
  feedbackEvent: FeedbackEvent | null;
  emitFeedback: (event: Omit<FeedbackEvent, 'id'>) => void;
  setFeedbackSetting: (setting: keyof FeedbackSettings, enabled: boolean) => void;
  dismissFeedback: () => void;
  recordPathActivity: (input: {
    pathId: string;
    beatId?: string;
    activity: PathActivityType;
    quality?: number;
    success?: boolean;
  }) => PathProgressResult | null;
  startPath: (pathId: string) => void;
  focusPath: (pathId: string) => void;
  createPath: (input: {
    title: string;
    target?: number;
    bibleVersionId: string;
    passage: BiblePassageReference;
    kind?: import('../types').PathKind;
  }) => string;
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
  completeLesson: (lessonId: string) => void;
  openChest: (rewardId: string, tier: number) => ChestReward;
  setTargetCharacter: (characterId: CharacterId) => void;
  toggleActiveCharacter: (characterId: CharacterId) => void;
  unlockHeroSlot: () => void;
  buyCharacterShards: (characterId: CharacterId, amount?: number) => void;
  applyWildShard: (characterId: CharacterId) => void;
  buyShopItem: (item: ShopItem) => void;
  activateBooster: (type: 'xpBooster' | 'goldBooster', durationMinutes: 15 | 30 | 60) => void;
  claimLevelReward: (level: number) => void;
  claimJourneyBeat: (beatId: string) => void;
  claimPeriodMastery: (periodId: import('../types').BiblePeriodId) => void;
  claimDailyGoalReward: () => void;
  claimDailyQuestReward: () => void;
  claimAchievementReward: (achievementId: string) => void;
  claimDailyFree: () => void;
  recordReading: (items: Verse[]) => void;
  startReadingPlan: (planId: string) => void;
  completeReadingPlanDay: (planId: string, day: number) => void;
  toggleReadingPlanPause: (planId: string) => void;
  resetProgress: () => void;
}

const AppStore = createContext<AppStoreValue | null>(null);

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuthStore();
  const userId = auth.userId;
  const cloudUserId = auth.session?.user.id;
  const [state, setState] = useState<StoredState>(initialState);
  const [feedbackEvent, setFeedbackEvent] = useState<FeedbackEvent | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<AppStoreValue['cloudSyncStatus']>('guest');

  useEffect(() => {
    let cancelled = false;
    const client = supabase;
    setHydrated(false);
    setState(initialState());
    if (!userId) {
      setCloudSyncStatus('guest');
      setHydrated(true);
      return () => {
        cancelled = true;
      };
    }
    if (!client || !cloudUserId) {
      setCloudSyncStatus('guest');
      void AsyncStorage.getItem(`bibliavia/state/v3/${userId}`)
        .then((raw) => {
          if (raw && !cancelled) setState(JSON.parse(raw) as StoredState);
        })
        .finally(() => {
          if (!cancelled) setHydrated(true);
        });
      return () => {
        cancelled = true;
      };
    }
    setCloudSyncStatus('syncing');
    Promise.resolve(
      client.from('app_states').select('state').eq('user_id', cloudUserId).maybeSingle(),
    )
      .then(({ data, error }) => {
        if (error) throw error;
        return [data?.state ? JSON.stringify(data.state) : null, null, null] as const;
      })
      .then(([currentRaw, previousRaw, legacyRaw]) => {
        const raw = currentRaw ?? previousRaw ?? legacyRaw;
        if (raw) {
          const saved = { ...(JSON.parse(raw) as StoredState), version: 2 as const };
          if (!isBibleVersionEnabled(saved.translationId)) saved.translationId = 'cuv-s';
          saved.feedbackSettings = saved.feedbackSettings ?? {
            soundEffects: true,
            ambientMusic: false,
            haptics: true,
            reduceMotion: false,
          };
          saved.progress.pathStates = saved.progress.pathStates ?? {};
          saved.progress.pathStates = Object.fromEntries(
            Object.entries(saved.progress.pathStates).map(([id, path]) => [
              id,
              { ...path, lastActivityAt: path.lastActivityAt ?? null },
            ]),
          );
          saved.progress.activePathIds = saved.progress.activePathIds ?? [];
          saved.progress.customPaths = (saved.progress.customPaths ?? []).map((path) => ({
            ...path,
            kind: path.kind ?? 'mixed',
          }));
          saved.progress.focusedPathId = saved.progress.focusedPathId ?? null;
          saved.progress.pathChapter = saved.progress.pathChapter ?? { romans: 1, proverbs: 1 };
          if ((saved.progress.chapterOneStartVersion ?? 0) < 1) {
            saved.progress.pathChapter = { ...saved.progress.pathChapter, romans: 1, proverbs: 1 };
            saved.progress.chapterOneStartVersion = 1;
          }
          saved.progress.lessonProgress = saved.progress.lessonProgress ?? {};
          saved.progress.completedLessonIds = saved.progress.completedLessonIds ?? [];
          saved.progress.gold = saved.progress.gold ?? 0;
          saved.progress.activeDates =
            saved.progress.activeDates ??
            (saved.progress.lastPracticeDate ? [saved.progress.lastPracticeDate] : []);
          if (!saved.progress.collectionInitialized) {
            saved.progress.characterShards = { adam: 100 };
            saved.progress.targetCharacter = 'adam';
            saved.progress.collectionInitialized = true;
          }
          saved.progress.characterShards = saved.progress.characterShards ?? { adam: 100 };
          saved.progress.characterShards.adam = Math.max(
            100,
            saved.progress.characterShards.adam ?? 0,
          );
          saved.progress.wildShards = saved.progress.wildShards ?? 0;
          saved.progress.streakFreezes = saved.progress.streakFreezes ?? 0;
          saved.progress.xpBoosters = saved.progress.xpBoosters ?? {};
          saved.progress.goldBoosters = saved.progress.goldBoosters ?? {};
          saved.progress.activeXpBoosterUntil = saved.progress.activeXpBoosterUntil ?? null;
          saved.progress.activeGoldBoosterUntil = saved.progress.activeGoldBoosterUntil ?? null;
          saved.progress.targetCharacter = (saved.progress.targetCharacter ??
            'adam') as CharacterId;
          saved.progress.fragments = saved.progress.fragments ?? 0;
          saved.progress.unlockedHeroSlots = saved.progress.unlockedHeroSlots ?? 0;
          saved.progress.activeCharacters = saved.progress.activeCharacters?.length
            ? saved.progress.activeCharacters
            : [saved.progress.targetCharacter];
          saved.progress.openedChests = saved.progress.openedChests ?? {};
          saved.progress.claimedStageRewards = saved.progress.claimedStageRewards ?? {};
          if (!saved.progress.claimedLevelRewards) {
            const currentLevel = levelForXp(saved.progress.xp ?? 0);
            saved.progress.claimedLevelRewards = Array.from(
              { length: Math.max(1, currentLevel - 1) },
              (_, index) => index + 1,
            );
          }
          saved.progress.claimedJourneyBeats = saved.progress.claimedJourneyBeats ?? [];
          saved.progress.claimedPeriodMastery = saved.progress.claimedPeriodMastery ?? [];
          saved.progress.claimedDailyGoals = saved.progress.claimedDailyGoals ?? [];
          saved.progress.claimedDailyQuests = saved.progress.claimedDailyQuests ?? [];
          saved.progress.claimedAchievements = saved.progress.claimedAchievements ?? [];
          saved.progress.dailyXp = saved.progress.dailyXp ?? {};
          saved.progress.lastDailyFreeClaim = saved.progress.lastDailyFreeClaim ?? null;
          saved.progress.rewardHistory = saved.progress.rewardHistory ?? [];
          saved.progress.readVerseIds = saved.progress.readVerseIds ?? {};
          saved.progress.mastery = Object.fromEntries(
            Object.entries(saved.progress.mastery ?? {}).map(([id, mastery]) => [
              canonicalVerseId(id),
              { ...mastery, verseId: canonicalVerseId(id) },
            ]),
          );
          saved.progress.readVerseIds = Object.fromEntries(
            Object.entries(saved.progress.readVerseIds).map(([id, read]) => [
              canonicalVerseId(id),
              read,
            ]),
          );
          saved.progress.reviews = (saved.progress.reviews ?? []).map((review) => ({
            ...review,
            verseId: canonicalVerseId(review.verseId),
          }));
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
          if (!cancelled) setState(saved);
        }
        if (!cancelled) setCloudSyncStatus('synced');
      })
      .catch(() => {
        if (!cancelled) setCloudSyncStatus('error');
      })
      .finally(() => {
        if (!cancelled) setHydrated(true);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, cloudUserId]);

  useEffect(() => {
    if (!hydrated || !userId) return;
    void AsyncStorage.setItem(`bibliavia/state/v3/${userId}`, JSON.stringify(state));
  }, [state, hydrated, userId]);

  useEffect(() => {
    const client = supabase;
    if (!hydrated || !client || !cloudUserId) return;
    const timeout = setTimeout(() => {
      setCloudSyncStatus('syncing');
      void Promise.resolve(
        client
          .from('app_states')
          .upsert(
            { user_id: cloudUserId, state, updated_at: new Date().toISOString() },
            { onConflict: 'user_id' },
          ),
      ).then(({ error }) => setCloudSyncStatus(error ? 'error' : 'synced'));
    }, 400);
    return () => clearTimeout(timeout);
  }, [state, hydrated, cloudUserId]);

  useEffect(() => {
    if (!hydrated) return;
    const today = localDay(new Date());
    setState((old) =>
      old.progress.activeDates.includes(today)
        ? old
        : {
            ...old,
            progress: {
              ...old.progress,
              activeDates: [...old.progress.activeDates, today],
            },
          },
    );
  }, [hydrated]);

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
  const setFeedbackSetting = useCallback(
    (setting: keyof FeedbackSettings, enabled: boolean) =>
      setState((old) => ({
        ...old,
        feedbackSettings: { ...old.feedbackSettings, [setting]: enabled },
      })),
    [],
  );
  const emitFeedback = useCallback(
    (event: Omit<FeedbackEvent, 'id'>) =>
      setFeedbackEvent({ ...event, id: `${event.type}-${Date.now()}` }),
    [],
  );
  const dismissFeedback = useCallback(() => setFeedbackEvent(null), []);
  const setTranslationId = useCallback(
    (translationId: string) =>
      setState((old) =>
        isBibleVersionEnabled(translationId)
          ? {
              ...old,
              translationId,
              progress: {
                ...old.progress,
                activeCampaign: compatibleCampaign(translationId, old.progress.activeCampaign),
              },
            }
          : old,
      ),
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
  const completeLesson = useCallback(
    (lessonId: string) =>
      setState((old) => ({
        ...old,
        progress: {
          ...old.progress,
          lessonProgress: { ...old.progress.lessonProgress, [lessonId]: 0 },
          completedLessonIds: old.progress.completedLessonIds.includes(lessonId)
            ? old.progress.completedLessonIds
            : [...old.progress.completedLessonIds, lessonId],
        },
      })),
    [],
  );
  const setTargetCharacter = useCallback(
    (targetCharacter: CharacterId) =>
      setState((old) => ({ ...old, progress: { ...old.progress, targetCharacter } })),
    [],
  );
  const toggleActiveCharacter = useCallback((characterId: CharacterId) => {
    setState((old) => {
      const active = old.progress.activeCharacters;
      if (active.includes(characterId)) {
        if (active.length === 1) return old;
        const next = active.filter((id) => id !== characterId);
        return {
          ...old,
          progress: { ...old.progress, activeCharacters: next, targetCharacter: next[0]! },
        };
      }
      const character = characters.find((item) => item.id === characterId);
      const owned = character
        ? (old.progress.characterShards[characterId] ?? 0) >= character.unlockCost
        : false;
      if (!owned || active.length >= heroCapacity(old.progress.unlockedHeroSlots)) return old;
      return {
        ...old,
        progress: {
          ...old.progress,
          activeCharacters: [...active, characterId],
          targetCharacter: characterId,
        },
      };
    });
  }, []);
  const unlockHeroSlot = useCallback(() => {
    setState((old) => {
      const cost = heroSlotCost(old.progress.unlockedHeroSlots);
      if (!cost || old.progress.fragments < cost) return old;
      return {
        ...old,
        progress: {
          ...old.progress,
          fragments: old.progress.fragments - cost,
          unlockedHeroSlots: old.progress.unlockedHeroSlots + 1,
        },
      };
    });
  }, []);
  const buyCharacterShards = useCallback(
    (characterId: CharacterId, requestedAmount: number = CHARACTER_SHARD_OFFER.amount) =>
      setState((old) => {
        const amount = Math.max(1, Math.min(10, Math.floor(requestedAmount)));
        const price = priceForCharacterShards(amount);
        if (old.progress.gold < price) return old;
        return {
          ...old,
          progress: {
            ...old.progress,
            gold: old.progress.gold - price,
            characterShards: {
              ...old.progress.characterShards,
              [characterId]: (old.progress.characterShards[characterId] ?? 0) + amount,
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
        const gold = reward.gold;
        return {
          ...old,
          progress: {
            ...old.progress,
            gold: old.progress.gold + gold,
            fragments: old.progress.fragments + (safeLevel % 60 === 0 ? 1 : 0),
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
          fragments: old.progress.fragments + (periodId === 10 ? 1 : 0),
        },
      };
    });
  }, []);
  const claimJourneyBeat: AppStoreValue['claimJourneyBeat'] = useCallback((beatId) => {
    setState((old) => {
      const beat = journeyBeatById(beatId);
      if (
        !beat ||
        old.progress.claimedJourneyBeats.includes(beatId) ||
        levelForXp(old.progress.xp) < beat.requiredLevel
      )
        return old;
      return {
        ...old,
        progress: {
          ...old.progress,
          xp: old.progress.xp + beat.reward.xp,
          gold: old.progress.gold + beat.reward.gold,
          claimedJourneyBeats: [...old.progress.claimedJourneyBeats, beatId],
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
      return {
        ...old,
        progress: {
          ...old.progress,
          gold: old.progress.gold + (reward.kind === 'gold' ? 100 : 0),
          wildShards: old.progress.wildShards + (reward.kind === 'wildShards' ? 8 : 0),
          characterShards: old.progress.characterShards,
          openedChests: old.progress.openedChests,
          lastDailyFreeClaim: today,
        },
      };
    });
  }, []);
  const claimDailyGoalReward = useCallback(() => {
    setState((old) => {
      const today = localDay(new Date());
      if (
        (old.progress.dailyXp[today] ?? 0) < DAILY_GOAL_XP ||
        old.progress.claimedDailyGoals.includes(today)
      )
        return old;
      return {
        ...old,
        progress: {
          ...old.progress,
          gold: old.progress.gold + DAILY_GOAL_REWARD.gold,
          wildShards: old.progress.wildShards + DAILY_GOAL_REWARD.wildShards,
          claimedDailyGoals: [...old.progress.claimedDailyGoals, today],
        },
      };
    });
  }, []);
  const claimDailyQuestReward = useCallback(() => {
    setState((old) => {
      const today = localDay(new Date());
      if (
        dailyQuestCount(old.progress, today) < 3 ||
        old.progress.claimedDailyQuests.includes(today)
      )
        return old;
      return {
        ...old,
        progress: {
          ...old.progress,
          gold: old.progress.gold + DAILY_QUEST_REWARD.gold,
          wildShards: old.progress.wildShards + DAILY_QUEST_REWARD.wildShards,
          claimedDailyQuests: [...old.progress.claimedDailyQuests, today],
        },
      };
    });
  }, []);
  const claimAchievementReward = useCallback((achievementId: string) => {
    setState((old) => {
      const reward = ACHIEVEMENT_REWARDS[achievementId];
      const complete = achievementsFor(
        old.progress,
        versesForTranslation(old.translationId),
        Object.fromEntries(characters.map((character) => [character.id, character.unlockCost])),
      ).some((achievement) => achievement.id === achievementId && achievement.complete);
      if (!reward || !complete || old.progress.claimedAchievements.includes(achievementId))
        return old;
      return {
        ...old,
        progress: {
          ...old.progress,
          gold: old.progress.gold + reward.gold,
          wildShards: old.progress.wildShards + reward.wildShards,
          fragments: old.progress.fragments + reward.fragments,
          claimedAchievements: [...old.progress.claimedAchievements, achievementId],
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
        const boostedGold =
          old.progress.activeGoldBoosterUntil &&
          Date.parse(old.progress.activeGoldBoosterUntil) > Date.now()
            ? baseGold * 2
            : baseGold;
        const gold = boostedGold;
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
  const startPath = useCallback((pathId: string) => {
    setState((old) => {
      const path = pathById(pathId) ?? old.progress.customPaths?.find((item) => item.id === pathId);
      return path ? { ...old, progress: activatePath(old.progress, path) } : old;
    });
  }, []);
  const focusPath = useCallback(
    (pathId: string) =>
      setState((old) => ({
        ...old,
        progress: { ...old.progress, focusedPathId: pathId },
      })),
    [],
  );
  const createPath: AppStoreValue['createPath'] = useCallback((input) => {
    const id = `user-${Date.now()}`;
    setState((old) => {
      const path = {
        id,
        title: input.title.trim(),
        source: 'user' as const,
        kind: input.kind ?? ('mixed' as const),
        target: Math.max(1, input.target ?? 100),
        bibleVersionId: input.bibleVersionId,
        passage: input.passage,
      };
      return {
        ...old,
        progress: {
          ...activatePath(
            { ...old.progress, customPaths: [...(old.progress.customPaths ?? []), path] },
            path,
          ),
          focusedPathId: id,
        },
      };
    });
    return id;
  }, []);
  const recordPathActivity: AppStoreValue['recordPathActivity'] = useCallback(
    (input) => {
      const path =
        pathById(input.pathId) ??
        state.progress.customPaths?.find((item) => item.id === input.pathId);
      if (!path) return null;
      const now = new Date();
      let outcome: PathProgressResult | null = null;
      let pathReward: PathReward = { xp: 0, gold: 0, fragments: 0 };
      setState((old) => {
        const applied = applyActivityToProgress(old.progress, path, { ...input, at: now });
        outcome = applied.result;
        pathReward = pathRewardFor(path, applied.result);
        return {
          ...old,
          progress: {
            ...applied.progress,
            xp: applied.progress.xp + pathReward.xp,
            gold: applied.progress.gold + pathReward.gold,
            fragments: applied.progress.fragments + pathReward.fragments,
          },
        };
      });
      const result = outcome as PathProgressResult | null;
      if (!result) return null;
      const completedBeat = result.completedBeatIds.at(-1);
      const beat = path.beats?.find(
        (item) => item.id === completedBeat || item.id === input.beatId,
      );
      const nextAction = nextPathAction(path, result.state, state.uiLanguage);
      const type = pathReward.fragments
        ? 'FRAGMENT_REVEALED'
        : result.pathCompleted
          ? 'PATH_COMPLETED'
          : completedBeat
            ? 'BEAT_COMPLETED'
            : result.feedback === 'partial'
              ? 'ACTIVITY_PARTIAL'
              : 'PATH_PROGRESS';
      setFeedbackEvent({
        id: `${type}-${now.getTime()}`,
        type,
        tier: pathReward.fragments ? 4 : result.pathCompleted ? 3 : completedBeat ? 2 : 1,
        tone: beat?.tone ?? 'reflective',
        message:
          (pathReward.fragments
            ? `${uiText(state.uiLanguage, 'Fragment revealed')} · ${pathTitle(path, state.uiLanguage)}`
            : result.pathCompleted
              ? `${pathTitle(path, state.uiLanguage)} · ${uiText(state.uiLanguage, 'Path complete')}`
              : completedBeat
                ? `${beat ? beatTitle(beat, state.uiLanguage) : 'Beat'} · ${uiText(state.uiLanguage, 'Complete')}`
                : result.feedback === 'partial'
                  ? uiText(state.uiLanguage, 'Partial success')
                  : `+${result.appliedProgress} ${uiText(state.uiLanguage, 'Path progress')}`) +
          (result.pathCompleted ? '' : ` · ${nextAction.label}: ${nextAction.detail}`),
        amount: result.appliedProgress,
        diminishingLevel: result.diminishingLevel,
      });
      return result;
    },
    [state.progress.customPaths, state.uiLanguage],
  );

  const recordReading = useCallback(
    (items: Verse[]) => {
      setState((old) => {
        const unread = items.filter((verse) => !old.progress.readVerseIds[verse.id]);
        if (!unread.length) return old;
        const today = localDay(new Date());
        const baseAward = unread.length;
        const award = dailyXpAward(baseAward, old.progress.dailyXp[today] ?? 0);
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
      });
      const first = items[0];
      if (first) {
        const campaignId =
          first.bookId === 'romans' || first.bookId === 'proverbs' ? first.bookId : null;
        const defaultPath = campaignId ? pathForBook(campaignId, 'reading') : undefined;
        const focusedPathId = state.progress.focusedPathId;
        const pathId =
          focusedPathId && state.progress.activePathIds?.includes(focusedPathId)
            ? focusedPathId
            : defaultPath?.id;
        if (pathId)
          recordPathActivity({
            pathId,
            beatId: pathId === defaultPath?.id ? `${first.bookId}-${first.chapter}` : undefined,
            activity: 'reading',
          });
      }
    },
    [recordPathActivity, state.progress.activePathIds, state.progress.focusedPathId],
  );
  const startReadingPlan = useCallback(
    (planId: string) =>
      setState((old) => {
        const path = pathForReadingPlan(planId);
        const progress = path ? activatePath(old.progress, path) : old.progress;
        return {
          ...old,
          progress: {
            ...progress,
            focusedPathId: path?.id ?? progress.focusedPathId,
            activeReadingPlanId: planId,
            readingPlanProgress: {
              ...progress.readingPlanProgress,
              [planId]: progress.readingPlanProgress[planId] ?? {
                planId,
                startedAt: new Date().toISOString(),
                completedDays: [],
                paused: false,
              },
            },
          },
        };
      }),
    [],
  );
  const completeReadingPlanDay = useCallback(
    (planId: string, day: number) => {
      let completed = false;
      setState((old) => {
        const current = old.progress.readingPlanProgress[planId];
        if (!current || current.completedDays.includes(day)) return old;
        completed = true;
        const today = localDay(new Date());
        const baseAward = 5;
        const award = dailyXpAward(baseAward, old.progress.dailyXp[today] ?? 0);
        const plan = readingPlanById(planId);
        const completesPlan = Boolean(
          plan && current.completedDays.length + 1 >= plan.durationDays,
        );
        return {
          ...old,
          progress: {
            ...old.progress,
            xp: old.progress.xp + award,
            gold: old.progress.gold + (completesPlan ? 100 : 0),
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
      });
      if (completed) {
        const path = pathForReadingPlan(planId);
        if (path)
          recordPathActivity({
            pathId: path.id,
            beatId: `${planId}-day-${day}`,
            activity: 'reading',
          });
      }
    },
    [recordPathActivity],
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
      cloudSyncStatus,
      availableVerses: versesForTranslation(state.translationId),
      feedbackEvent,
      emitFeedback,
      setFeedbackSetting,
      dismissFeedback,
      recordPathActivity,
      startPath,
      focusPath,
      createPath,
      setUiLanguage,
      setTranslationId,
      setCampaign,
      setPathChapter,
      setLessonProgress,
      completeLesson,
      openChest,
      setTargetCharacter,
      toggleActiveCharacter,
      unlockHeroSlot,
      buyCharacterShards,
      applyWildShard,
      buyShopItem,
      activateBooster,
      claimLevelReward,
      claimJourneyBeat,
      claimPeriodMastery,
      claimDailyGoalReward,
      claimDailyQuestReward,
      claimAchievementReward,
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
      cloudSyncStatus,
      feedbackEvent,
      emitFeedback,
      setFeedbackSetting,
      dismissFeedback,
      recordPathActivity,
      startPath,
      focusPath,
      createPath,
      setUiLanguage,
      setTranslationId,
      setCampaign,
      setPathChapter,
      setLessonProgress,
      completeLesson,
      openChest,
      setTargetCharacter,
      toggleActiveCharacter,
      unlockHeroSlot,
      buyCharacterShards,
      applyWildShard,
      buyShopItem,
      activateBooster,
      claimLevelReward,
      claimJourneyBeat,
      claimPeriodMastery,
      claimDailyGoalReward,
      claimDailyQuestReward,
      claimAchievementReward,
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
