import type { UiLanguage } from '../types';

export type ReadingPlanCategory = 'gospel' | 'new-testament' | 'theme';
export interface ReadingPlanDay {
  day: number;
  references: Record<UiLanguage, string[]>;
}
export interface ReadingPlan {
  id: string;
  category: ReadingPlanCategory;
  durationDays: number;
  icon: string;
  color: string;
  title: Record<UiLanguage, string>;
  description: Record<UiLanguage, string>;
  days: ReadingPlanDay[];
}

const localized = (
  en: string,
  sv: string,
  zhHans: string,
  zhHant = zhHans,
): Record<UiLanguage, string> => ({ en, sv, 'zh-Hans': zhHans, 'zh-Hant': zhHant });
const ref = (
  en: string,
  sv: string,
  zhHans: string,
  zhHant = zhHans,
): Record<UiLanguage, string[]> => ({
  en: [en],
  sv: [sv],
  'zh-Hans': [zhHans],
  'zh-Hant': [zhHant],
});
const chapterPlan = (
  id: string,
  icon: string,
  color: string,
  title: Record<UiLanguage, string>,
  description: Record<UiLanguage, string>,
  book: Record<UiLanguage, string>,
  chapters: number,
): ReadingPlan => ({
  id,
  category: 'gospel',
  durationDays: chapters,
  icon,
  color,
  title,
  description,
  days: Array.from({ length: chapters }, (_, index) => ({
    day: index + 1,
    references: {
      en: [`${book.en} ${index + 1}`],
      sv: [`${book.sv} ${index + 1}`],
      'zh-Hans': [`${book['zh-Hans']} ${index + 1}`],
      'zh-Hant': [`${book['zh-Hant']} ${index + 1}`],
    },
  })),
});

const ntBooks = [
  [28, localized('Matthew', 'Matteusevangeliet', '马太福音', '馬太福音')],
  [16, localized('Mark', 'Markusevangeliet', '马可福音', '馬可福音')],
  [24, localized('Luke', 'Lukasevangeliet', '路加福音', '路加福音')],
  [21, localized('John', 'Johannesevangeliet', '约翰福音', '約翰福音')],
  [28, localized('Acts', 'Apostlagärningarna', '使徒行传', '使徒行傳')],
  [16, localized('Romans', 'Romarbrevet', '罗马书', '羅馬書')],
  [16, localized('1 Corinthians', 'Första Korinthierbrevet', '哥林多前书', '哥林多前書')],
  [13, localized('2 Corinthians', 'Andra Korinthierbrevet', '哥林多后书', '哥林多後書')],
  [6, localized('Galatians', 'Galaterbrevet', '加拉太书', '加拉太書')],
  [6, localized('Ephesians', 'Efesierbrevet', '以弗所书', '以弗所書')],
  [4, localized('Philippians', 'Filipperbrevet', '腓立比书', '腓立比書')],
  [4, localized('Colossians', 'Kolosserbrevet', '歌罗西书', '歌羅西書')],
  [
    5,
    localized('1 Thessalonians', 'Första Thessalonikerbrevet', '帖撒罗尼迦前书', '帖撒羅尼迦前書'),
  ],
  [
    3,
    localized('2 Thessalonians', 'Andra Thessalonikerbrevet', '帖撒罗尼迦后书', '帖撒羅尼迦後書'),
  ],
  [6, localized('1 Timothy', 'Första Timotheosbrevet', '提摩太前书', '提摩太前書')],
  [4, localized('2 Timothy', 'Andra Timotheosbrevet', '提摩太后书', '提摩太後書')],
  [3, localized('Titus', 'Titusbrevet', '提多书', '提多書')],
  [1, localized('Philemon', 'Filemonbrevet', '腓利门书', '腓利門書')],
  [13, localized('Hebrews', 'Hebreerbrevet', '希伯来书', '希伯來書')],
  [5, localized('James', 'Jakobsbrevet', '雅各书', '雅各書')],
  [5, localized('1 Peter', 'Första Petrusbrevet', '彼得前书', '彼得前書')],
  [3, localized('2 Peter', 'Andra Petrusbrevet', '彼得后书', '彼得後書')],
  [5, localized('1 John', 'Första Johannesbrevet', '约翰一书', '約翰一書')],
  [1, localized('2 John', 'Andra Johannesbrevet', '约翰二书', '約翰二書')],
  [1, localized('3 John', 'Tredje Johannesbrevet', '约翰三书', '約翰三書')],
  [1, localized('Jude', 'Judasbrevet', '犹大书', '猶大書')],
  [22, localized('Revelation', 'Uppenbarelseboken', '启示录', '啟示錄')],
] as const;
const ntChapters = ntBooks.flatMap(([count, names]) =>
  Array.from({ length: count }, (_, index) => ({ chapter: index + 1, names })),
);
let ntCursor = 0;
const nt90Days: Array<ReadingPlanDay> = Array.from({ length: 90 }, (_, index) => {
  const take = (index + 1) % 9 === 0 ? 2 : 3;
  const chapters = ntChapters.slice(ntCursor, ntCursor + take);
  ntCursor += take;
  return {
    day: index + 1,
    references: {
      en: chapters.map((item) => `${item.names.en} ${item.chapter}`),
      sv: chapters.map((item) => `${item.names.sv} ${item.chapter}`),
      'zh-Hans': chapters.map((item) => `${item.names['zh-Hans']} ${item.chapter}`),
      'zh-Hant': chapters.map((item) => `${item.names['zh-Hant']} ${item.chapter}`),
    },
  };
});

