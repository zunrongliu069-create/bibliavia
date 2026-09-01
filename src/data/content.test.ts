import { describe, expect, it } from 'vitest';
import {
  bibleVersionById,
  booksForVersion,
  getPassage,
  getVerse,
  isBibleVersionEnabled,
  versesForTranslation,
} from './content';

describe('shared Bible content layer', () => {
  it.each([
    ['webp', 31_098, 'In the beginning, God created'],
    ['cuv-s', 31_021, '起初，　神创造天地'],
    ['cuv-t', 31_021, '起初，上帝創造天地'],
  ])('contains the complete 66-book %s source', (versionId, verseCount, opening) => {
    expect(booksForVersion(versionId)).toHaveLength(66);
    expect(versesForTranslation(versionId)).toHaveLength(verseCount);
    expect(bibleVersionById(versionId)?.sourceChecksum).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(getVerse(versionId, 'genesis', 1, 1)?.text).toContain(opening);
    expect(getVerse(versionId, 'revelation', 22, 21)).toBeDefined();
  });

  it('returns one shared verse identity for Reading, Memorization, Review and Challenge', () => {
    const verse = getVerse('webp', 'john', 3, 16)!;
    const passage = getPassage('webp', 'john', 3, 16, 3, 21);
    expect(passage).toHaveLength(6);
    expect(passage[0]).toEqual(verse);
    expect(verse.id).toBe('webp-john-3-16');
  });

  it('keeps unavailable licensed versions configured but disabled and empty', () => {
    const b2000 = bibleVersionById('b2000')!;
    expect(b2000.redistributionAllowed).toBe(false);
    expect(b2000.contentAvailable).toBe(false);
    expect(isBibleVersionEnabled('b2000')).toBe(false);
    expect(getVerse('b2000', 'john', 3, 16)).toBeUndefined();
  });
});
