import type { CharacterId, ChestLoot, ChestReward } from '../types';

const characterIds: CharacterId[] = [
  'david',
  'moses',
  'abraham',
  'paul',
  'peter',
  'esther',
  'daniel',
  'mary',
  'joseph',
  'ruth',
  'elijah',
  'deborah',
  'joshua',
  'john-baptist',
  'samuel',
  'nehemiah',
  'gideon',
  'hannah',
  'timothy',
  'lydia',
];
const hash = (value: string) =>
  [...value].reduce((sum, character) => (sum * 31 + character.charCodeAt(0)) >>> 0, 7);
const roll = (seed: string) => (hash(seed) % 1_000_000) / 1_000_000;
const range = (seed: string, min: number, max: number) => min + (hash(seed) % (max - min + 1));
export const lessonChestTierForStage = (stageIndex: number): number | null =>
  stageIndex <= 0 ? null : stageIndex === 1 ? 1 : 2;
type LootType = ChestLoot['type'];
type PoolItem = {
  type: LootType;
  weight: number;
  min?: number;
  max?: number;
  duration?: 15 | 30 | 60;
};

const upgradeOdds: Record<number, Array<[number, number]>> = {
  1: [
    [1, 0.3164],
    [2, 0.4304],
    [3, 0.2025],
    [4, 0.0406],
    [5, 0.0101],
  ],
  2: [
    [2, 0.3336],
    [3, 0.4559],
    [4, 0.1971],
    [5, 0.0134],
  ],
  3: [
    [3, 0.4096],
    [4, 0.5697],
    [5, 0.0207],
  ],
  4: [
    [4, 0.96],
    [5, 0.04],
  ],
  5: [[5, 1]],
};
export const chestTierAfterTap = (
  seed: string,
  tap: number,
  currentTier: number,
  _accuracy = 1,
): number => {
  const safe = Math.max(1, Math.min(5, Math.floor(currentTier)));
  let value = roll(`${seed}-tap-${tap}`);
  for (const [tier, chance] of upgradeOdds[safe]!) {
    if (value < chance) return tier;
    value -= chance;
  }
  return safe;
};

