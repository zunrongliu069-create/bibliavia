import { describe, expect, it } from 'vitest';
import { getReferencedPassage } from './content';
import { readingChapterForBeat } from './readingChapters';

describe('Mark 1 Reading Path content', () => {
  const chapter = readingChapterForBeat('mark-1');

  it('uses six editorial sections that cover Mark 1 without gaps', () => {
    expect(
      chapter?.sections.map((section) => [section.passage.startVerse, section.passage.endVerse]),
    ).toEqual([
      [1, 8],
      [9, 13],
      [14, 20],
      [21, 34],
      [35, 39],
      [40, 45],
    ]);
  });

  it('resolves every section from both WEB and simplified CUV', () => {
    for (const section of chapter!.sections) {
      expect(getReferencedPassage('webp', section.passage).length).toBeGreaterThan(0);
      expect(getReferencedPassage('cuv-s', section.passage).length).toBeGreaterThan(0);
    }
  });

  it('provides one structurally valid interaction after every section', () => {
    expect(chapter?.sections.every((section) => section.interaction)).toBe(true);
    for (const section of chapter!.sections) {
      const interaction = section.interaction!;
      if (interaction.kind === 'choose')
        expect(interaction.options.map((option) => option.id)).toContain(
          interaction.correctOptionId,
        );
      if (interaction.kind === 'order')
        expect([...interaction.correctOrder].sort()).toEqual(
          interaction.items.map((item) => item.id).sort(),
        );
      if (interaction.kind === 'connect')
        expect(new Set(interaction.pairs.map((pair) => pair.id)).size).toBe(
          interaction.pairs.length,
        );
    }
  });

  it('uses all three interaction mechanics and a three-question recap', () => {
    expect(new Set(chapter?.sections.map((section) => section.interaction?.kind))).toEqual(
      new Set(['choose', 'order', 'connect']),
    );
    expect(chapter?.recap).toHaveLength(3);
    expect(new Set(chapter?.recap.map((interaction) => interaction.kind))).toEqual(
      new Set(['choose', 'order', 'connect']),
    );
  });
});

describe('complete Mark Reading Path content', () => {
  const verseCounts = [45, 28, 35, 41, 43, 56, 37, 38, 50, 52, 33, 44, 37, 72, 47, 20];

  it('provides editorial Reading 1.0 content for every Mark chapter', () => {
    expect(
      verseCounts.map((_, index) => Boolean(readingChapterForBeat(`mark-${index + 1}`))),
    ).toEqual(Array(16).fill(true));
  });

  it.each(verseCounts.map((count, index) => [index + 1, count] as const))(
    'covers every verse of Mark %i exactly once',
    (chapterNumber, verseCount) => {
      const chapter = readingChapterForBeat(`mark-${chapterNumber}`)!;
      const covered = chapter.sections.flatMap((section) => {
        expect(section.passage.startChapter).toBe(chapterNumber);
        expect(section.passage.endChapter).toBe(chapterNumber);
        return Array.from(
          { length: section.passage.endVerse - section.passage.startVerse + 1 },
          (_, index) => section.passage.startVerse + index,
        );
      });
      expect(covered).toEqual(Array.from({ length: verseCount }, (_, index) => index + 1));
    },
  );

  it('keeps every section interactive and every chapter recap short', () => {
    for (let chapterNumber = 1; chapterNumber <= 16; chapterNumber += 1) {
      const chapter = readingChapterForBeat(`mark-${chapterNumber}`)!;
      expect(chapter.sections.length).toBeGreaterThanOrEqual(3);
      expect(chapter.sections.every((section) => Boolean(section.interaction))).toBe(true);
      expect(chapter.recap.length).toBeGreaterThanOrEqual(2);
      expect(chapter.recap.length).toBeLessThanOrEqual(3);
    }
  });

  it('keeps generated checks structurally valid and varies the correct answer position', () => {
    for (let chapterNumber = 2; chapterNumber <= 16; chapterNumber += 1) {
      const chapter = readingChapterForBeat(`mark-${chapterNumber}`)!;
      const correctPositions = chapter.sections.map((section) => {
        const interaction = section.interaction!;
        expect(interaction.kind).toBe('choose');
        if (interaction.kind !== 'choose') return -1;
        const optionIds = interaction.options.map((option) => option.id);
        expect(optionIds).toContain(interaction.correctOptionId);
        return optionIds.indexOf(interaction.correctOptionId);
      });
      expect(new Set(correctPositions).size).toBeGreaterThan(1);

      for (const interaction of chapter.recap) {
        if (interaction.kind === 'order')
          expect([...interaction.correctOrder].sort()).toEqual(
            interaction.items.map((item) => item.id).sort(),
          );
        if (interaction.kind === 'connect')
          expect(new Set(interaction.pairs.map((pair) => pair.id)).size).toBe(
            interaction.pairs.length,
          );
      }
    }
  });

  it('resolves every section in WEB and both CUV editions', () => {
    for (let chapterNumber = 1; chapterNumber <= 16; chapterNumber += 1) {
      for (const section of readingChapterForBeat(`mark-${chapterNumber}`)!.sections) {
        for (const version of ['webp', 'cuv-s', 'cuv-t'] as const) {
          const verses = getReferencedPassage(version, section.passage);
          expect(verses.length, `${version} ${section.id}`).toBeGreaterThan(0);
          expect(verses[0]?.verseStart).toBe(section.passage.startVerse);
          expect(verses.at(-1)?.verseEnd).toBe(section.passage.endVerse);
        }
      }
    }
  });

  it('localizes all authored reading content', () => {
    const languages = ['en', 'sv', 'zh-Hans', 'zh-Hant'] as const;
    for (let chapterNumber = 1; chapterNumber <= 16; chapterNumber += 1) {
      const chapter = readingChapterForBeat(`mark-${chapterNumber}`)!;
      for (const section of chapter.sections) {
        for (const language of languages) expect(section.titles?.[language]?.trim()).toBeTruthy();
      }
      for (const interaction of [
        ...chapter.sections.map((section) => section.interaction!),
        ...chapter.recap,
      ]) {
        for (const language of languages) {
          expect(interaction.prompt[language].trim()).toBeTruthy();
          expect(interaction.explanation[language].trim()).toBeTruthy();
          if (interaction.kind === 'choose')
            for (const option of interaction.options)
              expect(option.label[language].trim()).toBeTruthy();
          if (interaction.kind === 'order')
            for (const item of interaction.items) expect(item.label[language].trim()).toBeTruthy();
          if (interaction.kind === 'connect')
            for (const pair of interaction.pairs) {
              expect(pair.left[language].trim()).toBeTruthy();
              expect(pair.right[language].trim()).toBeTruthy();
            }
        }
      }
    }
  });
});
