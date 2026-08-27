import type { ReviewGrade } from '../types';

export const lessonOutcome = (grade: ReviewGrade, accuracy: number) => ({
  advance: true,
  success: grade !== 'again' && accuracy >= 0.55,
});
