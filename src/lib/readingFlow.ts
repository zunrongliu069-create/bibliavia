import type { PathState, ReadingSessionState } from '../types';

export interface ReadingFlowContext {
  sectionIds: string[];
  recapCount: number;
  definitionRevision?: number;
}

export type ReadingFlowAction =
  | { type: 'begin' }
  | { type: 'finish-reading' }
  | { type: 'answer'; correct: boolean }
  | { type: 'retry' }
  | { type: 'continue' };

export const initialReadingSession = (definitionRevision?: number): ReadingSessionState => ({
  ...(definitionRevision ? { definitionRevision } : {}),
  phase: 'intro',
  sectionIndex: 0,
  recapIndex: 0,
  completedSectionIds: [],
  answerState: 'idle',
});

export const readingSessionProgress = (
  state: ReadingSessionState,
  context: ReadingFlowContext,
): number => {
  if (state.phase === 'complete') return 1;
  const total = context.sectionIds.length + context.recapCount;
  if (!total) return 0;
  const completedRecaps = state.phase === 'recap' ? state.recapIndex : 0;
  return Math.min(1, (state.completedSectionIds.length + completedRecaps) / total);
};

export const readingSectionsComplete = (state: ReadingSessionState, context: ReadingFlowContext) =>
  context.sectionIds.length > 0 &&
  context.sectionIds.every((sectionId) => state.completedSectionIds.includes(sectionId));

export const readingCompletionNeeded = (
  state: ReadingSessionState,
  context: ReadingFlowContext,
  readingCompleted: boolean,
) => !readingCompleted && readingSectionsComplete(state, context);

export const readingQuizCompletionNeeded = (
  state: ReadingSessionState,
  context: ReadingFlowContext,
  quizCompleted: boolean,
) =>
  !quizCompleted &&
  state.phase === 'recap' &&
  state.answerState === 'correct' &&
  state.recapIndex + 1 >= context.recapCount;

export type ReadingNextStep = {
  kind: 'section' | 'recap' | 'complete';
  position?: number;
  total?: number;
};

export const readingNextStep = (
  state: ReadingSessionState,
  context: ReadingFlowContext,
): ReadingNextStep => {
  if (state.phase === 'complete') return { kind: 'complete' };
  if (state.phase === 'recap') {
    const nextIndex = state.recapIndex + (state.answerState === 'correct' ? 1 : 0);
    return nextIndex < context.recapCount
      ? { kind: 'recap', position: nextIndex + 1, total: context.recapCount }
      : { kind: 'complete' };
  }
  const sectionFinished =
    state.phase === 'interaction' &&
    state.answerState === 'correct' &&
    state.completedSectionIds.includes(context.sectionIds[state.sectionIndex] ?? '');
  const nextIndex = state.sectionIndex + (sectionFinished ? 1 : 0);
  if (nextIndex < context.sectionIds.length)
    return { kind: 'section', position: nextIndex + 1, total: context.sectionIds.length };
  return context.recapCount
    ? { kind: 'recap', position: 1, total: context.recapCount }
    : { kind: 'complete' };
};

