import { describe, expect, it } from 'vitest';
import type { UserProgress } from '../types';
import {
  ACHIEVEMENT_REWARDS,
  DAILY_GOAL_REWARD,
  DAILY_QUEST_REWARD,
  dailyQuestCount,
} from './activityRewards';

describe('activity rewards', () => {
  it('keeps routine goals and achievements Fragment-free', () => {
    expect(DAILY_GOAL_REWARD.gold).toBeLessThan(DAILY_QUEST_REWARD.gold);
    expect(DAILY_GOAL_REWARD.fragments).toBe(0);
    expect(DAILY_QUEST_REWARD.fragments).toBe(0);
    expect(Object.values(ACHIEVEMENT_REWARDS).every((reward) => reward.fragments === 0)).toBe(true);
  });

  it('requires all three daily quests', () => {
    const day = '2026-08-30';
    const progress = {
      reviews: [
        { reviewedAt: `${day}T08:00:00Z`, verseId: 'a', accuracy: 1, hintsUsed: 0, mode: 'recall' },
        {
          reviewedAt: `${day}T08:01:00Z`,
          verseId: 'b',
          accuracy: 0.8,
          hintsUsed: 0,
          mode: 'choice',
        },
        {
          reviewedAt: `${day}T08:02:00Z`,
          verseId: 'c',
          accuracy: 0.8,
          hintsUsed: 0,
          mode: 'choice',
        },
      ],
      mastery: { a: { successfulRecalls: 1 } },
    } as unknown as UserProgress;
    expect(dailyQuestCount(progress, day)).toBe(3);
  });
});
