import type { Verse } from '../types';

const bookOrder: Record<Verse['bookId'], number> = { romans: 0, proverbs: 1 };

export function learningSequence(items: Verse[]): Verse[] {
  return [...items].sort(
    (a, b) =>
      bookOrder[a.bookId] - bookOrder[b.bookId] ||
      a.chapter - b.chapter ||
      a.verseStart - b.verseStart ||
      a.verseEnd - b.verseEnd,
  );
}

export function nextVerseAfter(items: Verse[], verseId: string): Verse | undefined {
  const ordered = learningSequence(items);
  const index = ordered.findIndex((item) => item.id === verseId);
  return index >= 0 ? ordered[index + 1] : ordered[0];
}