const themePlan = (
  id: string,
  durationDays: number,
  icon: string,
  color: string,
  title: Record<UiLanguage, string>,
  description: Record<UiLanguage, string>,
  references: Array<Record<UiLanguage, string[]>>,
): ReadingPlan => ({
  id,
  category: 'theme',
  durationDays,
  icon,
  color,
  title,
  description,
  days: references.map((references, index) => ({ day: index + 1, references })),
});
const comfort = [
  ref('Psalm 23', 'Psaltaren 23', '诗篇 23', '詩篇 23'),
  ref('Psalm 46', 'Psaltaren 46', '诗篇 46', '詩篇 46'),
  ref('Isaiah 40', 'Jesaja 40', '以赛亚书 40', '以賽亞書 40'),
  ref('Matthew 6:25–34', 'Matteus 6:25–34', '马太福音 6:25–34', '馬太福音 6:25–34'),
  ref('John 14', 'Johannes 14', '约翰福音 14', '約翰福音 14'),
  ref('Romans 8:18–39', 'Romarbrevet 8:18–39', '罗马书 8:18–39', '羅馬書 8:18–39'),
  ref('Revelation 21:1–7', 'Uppenbarelseboken 21:1–7', '启示录 21:1–7', '啟示錄 21:1–7'),
];
const prayer = [
  ref('Psalm 5', 'Psaltaren 5', '诗篇 5', '詩篇 5'),
  ref('Psalm 27', 'Psaltaren 27', '诗篇 27', '詩篇 27'),
  ref('Psalm 51', 'Psaltaren 51', '诗篇 51', '詩篇 51'),
  ref('Psalm 63', 'Psaltaren 63', '诗篇 63', '詩篇 63'),
  ref('Psalm 86', 'Psaltaren 86', '诗篇 86', '詩篇 86'),
  ref('Daniel 6', 'Daniel 6', '但以理书 6', '但以理書 6'),
  ref('Matthew 6:5–15', 'Matteus 6:5–15', '马太福音 6:5–15', '馬太福音 6:5–15'),
  ref('Luke 11:1–13', 'Lukas 11:1–13', '路加福音 11:1–13', '路加福音 11:1–13'),
  ref('Luke 18:1–14', 'Lukas 18:1–14', '路加福音 18:1–14', '路加福音 18:1–14'),
  ref('John 17', 'Johannes 17', '约翰福音 17', '約翰福音 17'),
  ref('Acts 4:23–31', 'Apostlagärningarna 4:23–31', '使徒行传 4:23–31', '使徒行傳 4:23–31'),
  ref('Philippians 4:4–9', 'Filipperbrevet 4:4–9', '腓立比书 4:4–9', '腓立比書 4:4–9'),
  ref('Colossians 4:2–6', 'Kolosserbrevet 4:2–6', '歌罗西书 4:2–6', '歌羅西書 4:2–6'),
  ref('James 5:13–18', 'Jakobsbrevet 5:13–18', '雅各书 5:13–18', '雅各書 5:13–18'),
];
const bookTranslations: Record<string, [string, string, string]> = {
  '2 Chronicles': ['Andra Krönikeboken', '历代志下', '歷代志下'],
  '2 Timothy': ['Andra Timotheosbrevet', '提摩太后书', '提摩太後書'],
  '1 Samuel': ['Första Samuelsboken', '撒母耳记上', '撒母耳記上'],
  '1 Kings': ['Första Kungaboken', '列王纪上', '列王紀上'],
  '2 Kings': ['Andra Kungaboken', '列王纪下', '列王紀下'],
  Joshua: ['Josua', '约书亚记', '約書亞記'],
  Judges: ['Domarboken', '士师记', '士師記'],
  Nehemiah: ['Nehemja', '尼希米记', '尼希米記'],
  Esther: ['Ester', '以斯帖记', '以斯帖記'],
  Psalm: ['Psaltaren', '诗篇', '詩篇'],
  Isaiah: ['Jesaja', '以赛亚书', '以賽亞書'],
  Daniel: ['Daniel', '但以理书', '但以理書'],
  Matthew: ['Matteus', '马太福音', '馬太福音'],
  Mark: ['Markus', '马可福音', '馬可福音'],
  Luke: ['Lukas', '路加福音', '路加福音'],
  John: ['Johannes', '约翰福音', '約翰福音'],
  Acts: ['Apostlagärningarna', '使徒行传', '使徒行傳'],
  Romans: ['Romarbrevet', '罗马书', '羅馬書'],
};
const multiRef = (value: string): Record<UiLanguage, string[]> => {
  const book = Object.keys(bookTranslations)
    .sort((a, b) => b.length - a.length)
    .find((name) => value.startsWith(name))!;
  const suffix = value.slice(book.length);
  const translated = bookTranslations[book]!;
  const chapterRange = suffix.match(/^ (\d+)[–-](\d+)$/);
  const chapters = chapterRange
    ? Array.from(
        { length: Number(chapterRange[2]) - Number(chapterRange[1]) + 1 },
        (_, index) => Number(chapterRange[1]) + index,
      )
    : [];
  if (chapters.length > 0) {
    return {
      en: chapters.map((chapter) => `${book} ${chapter}`),
      sv: chapters.map((chapter) => `${translated[0]} ${chapter}`),
      'zh-Hans': chapters.map((chapter) => `${translated[1]} ${chapter}`),
      'zh-Hant': chapters.map((chapter) => `${translated[2]} ${chapter}`),
    };
  }
  return ref(
    value,
    `${translated[0]}${suffix}`,
    `${translated[1]}${suffix}`,
    `${translated[2]}${suffix}`,
  );
};
const courageRefs = [
  'Joshua 1',
  'Judges 6',
  '1 Samuel 17',
  '1 Kings 18',
  '2 Kings 6',
  '2 Chronicles 20',
  'Nehemiah 4',
  'Esther 4',
  'Psalm 27',
  'Psalm 56',
  'Psalm 91',
  'Isaiah 41',
  'Isaiah 43',
  'Daniel 3',
  'Daniel 6',
  'Matthew 10',
  'Matthew 14:22–33',
  'John 16:25–33',
  'Acts 4',
  'Romans 8:31–39',
  '2 Timothy 1',
].map(multiRef);
const jesusRefs = [
  'Matthew 3–4',
  'Matthew 5',
  'Matthew 6',
  'Matthew 7',
  'Matthew 8',
  'Matthew 9',
  'Matthew 10',
  'Matthew 11',
  'Matthew 13',
  'Matthew 14',
  'Matthew 16',
  'Matthew 17',
  'Matthew 18',
  'Matthew 20',
  'Matthew 21',
  'Matthew 22',
  'Matthew 24',
  'Matthew 25',
  'Matthew 26',
  'Matthew 27–28',
  'Mark 1',
  'Mark 2',
  'Mark 4',
  'Mark 5',
  'Luke 7',
  'Luke 10',
  'Luke 15',
  'Luke 18',
  'John 13–14',
  'John 15–17',
].map(multiRef);

