import { describe, expect, it } from 'vitest';
import {
  levelForXp,
  levelProgressForXp,
  levelRewardFor,
  titleTierForLevel,
  xpForLevel,
} from './level';

describe('level progression', () => {
  it('uses an increasingly challenging XP curve', () => {
    expect([1, 2, 3, 4, 5].map(xpForLevel)).toEqual([0, 50, 110, 180, 260]);
    expect(levelForXp(49)).toBe(1);
    expect(levelForXp(50)).toBe(2);
    expect(levelForXp(259)).toBe(4);
  });

  it('reports progress inside the current level', () => {
    expect(levelProgressForXp(140)).toMatchObject({
      level: 3,
      earnedInLevel: 30,
      requiredInLevel: 70,
    });
  });

  it('adds shards and a title milestone every fifth level', () => {
    expect(levelRewardFor(4)).toEqual({
      gold: 27,
      shards: 0,
      wildShards: 0,
      streakFreezes: 0,
      milestone: false,
    });
    expect(levelRewardFor(5)).toEqual({
      gold: 100,
      shards: 0,
      wildShards: 3,
      streakFreezes: 0,
      milestone: true,
    });
    expect(titleTierForLevel(22)).toBe(20);
  });
});
