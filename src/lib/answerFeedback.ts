import type { ExerciseMode } from '../types';
import { tokenize } from './tokenize';

export type WordDiffKind = 'correct' | 'minor' | 'missing' | 'extra' | 'changed';

export interface WordDiffToken {
  kind: WordDiffKind;
  expected?: string;
  actual?: string;
}

export interface AnswerDiff {
  tokens: WordDiffToken[];
  missing: number;
  extra: number;
  changed: number;
  minor: number;
}

export type MistakeFeedbackKey =
  | 'feedbackCorrect'
  | 'feedbackMinorSpelling'
  | 'feedbackMissingWords'
  | 'feedbackChangedWords'
  | 'feedbackWordOrder'
  | 'feedbackRecognition';

const normalizeWord = (word: string) =>
  word
    .normalize('NFC')
    .toLocaleLowerCase()
    .replace(/[’']/gu, '')
    .replace(/[^\p{L}\p{N}]/gu, '');

const editDistance = (left: string, right: string) => {
  const a = [...left];
  const b = [...right];
  const rows = Array.from({ length: a.length + 1 }, (_, index) =>
    Array.from({ length: b.length + 1 }, (__, other) =>
      index === 0 ? other : other === 0 ? index : 0,
    ),
  );
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      rows[i]![j] =
        a[i - 1] === b[j - 1]
          ? rows[i - 1]![j - 1]!
          : 1 + Math.min(rows[i - 1]![j]!, rows[i]![j - 1]!, rows[i - 1]![j - 1]!);
    }
  }
  return rows[a.length]![b.length]!;
};

const substitution = (expected: string, actual: string) => {
  if (expected === actual) return { cost: 0, kind: 'correct' as const };
  const distance = editDistance(expected, actual);
  const longest = Math.max([...expected].length, [...actual].length);
  if ((longest >= 4 && distance === 1) || (longest >= 7 && distance === 2)) {
    return { cost: 0.25, kind: 'minor' as const };
  }
  return { cost: 1, kind: 'changed' as const };
};

export function answerWordDiff(expected: string, actual: string, languageTag: string): AnswerDiff {
  const expectedWords = tokenize(expected, languageTag);
  const actualWords = tokenize(actual, languageTag);
  const a = expectedWords.map(normalizeWord);
  const b = actualWords.map(normalizeWord);
  const rows = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (__, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      rows[i]![j] = Math.min(
        rows[i - 1]![j]! + 1,
        rows[i]![j - 1]! + 1,
        rows[i - 1]![j - 1]! + substitution(a[i - 1]!, b[j - 1]!).cost,
      );
    }
  }

  const tokens: WordDiffToken[] = [];
  let i = a.length;
  let j = b.length;
  while (i > 0 || j > 0) {
    const sub = i > 0 && j > 0 ? substitution(a[i - 1]!, b[j - 1]!) : null;
    const canDelete = i > 0 && Math.abs(rows[i]![j]! - (rows[i - 1]![j]! + 1)) < 0.001;
    const canInsert = j > 0 && Math.abs(rows[i]![j]! - (rows[i]![j - 1]! + 1)) < 0.001;
    if (sub?.kind === 'changed' && i > j && canDelete) {
      tokens.push({ kind: 'missing', expected: expectedWords[i - 1] });
      i -= 1;
    } else if (sub?.kind === 'changed' && j > i && canInsert) {
      tokens.push({ kind: 'extra', actual: actualWords[j - 1] });
      j -= 1;
    } else if (sub && Math.abs(rows[i]![j]! - (rows[i - 1]![j - 1]! + sub.cost)) < 0.001) {
      tokens.push({ kind: sub.kind, expected: expectedWords[i - 1], actual: actualWords[j - 1] });
      i -= 1;
      j -= 1;
    } else if (canDelete) {
      tokens.push({ kind: 'missing', expected: expectedWords[i - 1] });
      i -= 1;
    } else {
      tokens.push({ kind: 'extra', actual: actualWords[j - 1] });
      j -= 1;
    }
  }
  tokens.reverse();
  return {
    tokens,
    missing: tokens.filter((token) => token.kind === 'missing').length,
    extra: tokens.filter((token) => token.kind === 'extra').length,
    changed: tokens.filter((token) => token.kind === 'changed').length,
    minor: tokens.filter((token) => token.kind === 'minor').length,
  };
}

const recognitionModes: ExerciseMode[] = [
  'understand',
  'choice',
  'sentenceCheck',
  'match',
  'contextChoice',
  'listen',
  'read',
];

export function mistakeFeedbackKey(
  mode: ExerciseMode,
  accuracy: number,
  diff: AnswerDiff,
): MistakeFeedbackKey {
  if (accuracy >= 0.98 && diff.minor === 0) return 'feedbackCorrect';
  if (mode === 'reorder') return 'feedbackWordOrder';
  if (recognitionModes.includes(mode)) return 'feedbackRecognition';
  if (diff.minor > 0 && diff.missing + diff.extra + diff.changed === 0)
    return 'feedbackMinorSpelling';
  if (diff.missing > diff.changed) return 'feedbackMissingWords';
  return 'feedbackChangedWords';
}
