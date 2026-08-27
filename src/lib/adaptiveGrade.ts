import type { ReviewGrade } from '../types';

export function inferReviewGrade(input: {
  accuracy: number;
  hintsUsed: number;
  recallMs: number;
  wordCount: number;
}): ReviewGrade {
  const { accuracy, hintsUsed, recallMs, wordCount } = input;
  if (accuracy < 0.55) return 'again';
  if (accuracy < 0.82 || hintsUsed >= 2) return 'hard';

  const confidentRecallMs = Math.max(12_000, wordCount * 2_200 + 8_000);
  if (accuracy >= 0.98 && hintsUsed === 0 && recallMs <= confidentRecallMs) return 'easy';
  return 'good';
}
