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
  const blankCount = Math.min(strength >= 0.6 ? 3 : 2, Math.max(1, words.length - 1));
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
