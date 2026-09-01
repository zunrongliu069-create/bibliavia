import { describe, expect, it } from 'vitest';
import type { Mastery, ReviewEvent, Verse } from '../types';
import { lessonOutcome } from './lessonOutcome';
import { nextVerseAfter } from './learningSequence';
import { prioritizedDueVerses } from './reviewQueue';
import { initialMastery, retrievability, scheduleReview } from './scheduler';

const DAY = 86_400_000;
const start = new Date('2026-01-01T00:00:00.000Z');
const verses: Verse[] = [1, 2].map((verseStart) => ({
  id: `romans-1-${verseStart}`,
  translationId: 'test',
  bookId: 'romans',
  bookName: 'Romans',
  chapter: 1,
  verseStart,
  verseEnd: verseStart,
  reference: `Romans 1:${verseStart}`,
  text: `Verse ${verseStart}`,
  languageTag: 'en',
  sourceUrl: '',
}));

describe('60-day retention flow', () => {
  it('selects only due verses, recovers from a lapse, and reaches durable stages', () => {
    let mastery = Object.fromEntries(
      verses.map((verse) => [verse.id, initialMastery(verse.id, start)]),
    ) as Record<string, Mastery>;
    const reviews: ReviewEvent[] = [];
    const seenStages = new Set([mastery[verses[0]!.id]!.stage]);
    let stabilityBeforeLapse = 0;
    let decayedRetrievability = 1;

    for (let day = 0; day <= 60; day += 1) {
      const now = new Date(start.getTime() + day * DAY);
      const due = prioritizedDueVerses(verses, mastery, reviews, 'full', now);
      if (day === 0) due.push(...verses);

      for (const verse of [...new Map(due.map((item) => [item.id, item])).values()]) {
        const current = mastery[verse.id]!;
        expect(new Date(current.dueAt).getTime()).toBeLessThanOrEqual(now.getTime());
        const lapse = verse.id === verses[0]!.id && day === 4;
        if (lapse) {
          stabilityBeforeLapse = current.stabilityDays;
          decayedRetrievability = retrievability(current, now);
        }
        const next = scheduleReview(current, {
          grade: lapse ? 'again' : 'good',
          mode: 'recall',
          accuracy: lapse ? 0.2 : 1,
          hintsUsed: lapse ? 1 : 0,
          recallMs: 12_000,
          now,
        });
        mastery = { ...mastery, [verse.id]: next };
        seenStages.add(next.stage);
        reviews.push({
          id: `${verse.id}-${day}`,
          verseId: verse.id,
          reviewedAt: now.toISOString(),
          grade: lapse ? 'again' : 'good',
          mode: 'recall',
          accuracy: lapse ? 0.2 : 1,
          hintsUsed: lapse ? 1 : 0,
          recallMs: 12_000,
          xpAwarded: 0,
        });
      }

      if (day === 30) {
        const persisted = JSON.parse(JSON.stringify({ mastery, reviews })) as {
          mastery: Record<string, Mastery>;
          reviews: ReviewEvent[];
        };
        mastery = persisted.mastery;
        reviews.splice(0, reviews.length, ...persisted.reviews);
      }
    }

    const lapsed = mastery[verses[0]!.id]!;
    expect(decayedRetrievability).toBeLessThan(1);
    expect(lapsed.lapses).toBe(1);
    expect(lapsed.stabilityDays).toBeGreaterThan(stabilityBeforeLapse);
    expect(lapsed.successfulRecalls).toBeGreaterThanOrEqual(5);
    expect(seenStages).toEqual(new Set(['new', 'learning', 'familiar', 'strong', 'mastered']));
    expect(Object.values(mastery).every((item) => item.stage === 'mastered')).toBe(true);
  });

  it('allows a stage exit after full recall and continues to the next verse', () => {
    const recalled = scheduleReview(initialMastery(verses[0]!.id, start), {
      grade: 'good',
      mode: 'recall',
      accuracy: 1,
      hintsUsed: 0,
      recallMs: 12_000,
      now: start,
    });

    expect(lessonOutcome('good', 1)).toEqual({ advance: true, success: true });
    expect(recalled.successfulRecalls).toBe(1);
    expect(nextVerseAfter(verses, verses[0]!.id)?.id).toBe(verses[1]!.id);
  });
});
