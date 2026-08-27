import type { ExerciseMode, Mastery, ReviewGrade } from '../types';

export const MIN_DAILY_XP = 10;

export const dailyXpAward = (baseXp: number, earnedToday: number): number =>
  Math.max(Math.max(0, Math.floor(baseXp)), MIN_DAILY_XP - Math.max(0, earnedToday));

export function calculateXp(input: {
  grade: ReviewGrade;
  accuracy: number;
  hintsUsed: number;
  mode: ExerciseMode;
  mastery: Mastery;
}): number {
  if (input.grade === 'again' || input.accuracy < 0.5) return 2;
  const base = input.mastery.stage === 'new' ? 12 : 8;
  const modeBonus =
    input.mode === 'recall' || input.mode === 'speak'
      ? 8
      : input.mode === 'context' ||
          input.mode === 'contextChoice' ||
          input.mode === 'initials' ||
          input.mode === 'keywords'
        ? 4
        : input.mode === 'blanks' ||
            input.mode === 'moreBlanks' ||
            input.mode === 'reorder' ||
            input.mode === 'choice' ||
            input.mode === 'finish' ||
            input.mode === 'sentenceCheck' ||
            input.mode === 'match'
          ? 2
          : 0;
  const ageBonus = Math.min(10, Math.floor(input.mastery.stabilityDays / 7));
  const perfectBonus = input.accuracy >= 0.98 && input.hintsUsed === 0 ? 6 : 0;
  const hintPenalty = input.hintsUsed * 3;
  const gradeFactor = input.grade === 'easy' ? 1.15 : input.grade === 'hard' ? 0.75 : 1;
  return Math.max(
    3,
    Math.round((base + modeBonus + ageBonus + perfectBonus - hintPenalty) * gradeFactor),
  );
}
