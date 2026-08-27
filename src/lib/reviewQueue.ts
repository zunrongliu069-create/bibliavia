import { retrievability } from './scheduler';
import type { Mastery, ReviewEvent, Verse } from '../types';

export type ReviewMode = 'quick' | 'normal' | 'full';

const limitFor = (mode: ReviewMode) =>
  mode === 'quick' ? 5 : mode === 'normal' ? 10 : Number.POSITIVE_INFINITY;

export function prioritizedDueVerses(
  verses: Verse[],
  mastery: Record<string, Mastery>,
  reviews: ReviewEvent[],
  mode: ReviewMode,
  now = new Date(),
): Verse[] {
  const mistakeCounts = reviews.reduce<Record<string, number>>((counts, review) => {
    if (review.accuracy < 0.82 || review.grade === 'again')
      counts[review.verseId] = (counts[review.verseId] ?? 0) + 1;
    return counts;
  }, {});
  return verses
    .filter((verse) => {
      const item = mastery[verse.id];
      return (item?.successfulRecalls ?? 0) > 0 && new Date(item!.dueAt).getTime() <= now.getTime();
    })
    .sort((a, b) => {
      const left = mastery[a.id]!;
      const right = mastery[b.id]!;
      const overdueLeft = Math.max(0, now.getTime() - new Date(left.dueAt).getTime());
      const overdueRight = Math.max(0, now.getTime() - new Date(right.dueAt).getTime());
      return (
        overdueRight - overdueLeft ||
        (mistakeCounts[b.id] ?? 0) - (mistakeCounts[a.id] ?? 0) ||
        retrievability(left, now) - retrievability(right, now) ||
        left.recallStrength - right.recallStrength ||
        new Date(left.lastReviewedAt ?? 0).getTime() - new Date(right.lastReviewedAt ?? 0).getTime()
      );
    })
    .slice(0, limitFor(mode));
}

export function reviewHealth(
  verses: Verse[],
  mastery: Record<string, Mastery>,
  now = new Date(),
): number {
  const learned = verses.filter((verse) => (mastery[verse.id]?.successfulRecalls ?? 0) > 0);
  if (!learned.length) return 100;
  const health =
    learned.reduce((sum, verse) => {
      const item = mastery[verse.id]!;
      const overdue = new Date(item.dueAt).getTime() <= now.getTime();
      return (
        sum +
        (overdue ? retrievability(item, now) * 0.65 : Math.max(0.65, retrievability(item, now)))
      );
    }, 0) / learned.length;
  return Math.round(Math.max(0, Math.min(1, health)) * 100);
}
