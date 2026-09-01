import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createHash } from 'node:crypto';

const books = [
  ['GEN', 'genesis', 'Genesis', '创世记', '創世記'],
  ['EXO', 'exodus', 'Exodus', '出埃及记', '出埃及記'],
  ['LEV', 'leviticus', 'Leviticus', '利未记', '利未記'],
  ['NUM', 'numbers', 'Numbers', '民数记', '民數記'],
  ['DEU', 'deuteronomy', 'Deuteronomy', '申命记', '申命記'],
  ['JOS', 'joshua', 'Joshua', '约书亚记', '約書亞記'],
  ['JDG', 'judges', 'Judges', '士师记', '士師記'],
  ['RUT', 'ruth', 'Ruth', '路得记', '路得記'],
  ['1SA', '1-samuel', '1 Samuel', '撒母耳记上', '撒母耳記上'],
  ['2SA', '2-samuel', '2 Samuel', '撒母耳记下', '撒母耳記下'],
  ['1KI', '1-kings', '1 Kings', '列王纪上', '列王紀上'],
  ['2KI', '2-kings', '2 Kings', '列王纪下', '列王紀下'],
  ['1CH', '1-chronicles', '1 Chronicles', '历代志上', '歷代志上'],
  ['2CH', '2-chronicles', '2 Chronicles', '历代志下', '歷代志下'],
  ['EZR', 'ezra', 'Ezra', '以斯拉记', '以斯拉記'],
  ['NEH', 'nehemiah', 'Nehemiah', '尼希米记', '尼希米記'],
  ['EST', 'esther', 'Esther', '以斯帖记', '以斯帖記'],
  ['JOB', 'job', 'Job', '约伯记', '約伯記'],
  ['PSA', 'psalms', 'Psalms', '诗篇', '詩篇'],
  ['PRO', 'proverbs', 'Proverbs', '箴言', '箴言'],
  ['ECC', 'ecclesiastes', 'Ecclesiastes', '传道书', '傳道書'],
  ['SOL', 'song-of-solomon', 'Song of Solomon', '雅歌', '雅歌'],
  ['ISA', 'isaiah', 'Isaiah', '以赛亚书', '以賽亞書'],
  ['JER', 'jeremiah', 'Jeremiah', '耶利米书', '耶利米書'],
  ['LAM', 'lamentations', 'Lamentations', '耶利米哀歌', '耶利米哀歌'],
  ['EZE', 'ezekiel', 'Ezekiel', '以西结书', '以西結書'],
  ['DAN', 'daniel', 'Daniel', '但以理书', '但以理書'],
  ['HOS', 'hosea', 'Hosea', '何西阿书', '何西阿書'],
  ['JOE', 'joel', 'Joel', '约珥书', '約珥書'],
  ['AMO', 'amos', 'Amos', '阿摩司书', '阿摩司書'],
  ['OBA', 'obadiah', 'Obadiah', '俄巴底亚书', '俄巴底亞書'],
  ['JON', 'jonah', 'Jonah', '约拿书', '約拿書'],
  ['MIC', 'micah', 'Micah', '弥迦书', '彌迦書'],
  ['NAH', 'nahum', 'Nahum', '那鸿书', '那鴻書'],
  ['HAB', 'habakkuk', 'Habakkuk', '哈巴谷书', '哈巴谷書'],
  ['ZEP', 'zephaniah', 'Zephaniah', '西番雅书', '西番雅書'],
  ['HAG', 'haggai', 'Haggai', '哈该书', '哈該書'],
  ['ZEC', 'zechariah', 'Zechariah', '撒迦利亚书', '撒迦利亞書'],
  ['MAL', 'malachi', 'Malachi', '玛拉基书', '瑪拉基書'],
  ['MAT', 'matthew', 'Matthew', '马太福音', '馬太福音'],
  ['MAR', 'mark', 'Mark', '马可福音', '馬可福音'],
  ['LUK', 'luke', 'Luke', '路加福音', '路加福音'],
  ['JOH', 'john', 'John', '约翰福音', '約翰福音'],
  ['ACT', 'acts', 'Acts', '使徒行传', '使徒行傳'],
  ['ROM', 'romans', 'Romans', '罗马书', '羅馬書'],
  ['1CO', '1-corinthians', '1 Corinthians', '哥林多前书', '哥林多前書'],
  ['2CO', '2-corinthians', '2 Corinthians', '哥林多后书', '哥林多後書'],
  ['GAL', 'galatians', 'Galatians', '加拉太书', '加拉太書'],
  ['EPH', 'ephesians', 'Ephesians', '以弗所书', '以弗所書'],
  ['PHI', 'philippians', 'Philippians', '腓立比书', '腓立比書'],
  ['COL', 'colossians', 'Colossians', '歌罗西书', '歌羅西書'],
  ['1TH', '1-thessalonians', '1 Thessalonians', '帖撒罗尼迦前书', '帖撒羅尼迦前書'],
  ['2TH', '2-thessalonians', '2 Thessalonians', '帖撒罗尼迦后书', '帖撒羅尼迦後書'],
  ['1TI', '1-timothy', '1 Timothy', '提摩太前书', '提摩太前書'],
  ['2TI', '2-timothy', '2 Timothy', '提摩太后书', '提摩太後書'],
  ['TIT', 'titus', 'Titus', '提多书', '提多書'],
  ['PHM', 'philemon', 'Philemon', '腓利门书', '腓利門書'],
  ['HEB', 'hebrews', 'Hebrews', '希伯来书', '希伯來書'],
  ['JAM', 'james', 'James', '雅各书', '雅各書'],
  ['1PE', '1-peter', '1 Peter', '彼得前书', '彼得前書'],
  ['2PE', '2-peter', '2 Peter', '彼得后书', '彼得後書'],
  ['1JO', '1-john', '1 John', '约翰一书', '約翰一書'],
  ['2JO', '2-john', '2 John', '约翰二书', '約翰二書'],
  ['3JO', '3-john', '3 John', '约翰三书', '約翰三書'],
  ['JUD', 'jude', 'Jude', '犹大书', '猶大書'],
  ['REV', 'revelation', 'Revelation', '启示录', '啟示錄'],
];

