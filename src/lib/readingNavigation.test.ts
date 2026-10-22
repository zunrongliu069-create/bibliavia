import { describe, expect, it } from 'vitest';
import { readingNextAction } from './readingNavigation';

describe('readingNextAction', () => {
  it('opens the chapter quiz before advancing to another chapter', () => {
    expect(
      readingNextAction({ hasChapterQuiz: true, quizCompleted: false, hasNextChapter: true }),
    ).toBe('quiz');
  });

  it('continues to the next chapter after the current chapter quiz is complete', () => {
    expect(
      readingNextAction({ hasChapterQuiz: true, quizCompleted: true, hasNextChapter: true }),
    ).toBe('next-chapter');
  });

  it('finishes the Path when its final chapter and quiz are complete', () => {
    expect(
      readingNextAction({ hasChapterQuiz: true, quizCompleted: true, hasNextChapter: false }),
    ).toBe('path-complete');
  });

  it('advances ordinary Bible reading without inventing a quiz', () => {
    expect(
      readingNextAction({ hasChapterQuiz: false, quizCompleted: false, hasNextChapter: true }),
    ).toBe('next-chapter');
  });
});
