import { describe, expect, it } from 'vitest';
import { initialMastery } from './scheduler';
import { prioritizedDueVerses, reviewHealth } from './reviewQueue';
import type { Mastery, ReviewEvent, Verse } from '../types';

const verse = (id: string): Verse => ({
  id,
  translationId: 'test',
  bookId: 'romans',
  bookName: 'Romans',
  chapter: 1,
  verseStart: 1,
  verseEnd: 1,
  reference: id,
  text: id,
  languageTag: 'en',
  sourceUrl: '',
});
const due = (id: string, daysOverdue: number, recalls = 1): Mastery => ({
  ...initialMastery(id),
  successfulRecalls: recalls,
  lastReviewedAt: '2026-08-01T00:00:00.000Z',
  dueAt: new Date(Date.UTC(2026, 7, 26 - daysOverdue)).toISOString(),
  recallStrength: 0.5,
});

describe('review queue', () => {
  it('limits quick and normal review while full review contains every due verse', () => {
    const verses = Array.from({ length: 12 }, (_, index) => verse(String(index)));
    const mastery = Object.fromEntries(
      verses.map((item, index) => [item.id, due(item.id, index + 1)]),
    );
    const now = new Date('2026-08-26T12:00:00.000Z');
    expect(prioritizedDueVerses(verses, mastery, [], 'quick', now)).toHaveLength(5);
    expect(prioritizedDueVerses(verses, mastery, [], 'normal', now)).toHaveLength(10);
    expect(prioritizedDueVerses(verses, mastery, [], 'full', now)).toHaveLength(12);
  });

  it('prioritizes overdue verses, then repeated mistakes', () => {
    const verses = [verse('old'), verse('mistake'), verse('other')];
    const mastery = { old: due('old', 8), mistake: due('mistake', 2), other: due('other', 2) };
    const reviews = [{ verseId: 'mistake', accuracy: 0.4, grade: 'again' }] as ReviewEvent[];
    expect(
      prioritizedDueVerses(
        verses,
        mastery,
        reviews,
        'full',
        new Date('2026-08-26T12:00:00.000Z'),
      ).map((item) => item.id),
    ).toEqual(['old', 'mistake', 'other']);
  });

  it('reports full health when nothing has been learned', () => {
    const item = verse('new');
    expect(reviewHealth([item], { new: initialMastery('new') })).toBe(100);
  });
});
