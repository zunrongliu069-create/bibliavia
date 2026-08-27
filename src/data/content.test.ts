import { describe, expect, it } from 'vitest';
import { versesForTranslation } from './content';

describe('CUV Simplified Romans import', () => {
  const romans = versesForTranslation('cuv-s').filter((verse) => verse.bookId === 'romans');

  it('contains the complete canonical verse sequence', () => {
    expect(romans).toHaveLength(433);
    expect(romans[0]?.reference).toBe('罗马书 1:1');
    expect(romans.at(-1)?.reference).toBe('罗马书 16:27');
  });

  it('contains every chapter in ascending order', () => {
    expect([...new Set(romans.map((verse) => verse.chapter))]).toEqual(
      Array.from({ length: 16 }, (_, index) => index + 1),
    );
    expect(
      romans.every(
        (verse, index) =>
          index === 0 ||
          verse.chapter > romans[index - 1]!.chapter ||
          verse.verseStart === romans[index - 1]!.verseStart + 1,
      ),
    ).toBe(true);
  });
});

describe('chapter one lesson starts', () => {
  it.each([
    ['cuv-s', 'romans', '罗马书 1:1'],
    ['cuv-s', 'proverbs', '箴言 1:1'],
    ['webp', 'romans', 'Romans 1:1'],
    ['webp', 'proverbs', 'Proverbs 1:1'],
  ])('%s starts %s at chapter 1 verse 1', (translationId, bookId, reference) => {
    const first = versesForTranslation(translationId).find((verse) => verse.bookId === bookId);
    expect(first?.reference).toBe(reference);
  });

  it('contains the complete English Romans chapter 1 path', () => {
    const chapter = versesForTranslation('webp').filter(
      (verse) => verse.bookId === 'romans' && verse.chapter === 1,
    );
    expect(chapter).toHaveLength(32);
    expect(chapter.map((verse) => verse.verseStart)).toEqual(
      Array.from({ length: 32 }, (_, index) => index + 1),
    );
    expect(chapter.at(-1)?.reference).toBe('Romans 1:32');
  });
});
