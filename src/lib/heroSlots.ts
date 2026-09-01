export const HERO_SLOT_COSTS = [1, 3, 7] as const;
export const MAX_ACTIVE_HEROES = 1 + HERO_SLOT_COSTS.length;

export const heroSlotCost = (unlockedExtraSlots: number): number | null =>
  HERO_SLOT_COSTS[unlockedExtraSlots] ?? null;

export const heroCapacity = (unlockedExtraSlots: number): number =>
  Math.min(MAX_ACTIVE_HEROES, 1 + Math.max(0, Math.floor(unlockedExtraSlots)));
