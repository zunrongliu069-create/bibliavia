import type { CampaignId } from '../types';

export interface BibleReferenceTarget {
  book: string;
  code: string;
  chapter: number;
  verseStart?: number;
  verseEnd?: number;
  campaignId?: CampaignId;
}

const books: Record<string, { code: string; campaignId?: CampaignId }> = {
  Matthew: { code: 'MAT' },
  Mark: { code: 'MRK' },
  Luke: { code: 'LUK' },
  John: { code: 'JHN' },
  Acts: { code: 'ACT' },
  Romans: { code: 'ROM', campaignId: 'romans' },
  '1 Corinthians': { code: '1CO' },
  '2 Corinthians': { code: '2CO' },
  Galatians: { code: 'GAL' },
  Ephesians: { code: 'EPH' },
  Philippians: { code: 'PHP' },
  Colossians: { code: 'COL' },
  '1 Thessalonians': { code: '1TH' },
  '2 Thessalonians': { code: '2TH' },
  '1 Timothy': { code: '1TI' },
  '2 Timothy': { code: '2TI' },
  Titus: { code: 'TIT' },
  Philemon: { code: 'PHM' },
  Hebrews: { code: 'HEB' },
  James: { code: 'JAS' },
  '1 Peter': { code: '1PE' },
  '2 Peter': { code: '2PE' },
  '1 John': { code: '1JN' },
  '2 John': { code: '2JN' },
  '3 John': { code: '3JN' },
  Jude: { code: 'JUD' },
  Revelation: { code: 'REV' },
  Joshua: { code: 'JOS' },
  Judges: { code: 'JDG' },
  '1 Samuel': { code: '1SA' },
  '1 Kings': { code: '1KI' },
  '2 Kings': { code: '2KI' },
  '2 Chronicles': { code: '2CH' },
  Nehemiah: { code: 'NEH' },
  Esther: { code: 'EST' },
  Psalm: { code: 'PSA' },
  Proverbs: { code: 'PRO', campaignId: 'proverbs' },
  Isaiah: { code: 'ISA' },
  Daniel: { code: 'DAN' },
};

const bookNames = Object.keys(books).sort((a, b) => b.length - a.length);

export const parseBibleReference = (reference: string): BibleReferenceTarget | undefined => {
  const normalized = reference.replace(/–/g, '-').trim();
  const book = bookNames.find((name) => normalized === name || normalized.startsWith(`${name} `));
  if (!book) return undefined;
  const rest = normalized.slice(book.length).trim();
  const match = rest.match(/^(\d+)(?::(\d+)(?:-(\d+))?)?/);
  if (!match) return undefined;
  const definition = books[book]!;
  return {
    book,
    code: definition.code,
    campaignId: definition.campaignId,
    chapter: Number(match[1]),
    verseStart: match[2] ? Number(match[2]) : undefined,
    verseEnd: match[3] ? Number(match[3]) : match[2] ? Number(match[2]) : undefined,
  };
};

export const biblePassageUrl = (reference: string, translationId: string): string | undefined => {
  const target = parseBibleReference(reference);
  if (!target) return undefined;
  if (translationId === 'b2000')
    return `https://www.bibeln.se/bibel/B2000/${target.code}.${target.chapter}`;
  const edition =
    translationId === 'cuv-s' ? 'cmn-cu89s' : translationId === 'cuv-t' ? 'cmn-cu89t' : 'engwebp';
  const width = target.code === 'PSA' ? 3 : 2;
  return `https://ebible.org/${edition}/${target.code}${String(target.chapter).padStart(width, '0')}.htm`;
};
