import type { ShopItem } from '../types';

export interface ShopOffer {
  id: string;
  icon: string;
  label: string;
  price: number;
  item: ShopItem;
}

export const dailyFreeOfferFor = (day: number) =>
  [
    { kind: 'gold' as const, icon: '🪙', label: '75 Gold' },
    { kind: 'chest' as const, icon: '🎁', label: 'Level 1 Chest' },
    { kind: 'wildShards' as const, icon: '🃏', label: '5 Wild Shards' },
  ][Math.abs(Math.floor(day)) % 3]!;

export const resourceShopOffers: ShopOffer[] = [
  { id: 'wild', icon: '🃏', label: '1 Wild Shard', price: 200, item: { type: 'wildShard' } },
  {
    id: 'freeze',
    icon: '🛡️',
    label: '1 Streak Freeze',
    price: 500,
    item: { type: 'streakFreeze' },
  },
  ...([15, 30, 60] as const).map((durationMinutes, index) => ({
    id: `xp-${durationMinutes}`,
    icon: '⚡',
    label: `2× XP · ${durationMinutes} min`,
    price: [75, 125, 225][index]!,
    item: { type: 'xpBooster' as const, durationMinutes },
  })),
  ...([15, 30, 60] as const).map((durationMinutes, index) => ({
    id: `gold-${durationMinutes}`,
    icon: '🪙',
    label: `2× Gold · ${durationMinutes} min`,
    price: [15, 25, 45][index]!,
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
