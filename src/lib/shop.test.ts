import { describe, expect, it } from 'vitest';
import { dailyFreeOfferFor, priceForShopItem, resourceShopOffers } from './shop';

describe('resource shop', () => {
  it('uses the latest booster and resource prices', () => {
    expect(priceForShopItem({ type: 'wildShard' })).toBe(200);
    expect(priceForShopItem({ type: 'streakFreeze' })).toBe(500);
    expect(priceForShopItem({ type: 'xpBooster', durationMinutes: 60 })).toBe(225);
    expect(priceForShopItem({ type: 'goldBooster', durationMinutes: 15 })).toBe(15);
    expect(resourceShopOffers).toHaveLength(8);
  });

  it('rotates a free daily reward', () => {
    expect([0, 1, 2].map((day) => dailyFreeOfferFor(day).label)).toEqual([
      '75 Gold',
      'Level 1 Chest',
      '5 Wild Shards',
    ]);
  });
});
