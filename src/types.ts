export type UiLanguage = 'en' | 'sv' | 'zh-Hans' | 'zh-Hant';
export type MasteryStage = 'new' | 'learning' | 'familiar' | 'strong' | 'mastered';
export type ReviewGrade = 'again' | 'hard' | 'good' | 'easy';
export type ExerciseMode =
  | 'read'
  | 'understand'
  | 'listen'
  | 'blanks'
  | 'moreBlanks'
  | 'reorder'
  | 'choice'
  | 'finish'
  | 'sentenceCheck'
  | 'match'
  | 'contextChoice'
  | 'initials'
  | 'keywords'
  | 'recall'
  | 'speak'
  | 'context';
export type CampaignId = 'romans' | 'proverbs';
export type CharacterRarity = 'common' | 'rare' | 'epic' | 'legendary';
export type BiblePeriodId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
export type ShopItem =
  | { type: 'wildShard' }
  | { type: 'streakFreeze' }
  | { type: 'xpBooster'; durationMinutes: 15 | 30 | 60 }
  | { type: 'goldBooster'; durationMinutes: 15 | 30 | 60 };
export type CharacterId = string;

export type ChestLoot =
  | { type: 'gold'; amount: number }
  | {
      type: 'characterShards';
      amount: number;
      characters: Array<{ characterId: CharacterId; amount: number }>;
    }
  | { type: 'wildShards'; amount: number }
  | { type: 'xpBooster' | 'goldBooster'; multiplier: 2; durationMinutes: 15 | 30 | 60 }
  | { type: 'streakFreeze'; amount: number };

export interface ChestReward {
  id: string;
  tier: number;
  rewards: ChestLoot[];
  openedAt: string;
}

export interface ReadingPlanProgress {
  planId: string;
  startedAt: string;
  completedDays: number[];
  paused: boolean;
}

export interface TranslationLicense {
  id: string;
  name: string;
  abbreviation: string;
  languageTag: string;
  year: number | null;
  copyrightHolder: string | null;
  license: string;
  jurisdictions: string[];
  commercialUse: 'allowed' | 'permission-required' | 'unknown';
  digitalUse: 'allowed' | 'permission-required' | 'unknown';
  attribution: string | null;
  sourceUrl: string;
  verifiedAt: string;
  publicBuild: boolean;
  developmentBuild?: boolean;
}

export interface Verse {
  id: string;
  translationId: string;
  bookId: CampaignId;
  bookName: string;
  chapter: number;
  verseStart: number;
  verseEnd: number;
  reference: string;
  text: string;
  languageTag: string;
  sourceUrl: string;
}

export interface Mastery {
  verseId: string;
  stage: MasteryStage;
  difficulty: number;
  stabilityDays: number;
  retrievability: number;
  dueAt: string;
  lastReviewedAt: string | null;
  successfulRecalls: number;
  lapses: number;
  hintsUsed: number;
  averageAccuracy: number;
  averageRecallMs: number;
  recognitionStrength: number;
  recallStrength: number;
  understandingStrength: number;
  learningStep: number;
  reviewCount?: number;
}

export interface ReviewEvent {
  id: string;
  verseId: string;
  reviewedAt: string;
  grade: ReviewGrade;
  mode: ExerciseMode;
  accuracy: number;
  hintsUsed: number;
  recallMs: number;
  xpAwarded: number;
}

export interface UserProgress {
  retentionModelVersion?: number;
  xp: number;
  gold: number;
  streak: number;
  longestStreak: number;
  activeDates: string[];
  lastPracticeDate: string | null;
  activeCampaign: CampaignId;
  pathChapter: Record<CampaignId, number>;
  chapterOneStartVersion?: number;
  lessonProgress: Record<string, number>;
  characterShards: Record<string, number>;
  wildShards: number;
  streakFreezes: number;
  xpBoosters: Record<string, number>;
  goldBoosters: Record<string, number>;
  activeXpBoosterUntil: string | null;
  activeGoldBoosterUntil: string | null;
  collectionInitialized: boolean;
  targetCharacter: CharacterId;
  openedChests: Record<string, number>;
  claimedStageRewards: Record<string, boolean>;
  claimedLevelRewards: number[];
  claimedPeriodMastery: BiblePeriodId[];
  dailyXp: Record<string, number>;
  lastDailyFreeClaim: string | null;
  rewardHistory: ChestReward[];
  readVerseIds: Record<string, boolean>;
  activeReadingPlanId: string | null;
  readingPlanProgress: Record<string, ReadingPlanProgress>;
  mastery: Record<string, Mastery>;
  reviews: ReviewEvent[];
}

export interface CurriculumChapter {
  chapter: number;
  theme: string;
  groups: string[];
  dailyTarget: string;
  test: string;
}

export interface Curriculum {
  id: CampaignId;
  title: string;
  subtitle: string;
  chapters: CurriculumChapter[];
  bosses: { title: string; afterChapter: number; coverage: string }[];
  finalTest: string;
}
