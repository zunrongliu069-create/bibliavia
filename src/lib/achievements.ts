import type { UserProgress, Verse } from '../types';

export interface Achievement {
  id: string;
  icon: string;
  titleKey:
    | 'achievementFirstVerse'
    | 'achievementTenVerses'
    | 'achievementPerfect'
    | 'achievementTenPerfect'
    | 'achievementFirstCharacter'
    | 'achievementWeek'
    | 'achievementFirstChapter'
    | 'achievementScholar';
  descriptionKey:
    | 'achievementFirstVerseDesc'
    | 'achievementTenVersesDesc'
    | 'achievementPerfectDesc'
    | 'achievementTenPerfectDesc'
    | 'achievementFirstCharacterDesc'
    | 'achievementWeekDesc'
    | 'achievementFirstChapterDesc'
    | 'achievementScholarDesc';
  complete: boolean;
  progress: number;
  target: number;
}

export const achievementsFor = (
  progress: UserProgress,
  verses: Verse[],
  unlockCosts: Record<string, number> = {},
): Achievement[] => {
  const learned = verses.filter(
    (verse) => (progress.mastery[verse.id]?.successfulRecalls ?? 0) > 0,
  ).length;
  const perfect = progress.reviews.filter(
    (review) =>
      review.accuracy >= 0.98 &&
      review.hintsUsed === 0 &&
      ['recall', 'speak'].includes(review.mode),
  ).length;
  const unlockedCharacters = Object.entries(progress.characterShards).filter(
    ([id, shards]) => shards >= (unlockCosts[id] ?? 100),
  ).length;
  const readByChapter = new Map<string, { read: number; total: number }>();
  for (const verse of verses) {
    const key = `${verse.bookId}-${verse.chapter}`;
    const value = readByChapter.get(key) ?? { read: 0, total: 0 };
    value.total += 1;
    if (progress.readVerseIds[verse.id]) value.read += 1;
    readByChapter.set(key, value);
  }
  const completeChapter = [...readByChapter.values()].some(
    (value) => value.total > 0 && value.read === value.total,
  );
  const data: Achievement[] = [
    {
      id: 'first-verse',
      icon: '🌱',
      titleKey: 'achievementFirstVerse',
      descriptionKey: 'achievementFirstVerseDesc',
      complete: learned >= 1,
      progress: Math.min(1, learned),
      target: 1,
    },
    {
      id: 'ten-verses',
      icon: '📜',
      titleKey: 'achievementTenVerses',
      descriptionKey: 'achievementTenVersesDesc',
      complete: learned >= 10,
      progress: Math.min(10, learned),
      target: 10,
    },
    {
      id: 'perfect',
      icon: '✨',
      titleKey: 'achievementPerfect',
      descriptionKey: 'achievementPerfectDesc',
      complete: perfect >= 1,
      progress: Math.min(1, perfect),
      target: 1,
    },
    {
      id: 'ten-perfect',
      icon: '🎯',
      titleKey: 'achievementTenPerfect',
      descriptionKey: 'achievementTenPerfectDesc',
      complete: perfect >= 10,
      progress: Math.min(10, perfect),
      target: 10,
    },
    {
      id: 'first-character',
      icon: '👤',
      titleKey: 'achievementFirstCharacter',
      descriptionKey: 'achievementFirstCharacterDesc',
      complete: unlockedCharacters >= 1,
      progress: Math.min(1, unlockedCharacters),
      target: 1,
    },
    {
      id: 'week',
      icon: '🔥',
      titleKey: 'achievementWeek',
      descriptionKey: 'achievementWeekDesc',
      complete: progress.activeDates.length >= 7,
      progress: Math.min(7, progress.activeDates.length),
      target: 7,
    },
    {
      id: 'chapter',
      icon: '📖',
      titleKey: 'achievementFirstChapter',
      descriptionKey: 'achievementFirstChapterDesc',
      complete: completeChapter,
      progress: completeChapter ? 1 : 0,
      target: 1,
    },
    {
      id: 'scholar',
      icon: '🏛️',
      titleKey: 'achievementScholar',
      descriptionKey: 'achievementScholarDesc',
      complete: progress.xp >= 1000,
      progress: Math.min(1000, progress.xp),
      target: 1000,
    },
  ];
  return data.sort(
    (a, b) =>
      Number(b.complete) - Number(a.complete) || b.progress / b.target - a.progress / a.target,
  );
};

export const characterLevel = (shards: number, unlockCost: number) =>
  shards < unlockCost ? 0 : Math.min(4, 1 + Math.floor((shards - unlockCost) / unlockCost));
