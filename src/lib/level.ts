export interface LevelProgress {
  level: number;
  currentLevelXp: number;
  nextLevelXp: number;
  earnedInLevel: number;
  requiredInLevel: number;
  ratio: number;
}

export interface LevelReward {
  gold: number;
  shards: number;
  wildShards: number;
  streakFreezes: number;
  milestone: boolean;
}

export const xpForLevel = (level: number): number => {
  const completedLevels = Math.max(0, Math.floor(level) - 1);
  return 45 * completedLevels + 5 * completedLevels * completedLevels;
};

export const levelForXp = (xp: number): number => {
  const safeXp = Math.max(0, Math.floor(xp));
  let level = 1;
  while (xpForLevel(level + 1) <= safeXp) level += 1;
  return level;
};

export const levelProgressForXp = (xp: number): LevelProgress => {
  const safeXp = Math.max(0, Math.floor(xp));
  const level = levelForXp(safeXp);
  const currentLevelXp = xpForLevel(level);
  const nextLevelXp = xpForLevel(level + 1);
  const requiredInLevel = nextLevelXp - currentLevelXp;
  const earnedInLevel = safeXp - currentLevelXp;
  return {
    level,
    currentLevelXp,
    nextLevelXp,
    requiredInLevel,
    earnedInLevel,
    ratio: earnedInLevel / requiredInLevel,
  };
};

export const levelRewardFor = (level: number): LevelReward => {
  const safeLevel = Math.max(2, Math.floor(level));
  const milestone = safeLevel % 5 === 0;
  return {
    gold: milestone ? 75 + safeLevel * 5 : 15 + safeLevel * 3,
    shards: safeLevel % 3 === 0 ? (milestone ? 15 : 5) : 0,
    wildShards: safeLevel % 5 === 0 ? 3 : 0,
    streakFreezes: safeLevel % 10 === 0 ? 1 : 0,
    milestone,
  };
};

export const titleTierForLevel = (level: number): 1 | 5 | 10 | 20 | 35 => {
  if (level >= 35) return 35;
  if (level >= 20) return 20;
  if (level >= 10) return 10;
  if (level >= 5) return 5;
  return 1;
};
