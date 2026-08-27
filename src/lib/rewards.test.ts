import { describe, expect, it } from 'vitest';
import { chestRewardFor, chestTierAfterTap, lessonChestTierForStage } from './rewards';

describe('chest rewards', () => {
  it('gives XP only in part 1, then level 1 and level 2 chests', () => {
    expect([0, 1, 2].map(lessonChestTierForStage)).toEqual([null, 1, 2]);
  });
  it('uses one main reward and the specified maximum number of bonuses', () => {
    for (let tier = 1; tier <= 5; tier += 1)
      for (let index = 0; index < 50; index += 1) {
        const reward = chestRewardFor(
          `session-${index}`,
          tier,
          'david',
          '2026-01-01T00:00:00.000Z',
        );
        expect(reward.rewards.length).toBeGreaterThanOrEqual(1);
        expect(reward.rewards.length).toBeLessThanOrEqual(tier < 2 ? 1 : tier < 4 ? 2 : 3);
        if (tier === 5) expect(reward.rewards.length).toBeGreaterThanOrEqual(2);
      }
  });
  it('uses only loot available at each chest level', () => {
    const levelOne = new Set(
      Array.from(
        { length: 100 },
        (_, index) => chestRewardFor(`l1-${index}`, 1, 'david').rewards[0]!.type,
      ),
    );
    expect([...levelOne].every((type) => type === 'gold' || type === 'characterShards')).toBe(true);
    const levelTwo = new Set(
      Array.from({ length: 100 }, (_, index) =>
        chestRewardFor(`l2-${index}`, 2, 'david').rewards.map((item) => item.type),
      ).flat(),
    );
    expect(levelTwo.has('xpBooster')).toBe(false);
    expect(levelTwo.has('streakFreeze')).toBe(false);
  });
  it('distributes the total character shards across the tier-specific character range', () => {
    for (let index = 0; index < 500; index += 1) {
      const loot = chestRewardFor(`shards-${index}`, 5, 'paul').rewards.find(
        (item) => item.type === 'characterShards',
      );
      if (!loot || loot.type !== 'characterShards') continue;
      expect(loot.characters.length).toBeGreaterThanOrEqual(3);
      expect(loot.characters.length).toBeLessThanOrEqual(5);
      expect(loot.characters.reduce((sum, item) => sum + item.amount, 0)).toBe(loot.amount);
      return;
    }
    throw new Error('expected deterministic sample to include character shards');
  });
  it('is deterministic and clamps supported tiers', () => {
    expect(chestRewardFor('same', 3, 'esther', '2026-01-01T00:00:00.000Z')).toEqual(
      chestRewardFor('same', 3, 'esther', '2026-01-01T00:00:00.000Z'),
    );
    expect(chestRewardFor('low', 0, 'david').tier).toBe(1);
    expect(chestRewardFor('high', 99, 'david').tier).toBe(5);
    expect(chestTierAfterTap('max', 1, 5, 1)).toBe(5);
  });
});
