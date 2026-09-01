import { describe, expect, it } from 'vitest';
import type { UserProgress } from '../types';
import { achievementsFor, characterLevel } from './achievements';

const progress = (): UserProgress => ({
  xp: 0,
  gold: 0,
  streak: 0,
  longestStreak: 0,
  activeDates: [],
  lastPracticeDate: null,
  activeCampaign: 'romans',
  pathChapter: { romans: 1, proverbs: 1 },
  lessonProgress: {},
  completedLessonIds: [],
  characterShards: { david: 0 },
  wildShards: 0,
  streakFreezes: 0,
  xpBoosters: {},
  goldBoosters: {},
  activeXpBoosterUntil: null,
  activeGoldBoosterUntil: null,
  collectionInitialized: true,
  targetCharacter: 'david',
  fragments: 1,
  unlockedHeroSlots: 0,
  activeCharacters: ['david'],
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

describe('collection progression', () => {
  it('turns excess shards into four clear character levels', () => {
    expect(characterLevel(39, 40)).toBe(0);
    expect(characterLevel(40, 40)).toBe(1);
    expect(characterLevel(80, 40)).toBe(2);
    expect(characterLevel(160, 40)).toBe(4);
    expect(characterLevel(999, 40)).toBe(4);
  });

  it('uses each card actual unlock cost for the first-character achievement', () => {
    const state = progress();
    state.characterShards.david = 40;
    expect(
      achievementsFor(state, [], { david: 100 }).find((item) => item.id === 'first-character')
        ?.complete,
    ).toBe(false);
    state.characterShards.david = 100;
    expect(
      achievementsFor(state, [], { david: 100 }).find((item) => item.id === 'first-character')
        ?.complete,
    ).toBe(true);
  });
});
