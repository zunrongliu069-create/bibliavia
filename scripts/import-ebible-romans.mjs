import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const [sourcePath, outputPath = 'src/data/generated/cuvs-romans.json'] = process.argv.slice(2);
if (!sourcePath) {
  throw new Error('Usage: node scripts/import-ebible-romans.mjs <cmn-cu89s_vpl.txt> [output.json]');
}

const source = readFileSync(resolve(sourcePath), 'utf8');
const rows = source.split(/\r?\n/).filter((line) => line.startsWith('ROM '));
const verses = rows.map((line) => {
  const match = /^ROM (\d+):(\d+) (.+)$/.exec(line);
  if (!match) throw new Error(`Invalid Romans VPL row: ${line.slice(0, 80)}`);
  const chapter = Number(match[1]);
  const verse = Number(match[2]);
  const text = match[3];
  return {
    id: `cuv-s-rom-${chapter}-${verse}`,
    translationId: 'cuv-s',
    bookId: 'romans',
    bookName: '罗马书',
    chapter,
    verseStart: verse,
    verseEnd: verse,
    reference: `罗马书 ${chapter}:${verse}`,
    text,
    languageTag: 'zh-Hans',
    sourceUrl: `https://ebible.org/cmn-cu89s/ROM${String(chapter).padStart(2, '0')}.htm`,
  };
});

if (verses.length !== 433) throw new Error(`Expected 433 Romans verses, found ${verses.length}`);
if (verses[0]?.reference !== '罗马书 1:1') throw new Error('Romans import does not begin at 1:1');
if (verses.at(-1)?.reference !== '罗马书 16:27') throw new Error('Romans import does not end at 16:27');

const resolvedOutput = resolve(outputPath);
mkdirSync(dirname(resolvedOutput), { recursive: true });
writeFileSync(resolvedOutput, `${JSON.stringify(verses, null, 2)}\n`, 'utf8');
console.log(`Imported ${verses.length} verified CUV Simplified Romans verses to ${resolvedOutput}`);
