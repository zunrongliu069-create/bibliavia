import type { CampaignId, PathDefinition, PathTone, UiLanguage } from '../types';
import { curricula } from './curriculum';
import { readingPlans } from './readingPlans';
import { parseBibleReference } from '../lib/bibleLinks';

const tones: Record<number, PathTone> = {
  0: 'hopeful',
  1: 'reflective',
  2: 'solemn',
  3: 'triumphant',
};
const bookTitles: Record<CampaignId, Record<UiLanguage, string>> = {
  romans: { en: 'Romans', sv: 'Romarbrevet', 'zh-Hans': '罗马书', 'zh-Hant': '羅馬書' },
  proverbs: { en: 'Proverbs', sv: 'Ordspråksboken', 'zh-Hans': '箴言', 'zh-Hant': '箴言' },
};

const curriculumPath = (
  bookId: CampaignId,
  activity: 'reading' | 'memorization',
): PathDefinition => {
  const curriculum = curricula.find((item) => item.id === bookId)!;
  return {
    id: `${activity}-${bookId}`,
    title: `${activity === 'reading' ? 'Read' : 'Memorize'} ${curriculum.title}`,
    titles: Object.fromEntries(
      (['en', 'sv', 'zh-Hans', 'zh-Hant'] as UiLanguage[]).map((language) => [
        language,
        activity === 'reading'
          ? `${language === 'sv' ? 'Läs' : language.startsWith('zh') ? '阅读' : 'Read'} ${bookTitles[bookId][language]}`
          : `${language === 'sv' ? 'Memorera' : language.startsWith('zh') ? '背诵' : 'Memorize'} ${bookTitles[bookId][language]}`,
      ]),
    ),
    source: 'curated',
    kind: activity,
    beats: curriculum.chapters.map((chapter, index) => ({
      id: `${bookId}-${chapter.chapter}`,
      title: `${curriculum.title} ${chapter.chapter}`,
      titles: Object.fromEntries(
        (['en', 'sv', 'zh-Hans', 'zh-Hant'] as UiLanguage[]).map((language) => [
          language,
          `${bookTitles[bookId][language]} ${chapter.chapter}`,
        ]),
      ),
      target: activity === 'reading' ? 30 : 100,
      parentId: index ? `${bookId}-${curriculum.chapters[index - 1]!.chapter}` : undefined,
      tone: tones[index % 4],
      milestone:
        (index + 1) % Math.max(1, Math.ceil(curriculum.chapters.length / 4)) === 0 ||
        index === curriculum.chapters.length - 1,
      discovery: {
        en: 'A new part of the journey is revealed.',
        sv: 'En ny del av resan har avslöjats.',
        'zh-Hans': '旅程的新篇章已揭晓。',
        'zh-Hant': '旅程的新篇章已揭曉。',
      },
      passage: {
        bookId,
        startChapter: chapter.chapter,
        startVerse: 1,
        endChapter: chapter.chapter,
        endVerse: 999,
      },
    })),
  };
};

export const scripturePaths: PathDefinition[] = curricula.flatMap((curriculum) => [
  curriculumPath(curriculum.id, 'reading'),
  curriculumPath(curriculum.id, 'memorization'),
]);

export const readingPlanPaths: PathDefinition[] = readingPlans.map((plan) => ({
  id: `reading-plan-${plan.id}`,
  title: plan.title.en,
  titles: plan.title,
  source: 'curated',
  kind: 'reading',
  beats: plan.days.map((day, index) => ({
    id: `${plan.id}-day-${day.day}`,
    title: `Day ${day.day}`,
    titles: {
      en: `Day ${day.day}`,
      sv: `Dag ${day.day}`,
      'zh-Hans': `第 ${day.day} 天`,
      'zh-Hant': `第 ${day.day} 天`,
    },
    target: 15,
    parentId: index ? `${plan.id}-day-${plan.days[index - 1]!.day}` : undefined,
    tone: 'reflective',
    milestone:
      (index + 1) % Math.max(1, Math.ceil(plan.days.length / 4)) === 0 ||
      index === plan.days.length - 1,
    discovery: {
      en: 'A new part of the journey is revealed.',
      sv: 'En ny del av resan har avslöjats.',
      'zh-Hans': '旅程的新篇章已揭晓。',
      'zh-Hant': '旅程的新篇章已揭曉。',
    },
    passages: plan.days[index]!.references.en.flatMap((reference) => {
      const target = parseBibleReference(reference);
      return target
        ? [
            {
              bookId: target.bookId,
              startChapter: target.chapter,
              startVerse: target.verseStart ?? 1,
              endChapter: target.chapter,
              endVerse: target.verseEnd ?? 999,
            },
          ]
        : [];
    }),
  })),
}));

export const pathDefinitions = [...scripturePaths, ...readingPlanPaths];
export const pathById = (id: string) => pathDefinitions.find((path) => path.id === id);
export const pathForBook = (bookId: CampaignId, activity: 'reading' | 'memorization') =>
  pathById(`${activity}-${bookId}`)!;
export const pathForReadingPlan = (planId: string) => pathById(`reading-plan-${planId}`)!;
export const pathTitle = (path: PathDefinition, language: UiLanguage) =>
  path.titles?.[language] ?? path.title;
export const beatTitle = (
  beat: NonNullable<PathDefinition['beats']>[number],
  language: UiLanguage,
) => beat.titles?.[language] ?? beat.title;
