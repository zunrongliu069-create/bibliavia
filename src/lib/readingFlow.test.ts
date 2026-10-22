import { describe, expect, it } from 'vitest';
import {
  backReadingSession,
  initialReadingSession,
  restoreReadingSession,
  readingNextStep,
  readingSectionsComplete,
  readingCompletionNeeded,
  readingQuizCompletionNeeded,
  readingSessionProgress,
  transitionReadingSession,
  withReadingSession,
} from './readingFlow';
import type { PathState } from '../types';

const context = { sectionIds: ['one', 'two'], recapCount: 2 };

describe('Reading Path chapter flow', () => {
  it('moves through sections and recap into chapter completion', () => {
    let state = transitionReadingSession(initialReadingSession(), { type: 'begin' }, context);
    expect(state.phase).toBe('reading');
    state = transitionReadingSession(state, { type: 'finish-reading' }, context);
    expect(state.phase).toBe('interaction');
    state = transitionReadingSession(state, { type: 'answer', correct: true }, context);
    state = transitionReadingSession(state, { type: 'continue' }, context);
    expect(state).toMatchObject({ phase: 'reading', sectionIndex: 1 });
    state = transitionReadingSession(state, { type: 'finish-reading' }, context);
    state = transitionReadingSession(state, { type: 'answer', correct: true }, context);
    state = transitionReadingSession(state, { type: 'continue' }, context);
    expect(state).toMatchObject({ phase: 'recap', recapIndex: 0 });
    for (let index = 0; index < 2; index += 1) {
      state = transitionReadingSession(state, { type: 'answer', correct: true }, context);
      state = transitionReadingSession(state, { type: 'continue' }, context);
    }
    expect(state.phase).toBe('complete');
    expect(state.completedSectionIds).toEqual(['one', 'two']);
  });

  it('keeps an incorrect answer in place and permits a retry without lost progress', () => {
    const reading = transitionReadingSession(initialReadingSession(), { type: 'begin' }, context);
    const interaction = transitionReadingSession(reading, { type: 'finish-reading' }, context);
    const wrong = transitionReadingSession(
      interaction,
      { type: 'answer', correct: false },
      context,
    );
    expect(wrong).toMatchObject({ phase: 'interaction', answerState: 'incorrect' });
    expect(transitionReadingSession(wrong, { type: 'retry' }, context)).toMatchObject({
      phase: 'interaction',
      answerState: 'idle',
      sectionIndex: 0,
    });
  });

  it('completes a section as soon as understanding is established', () => {
    const reading = transitionReadingSession(initialReadingSession(), { type: 'begin' }, context);
    const interaction = transitionReadingSession(reading, { type: 'finish-reading' }, context);
    const understood = transitionReadingSession(
      interaction,
      { type: 'answer', correct: true },
      context,
    );
    expect(understood.completedSectionIds).toEqual(['one']);
    expect(readingSessionProgress(understood, context)).toBe(0.25);
  });

  it('resumes at the next section after leaving on a completed interaction', () => {
    const saved = {
      ...initialReadingSession(),
      phase: 'interaction' as const,
      completedSectionIds: ['one'],
      answerState: 'correct' as const,
    };
    expect(restoreReadingSession(saved, context)).toMatchObject({
      phase: 'reading',
      sectionIndex: 1,
      completedSectionIds: ['one'],
      answerState: 'idle',
    });
  });

  it('describes the next small action without exposing editorial section titles', () => {
    const understood = {
      ...initialReadingSession(),
      phase: 'interaction' as const,
      completedSectionIds: ['one'],
      answerState: 'correct' as const,
    };
    expect(readingNextStep(understood, context)).toEqual({
      kind: 'section',
      position: 2,
      total: 2,
    });
    expect(
      readingNextStep(
        { ...understood, sectionIndex: 1, completedSectionIds: ['one', 'two'] },
        context,
      ),
    ).toEqual({ kind: 'recap', position: 1, total: 2 });
  });

  it('marks chapter reading ready as soon as every section is understood', () => {
    expect(
      readingSectionsComplete(
        {
          ...initialReadingSession(),
          phase: 'interaction',
          sectionIndex: 1,
          completedSectionIds: ['one', 'two'],
          answerState: 'correct',
        },
        context,
      ),
    ).toBe(true);
  });

  it('repairs a resumed recap whose reading completion was not persisted yet', () => {
    const recap = {
      ...initialReadingSession(),
      phase: 'recap' as const,
      completedSectionIds: ['one', 'two'],
    };
    expect(readingCompletionNeeded(recap, context, false)).toBe(true);
    expect(readingCompletionNeeded(recap, context, true)).toBe(false);
  });

  it('finishes a resumed chapter after the final recap answer was correct', () => {
    const finalAnswer = {
      ...initialReadingSession(),
      phase: 'recap' as const,
      recapIndex: 1,
      completedSectionIds: ['one', 'two'],
      answerState: 'correct' as const,
    };
    expect(readingQuizCompletionNeeded(finalAnswer, context, false)).toBe(true);
    expect(restoreReadingSession(finalAnswer, context).phase).toBe('complete');
  });

  it('returns from an interaction to its reading section', () => {
    const reading = transitionReadingSession(initialReadingSession(), { type: 'begin' }, context);
    const interaction = transitionReadingSession(reading, { type: 'finish-reading' }, context);
    expect(backReadingSession(interaction, context)).toMatchObject({
      phase: 'reading',
      sectionIndex: 0,
    });
  });

  it('restores and clamps saved progress to the available content', () => {
    expect(
      restoreReadingSession(
        {
          phase: 'reading',
          sectionIndex: 12,
          recapIndex: 8,
          completedSectionIds: ['one', 'missing'],
          answerState: 'correct',
        },
        context,
      ),
    ).toEqual({
      phase: 'reading',
      sectionIndex: 1,
      recapIndex: 1,
      completedSectionIds: ['one'],
      answerState: 'idle',
    });
  });

  it('restarts only the chapter session when its content definition changes', () => {
    const saved = {
      ...initialReadingSession(),
      definitionRevision: 1,
      phase: 'complete' as const,
      sectionIndex: 1,
      recapIndex: 1,
      completedSectionIds: ['one', 'two'],
    };

    expect(
      restoreReadingSession(saved, {
        ...context,
        definitionRevision: 2,
      }),
    ).toEqual({
      phase: 'intro',
      sectionIndex: 0,
      recapIndex: 0,
      completedSectionIds: [],
      answerState: 'idle',
      definitionRevision: 2,
    });
  });

  it('stores reading progress inside the existing chapter node without changing completion', () => {
    const path: PathState = {
      pathId: 'reading-mark',
      status: 'active',
      activeBeatIds: ['mark-1'],
      beatProgress: {},
      pathProgress: 0,
      completedBeatIds: [],
      completedAt: null,
      lastActivityAt: null,
      activityCounts: {},
      nodeProgress: {
        'mark-1': {
          status: 'current',
          chapter: { readingCompleted: false, quizCompleted: false },
        },
      },
    };
    const session = transitionReadingSession(initialReadingSession(), { type: 'begin' }, context);
    const updated = withReadingSession(path, 'mark-1', session);
    expect(updated.nodeProgress?.['mark-1']?.chapter).toEqual({
      readingCompleted: false,
      quizCompleted: false,
      readingSession: session,
    });
  });
});
