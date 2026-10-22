export function tokenize(text: string, languageTag: string): string[] {
  if (languageTag.startsWith('zh')) {
    const Segmenter = (
      Intl as typeof Intl & {
        Segmenter?: new (
          locale: string,
          options: { granularity: 'word' },
        ) => { segment: (value: string) => Iterable<{ segment: string; isWordLike?: boolean }> };
      }
    ).Segmenter;
    if (Segmenter) {
      return [...new Segmenter(languageTag, { granularity: 'word' }).segment(text)]
        .filter((item) => item.isWordLike !== false && item.segment.trim())
        .map((item) => item.segment);
    }
    return [...text].filter((char) => /[\p{L}\p{N}]/u.test(char));
  }
  return text.match(/[\p{L}\p{N}]+(?:[’'][\p{L}]+)?/gu) ?? [];
}

export const VERSE_CHUNK_CONFIG = {
  longVerseThreshold: 18,
  maxWordsPerChunk: 9,
} as const;

export interface VerseLearningSection {
  text: string;
  partStart: number;
  partEnd: number;
  partCount: number;
  fullVerse: boolean;
}

export function verseLearningChunks(text: string, languageTag: string): string[] {
  const words = tokenize(text, languageTag);
  const trimmed = text.trim();
  const chineseLength = languageTag.startsWith('zh') ? [...trimmed].length : 0;
  const hasNaturalClauseBoundary = /[,，;；:：]/u.test(trimmed);
  if (
    words.length <= VERSE_CHUNK_CONFIG.longVerseThreshold &&
    chineseLength <= 32 &&
    !hasNaturalClauseBoundary
  )
    return [trimmed];

  const punctuationParts =
    trimmed.match(/[^,，;；:：.!?。！？]+(?:[,，;；:：.!?。！？]+[”’"'»）】]?|$)/gu) ?? [];
  let parts = punctuationParts.map((part) => part.trim()).filter(Boolean);
  if (parts.length <= 1 && !languageTag.startsWith('zh')) {
    parts = trimmed
      .split(/\s+(?=(?:and|but|because|when|while|who|which|that|for|as)\b)/giu)
      .map((part) => part.trim())
      .filter(Boolean);
  }
  if (parts.length <= 1) {
    if (languageTag.startsWith('zh')) {
      const characters = [...trimmed];
      return Array.from({ length: Math.ceil(characters.length / 16) }, (_, index) =>
        characters.slice(index * 16, (index + 1) * 16).join(''),
      ).filter(Boolean);
    }
    const wordMatches = [...trimmed.matchAll(/[\p{L}\p{N}]+(?:[’'][\p{L}]+)?/gu)];
    const chunks: string[] = [];
    for (let index = 0; index < wordMatches.length; index += VERSE_CHUNK_CONFIG.maxWordsPerChunk) {
      const start = wordMatches[index]?.index ?? 0;
      const next = wordMatches[index + VERSE_CHUNK_CONFIG.maxWordsPerChunk]?.index;
      chunks.push(trimmed.slice(start, next).trim());
    }
    return chunks.filter(Boolean);
  }

  const chunks: string[] = [];
  for (const part of parts) {
    const previous = chunks.at(-1);
    if (
      previous &&
      !languageTag.startsWith('zh') &&
      tokenize(previous, languageTag).length + tokenize(part, languageTag).length <=
        VERSE_CHUNK_CONFIG.maxWordsPerChunk
    )
      chunks[chunks.length - 1] = `${previous}${languageTag.startsWith('zh') ? '' : ' '}${part}`;
    else chunks.push(part);
  }
  return chunks;
}

export function lessonSectionForParts(
  text: string,
  languageTag: string,
  partStart?: number,
  partEnd?: number,
): VerseLearningSection {
  const chunks = verseLearningChunks(text, languageTag);
  if (chunks.length === 1 || partStart === undefined || partEnd === undefined)
    return {
      text,
      partStart: 1,
      partEnd: chunks.length,
      partCount: chunks.length,
      fullVerse: true,
    };
  const start = Math.max(1, Math.min(chunks.length, partStart));
  const end = Math.max(start, Math.min(chunks.length, partEnd));
  return {
    text: chunks.slice(start - 1, end).join(languageTag.startsWith('zh') ? '' : ' '),
    partStart: start,
    partEnd: end,
    partCount: chunks.length,
    fullVerse: start === 1 && end === chunks.length,
  };
}

export function normalizeRecall(text: string): string[] {
  return (
    text
      .normalize('NFC')
      .toLocaleLowerCase()
      .replace(/[’']/gu, '')
      .match(/[\p{L}\p{N}]+/gu) ?? []
  );
}

function editDistance(expected: string, actual: string): number {
  const a = [...expected];
  const b = [...actual];
  const rows = Array.from(
    { length: a.length + 1 },
    (_, i) => Array(b.length + 1).fill(0) as number[],
  );
  for (let i = 0; i <= a.length; i += 1) rows[i]![0] = i;
  for (let j = 0; j <= b.length; j += 1) rows[0]![j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      rows[i]![j] =
        a[i - 1] === b[j - 1]
          ? rows[i - 1]![j - 1]!
          : 1 + Math.min(rows[i - 1]![j]!, rows[i]![j - 1]!, rows[i - 1]![j - 1]!);
    }
  }
  return rows[a.length]![b.length]!;
}

function wordDifference(expected: string, actual: string): number {
  if (expected === actual) return 0;
  const distance = editDistance(expected, actual);
  const longest = Math.max([...expected].length, [...actual].length);

  // Small spelling slips should not outweigh successfully recalling the word.
  if (longest >= 4 && distance === 1) return 0.15;
  if (longest >= 7 && distance === 2) return 0.3;
  return 1;
}

export function recallAccuracy(expected: string, actual: string): number {
  const a = normalizeRecall(expected);
  const b = normalizeRecall(actual);
  if (!a.length) return 1;
  const rows = Array.from(
    { length: a.length + 1 },
    (_, i) => Array(b.length + 1).fill(0) as number[],
  );
  for (let i = 0; i <= a.length; i += 1) rows[i]![0] = i;
  for (let j = 0; j <= b.length; j += 1) rows[0]![j] = j;
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      rows[i]![j] = Math.min(
        1 + rows[i - 1]![j]!,
        1 + rows[i]![j - 1]!,
        wordDifference(a[i - 1]!, b[j - 1]!) + rows[i - 1]![j - 1]!,
      );
    }
  }
  return Math.max(0, 1 - rows[a.length]![b.length]! / Math.max(a.length, b.length, 1));
}

export function blankedText(text: string, languageTag: string, strength = 0.45): string {
  return blankExercise(text, languageTag, strength).prompt;
}

export function blankExercise(
  text: string,
  languageTag: string,
  strength = 0.45,
): { prompt: string; answer: string } {
  const words = tokenize(text, languageTag);
  const blankCount = Math.min(
    Math.max(1, words.length - 1),
    Math.max(strength >= 0.6 ? 3 : 2, Math.round(words.length * strength)),
  );
  const hidden = new Set<number>();
  for (let item = 1; item <= blankCount; item += 1)
    hidden.add(Math.min(words.length - 1, Math.floor((item * words.length) / (blankCount + 1))));
  const joiner = languageTag.startsWith('zh') ? '' : ' ';
  return {
    prompt: words.map((word, index) => (hidden.has(index) ? '____' : word)).join(joiner),
    answer: words.filter((_, index) => hidden.has(index)).join(joiner),
  };
}

export function shortRecallExercise(
  text: string,
  languageTag: string,
  offset: 'start' | 'middle' = 'start',
): { phrase: string; initials: string; keywords: string } {
  const words = tokenize(text, languageTag);
  const count = Math.min(6, words.length);
  const start = offset === 'middle' ? Math.max(0, Math.floor((words.length - count) / 2)) : 0;
  const phrase = words.slice(start, start + count).join(languageTag.startsWith('zh') ? '' : ' ');
  return {
    phrase,
    initials: initials(phrase, languageTag),
    keywords: keywordPrompt(phrase, languageTag),
  };
}

export function keywordPrompt(text: string, languageTag: string): string {
  const words = tokenize(text, languageTag);
  const selected = words
    .filter((_, index) => index % Math.max(2, Math.floor(words.length / 5)) === 0)
    .slice(0, 6);
  return selected.join(languageTag.startsWith('zh') ? ' · ' : '  •  ');
}

export function reorderedWords(text: string, languageTag: string): string[] {
  const words = tokenize(text, languageTag).slice(0, 30);
  if (words.length < 2) return words;
  const pivot = Math.max(1, Math.floor(words.length / 3));
  return [...words.slice(pivot), ...words.slice(0, pivot)].reverse();
}

export function initials(text: string, languageTag: string): string {
  if (languageTag.startsWith('zh'))
    return tokenize(text, languageTag)
      .map((word) => word[0])
      .join(' · ');
  return tokenize(text, languageTag)
    .map((word) => `${word[0]}${'·'.repeat(Math.min(word.length - 1, 5))}`)
    .join(' ');
}
