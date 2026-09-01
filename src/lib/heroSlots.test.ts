import { describe, expect, it } from 'vitest';
import { heroCapacity, heroSlotCost, HERO_SLOT_COSTS } from './heroSlots';

describe('Hero Slots', () => {
  it('uses the rare Fragment progression 1, 3, 7', () => {
    expect(HERO_SLOT_COSTS).toEqual([1, 3, 7]);
    expect([0, 1, 2, 3].map(heroSlotCost)).toEqual([1, 3, 7, null]);
  });

  it('allows one base Hero and three unlockable Heroes', () => {
    expect([0, 1, 2, 3, 99].map(heroCapacity)).toEqual([1, 2, 3, 4, 4]);
  });
});
