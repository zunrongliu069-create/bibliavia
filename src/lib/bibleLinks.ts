import type { CampaignId } from '../types';

export interface BibleReferenceTarget {
  book: string;
  bookId: string;
  chapter: number;
  verseStart?: number;
  verseEnd?: number;
  campaignId?: CampaignId;
}

const canonicalBooks: Array<[string, string]> = [
  ['Genesis', 'genesis'],
  ['Exodus', 'exodus'],
  ['Leviticus', 'leviticus'],
  ['Numbers', 'numbers'],
  ['Deuteronomy', 'deuteronomy'],
  ['Joshua', 'joshua'],
  ['Judges', 'judges'],
  ['Ruth', 'ruth'],
  ['1 Samuel', '1-samuel'],
  ['2 Samuel', '2-samuel'],
  ['1 Kings', '1-kings'],
  ['2 Kings', '2-kings'],
  ['1 Chronicles', '1-chronicles'],
  ['2 Chronicles', '2-chronicles'],
  ['Ezra', 'ezra'],
  ['Nehemiah', 'nehemiah'],
  ['Esther', 'esther'],
  ['Job', 'job'],
  ['Psalm', 'psalms'],
  ['Psalms', 'psalms'],
  ['Proverbs', 'proverbs'],
  ['Ecclesiastes', 'ecclesiastes'],
  ['Song of Solomon', 'song-of-solomon'],
  ['Isaiah', 'isaiah'],
  ['Jeremiah', 'jeremiah'],
  ['Lamentations', 'lamentations'],
  ['Ezekiel', 'ezekiel'],
  ['Daniel', 'daniel'],
  ['Hosea', 'hosea'],
  ['Joel', 'joel'],
  ['Amos', 'amos'],
  ['Obadiah', 'obadiah'],
  ['Jonah', 'jonah'],
  ['Micah', 'micah'],
  ['Nahum', 'nahum'],
  ['Habakkuk', 'habakkuk'],
  ['Zephaniah', 'zephaniah'],
  ['Haggai', 'haggai'],
  ['Zechariah', 'zechariah'],
  ['Malachi', 'malachi'],
  ['Matthew', 'matthew'],
  ['Mark', 'mark'],
  ['Luke', 'luke'],
  ['John', 'john'],
  ['Acts', 'acts'],
  ['Romans', 'romans'],
  ['1 Corinthians', '1-corinthians'],
  ['2 Corinthians', '2-corinthians'],
  ['Galatians', 'galatians'],
  ['Ephesians', 'ephesians'],
  ['Philippians', 'philippians'],
  ['Colossians', 'colossians'],
  ['1 Thessalonians', '1-thessalonians'],
  ['2 Thessalonians', '2-thessalonians'],
  ['1 Timothy', '1-timothy'],
  ['2 Timothy', '2-timothy'],
  ['Titus', 'titus'],
  ['Philemon', 'philemon'],
  ['Hebrews', 'hebrews'],
  ['James', 'james'],
  ['1 Peter', '1-peter'],
  ['2 Peter', '2-peter'],
  ['1 John', '1-john'],
  ['2 John', '2-john'],
  ['3 John', '3-john'],
  ['Jude', 'jude'],
  ['Revelation', 'revelation'],
];

const books = new Map(canonicalBooks);
const bookNames = [...books.keys()].sort((a, b) => b.length - a.length);

export const parseBibleReference = (reference: string): BibleReferenceTarget | undefined => {
  const normalized = reference.replace(/–/g, '-').trim();
  const book = bookNames.find((name) => normalized === name || normalized.startsWith(`${name} `));
  if (!book) return undefined;
  const rest = normalized.slice(book.length).trim();
  const match = rest.match(/^(\d+)(?::(\d+)(?:-(\d+))?)?/);
  if (!match) return undefined;
  const bookId = books.get(book)!;
  return {
    book,
    bookId,
    campaignId: bookId === 'romans' || bookId === 'proverbs' ? bookId : undefined,
    chapter: Number(match[1]),
    verseStart: match[2] ? Number(match[2]) : undefined,
    verseEnd: match[3] ? Number(match[3]) : match[2] ? Number(match[2]) : undefined,
  };
};