export const readingPlans: ReadingPlan[] = [
  chapterPlan(
    'john-21',
    '✨',
    '#6958D9',
    localized('John in 21 Days', 'Johannes på 21 dagar', '21天读约翰福音', '21天讀約翰福音'),
    localized(
      'Meet Jesus through one chapter each day.',
      'Möt Jesus genom ett kapitel om dagen.',
      '每天一章，认识耶稣。',
      '每天一章，認識耶穌。',
    ),
    localized('John', 'Johannesevangeliet', '约翰福音', '約翰福音'),
    21,
  ),
  chapterPlan(
    'mark-16',
    '⚡',
    '#45B892',
    localized('Mark in 16 Days', 'Markus på 16 dagar', '16天读马可福音', '16天讀馬可福音'),
    localized(
      'A fast-moving Gospel plan for busy days.',
      'En händelserik evangelieplan för fulla dagar.',
      '适合忙碌生活的快节奏福音计划。',
      '適合忙碌生活的快節奏福音計畫。',
    ),
    localized('Mark', 'Markusevangeliet', '马可福音', '馬可福音'),
    16,
  ),
  {
    id: 'nt-90',
    category: 'new-testament',
    durationDays: 90,
    icon: '📚',
    color: '#E5A93D',
    title: localized(
      'New Testament in 90 Days',
      'Nya testamentet på 90 dagar',
      '90天读完新约',
      '90天讀完新約',
    ),
    description: localized(
      'All 260 chapters in canonical order, usually three chapters per day.',
      'Alla 260 kapitel i ordning, oftast tre kapitel om dagen.',
      '按顺序读完260章，通常每天三章。',
      '按順序讀完260章，通常每天三章。',
    ),
    days: nt90Days,
  },
  themePlan(
    'comfort-7',
    7,
    '🕊️',
    '#71A6D2',
    localized('7 Days of Comfort', '7 dagar av tröst', '7天安慰之旅', '7天安慰之旅'),
    localized(
      'Passages for anxious, tired, or grieving days.',
      'Texter för oroliga, trötta eller sorgliga dagar.',
      '在焦虑、疲惫或悲伤中得安慰。',
      '在焦慮、疲憊或悲傷中得安慰。',
    ),
    comfort,
  ),
  themePlan(
    'prayer-14',
    14,
    '🙏',
    '#8B5CC7',
    localized('14 Days of Prayer', '14 dagar av bön', '14天祷告计划', '14天禱告計畫'),
    localized(
      'Learn prayer through Psalms, Jesus, and the early church.',
      'Lär dig bön genom Psaltaren, Jesus och den tidiga kyrkan.',
      '从诗篇、耶稣和初期教会学习祷告。',
      '從詩篇、耶穌和初期教會學習禱告。',
    ),
    prayer,
  ),
  themePlan(
    'courage-21',
    21,
    '🛡️',
    '#D36E5D',
    localized('21 Days of Courage', '21 dagar av mod', '21天勇气计划', '21天勇氣計畫'),
    localized(
      'Stories and promises for acting faithfully despite fear.',
      'Berättelser och löften för trofast handling trots rädsla.',
      '在惧怕中仍忠心前行的故事与应许。',
      '在懼怕中仍忠心前行的故事與應許。',
    ),
    courageRefs,
  ),
  themePlan(
    'wisdom-31',
    31,
    '🌿',
    '#6F9E58',
    localized('31 Days of Wisdom', '31 dagar av vishet', '31天智慧计划', '31天智慧計畫'),
    localized(
      'One chapter of Proverbs each day.',
      'Ett kapitel ur Ordspråksboken varje dag.',
      '每天一章箴言。',
      '每天一章箴言。',
    ),
    Array.from({ length: 31 }, (_, index) =>
      ref(`Proverbs ${index + 1}`, `Ordspråksboken ${index + 1}`, `箴言 ${index + 1}`),
    ),
  ),
  themePlan(
    'with-jesus-30',
    30,
    '✝️',
    '#B77A49',
    localized('30 Days with Jesus', '30 dagar med Jesus', '与耶稣同行30天', '與耶穌同行30天'),
    localized(
      'Follow key teachings, signs, and encounters across the Gospels.',
      'Följ centrala undervisningar, tecken och möten i evangelierna.',
      '阅读福音书中的关键教导、神迹与相遇。',
      '閱讀福音書中的關鍵教導、神蹟與相遇。',
    ),
    jesusRefs,
  ),
];

export const readingPlanById = (id: string) => readingPlans.find((plan) => plan.id === id);
