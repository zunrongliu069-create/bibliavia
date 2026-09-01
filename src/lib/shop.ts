import type { ShopItem } from '../types';

export interface ShopOffer {
  id: string;
  icon: string;
  label: string;
  price: number;
  item: ShopItem;
}

export const CHARACTER_SHARD_OFFER = { price: 250, amount: 10 } as const;
export const priceForCharacterShards = (amount: number) =>
  Math.max(1, Math.min(10, Math.floor(amount))) * 25;

export const dailyFreeOfferFor = (day: number) =>
  [
    { kind: 'gold' as const, icon: '🪙', label: '100 Gold' },
    { kind: 'chest' as const, icon: '🎁', label: 'Level 1 Chest' },
    { kind: 'wildShards' as const, icon: '🃏', label: '8 Wild Shards' },
  ][Math.abs(Math.floor(day)) % 3]!;

export const resourceShopOffers: ShopOffer[] = [
  { id: 'wild', icon: '🃏', label: '1 Wild Shard', price: 100, item: { type: 'wildShard' } },
  {
    id: 'freeze',
    icon: '🛡️',
    label: '1 Streak Freeze',
    price: 300,
    item: { type: 'streakFreeze' },
  },
  ...([15, 30, 60] as const).map((durationMinutes, index) => ({
    id: `xp-${durationMinutes}`,
    icon: '⚡',
    label: `2× XP · ${durationMinutes} min`,
    price: [60, 100, 180][index]!,
    item: { type: 'xpBooster' as const, durationMinutes },
  })),
  ...([15, 30, 60] as const).map((durationMinutes, index) => ({
    id: `gold-${durationMinutes}`,
    icon: '🪙',
    label: `2× Gold · ${durationMinutes} min`,
    price: [10, 20, 35][index]!,
    item: { type: 'goldBooster' as const, durationMinutes },
  })),
];

export const priceForShopItem = (item: ShopItem) =>
  resourceShopOffers.find(
    (offer) =>
      offer.item.type === item.type &&
      ('durationMinutes' in offer.item
        ? 'durationMinutes' in item && offer.item.durationMinutes === item.durationMinutes
        : true),
  )?.price;
