import type {
  BibleBookContent,
  BiblePassageReference,
  PathBeatDefinition,
  PathDefinition,
  UiLanguage,
} from '../types';
import { booksForVersion, canonicalBookIds } from './content';
import { milestoneIndexes } from '../lib/pathWorld';
import { readingChapterForBeat } from './readingChapters';

const languages: UiLanguage[] = ['en', 'sv', 'zh-Hans', 'zh-Hant'];
const booksByVersion = Object.fromEntries(
  ['webp', 'cuv-s', 'cuv-t'].map((versionId) => [
    versionId,
    new Map(booksForVersion(versionId).map((book) => [book.id, book])),
  ]),
) as Record<string, Map<string, BibleBookContent>>;
const webBook = (bookId: string) => booksByVersion.webp!.get(bookId)!;
const localizedBookTitles = (bookId: string): Partial<Record<UiLanguage, string>> => ({
  en: webBook(bookId).name,
  sv: webBook(bookId).name,
  'zh-Hans': booksByVersion['cuv-s']!.get(bookId)?.name ?? webBook(bookId).name,
  'zh-Hant': booksByVersion['cuv-t']!.get(bookId)?.name ?? webBook(bookId).name,
});
const passage = (
  bookId: string,
  startChapter: number,
  startVerse: number,
  endChapter = startChapter,
  endVerse = startVerse,
): BiblePassageReference => ({ bookId, startChapter, startVerse, endChapter, endVerse });
const lastVerse = (bookId: string, chapter: number) =>
  webBook(bookId)
    .chapters.find((item) => item.number === chapter)!
    .verses.at(-1)!.number;

const chapterBeat = (bookId: string, chapter: number, previousId?: string): PathBeatDefinition => {
  const bookTitles = localizedBookTitles(bookId);
  const reading = readingChapterForBeat(`${bookId}-${chapter}`);
  return {
    id: `${bookId}-${chapter}`,
    title: `${bookTitles.en} ${chapter}`,
    titles: Object.fromEntries(
      languages.map((language) => [language, `${bookTitles[language]} ${chapter}`]),
    ),
    target: 1,
    parentId: previousId,
    nodeKind: 'content',
    regionId: bookId,
    passage: passage(bookId, chapter, 1, chapter, lastVerse(bookId, chapter)),
    sections: reading?.sections,
    reading: reading
      ? { estimatedMinutes: reading.estimatedMinutes, recap: reading.recap }
      : undefined,
  };
};

const chapterPath = (
  id: string,
  bookIds: string[],
  titles: Record<UiLanguage, string>,
): PathDefinition => {
  const beats: PathBeatDefinition[] = [];
  for (const bookId of bookIds) {
    for (const chapter of webBook(bookId).chapters) {
      beats.push(chapterBeat(bookId, chapter.number, beats.at(-1)?.id));
    }
  }
  const milestones = new Set(milestoneIndexes(beats.length));
  beats.forEach((beat, index) => {
    beat.milestone = milestones.has(index);
  });
  return {
    id,
    title: titles.en,
    titles,
    source: 'curated',
    kind: 'reading',
    structure: 'chapter',
    beats,
    regions: bookIds.map((bookId) => ({
      id: bookId,
      title: localizedBookTitles(bookId).en!,
      titles: localizedBookTitles(bookId),
    })),
  };
};

