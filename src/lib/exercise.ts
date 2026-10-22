import { curricula } from '../data/curriculum';
import type { ExerciseMode, Mastery, Verse } from '../types';
import { tokenize } from './tokenize';

export const adaptiveSequence: ExerciseMode[] = [
  'read',
  'finish',
  'choice',
  'sentenceCheck',
  'understand',
  'reorder',
  'initials',
  'keywords',
  'listen',
  'speak',
  'recall',
  'context',
];

export type LessonStageIndex = 0 | 1 | 2;
export type LessonScope = 'full' | 'structure' | 'chunk' | 'cumulative';

export interface LessonStep {
  mode: ExerciseMode;
  stage: LessonStageIndex;
  scope: LessonScope;
  partStart?: number;
  partEnd?: number;
  gate?: boolean;
  minimumAccuracy?: number;
}

export function createLessonPlan(partCount: number): LessonStep[] {
  const count = Math.max(1, partCount);
  const learn: LessonStep[] = [{ mode: 'read', stage: 0, scope: 'full' }];
  if (count > 1) learn.push({ mode: 'read', stage: 0, scope: 'structure' });
  for (let part = 1; part <= count; part += 1) {
    learn.push({ mode: 'blanks', stage: 0, scope: 'chunk', partStart: part, partEnd: part });
    if (part > 1)
      learn.push({ mode: 'blanks', stage: 0, scope: 'cumulative', partStart: 1, partEnd: part });
  }
  learn.push({
    mode: 'initials',
    stage: 0,
    scope: 'full',
    gate: true,
    minimumAccuracy: 0.55,
  });
  return [
    ...learn,
    { mode: 'moreBlanks', stage: 1, scope: 'full' },
    { mode: 'reorder', stage: 1, scope: 'full' },
    {
      mode: 'recall',
      stage: 1,
      scope: 'full',
      gate: true,
      minimumAccuracy: 0.75,
    },
    { mode: 'initials', stage: 2, scope: 'full' },
    {
      mode: 'recall',
      stage: 2,
      scope: 'full',
      gate: true,
      minimumAccuracy: 0.9,
    },
  ];
}

export const lessonStageStart = (plan: LessonStep[], stage: LessonStageIndex) =>
  Math.max(
    0,
    plan.findIndex((step) => step.stage === stage),
  );

export const lessonStageForPlanExercise = (plan: LessonStep[], index: number) =>
  plan[Math.max(0, Math.min(plan.length - 1, index))]?.stage ?? 0;

export const isLessonPlanStageEnd = (plan: LessonStep[], nextIndex: number) =>
  nextIndex >= plan.length || plan[nextIndex - 1]?.stage !== plan[nextIndex]?.stage;

export const lessonLevelForPlanEnd = (plan: LessonStep[], nextIndex: number) => {
  const stage = plan[Math.max(0, nextIndex - 1)]?.stage ?? 0;
  return stage === 0
    ? ('learn' as const)
    : stage === 1
      ? ('practice' as const)
      : ('master' as const);
};

export const mustRetryLessonStep = (
  step: LessonStep,
  grade: import('../types').ReviewGrade,
  accuracy: number,
) => Boolean(step.gate && (grade === 'again' || accuracy < (step.minimumAccuracy ?? 0.55)));

export function recommendedMode(mastery?: Mastery): ExerciseMode {
  if (!mastery) return 'read';
  if (
    (mastery.recallStrength ?? 0) + 0.12 < (mastery.recognitionStrength ?? 0) &&
    (mastery.learningStep ?? 0) > 3
  )
    return 'recall';
  return adaptiveSequence[
    Math.max(0, Math.min(adaptiveSequence.length - 1, mastery.learningStep ?? 0))
  ]!;
}

export function understandingChoices(verse: Verse): { label: string; correct: boolean }[] {
  const curriculum = curricula.find((item) => item.id === verse.bookId);
  const correct =
    curriculum?.chapters.find((item) => item.chapter === verse.chapter)?.theme ??
    curriculum?.subtitle ??
    verse.bookName;
  const distractors = (curriculum?.chapters ?? [])
    .filter((item) => item.chapter !== verse.chapter)
    .map((item) => item.theme);
  const a =
    distractors[(verse.chapter * 3) % Math.max(1, distractors.length)] ?? 'A different theme';
  const b =
    distractors[(verse.chapter * 7 + 1) % Math.max(1, distractors.length)] ?? 'Another passage';
  return [
    { label: a, correct: false },
    { label: correct, correct: true },
    { label: b, correct: false },
  ];
}

