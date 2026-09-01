import type {
  BibleBookContent,
  BiblePassageReference,
  BibleVersion,
  TranslationLicense,
  Verse,
} from '../types';
import cuvsData from './generated/cuvs-bible.json';
import cuvtData from './generated/cuvt-bible.json';
import webpData from './generated/webp-bible.json';

interface BibleContentFile {
  versionId: string;
  sourceId: string;
  sourceUrl: string;
  sourceChecksum: string;
  books: BibleBookContent[];
}

const contentFiles = [webpData, cuvsData, cuvtData] as unknown as BibleContentFile[];
const contentByVersion = new Map(contentFiles.map((content) => [content.versionId, content]));
export const canonicalBookIds = contentByVersion.get('webp')?.books.map((book) => book.id) ?? [];

const licenses: TranslationLicense[] = [
  {
    id: 'webp',
    name: 'World English Bible',
    abbreviation: 'WEB',
    languageTag: 'en',
    year: 2020,
    copyrightHolder: null,
    license: 'Public Domain; preserve the WEB name for faithful copies',
    jurisdictions: ['source-declared-public-domain'],
    commercialUse: 'allowed',
    digitalUse: 'allowed',
    attribution: 'Source: eBible.org, engwebp 2020 stable text edition',
    sourceUrl: 'https://ebible.org/bible/details.php?id=engwebp',
    sourceChecksum: contentByVersion.get('webp')?.sourceChecksum ?? null,
    verifiedAt: '2026-08-31',
    publicBuild: true,
    redistributionAllowed: true,
    contentAvailable: true,
  },
  {
    id: 'cuv-s',
    name: '新标点和合本',
    abbreviation: 'CUVs',
    languageTag: 'zh-Hans',
    year: 1919,
    copyrightHolder: null,
    license: 'Public Domain (as declared by the source)',
    jurisdictions: ['source-declared-public-domain'],
    commercialUse: 'allowed',
    digitalUse: 'allowed',
    attribution: 'Source: eBible.org, cmn-cu89s',
    sourceUrl: 'https://ebible.org/bible/details.php?id=cmn-cu89s',
    sourceChecksum: contentByVersion.get('cuv-s')?.sourceChecksum ?? null,
    verifiedAt: '2026-08-31',
    publicBuild: true,
    redistributionAllowed: true,
    contentAvailable: true,
  },
  {
    id: 'cuv-t',
    name: '新標點和合本',
    abbreviation: 'CUVt',
    languageTag: 'zh-Hant',
    year: 1919,
    copyrightHolder: null,
    license: 'Public Domain (as declared by the source)',
    jurisdictions: ['source-declared-public-domain'],
    commercialUse: 'allowed',
    digitalUse: 'allowed',
    attribution: 'Source: eBible.org, cmn-cu89t',
    sourceUrl: 'https://ebible.org/bible/details.php?id=cmn-cu89t',
    sourceChecksum: contentByVersion.get('cuv-t')?.sourceChecksum ?? null,
    verifiedAt: '2026-08-31',
    publicBuild: true,
    redistributionAllowed: true,
    contentAvailable: true,
  },
  {
    id: 'b2000',
    name: 'Bibel 2000',
    abbreviation: 'B2000',
    languageTag: 'sv',
    year: 2000,
    copyrightHolder: 'Svenska Bibelsällskapet',
    license: 'Permission required for digital apps/services',
    jurisdictions: ['Sweden', 'European Union'],
    commercialUse: 'permission-required',
    digitalUse: 'permission-required',
    attribution: 'Texter ur Bibel 2000 © Svenska bibelsällskapet',
    sourceUrl: 'https://www.xn--bibelsllskapet-bib.se/om-bibelsallskapet/copyright/',
    sourceChecksum: null,
    verifiedAt: '2026-08-31',
    publicBuild: false,
    redistributionAllowed: false,
    contentAvailable: false,
  },
];

export const bibleVersions: BibleVersion[] = licenses.map((license) => ({
  ...license,
  books:
    license.publicBuild && license.redistributionAllowed
      ? (contentByVersion.get(license.id)?.books ?? [])
      : [],
}));

export const translations = bibleVersions;
const versionById = new Map(bibleVersions.map((version) => [version.id, version]));
const verseCache = new Map<string, Verse[]>();

export const bibleVersionById = (versionId: string): BibleVersion | undefined =>
  versionById.get(versionId);

export const isBibleVersionEnabled = (versionId: string): boolean => {
  const version = versionById.get(versionId);
  return Boolean(
    version?.publicBuild &&
      version.redistributionAllowed &&
      version.contentAvailable &&
      version.books.length,
  );
};

export const booksForVersion = (versionId: string): BibleBookContent[] =>
  isBibleVersionEnabled(versionId) ? (versionById.get(versionId)?.books ?? []) : [];

const toVerse = (
  version: BibleVersion,
  book: BibleBookContent,
  chapter: number,
  verse: number,
  text: string,
): Verse => ({
  id: `${version.id}-${book.id}-${chapter}-${verse}`,
  translationId: version.id,
  bookId: book.id,
  bookName: book.name,
  chapter,
  verseStart: verse,
  verseEnd: verse,
  reference: `${book.name} ${chapter}:${verse}`,
  text,
  languageTag: version.languageTag,
  sourceUrl: version.sourceUrl,
});

export const getVerse = (
  versionId: string,
  bookId: string,
  chapterNumber: number,
  verseNumber: number,
): Verse | undefined => {
  const version = versionById.get(versionId);
  if (!version || !isBibleVersionEnabled(versionId)) return undefined;
  const book = version.books.find((item) => item.id === bookId);
  const verse = book?.chapters
    .find((item) => item.number === chapterNumber)
    ?.verses.find((item) => item.number === verseNumber);
  return book && verse
    ? toVerse(version, book, chapterNumber, verse.number, verse.text)
    : undefined;
};

export const getPassage = (
  versionId: string,
  bookId: string,
  startChapter: number,
  startVerse: number,
  endChapter = startChapter,
  endVerse = Number.MAX_SAFE_INTEGER,
): Verse[] => {
  const version = versionById.get(versionId);
  if (!version || !isBibleVersionEnabled(versionId)) return [];
  const book = version.books.find((item) => item.id === bookId);
  if (!book) return [];
  return book.chapters.flatMap((chapter) => {
    if (chapter.number < startChapter || chapter.number > endChapter) return [];
    return chapter.verses
      .filter(
        (verse) =>
          (chapter.number > startChapter || verse.number >= startVerse) &&
          (chapter.number < endChapter || verse.number <= endVerse),
      )
      .map((verse) => toVerse(version, book, chapter.number, verse.number, verse.text));
  });
};

export const getReferencedPassage = (
  versionId: string,
  reference: BiblePassageReference,
): Verse[] =>
  getPassage(
    versionId,
    reference.bookId,
    reference.startChapter,
    reference.startVerse,
    reference.endChapter,
    reference.endVerse,
  );

export const versesForTranslation = (versionId: string): Verse[] => {
  const cached = verseCache.get(versionId);
  if (cached) return cached;
  const version = versionById.get(versionId);
  if (!version || !isBibleVersionEnabled(versionId)) return [];
  const verses = version.books.flatMap((book) =>
    book.chapters.flatMap((chapter) =>
      chapter.verses.map((verse) =>
        toVerse(version, book, chapter.number, verse.number, verse.text),
      ),
    ),
  );
  verseCache.set(versionId, verses);
  return verses;
};