const mainPools: Record<number, PoolItem[]> = {
  1: [
    { type: 'gold', weight: 65, min: 3, max: 6 },
    { type: 'characterShards', weight: 35, min: 2, max: 4 },
  ],
  2: [
    { type: 'gold', weight: 45, min: 6, max: 12 },
    { type: 'characterShards', weight: 35, min: 5, max: 8 },
    { type: 'goldBooster', weight: 20, duration: 15 },
  ],
  3: [
    { type: 'gold', weight: 35, min: 12, max: 22 },
    { type: 'characterShards', weight: 30, min: 8, max: 12 },
    { type: 'wildShards', weight: 10, min: 2, max: 4 },
    { type: 'xpBooster', weight: 8, duration: 15 },
    { type: 'goldBooster', weight: 17, duration: 15 },
  ],
  4: [
    { type: 'gold', weight: 27, min: 25, max: 45 },
    { type: 'characterShards', weight: 27, min: 12, max: 18 },
    { type: 'wildShards', weight: 12, min: 4, max: 7 },
    { type: 'xpBooster', weight: 10, duration: 30 },
    { type: 'goldBooster', weight: 10, duration: 30 },
    { type: 'streakFreeze', weight: 14, min: 1, max: 2 },
  ],
  5: [
    { type: 'gold', weight: 20, min: 50, max: 90 },
    { type: 'characterShards', weight: 25, min: 18, max: 28 },
    { type: 'wildShards', weight: 15, min: 7, max: 12 },
    { type: 'xpBooster', weight: 12, duration: 60 },
    { type: 'goldBooster', weight: 12, duration: 60 },
    { type: 'streakFreeze', weight: 16, min: 2, max: 2 },
  ],
};
const bonusPools: Record<number, PoolItem[]> = {
  2: [
    { type: 'gold', weight: 50, min: 3, max: 6 },
    { type: 'characterShards', weight: 30, min: 2, max: 4 },
    { type: 'goldBooster', weight: 20, duration: 15 },
  ],
  3: [
    { type: 'gold', weight: 45, min: 6, max: 12 },
    { type: 'characterShards', weight: 30, min: 4, max: 6 },
    { type: 'wildShards', weight: 10, min: 1, max: 2 },
    { type: 'xpBooster', weight: 7.5, duration: 15 },
    { type: 'goldBooster', weight: 7.5, duration: 15 },
  ],
  4: [
    { type: 'gold', weight: 35, min: 12, max: 22 },
    { type: 'characterShards', weight: 30, min: 6, max: 10 },
    { type: 'wildShards', weight: 12, min: 2, max: 4 },
    { type: 'xpBooster', weight: 8, duration: 30 },
    { type: 'goldBooster', weight: 8, duration: 30 },
    { type: 'streakFreeze', weight: 7, min: 1, max: 1 },
  ],
  5: [
    { type: 'gold', weight: 25, min: 25, max: 45 },
    { type: 'characterShards', weight: 25, min: 9, max: 14 },
    { type: 'wildShards', weight: 15, min: 4, max: 7 },
    { type: 'xpBooster', weight: 12, duration: 60 },
    { type: 'goldBooster', weight: 13, duration: 60 },
    { type: 'streakFreeze', weight: 10, min: 1, max: 1 },
  ],
};
const characterRanges: Record<number, [number, number]> = {
  1: [1, 1],
  2: [1, 2],
  3: [1, 3],
  4: [2, 4],
  5: [3, 5],
};
const choose = (pool: PoolItem[], seed: string): PoolItem => {
  let value = roll(seed) * pool.reduce((sum, item) => sum + item.weight, 0);
  for (const item of pool) {
    if (value < item.weight) return item;
    value -= item.weight;
  }
  return pool[pool.length - 1]!;
};
const shardDistribution = (total: number, tier: number, seed: string, target: CharacterId) => {
  const [min, max] = characterRanges[tier]!;
  const count = Math.min(total, range(`${seed}-count`, min, max));
  const ordered = [target, ...characterIds.filter((id) => id !== target)]
    .sort((a, b) => hash(`${seed}-${a}`) - hash(`${seed}-${b}`))
    .slice(0, count);
  let remaining = total;
  return ordered.map((characterId, index) => {
    const slots = ordered.length - index;
    const amount =
      index === ordered.length - 1 ? remaining : Math.max(1, Math.floor(remaining / slots));
    remaining -= amount;
    return { characterId, amount };
  });
};
const makeLoot = (item: PoolItem, tier: number, seed: string, target: CharacterId): ChestLoot => {
  if (item.type === 'xpBooster' || item.type === 'goldBooster')
    return { type: item.type, multiplier: 2, durationMinutes: item.duration! };
  const amount = range(`${seed}-amount`, item.min!, item.max!);
  if (item.type === 'characterShards')
    return { type: item.type, amount, characters: shardDistribution(amount, tier, seed, target) };
  return { type: item.type, amount } as ChestLoot;
};
export const chestRewardFor = (
  id: string,
  tier: number,
  target: CharacterId,
  openedAt = new Date().toISOString(),
): ChestReward => {
  const safeTier = Math.max(1, Math.min(5, Math.floor(tier)));
  const rewards: ChestLoot[] = [
    makeLoot(choose(mainPools[safeTier]!, `${id}-main`), safeTier, `${id}-main`, target),
  ];
  const bonusChances =
    safeTier === 2
      ? [0.2]
      : safeTier === 3
        ? [0.4]
        : safeTier === 4
          ? [0.7, 0.15]
          : safeTier === 5
            ? [1, 0.3]
            : [];
  bonusChances.forEach((chance, index) => {
    if (roll(`${id}-bonus-trigger-${index}`) < chance)
      rewards.push(
        makeLoot(
          choose(bonusPools[safeTier]!, `${id}-bonus-${index}`),
          safeTier,
          `${id}-bonus-${index}`,
          target,
        ),
      );
  });
  return { id, tier: safeTier, rewards, openedAt };
};
