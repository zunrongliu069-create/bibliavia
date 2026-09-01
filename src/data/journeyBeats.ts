import type { BiblePeriodId, UiLanguage } from '../types';
import { biblePeriods } from './periods';

type LocalizedText = Record<UiLanguage, string>;

export interface JourneyBeat {
  id: string;
  period: BiblePeriodId;
  requiredLevel: number;
  title: LocalizedText;
  reference: string;
  teaser: LocalizedText;
  reward: { xp: number; gold: number };
}

const text = (en: string, sv: string, zhHans: string, zhHant: string): LocalizedText => ({
  en,
  sv,
  'zh-Hans': zhHans,
  'zh-Hant': zhHant,
});

const titles: Array<[string, LocalizedText, string, LocalizedText]> = [
  [
    'creation',
    text('Creation', 'Skapelsen', '创造天地', '創造天地'),
    'Genesis 1–2',
    text(
      'Discover how the story begins.',
      'Upptäck hur berättelsen börjar.',
      '探索故事如何开始。',
      '探索故事如何開始。',
    ),
  ],
  [
    'fall',
    text('The Fall', 'Syndafallet', '人的堕落', '人的墮落'),
    'Genesis 3',
    text(
      'A choice changes the world.',
      'Ett val förändrar världen.',
      '一个选择改变世界。',
      '一個選擇改變世界。',
    ),
  ],
  [
    'flood',
    text('Noah and the Flood', 'Noa och floden', '挪亚与洪水', '挪亞與洪水'),
    'Genesis 6–9',
    text(
      'A new beginning awaits.',
      'En ny början väntar.',
      '新的开始正在等待。',
      '新的開始正在等待。',
    ),
  ],
  [
    'abraham-call',
    text("Abraham's Call", 'Abrahams kallelse', '亚伯拉罕蒙召', '亞伯拉罕蒙召'),
    'Genesis 12',
    text(
      'A journey of trust begins.',
      'En resa i tillit börjar.',
      '信心之旅由此开始。',
      '信心之旅由此開始。',
    ),
  ],
  [
    'isaac',
    text('The Promised Son', 'Löftets son', '应许之子', '應許之子'),
    'Genesis 21–22',
    text('The promise is tested.', 'Löftet sätts på prov.', '应许经受考验。', '應許經受考驗。'),
  ],
  [
    'joseph',
    text("Joseph's Rescue", 'Josefs räddning', '约瑟的拯救', '約瑟的拯救'),
    'Genesis 37–50',
    text(
      'Betrayal becomes rescue.',
      'Svek förvandlas till räddning.',
      '背叛最终化为拯救。',
      '背叛最終化為拯救。',
    ),
  ],
  [
    'burning-bush',
    text('The Burning Bush', 'Den brinnande busken', '燃烧的荆棘', '燃燒的荊棘'),
    'Exodus 3',
    text(
      'Moses receives his calling.',
      'Mose får sin kallelse.',
      '摩西领受呼召。',
      '摩西領受呼召。',
    ),
  ],
  [
    'exodus',
    text('The Exodus', 'Uttåget', '出埃及', '出埃及'),
    'Exodus 12–14',
    text(
      'Freedom lies beyond the sea.',
      'Friheten väntar bortom havet.',
      '自由就在海的另一边。',
      '自由就在海的另一邊。',
    ),
  ],
  [
    'covenant',
    text('Covenant in the Wilderness', 'Förbundet i öknen', '旷野之约', '曠野之約'),
    'Exodus 19–Deuteronomy 34',
    text(
      'A people learns how to walk with God.',
      'Ett folk lär sig vandra med Gud.',
      '一个民族学习与上帝同行。',
      '一個民族學習與上帝同行。',
    ),
  ],
  [
    'jericho',
    text('The Walls of Jericho', 'Jerikos murar', '耶利哥城墙', '耶利哥城牆'),
    'Joshua 6',
    text(
      'The promised land lies ahead.',
      'Det utlovade landet ligger framför.',
      '应许之地就在前方。',
      '應許之地就在前方。',
    ),
  ],
  [
    'deborah',
    text("Deborah's Courage", 'Deboras mod', '底波拉的勇气', '底波拉的勇氣'),
    'Judges 4–5',
    text(
      'Courage rises in a troubled time.',
      'Mod växer i en orolig tid.',
      '乱世中勇气兴起。',
      '亂世中勇氣興起。',
    ),
  ],
  [
    'gideon',
    text("Gideon's Victory", 'Gideons seger', '基甸的胜利', '基甸的勝利'),
    'Judges 6–8',
    text(
      'A small army faces impossible odds.',
      'En liten här möter omöjliga odds.',
      '一支小军队面对不可能的挑战。',
      '一支小軍隊面對不可能的挑戰。',
    ),
  ],
  [
    'ruth',
    text("Ruth's Loyalty", 'Ruts trofasthet', '路得的忠诚', '路得的忠誠'),
    'Ruth 1–4',
    text(
      'Faithfulness opens a new future.',
      'Trofasthet öppnar en ny framtid.',
      '忠诚开启新的未来。',
      '忠誠開啟新的未來。',
    ),
  ],
  [
    'goliath',
    text('David and Goliath', 'David och Goliat', '大卫与歌利亚', '大衛與歌利亞'),
    '1 Samuel 17',
    text(
      'A shepherd faces a giant.',
      'En herde möter en jätte.',
      '牧羊人面对巨人。',
      '牧羊人面對巨人。',
    ),
  ],
  [
    'david-king',
    text('David Becomes King', 'David blir kung', '大卫作王', '大衛作王'),
    '2 Samuel 5',
    text(
      'The shepherd receives a crown.',
      'Herden tar emot en krona.',
      '牧羊人戴上王冠。',
      '牧羊人戴上王冠。',
    ),
  ],
  [
    'solomon',
    text("Solomon's Wisdom", 'Salomos vishet', '所罗门的智慧', '所羅門的智慧'),
    '1 Kings 3',
    text(
      'A king asks for wisdom.',
      'En kung ber om vishet.',
      '一位君王求智慧。',
      '一位君王求智慧。',
    ),
  ],
  [
    'divided-kingdom',
    text('The Divided Kingdom', 'Det delade riket', '王国分裂', '王國分裂'),
    '1 Kings 12',
    text(
      'One kingdom becomes two.',
      'Ett rike blir två.',
      '一个王国一分为二。',
      '一個王國一分為二。',
    ),
  ],
  [
    'carmel',
    text('Elijah on Carmel', 'Elia på Karmel', '以利亚在迦密山', '以利亞在迦密山'),
    '1 Kings 18',
    text('A prophet stands firm.', 'En profet står fast.', '先知坚定站立。', '先知堅定站立。'),
  ],
  [
    'esther',
    text("Esther's Courage", 'Esters mod', '以斯帖的勇气', '以斯帖的勇氣'),
    'Esther 4–8',
    text(
      'A queen risks everything.',
      'En drottning riskerar allt.',
      '王后冒险拯救百姓。',
      '王后冒險拯救百姓。',
    ),
  ],
  [
    'daniel',
    text('Daniel and the Lions', 'Daniel och lejonen', '但以理与狮子', '但以理與獅子'),
    'Daniel 6',
    text(
      'Faith remains strong in exile.',
      'Tron förblir stark i exilen.',
      '流亡中信心依然坚定。',
      '流亡中信心依然堅定。',
    ),
  ],
  [
    'nehemiah',
    text('The Wall Rebuilt', 'Muren byggs upp igen', '重建城墙', '重建城牆'),
    'Nehemiah 2–6',
    text(
      'A broken city rises again.',
      'En förstörd stad reser sig igen.',
      '破碎的城再次兴起。',
      '破碎的城再次興起。',
    ),
  ],
  [
    'isaiah',
    text("Isaiah's Call", 'Jesajas kallelse', '以赛亚蒙召', '以賽亞蒙召'),
    'Isaiah 6',
    text(
      'A prophet sees the holy King.',
      'En profet ser den helige Kungen.',
      '先知看见圣洁的君王。',
      '先知看見聖潔的君王。',
    ),
  ],
  [
    'jeremiah',
    text("Jeremiah's Message", 'Jeremias budskap', '耶利米的信息', '耶利米的信息'),
    'Jeremiah 1',
    text(
      'A difficult message must be spoken.',
      'Ett svårt budskap måste sägas.',
      '艰难的信息必须传讲。',
      '艱難的信息必須傳講。',
    ),
  ],
  [
    'promised-hope',
    text('The Promised Hope', 'Det utlovade hoppet', '应许的盼望', '應許的盼望'),
    'Micah 5',
    text(
      'The prophets point toward a coming King.',
      'Profeterna pekar mot en kommande Kung.',
      '先知指向将来的君王。',
      '先知指向將來的君王。',
    ),
  ],
  [
    'jesus-birth',
    text('The Birth of Jesus', 'Jesu födelse', '耶稣降生', '耶穌降生'),
    'Luke 2',
    text(
      'The promised King arrives.',
      'Den utlovade Kungen kommer.',
      '应许的君王来到。',
      '應許的君王來到。',
    ),
  ],
  [
    'jesus-teaching',
    text('The Way of Jesus', 'Jesu väg', '耶稣的道路', '耶穌的道路'),
    'Matthew 5–7',
    text(
      'Discover the teaching of the kingdom.',
      'Upptäck rikets undervisning.',
      '探索天国的教导。',
      '探索天國的教導。',
    ),
  ],
  [
    'resurrection',
    text('Cross and Resurrection', 'Korset och uppståndelsen', '十字架与复活', '十字架與復活'),
    'John 19–20',
    text(
      'Death does not have the final word.',
      'Döden får inte sista ordet.',
      '死亡不是终点。',
      '死亡不是終點。',
    ),
  ],
  [
    'pentecost',
    text('Pentecost', 'Pingstdagen', '五旬节', '五旬節'),
    'Acts 2',
    text(
      'The Church begins its mission.',
      'Kyrkan börjar sitt uppdrag.',
      '教会开始使命。',
      '教會開始使命。',
    ),
  ],
  [
    'paul',
    text("Paul's Mission", 'Paulus uppdrag', '保罗的使命', '保羅的使命'),
    'Acts 9–28',
    text(
      'The good news crosses borders.',
      'De goda nyheterna korsar gränser.',
      '福音跨越疆界。',
      '福音跨越疆界。',
    ),
  ],
  [
    'new-creation',
    text('The New Creation', 'Den nya skapelsen', '新创造', '新創造'),
    'Revelation 21–22',
    text(
      'The whole journey finds its destination.',
      'Hela resan når sitt mål.',
      '整段旅程抵达终点。',
      '整段旅程抵達終點。',
    ),
  ],
];

export const journeyBeats: JourneyBeat[] = titles.map(([id, title, reference, teaser], index) => {
  const period = (Math.floor(index / 3) + 1) as BiblePeriodId;
  const position = index % 3;
  return {
    id,
    period,
    requiredLevel: biblePeriods[period - 1]!.unlockLevel + [1, 7, 14][position]!,
    title,
    reference,
    teaser,
    reward: position === 2 ? { xp: 10, gold: 40 } : { xp: 5, gold: 20 },
  };
});

export const journeyBeatById = (id: string) => journeyBeats.find((beat) => beat.id === id);
export const completedJourneyBeats = (level: number) =>
  journeyBeats.filter((beat) => beat.requiredLevel <= level);
