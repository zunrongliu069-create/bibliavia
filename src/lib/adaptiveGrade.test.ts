import { describe, expect, it } from 'vitest';
import { inferReviewGrade } from './adaptiveGrade';

describe('adaptive review grading', () => {
  it('marks an inaccurate recall for immediate repetition', () => {
    expect(inferReviewGrade({ accuracy: 0.4, hintsUsed: 0, recallMs: 15_000, wordCount: 12 })).toBe(
      'again',
    );
  });

  it('treats several hints as hard even with a correct answer', () => {
    expect(inferReviewGrade({ accuracy: 1, hintsUsed: 2, recallMs: 20_000, wordCount: 12 })).toBe(
      'hard',
    );
  });

  it('reserves easy for fast, accurate recall without hints', () => {
    expect(inferReviewGrade({ accuracy: 1, hintsUsed: 0, recallMs: 20_000, wordCount: 12 })).toBe(
      'easy',
    );
    expect(
      inferReviewGrade({ accuracy: 0.94, hintsUsed: 0, recallMs: 20_000, wordCount: 12 }),
    ).toBe('good');
  });
});
