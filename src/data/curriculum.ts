import type { Curriculum, CurriculumChapter } from '../types';

const c = (chapter: number, theme: string, groups: string[]): CurriculumChapter => ({
  chapter,
  theme,
  groups,
  dailyTarget:
    groups.length > 4
      ? '1 group/day; consolidation on day 6'
      : '1 group/day; final day for mixed review',
  test: `Recall every group from chapter ${chapter} without text, then match references in random order.`,
});

export const romans: Curriculum = {
  id: 'romans',
  title: 'Romans',
  subtitle: 'Grace, faith, and a transformed life · 16 chapters',
  chapters: [
    c(1, 'The gospel and human need', ['1:1–7', '1:8–17', '1:18–23', '1:24–32']),
    c(2, 'Impartial judgment', ['2:1–11', '2:12–16', '2:17–24', '2:25–29']),
    c(3, 'All have sinned; justified by faith', ['3:1–8', '3:9–20', '3:21–26', '3:27–31']),
    c(4, 'Abraham justified by faith', ['4:1–8', '4:9–12', '4:13–17', '4:18–25']),
    c(5, 'Peace with God; Adam and Christ', ['5:1–5', '5:6–11', '5:12–17', '5:18–21']),
    c(6, 'Dead to sin, alive to God', ['6:1–7', '6:8–14', '6:15–19', '6:20–23']),
    c(7, 'Law, sin, and inner conflict', ['7:1–6', '7:7–12', '7:13–20', '7:21–25']),
    c(8, 'Life in the Spirit and secure hope', [
      '8:1–11',
      '8:12–17',
      '8:18–25',
      '8:26–30',
      '8:31–39',
    ]),
    c(9, 'God’s sovereign mercy', ['9:1–5', '9:6–13', '9:14–24', '9:25–33']),
    c(10, 'The word of faith', ['10:1–4', '10:5–13', '10:14–17', '10:18–21']),
    c(11, 'Israel, remnant, and mercy', [
      '11:1–10',
      '11:11–16',
      '11:17–24',
      '11:25–32',
      '11:33–36',
    ]),
    c(12, 'Living sacrifice and sincere love', ['12:1–2', '12:3–8', '12:9–13', '12:14–21']),
    c(13, 'Authorities, love, and wakefulness', ['13:1–7', '13:8–10', '13:11–14']),
    c(14, 'Welcome one another', ['14:1–6', '14:7–12', '14:13–18', '14:19–23']),
    c(15, 'Bearing with others and Paul’s mission', ['15:1–7', '15:8–13', '15:14–21', '15:22–33']),
    c(16, 'Partners, warnings, and doxology', ['16:1–7', '16:8–16', '16:17–20', '16:21–27']),
  ],
  bosses: [
    { title: 'The Gospel Case', afterChapter: 4, coverage: 'Romans 1–4' },
    { title: 'Alive in Christ', afterChapter: 8, coverage: 'Romans 5–8' },
    { title: 'Mercy for All', afterChapter: 11, coverage: 'Romans 9–11' },
    { title: 'Living the Gospel', afterChapter: 16, coverage: 'Romans 12–16' },
  ],
  finalTest:
    'Four sessions across seven days: full sequential recall, random reference prompts, audio recitation, then delayed no-hint recall of all 16 chapters.',
};