export const transitionReadingSession = (
  state: ReadingSessionState,
  action: ReadingFlowAction,
  context: ReadingFlowContext,
): ReadingSessionState => {
  if (action.type === 'begin' && state.phase === 'intro')
    return { ...state, phase: 'reading', answerState: 'idle' };
  if (action.type === 'finish-reading' && state.phase === 'reading')
    return { ...state, phase: 'interaction', answerState: 'idle' };
  if (action.type === 'answer' && (state.phase === 'interaction' || state.phase === 'recap')) {
    const sectionId = context.sectionIds[state.sectionIndex];
    return {
      ...state,
      completedSectionIds:
        action.correct && state.phase === 'interaction' && sectionId
          ? [...new Set([...state.completedSectionIds, sectionId])]
          : state.completedSectionIds,
      answerState: action.correct ? 'correct' : 'incorrect',
    };
  }
  if (action.type === 'retry' && state.answerState === 'incorrect')
    return { ...state, answerState: 'idle' };
  if (action.type !== 'continue' || state.answerState !== 'correct') return state;

  if (state.phase === 'interaction') {
    const sectionId = context.sectionIds[state.sectionIndex];
    const completedSectionIds = sectionId
      ? [...new Set([...state.completedSectionIds, sectionId])]
      : state.completedSectionIds;
    if (state.sectionIndex + 1 < context.sectionIds.length)
      return {
        ...state,
        phase: 'reading',
        sectionIndex: state.sectionIndex + 1,
        completedSectionIds,
        answerState: 'idle',
      };
    return {
      ...state,
      phase: context.recapCount > 0 ? 'recap' : 'complete',
      completedSectionIds,
      recapIndex: 0,
      answerState: 'idle',
    };
  }
  if (state.phase === 'recap') {
    if (state.recapIndex + 1 < context.recapCount)
      return { ...state, recapIndex: state.recapIndex + 1, answerState: 'idle' };
    return { ...state, phase: 'complete', answerState: 'idle' };
  }
  return state;
};

export const backReadingSession = (
  state: ReadingSessionState,
  context: ReadingFlowContext,
): ReadingSessionState => {
  if (state.phase === 'interaction') return { ...state, phase: 'reading', answerState: 'idle' };
  if (state.phase === 'reading')
    return state.sectionIndex === 0
      ? { ...state, phase: 'intro', answerState: 'idle' }
      : { ...state, sectionIndex: state.sectionIndex - 1, answerState: 'idle' };
  if (state.phase === 'recap')
    return {
      ...state,
      phase: 'reading',
      sectionIndex: Math.max(0, context.sectionIds.length - 1),
      answerState: 'idle',
    };
  if (state.phase === 'complete')
    return {
      ...state,
      phase: 'recap',
      recapIndex: Math.max(0, context.recapCount - 1),
      answerState: 'idle',
    };
  return state;
};

export const restoreReadingSession = (
  state: ReadingSessionState | undefined,
  context: ReadingFlowContext,
): ReadingSessionState => {
  if (
    !state ||
    (context.definitionRevision && state.definitionRevision !== context.definitionRevision)
  )
    return initialReadingSession(context.definitionRevision);
  const restored: ReadingSessionState = {
    ...state,
    sectionIndex: Math.max(0, Math.min(context.sectionIds.length - 1, state.sectionIndex)),
    recapIndex: Math.max(0, Math.min(context.recapCount - 1, state.recapIndex)),
    completedSectionIds: state.completedSectionIds.filter((id) => context.sectionIds.includes(id)),
    answerState: 'idle',
  };
  const currentSectionId = context.sectionIds[restored.sectionIndex];
  if (
    restored.phase === 'interaction' &&
    currentSectionId &&
    restored.completedSectionIds.includes(currentSectionId)
  ) {
    if (restored.sectionIndex + 1 < context.sectionIds.length)
      return { ...restored, phase: 'reading', sectionIndex: restored.sectionIndex + 1 };
    return { ...restored, phase: context.recapCount ? 'recap' : 'complete', recapIndex: 0 };
  }
  if (restored.phase === 'recap' && state.answerState === 'correct') {
    if (restored.recapIndex + 1 < context.recapCount)
      return { ...restored, recapIndex: restored.recapIndex + 1 };
    return { ...restored, phase: 'complete' };
  }
  return restored;
};

export const withReadingSession = (
  state: PathState,
  beatId: string,
  readingSession: ReadingSessionState,
): PathState => {
  const node = state.nodeProgress?.[beatId];
  if (!node?.chapter) return state;
  return {
    ...state,
    nodeProgress: {
      ...state.nodeProgress,
      [beatId]: {
        ...node,
        chapter: { ...node.chapter, readingSession },
      },
    },
  };
};
