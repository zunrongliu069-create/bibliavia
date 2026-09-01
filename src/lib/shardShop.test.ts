import { describe, expect, it } from 'vitest';
import type { BibleCharacter } from '../data/characters';
import type { CharacterId, CharacterRarity, UiLanguage } from '../types';
import { dailyShardShopOffers } from './shardShop';

const localized = (value: string) =>
  ({ en: value, sv: value, 'zh-Hans': value, 'zh-Hant': value }) satisfies Record<
    UiLanguage,
    string
  >;
const fixture = (
  [
    ['samuel', 'common'],
    ['lydia', 'common'],
    ['ruth', 'rare'],
    ['elijah', 'rare'],
    ['peter', 'epic'],
    ['mary', 'epic'],
    ['david', 'legendary'],
    ['paul', 'legendary'],
  ] as Array<[CharacterId, CharacterRarity]>
).map(
  ([id, rarity]): BibleCharacter => ({
    id,
    rarity,
    period: 1,
    unlockCost: 40,
    names: localized(id),
    description: localized(id),
    books: [],
    references: [],
    image: 0,
  }),
);

describe('dailyShardShopOffers', () => {
  it('shows exactly three unique characters each day', () => {
    const offers = dailyShardShopOffers(fixture, 20_690);
    expect(offers).toHaveLength(3);
    expect(new Set(offers.map((offer) => offer.id)).size).toBe(3);
  });

  it('is stable during a day and rotates the following day', () => {
    const today = dailyShardShopOffers(fixture, 20_690).map((offer) => offer.id);
    expect(dailyShardShopOffers(fixture, 20_690).map((offer) => offer.id)).toEqual(today);
    expect(dailyShardShopOffers(fixture, 20_691).map((offer) => offer.id)).not.toEqual(today);
  });

  it('offers a stable amount between one and ten shards', () => {
    const offers = dailyShardShopOffers(fixture, 20_690);
    expect(offers.every((offer) => offer.shardAmount >= 1 && offer.shardAmount <= 10)).toBe(true);
    expect(dailyShardShopOffers(fixture, 20_690).map((offer) => offer.shardAmount)).toEqual(
      offers.map((offer) => offer.shardAmount),
    );
  });

  it('shows every character exactly three times in a complete cycle', () => {
    const firstDay = 20_688;
    const counts = new Map<CharacterId, number>();
    for (let day = firstDay; day < firstDay + fixture.length; day += 1) {
      dailyShardShopOffers(fixture, day).forEach((offer) =>
        counts.set(offer.id, (counts.get(offer.id) ?? 0) + 1),
      );
    }
    fixture.forEach((character) => expect(counts.get(character.id)).toBe(3));
  });
});
