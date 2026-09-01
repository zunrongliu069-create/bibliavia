import type { UserProgress } from '../types';

export interface ActivityReward {
  gold: number;
  wildShards: number;
  fragments: number;
}

export const DAILY_GOAL_XP = 50;
export const DAILY_GOAL_REWARD: ActivityReward = { gold: 25, wildShards: 1, fragments: 0 };
export const DAILY_QUEST_REWARD: ActivityReward = { gold: 50, wildShards: 2, fragments: 0 };

export const ACHIEVEMENT_REWARDS: Record<string, ActivityReward> = {
  'first-verse': { gold: 25, wildShards: 1, fragments: 0 },
  'ten-verses': { gold: 100, wildShards: 3, fragments: 0 },
  perfect: { gold: 30, wildShards: 1, fragments: 0 },
  'ten-perfect': { gold: 125, wildShards: 4, fragments: 0 },
  'first-character': { gold: 40, wildShards: 2, fragments: 0 },
  week: { gold: 100, wildShards: 3, fragments: 0 },
  chapter: { gold: 75, wildShards: 2, fragments: 0 },
  scholar: { gold: 200, wildShards: 5, fragments: 0 },
};

export const activityDay = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export const dailyQuestCount = (progress: UserProgress, day: string): number => {
  const reviews = progress.reviews.filter(
    (review) => activityDay(new Date(review.reviewedAt)) === day,
  );
  const perfect = reviews.some(
    (review) =>
      review.accuracy >= 0.98 &&
      review.hintsUsed === 0 &&
      ['recall', 'speak'].includes(review.mode),
  );
  const learned = reviews.some(
    (review) => progress.mastery[review.verseId]?.successfulRecalls === 1,
  );
  return [reviews.length >= 3, perfect, learned].filter(Boolean).length;
};
