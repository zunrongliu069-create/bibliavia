import type { BiblePeriodId, CharacterId, UiLanguage } from '../types';

export interface BiblePeriod {
  id: BiblePeriodId;
  icon: string;
  names: Record<UiLanguage, string>;
  books: Record<UiLanguage, string>;
  unlockLevel: number;
}

const text = (en: string, sv: string, zhHans: string, zhHant: string) => ({
  en,
  sv,
  'zh-Hans': zhHans,
  'zh-Hant': zhHant,
});

export const biblePeriods: BiblePeriod[] = [
  {
    id: 1,
    icon: '🌍',
    names: text('Beginnings', 'Begynnelsen', '起初', '起初'),
    books: text('Genesis 1–11', '1 Moseboken 1–11', '创世记 1–11', '創世記 1–11'),
    unlockLevel: 1,
  },
  {
    id: 2,
    icon: '🔥',
    names: text('Patriarchs', 'Patriarkerna', '族长', '族長'),
    books: text('Genesis 12–50', '1 Moseboken 12–50', '创世记 12–50', '創世記 12–50'),
    unlockLevel: 3,
  },
  {
    id: 3,
    icon: '👑',
    names: text('Exodus & Wilderness', 'Uttåget & öknen', '出埃及与旷野', '出埃及與曠野'),
    books: text('Exodus–Deuteronomy', '2–5 Moseboken', '出埃及记–申命记', '出埃及記–申命記'),
    unlockLevel: 6,
  },
  {
    id: 4,
    icon: '📜',
    names: text('Conquest & Judges', 'Erövringen & domarna', '征服与士师', '征服與士師'),
    books: text('Joshua–Judges', 'Josua–Domarboken', '约书亚记–士师记', '約書亞記–士師記'),
    unlockLevel: 9,
  },
  {
    id: 5,
    icon: '✝️',
    names: text('United Kingdom', 'Det förenade kungariket', '联合王国', '聯合王國'),
    books: text(
      'Ruth, 1–2 Samuel',
      'Rut, 1–2 Samuelsboken',
      '路得记、撒母耳记上下',
      '路得記、撒母耳記上下',
    ),
    unlockLevel: 13,
  },
  {
    id: 6,
    icon: '🔥',
    names: text('Kings & Kingdoms', 'Kungar & riken', '列王与王国', '列王與王國'),
    books: text('1–2 Kings', '1–2 Kungaboken', '列王纪上下', '列王紀上下'),
    unlockLevel: 17,
  },
  {
    id: 7,
    icon: '🏛️',
    names: text('Exile & Return', 'Exil & återkomst', '被掳与归回', '被擄與歸回'),
    books: text(
      'Chronicles, Ezra, Nehemiah, Esther, Daniel',
      'Krönikeböckerna, Esra, Nehemja, Ester, Daniel',
      '历代志、以斯拉、尼希米、以斯帖、但以理',
      '歷代志、以斯拉、尼希米、以斯帖、但以理',
    ),
    unlockLevel: 22,
  },
  {
    id: 8,
    icon: '📜',
    names: text('Prophets', 'Profeterna', '先知', '先知'),
    books: text('Isaiah–Malachi', 'Jesaja–Malaki', '以赛亚书–玛拉基书', '以賽亞書–瑪拉基書'),
    unlockLevel: 27,
  },
  {
    id: 9,
    icon: '✝️',
    names: text('Jesus', 'Jesus', '耶稣', '耶穌'),
    books: text('Matthew–John', 'Matteus–Johannes', '马太福音–约翰福音', '馬太福音–約翰福音'),
    unlockLevel: 33,
  },
  {
    id: 10,
    icon: '🔥',
    names: text(
      'Church, Letters & Revelation',
      'Kyrkan, breven & Uppenbarelsen',
      '教会、书信与启示录',
      '教會、書信與啟示錄',
    ),
    books: text(
      'Acts–Revelation',
      'Apostlagärningarna–Uppenbarelseboken',
      '使徒行传–启示录',
      '使徒行傳–啟示錄',
    ),
    unlockLevel: 40,
  },
];

export const PERIOD_MASTERY_RATIO = 0.8;

export const highestUnlockedPeriodForLevel = (level: number): BiblePeriodId =>
  [...biblePeriods].reverse().find((period) => period.unlockLevel <= level)?.id ?? 1;

export const characterPeriods: Record<CharacterId, BiblePeriodId> = {
  abraham: 2,
  joseph: 2,
  moses: 3,
  joshua: 3,
  deborah: 4,
  gideon: 4,
  david: 5,
  ruth: 5,
  samuel: 5,
  hannah: 5,
  elijah: 6,
  esther: 7,
  daniel: 7,
  nehemiah: 7,
  mary: 9,
  'john-baptist': 9,
  paul: 10,
  peter: 10,
  timothy: 10,
  lydia: 10,
};

export const periodState = (percentage: number) =>
  percentage >= 100
    ? 'Period Complete'
    : percentage >= PERIOD_MASTERY_RATIO * 100
      ? 'Advanced'
      : percentage >= 50
        ? 'Developing'
        : 'Starting';