const versePath = (
  id: string,
  reference: BiblePassageReference,
  titles: Record<UiLanguage, string>,
): PathDefinition => {
  const book = webBook(reference.bookId);
  const locatedVerses = book.chapters.flatMap((chapter) =>
    chapter.number < reference.startChapter || chapter.number > reference.endChapter
      ? []
      : chapter.verses
          .filter(
            (verse) =>
              (chapter.number > reference.startChapter || verse.number >= reference.startVerse) &&
              (chapter.number < reference.endChapter || verse.number <= reference.endVerse),
          )
          .map((verse) => ({ chapter: chapter.number, verse: verse.number })),
  );
  const beats: PathBeatDefinition[] = locatedVerses.map((location, index) => ({
    id: `${book.id}-${location.chapter}-${location.verse}`,
    title: `${book.name} ${location.chapter}:${location.verse}`,
    target: 1,
    parentId:
      index > 0
        ? `${book.id}-${locatedVerses[index - 1]!.chapter}-${locatedVerses[index - 1]!.verse}`
        : undefined,
    nodeKind: 'content',
    regionId: `${book.id}-${location.chapter}`,
    passage: passage(book.id, location.chapter, location.verse),
  }));
  beats.push({
    id: `${id}-final-boss`,
    title: 'Final Boss',
    titles: {
      en: 'Final Boss',
      sv: 'Slutboss',
      'zh-Hans': '最终挑战',
      'zh-Hant': '最終挑戰',
    },
    target: 1,
    parentId: beats.at(-1)?.id,
    nodeKind: 'final-boss',
    boss: { kind: 'final-boss', coverage: [reference] },
  });
  const milestones = new Set(milestoneIndexes(beats.length));
  beats.forEach((beat, index) => {
    beat.milestone = milestones.has(index);
  });
  const chapters = Array.from(
    { length: reference.endChapter - reference.startChapter + 1 },
    (_, index) => reference.startChapter + index,
  );
  return {
    id,
    title: titles.en,
    titles,
    source: 'curated',
    kind: 'memorization',
    structure: 'verse',
    beats,
    regions: chapters.map((chapter) => ({
      id: `${book.id}-${chapter}`,
      title: `${book.name} ${chapter}`,
    })),
  };
};

const newTestamentBookIds = canonicalBookIds.slice(canonicalBookIds.indexOf('matthew'));

export const pathDefinitions: PathDefinition[] = [
  chapterPath('reading-mark', ['mark'], {
    en: 'Short Reading — Mark',
    sv: 'Kort läsning — Markusevangeliet',
    'zh-Hans': '短篇阅读 — 马可福音',
    'zh-Hant': '短篇閱讀 — 馬可福音',
  }),
  chapterPath('reading-luke', ['luke'], {
    en: 'Medium Reading — Luke',
    sv: 'Medellång läsning — Lukasevangeliet',
    'zh-Hans': '中篇阅读 — 路加福音',
    'zh-Hant': '中篇閱讀 — 路加福音',
  }),
  chapterPath('reading-new-testament', newTestamentBookIds, {
    en: 'Long Reading — The New Testament',
    sv: 'Lång läsning — Hela Nya testamentet',
    'zh-Hans': '长篇阅读 — 整本新约',
    'zh-Hant': '長篇閱讀 — 整本新約',
  }),
  versePath('memorization-psalm-23', passage('psalms', 23, 1, 23, lastVerse('psalms', 23)), {
    en: 'Short Memorization — Psalm 23',
    sv: 'Kort memorering — Psalm 23',
    'zh-Hans': '短篇背诵 — 诗篇 23',
    'zh-Hant': '短篇背誦 — 詩篇 23',
  }),
  versePath('memorization-matthew-5-7', passage('matthew', 5, 1, 7, lastVerse('matthew', 7)), {
    en: 'Medium Memorization — Matthew 5–7',
    sv: 'Medellång memorering — Matteus 5–7',
    'zh-Hans': '中篇背诵 — 马太福音 5–7',
    'zh-Hant': '中篇背誦 — 馬太福音 5–7',
  }),
  versePath('memorization-romans', passage('romans', 1, 1, 16, lastVerse('romans', 16)), {
    en: 'Long Memorization — Romans 1–16',
    sv: 'Lång memorering — Romarbrevet 1–16',
    'zh-Hans': '长篇背诵 — 罗马书 1–16',
    'zh-Hant': '長篇背誦 — 羅馬書 1–16',
  }),
];

export const scripturePaths = pathDefinitions;
export const readingPlanPaths: PathDefinition[] = [];
export const pathById = (id: string) => pathDefinitions.find((path) => path.id === id);
export const pathForBook = (
  bookId: string,
  activity: 'reading' | 'memorization',
): PathDefinition | undefined =>
  pathDefinitions.find(
    (path) =>
      path.kind === activity &&
      path.beats?.some((beat) => beat.nodeKind === 'content' && beat.passage?.bookId === bookId),
  );
export const pathForReadingPlan = (planId: string): PathDefinition | undefined =>
  planId === 'mark-16'
    ? pathById('reading-mark')
    : planId === 'nt-90'
      ? pathById('reading-new-testament')
      : undefined;
export const pathTitle = (path: PathDefinition, language: UiLanguage) =>
  path.titles?.[language] ?? path.title;
export const beatTitle = (
  beat: NonNullable<PathDefinition['beats']>[number],
  language: UiLanguage,
) => beat.titles?.[language] ?? beat.title;