export function wordChoice(verse: Verse): { prompt: string; options: string[]; correct: string } {
  const words = tokenize(verse.text, verse.languageTag);
  const targetIndex = Math.min(words.length - 1, Math.max(0, Math.floor(words.length / 2)));
  const correct = words[targetIndex] ?? '';
  const options = [words[targetIndex + 2], correct, words[Math.max(0, targetIndex - 2)]].filter(
    Boolean,
  ) as string[];
  let occurrence = 0;
  const prompt = verse.languageTag.startsWith('zh')
    ? verse.text.replace(correct, '____')
    : verse.text.replace(/[\p{L}\p{N}]+(?:[’'][\p{L}]+)?/gu, (word) =>
        occurrence++ === targetIndex ? '____' : word,
      );
  return { prompt, options: [...new Set(options)], correct };
}

const joinWords = (words: string[], languageTag: string) =>
  words.join(languageTag.startsWith('zh') ? '' : ' ');

export function finishSentenceChoice(verse: Verse): {
  prompt: string;
  options: string[];
  correct: string;
} {
  const words = tokenize(verse.text, verse.languageTag);
  const answerLength = Math.max(1, Math.min(3, Math.floor(words.length / 4)));
  const correct = joinWords(words.slice(-answerLength), verse.languageTag);
  const distractorStart = Math.max(0, words.length - answerLength * 3);
  const firstDistractor = joinWords(
    words.slice(distractorStart, distractorStart + answerLength),
    verse.languageTag,
  );
  const fallbackDistractor = joinWords(words.slice(0, answerLength), verse.languageTag);
  const distractor =
    firstDistractor !== correct
      ? firstDistractor
      : fallbackDistractor !== correct
        ? fallbackDistractor
        : `${correct}${verse.languageTag.startsWith('zh') ? '吗' : ' not'}`;
  const prompt =
    `${joinWords(words.slice(0, -answerLength), verse.languageTag)} ${'____'.repeat(verse.languageTag.startsWith('zh') ? 1 : answerLength)}`.trim();
  return { prompt, options: [...new Set([correct, distractor])], correct };
}

export function exactSentenceChoice(verse: Verse): {
  statement: string;
  options: string[];
  correct: string;
} {
  const words = tokenize(verse.text, verse.languageTag);
  const targetIndex = Math.max(0, Math.min(words.length - 1, Math.floor(words.length * 0.6)));
  const target = words[targetIndex] ?? '';
  const replacement =
    words.find(
      (word, index) =>
        index !== targetIndex && word.toLocaleLowerCase() !== target.toLocaleLowerCase(),
    ) ?? `${target}${verse.languageTag.startsWith('zh') ? '不' : ' not'}`;
  const changed = words.map((word, index) => (index === targetIndex ? replacement : word));
  const showCorrect =
    verse.id.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) % 2 === 0;
  return {
    statement: showCorrect
      ? joinWords(words, verse.languageTag)
      : joinWords(changed, verse.languageTag),
    options: ['yes', 'no'],
    correct: showCorrect ? 'yes' : 'no',
  };
}

export interface VerseMatchPair {
  id: string;
  left: string;
  right: string;
}

export function verseMatchPairs(verses: Verse[], languageTag: string): VerseMatchPair[] {
  return verses.slice(0, 3).map((item) => ({
    id: item.id,
    left: item.reference,
    right: joinWords(tokenize(item.text, languageTag).slice(0, 6), languageTag),
  }));
}

export function nextVerseChoice(
  current: Verse,
  next: Verse | undefined,
  distractor: Verse | undefined,
): { prompt: string; options: string[]; correct: string } {
  const correct = next?.text ?? current.text;
  const wrong = distractor?.text ?? exactSentenceChoice(current).statement;
  return { prompt: current.text, options: [...new Set([correct, wrong])], correct };
}