export const proverbs: Curriculum = {
  id: 'proverbs',
  title: 'Proverbs',
  subtitle: 'Wisdom for everyday life · 31 chapters',
  chapters: [
    c(1, 'The purpose and call of wisdom', ['1:1–7', '1:8–19', '1:20–33']),
    c(2, 'The treasure of wisdom', ['2:1–8', '2:9–15', '2:16–22']),
    c(3, 'Trust, discipline, and neighbor-love', ['3:1–12', '3:13–20', '3:21–26', '3:27–35']),
    c(4, 'Guard your heart', ['4:1–9', '4:10–19', '4:20–27']),
    c(5, 'Faithfulness in marriage', ['5:1–6', '5:7–14', '5:15–23']),
    c(6, 'Debt, diligence, and destructive desire', ['6:1–5', '6:6–11', '6:12–19', '6:20–35']),
    c(7, 'Resisting seduction', ['7:1–5', '7:6–23', '7:24–27']),
    c(8, 'Wisdom’s public invitation', ['8:1–11', '8:12–21', '8:22–31', '8:32–36']),
    c(9, 'Two invitations', ['9:1–6', '9:7–12', '9:13–18']),
    c(10, 'Righteous and wicked speech/work', ['10:1–8', '10:9–16', '10:17–24', '10:25–32']),
    c(11, 'Integrity and generosity', ['11:1–8', '11:9–15', '11:16–23', '11:24–31']),
    c(12, 'Correction, speech, and diligence', ['12:1–8', '12:9–16', '12:17–22', '12:23–28']),
    c(13, 'Instruction, desire, and companionship', ['13:1–6', '13:7–12', '13:13–19', '13:20–25']),
    c(14, 'Wisdom builds', ['14:1–7', '14:8–14', '14:15–21', '14:22–28', '14:29–35']),
    c(15, 'Gentle answers and teachable hearts', ['15:1–7', '15:8–15', '15:16–24', '15:25–33']),
    c(16, 'Plans, pride, and just rule', ['16:1–9', '16:10–17', '16:18–24', '16:25–33']),
    c(17, 'Peace, friendship, and restraint', ['17:1–7', '17:8–14', '17:15–21', '17:22–28']),
    c(18, 'Words, conflict, and true friendship', ['18:1–8', '18:9–16', '18:17–24']),
    c(19, 'Character, compassion, and discipline', ['19:1–7', '19:8–14', '19:15–22', '19:23–29']),
    c(20, 'Sobriety, honesty, and counsel', ['20:1–7', '20:8–15', '20:16–23', '20:24–30']),
    c(21, 'Justice over sacrifice', ['21:1–8', '21:9–16', '21:17–23', '21:24–31']),
    c(22, 'A good name and wise boundaries', ['22:1–9', '22:10–16', '22:17–21', '22:22–29']),
    c(23, 'Disciplined appetite and family wisdom', ['23:1–8', '23:9–18', '23:19–28', '23:29–35']),
    c(24, 'Wisdom, resilience, and justice', ['24:1–7', '24:8–16', '24:17–22', '24:23–34']),
    c(25, 'Royal sayings and self-control', ['25:1–7', '25:8–15', '25:16–22', '25:23–28']),
    c(26, 'Folly, sloth, and deceit', ['26:1–12', '26:13–16', '26:17–22', '26:23–28']),
    c(27, 'Friendship and faithful stewardship', ['27:1–6', '27:7–14', '27:15–22', '27:23–27']),
    c(28, 'Courage, justice, and confession', ['28:1–7', '28:8–14', '28:15–21', '28:22–28']),
    c(29, 'Correction and righteous leadership', ['29:1–7', '29:8–14', '29:15–21', '29:22–27']),
    c(30, 'The sayings of Agur', ['30:1–6', '30:7–14', '30:15–23', '30:24–33']),
    c(31, 'Lemuel and the excellent woman', ['31:1–9', '31:10–18', '31:19–25', '31:26–31']),
  ],
  bosses: [
    { title: 'Wisdom’s Invitation', afterChapter: 9, coverage: 'Proverbs 1–9' },
    { title: 'The Wise Life', afterChapter: 15, coverage: 'Proverbs 10–15' },
    { title: 'Words and Work', afterChapter: 22, coverage: 'Proverbs 16–22' },
    { title: 'Faithful Character', afterChapter: 27, coverage: 'Proverbs 23–27' },
    { title: 'Collected Wisdom', afterChapter: 31, coverage: 'Proverbs 28–31' },
  ],
  finalTest:
    'Five cumulative tests over ten days: themed sayings, random references, chapter sequences, spoken recall, and delayed whole-book retrieval.',
};

export const curricula: Curriculum[] = [romans, proverbs];
