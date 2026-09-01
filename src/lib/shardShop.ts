import type { BibleCharacter } from '../data/characters';

const shuffleForCycle = (characters: BibleCharacter[], cycle: number): BibleCharacter[] => {
  const shuffled = [...characters];
  let seed = Math.imul(cycle + 1, 0x9e3779b1) >>> 0;
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const swapIndex = seed % (index + 1);
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex]!, shuffled[index]!];
  }
  return shuffled;
};

export function dailyShardShopOffers(
  characters: BibleCharacter[],
  day: number,
): Array<BibleCharacter & { shardAmount: number }> {
  if (!characters.length) return [];
  const safeDay = Math.max(0, Math.floor(day));
  const cycle = Math.floor(safeDay / characters.length);
  const dayInCycle = safeDay % characters.length;
  const shuffled = shuffleForCycle(characters, cycle);
  return Array.from({ length: Math.min(3, characters.length) }, (_, slot) => {
    const character = shuffled[(dayInCycle * 3 + slot) % shuffled.length]!;
    const shardAmount =
      1 + (((Math.imul(safeDay + 1, 31) + slot * 7 + character.id.length) >>> 0) % 10);
    return { ...character, shardAmount };
  });
}
