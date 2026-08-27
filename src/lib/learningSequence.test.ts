import { describe, expect, it } from 'vitest';
import { learningSequence, nextVerseAfter } from './learningSequence';
import type { Verse } from '../types';

const verse = (
  id: string,
  bookId: Verse['bookId'],
  chapter: number,
  verseStart: number,
): Verse => ({
  id,
  translationId: 'test',
  bookId,
  bookName: bookId,
  chapter,
  verseStart,
  verseEnd: verseStart,
  reference: id,
  text: id,
  languageTag: 'en',
  sourceUrl: '',
});

describe('learning sequence', () => {
  const items = [
    verse('pro-3-5', 'proverbs', 3, 5),
    verse('rom-1-2', 'romans', 1, 2),
    verse('rom-1-1', 'romans', 1, 1),
  ];

  it('keeps verses in canonical learning order', () => {
    expect(learningSequence(items).map((item) => item.id)).toEqual([
      'rom-1-1',
      'rom-1-2',
      'pro-3-5',
    ]);
  });

  it('moves to the next available verse even across a book boundary', () => {
    expect(nextVerseAfter(items, 'rom-1-1')?.id).toBe('rom-1-2');
    expect(nextVerseAfter(items, 'rom-1-2')?.id).toBe('pro-3-5');
    expect(nextVerseAfter(items, 'pro-3-5')).toBeUndefined();
  });
});
