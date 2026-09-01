import type { Verse } from '../types';
import { canonicalBookIds } from '../data/content';

export function learningSequence(items: Verse[]): Verse[] {
  const legacyCurriculumOnly = items.every(
    (verse) => verse.bookId === 'romans' || verse.bookId === 'proverbs',
  );
  const order = legacyCurriculumOnly ? ['romans', 'proverbs'] : canonicalBookIds;
  const bookOrder = new Map(order.map((bookId, index) => [bookId, index]));
  return [...items].sort(
    (a, b) =>
      (bookOrder.get(a.bookId) ?? order.length) - (bookOrder.get(b.bookId) ?? order.length) ||
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
