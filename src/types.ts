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
export type BibleBookId = string;
export type PathActivityType = 'reading' | 'memorization' | 'review' | 'challenge';
export type PathTone = 'triumphant' | 'reflective' | 'solemn' | 'hopeful';
export type PathSource = 'curated' | 'user';
export type PathKind = 'reading' | 'memorization' | 'mixed';
export type PathStructure = 'verse' | 'chapter';
export type PathNodeKind = 'content' | 'boss' | 'final-boss';
export type PathNodeStatus = 'locked' | 'available' | 'current' | 'completed';
export type VersePathLevel = 'learn' | 'practice' | 'master';

export interface PathChapterSection {
  id: string;
  title: string;
  titles?: Partial<Record<UiLanguage, string>>;
  passage: BiblePassageReference;
}

export interface PathBossContent {
  kind: 'boss' | 'final-boss';
  coverage: BiblePassageReference[];
}

export interface PathRegionDefinition {
  id: string;
  title: string;
  titles?: Partial<Record<UiLanguage, string>>;
}

export interface PathBeatDefinition {
  id: string;
  title: string;
  titles?: Partial<Record<UiLanguage, string>>;
  target: number;
  parentId?: string;
  nextIds?: string[];
  tone?: PathTone;
  passage?: BiblePassageReference;
  passages?: BiblePassageReference[];
  milestone?: boolean;
  discovery?: Partial<Record<UiLanguage, string>>;
  nodeKind?: PathNodeKind;
  sections?: PathChapterSection[];
  boss?: PathBossContent;
  regionId?: string;
}

export interface PathDefinition {
  id: string;
  title: string;
  titles?: Partial<Record<UiLanguage, string>>;
  source: PathSource;
  kind: PathKind;
  structure?: PathStructure;
  target?: number;
  beats?: PathBeatDefinition[];
  bibleVersionId?: string;
  passage?: BiblePassageReference;
  regions?: PathRegionDefinition[];
}

export interface BiblePassageReference {
  bookId: BibleBookId;
  startChapter: number;
  startVerse: number;
  endChapter: number;
  endVerse: number;
}

export interface PathState {
  pathId: string;
  status: 'active' | 'completed';
  activeBeatIds: string[];
  beatProgress: Record<string, number>;
  pathProgress: number;
  completedBeatIds: string[];
  completedAt: string | null;
  lastActivityAt: string | null;
  activityCounts: Record<string, number>;
  nodeProgress?: Record<string, PathNodeProgress>;
  mastery?: {
    status: 'not-started' | 'refreshing' | 'retained';
    retainedBeatIds: string[];
    lastCheckedAt: string | null;
  };
}

export interface PathNodeProgress {
  status: PathNodeStatus;
  levels?: Record<VersePathLevel, boolean>;
  chapter?: {
    readingCompleted: boolean;
    quizCompleted: boolean;
  };
}
export type FeedbackEventType =
  | 'ACTIVITY_CORRECT'
  | 'ACTIVITY_WRONG'
  | 'ACTIVITY_PARTIAL'
  | 'PATH_PROGRESS'
  | 'BEAT_COMPLETED'
  | 'PATH_COMPLETED'
  | 'MAJOR_UNLOCK'
  | 'FRAGMENT_REVEALED';

export interface FeedbackSettings {
  soundEffects: boolean;
  ambientMusic: boolean;
  haptics: boolean;
  reduceMotion: boolean;
}

export interface FeedbackEvent {
  id: string;
  type: FeedbackEventType;
  tier: 1 | 2 | 3 | 4;
  tone: PathTone;
  message: string;
  amount?: number;
  diminishingLevel?: number;
}
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
  sourceChecksum: string | null;
  verifiedAt: string;
  publicBuild: boolean;
  developmentBuild?: boolean;
  redistributionAllowed: boolean;
  contentAvailable: boolean;
}

export interface BibleVerseContent {
  number: number;
  text: string;
}

export interface BibleChapterContent {
  number: number;
  verses: BibleVerseContent[];
}

export interface BibleBookContent {
  id: BibleBookId;
  code: string;
  name: string;
  chapters: BibleChapterContent[];
}

export interface BibleVersion extends TranslationLicense {
  books: BibleBookContent[];
}

export interface Verse {
  id: string;
  translationId: string;
  bookId: BibleBookId;
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
  pathStates?: Record<string, PathState>;
  activePathIds?: string[];
  customPaths?: PathDefinition[];
  focusedPathId?: string | null;
  pathChapter: Record<CampaignId, number>;
  chapterOneStartVersion?: number;
  lessonProgress: Record<string, number>;
  completedLessonIds: string[];
  characterShards: Record<string, number>;
  wildShards: number;
  streakFreezes: number;
  xpBoosters: Record<string, number>;
  goldBoosters: Record<string, number>;
  activeXpBoosterUntil: string | null;
  activeGoldBoosterUntil: string | null;
  collectionInitialized: boolean;
  targetCharacter: CharacterId;
  fragments: number;
  unlockedHeroSlots: number;
  activeCharacters: CharacterId[];
  openedChests: Record<string, number>;
  claimedStageRewards: Record<string, boolean>;
  claimedLevelRewards: number[];
  claimedJourneyBeats: string[];
  claimedPeriodMastery: BiblePeriodId[];
  claimedDailyGoals: string[];
  claimedDailyQuests: string[];
  claimedAchievements: string[];
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
