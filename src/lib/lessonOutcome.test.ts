import { describe, expect, it } from 'vitest';
import { lessonOutcome } from './lessonOutcome';

describe('lessonOutcome', () => {
  it.each(['again', 'hard', 'good', 'easy'] as const)('advances after %s', (grade) => {
    expect(lessonOutcome(grade, 0.8).advance).toBe(true);
  });

  it('treats hard as a successful but difficult recall', () => {
    expect(lessonOutcome('hard', 0.8).success).toBe(true);
  });

  it('keeps a failed recall unsuccessful without blocking progression', () => {
    expect(lessonOutcome('again', 0.2)).toEqual({ advance: true, success: false });
  });
});
