import { describe, expect, it } from 'vitest';
import {
  dailyFreeOfferFor,
  priceForCharacterShards,
  priceForShopItem,
  resourceShopOffers,
} from './shop';

describe('resource shop', () => {
  it('prices character shards consistently from one to ten', () => {
    expect(priceForCharacterShards(1)).toBe(25);
    expect(priceForCharacterShards(7)).toBe(175);
    expect(priceForCharacterShards(10)).toBe(250);
  });

  it('uses the latest booster and resource prices', () => {
    expect(priceForShopItem({ type: 'wildShard' })).toBe(100);
    expect(priceForShopItem({ type: 'streakFreeze' })).toBe(300);
    expect(priceForShopItem({ type: 'xpBooster', durationMinutes: 60 })).toBe(180);
    expect(priceForShopItem({ type: 'goldBooster', durationMinutes: 15 })).toBe(10);
    expect(resourceShopOffers).toHaveLength(8);
  });

  it('rotates a free daily reward', () => {
    expect([0, 1, 2].map((day) => dailyFreeOfferFor(day).label)).toEqual([
      '100 Gold',
      'Level 1 Chest',
      '8 Wild Shards',
    ]);
  });
});