const [sourcePath, outputPath, versionId, languageTag, sourceId] = process.argv.slice(2);
if (!sourcePath || !outputPath || !versionId || !languageTag || !sourceId) {
  throw new Error(
    'Usage: node scripts/import-ebible-bible.mjs <vpl.txt> <output.json> <versionId> <languageTag> <sourceId>',
  );
}

const nameIndex = languageTag === 'zh-Hans' ? 3 : languageTag === 'zh-Hant' ? 4 : 2;
const byCode = new Map(books.map((book) => [book[0], book]));
const content = new Map();
const sourceBuffer = readFileSync(resolve(sourcePath));
for (const line of sourceBuffer.toString('utf8').split(/\r?\n/)) {
  if (!line.trim()) continue;
  const match = /^([1-3A-Z]{3}) (\d+):(\d+) ?(.*)$/.exec(line);
  if (!match) throw new Error(`Invalid VPL row: ${line.slice(0, 100)}`);
  const [, code, chapterValue, verseValue, text] = match;
  if (!text.trim()) continue;
  if (!byCode.has(code)) throw new Error(`Unknown book code: ${code}`);
  const chapter = Number(chapterValue);
  const verse = Number(verseValue);
  const chapters = content.get(code) ?? new Map();
  const verses = chapters.get(chapter) ?? [];
  verses.push({ number: verse, text });
  chapters.set(chapter, verses);
  content.set(code, chapters);
}

const importedBooks = books.map((book) => {
  const [code, id] = book;
  const chapters = content.get(code);
  if (!chapters) throw new Error(`Missing canonical book: ${code}`);
  return {
    id,
    code,
    name: book[nameIndex],
    chapters: [...chapters].map(([number, verses]) => ({ number, verses })),
  };
});
const verseCount = importedBooks.reduce(
  (sum, book) =>
    sum + book.chapters.reduce((bookSum, chapter) => bookSum + chapter.verses.length, 0),
  0,
);
if (importedBooks.length !== 66 || verseCount < 31_000) {
  throw new Error(`Incomplete Bible import: ${importedBooks.length} books, ${verseCount} verses`);
}

const output = {
  versionId,
  sourceId,
  sourceUrl: `https://ebible.org/bible/details.php?id=${sourceId}`,
  sourceChecksum: `sha256:${createHash('sha256').update(sourceBuffer).digest('hex')}`,
  books: importedBooks,
};
const resolvedOutput = resolve(outputPath);
mkdirSync(dirname(resolvedOutput), { recursive: true });
writeFileSync(resolvedOutput, `${JSON.stringify(output)}\n`, 'utf8');
console.log(`Imported ${versionId}: ${importedBooks.length} books, ${verseCount} verses`);
