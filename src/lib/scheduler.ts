import type { ExerciseMode, Mastery, MasteryStage, ReviewGrade } from '../types';

const DAY = 86_400_000;
const gradeScore: Record<ReviewGrade, number> = { again: 1, hard: 2, good: 3, easy: 4 };

export function retrievability(mastery: Mastery, at = new Date()): number {
  if (!mastery.lastReviewedAt) return 0;
  const elapsed = Math.max(0, at.getTime() - new Date(mastery.lastReviewedAt).getTime()) / DAY;
  return Math.pow(1 + elapsed / Math.max(0.1, mastery.stabilityDays), -1);
}

export function stageFor(stabilityDays: number, successfulRecalls: number): MasteryStage {
  if (!successfulRecalls) return 'new';
  if (stabilityDays < 3) return 'learning';
  if (stabilityDays < 14) return 'familiar';
  if (stabilityDays < 60) return 'strong';
  return 'mastered';
}

export function initialMastery(verseId: string, now = new Date()): Mastery {
  return {
    verseId,
    stage: 'new',
    difficulty: 5,
    stabilityDays: 0.2,
    retrievability: 0,
    dueAt: now.toISOString(),
    lastReviewedAt: null,
    successfulRecalls: 0,
    lapses: 0,
    hintsUsed: 0,
    averageAccuracy: 0,
    averageRecallMs: 0,
    recognitionStrength: 0,
    recallStrength: 0,
    understandingStrength: 0,
    learningStep: 0,
    reviewCount: 0,
  };
}

const intervalLadder = [0, 1, 3, 7, 14, 30, 60];
const fullRecallModes = new Set<ExerciseMode>(['recall', 'speak']);
const shortRecallModes = new Set<ExerciseMode>([
  'blanks',
  'moreBlanks',
  'reorder',
  'initials',
  'keywords',
  'context',
]);
const understandingModes = new Set<ExerciseMode>(['understand', 'contextChoice']);

export function scheduleReview(
  current: Mastery,
  input: {
    grade: ReviewGrade;
    mode: ExerciseMode;
    accuracy: number;
    hintsUsed: number;
    recallMs: number;
    now?: Date;
  },
): Mastery {
  const now = input.now ?? new Date();
  const score = gradeScore[input.grade];
  const r = current.lastReviewedAt ? retrievability(current, now) : 0.25;
  const hintPenalty = Math.min(0.35, input.hintsUsed * 0.12);
  const quality = Math.max(0.1, Math.min(1, input.accuracy - hintPenalty));
  const isFullRecall = fullRecallModes.has(input.mode);
  const isShortRecall = shortRecallModes.has(input.mode);
  const evidenceWeight = isFullRecall
    ? 1
    : isShortRecall
      ? 0.45
      : input.mode === 'read'
        ? 0.05
        : 0.15;
  const effective = score * quality * evidenceWeight;
  const failed = input.grade === 'again' || input.accuracy < 0.55;
  const difficulty = Math.max(
    1,
    Math.min(
      10,
      current.difficulty +
        (failed ? 0.8 : 0.25 * (3 - score)) +
        hintPenalty -
        (input.grade === 'easy' ? 0.35 : 0),
    ),
  );
  let stability: number;
  if (failed) {
    stability = Math.max(
      0.12,
      current.stabilityDays * (isFullRecall ? 0.25 : isShortRecall ? 0.65 : 0.9),
    );
  } else {
    const desirableDifficulty = 1 + (1 - r) * 1.4;
    const growth = 1 + (desirableDifficulty * effective * (11 - difficulty)) / 12;
    stability = Math.max(0.25, current.stabilityDays * growth);
  }
  const nextRecallCount = current.successfulRecalls + (!failed && isFullRecall ? 1 : 0);
  const ladderIndex = Math.min(
    intervalLadder.length - 1,
    nextRecallCount + (input.grade === 'easy' ? 1 : 0),
  );
  const ladderDays = intervalLadder[ladderIndex] ?? 60;
  const intervalDays = failed
    ? isFullRecall
      ? 1 / 48
      : isShortRecall
        ? 1 / 12
        : 1 / 4
    : !isFullRecall
      ? isShortRecall
        ? 1
        : 0.5
      : input.grade === 'hard'
        ? Math.max(0.5, ladderDays * 0.55)
        : Math.max(1, ladderDays * Math.max(0.7, quality));
  const successfulRecalls = nextRecallCount;
  const count = current.reviewCount ?? current.successfulRecalls + current.lapses;
  const oldRecognition = current.recognitionStrength ?? current.averageAccuracy ?? 0;
  const oldRecall = current.recallStrength ?? 0;
  const oldUnderstanding = current.understandingStrength ?? 0;
  const measured = Math.max(0, Math.min(1, input.accuracy - hintPenalty));
  const recognitionStrength =
    isFullRecall || isShortRecall || understandingModes.has(input.mode)
      ? oldRecognition
      : oldRecognition * 0.7 + measured * 0.3;
  const recallStrength = isFullRecall
    ? oldRecall * 0.55 + measured * 0.45
    : isShortRecall
      ? oldRecall * 0.8 + measured * 0.2
      : oldRecall * 0.99;
  const understandingStrength = understandingModes.has(input.mode)
    ? oldUnderstanding * 0.55 + measured * 0.45
    : oldUnderstanding;
  const stepDelta = failed
    ? isFullRecall
      ? -2
      : -1
    : isFullRecall && input.grade === 'easy'
      ? 2
      : 1;
  const learningStep = Math.max(0, Math.min(12, (current.learningStep ?? 0) + stepDelta));
  return {
    ...current,
    difficulty,
    stabilityDays: stability,
    retrievability: failed ? 0.35 : 1,
    dueAt: new Date(now.getTime() + intervalDays * DAY).toISOString(),
    lastReviewedAt: now.toISOString(),
    successfulRecalls,
    lapses: current.lapses + (failed && isFullRecall ? 1 : 0),
    hintsUsed: current.hintsUsed + input.hintsUsed,
    averageAccuracy: count
      ? (current.averageAccuracy * count + input.accuracy) / (count + 1)
      : input.accuracy,
    averageRecallMs: count
      ? (current.averageRecallMs * count + input.recallMs) / (count + 1)
      : input.recallMs,
    recognitionStrength,
    recallStrength,
    understandingStrength,
    learningStep,
    reviewCount: count + 1,
    stage: stageFor(Math.max(stability, intervalDays), successfulRecalls),
  };
}

export function masteryPercent(mastery?: Mastery): number {
  if (!mastery) return 0;
  const evidence =
    ((mastery.recognitionStrength ?? 0) * 0.15 + (mastery.recallStrength ?? 0) * 0.85) * 100;
  const retention = mastery.lastReviewedAt ? 0.7 + retrievability(mastery) * 0.3 : 0.7;
  const honestScore = evidence * retention;
  return Math.round(mastery.successfulRecalls > 0 ? honestScore : Math.min(49, honestScore));
}

export function recallRisk(mastery: Mastery, now = new Date()): number {
  return Math.round((1 - retrievability(mastery, now)) * 100);
}
