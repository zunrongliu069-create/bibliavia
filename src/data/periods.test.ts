import { describe, expect, it } from 'vitest';
import {
  biblePeriods,
  characterPeriods,
  highestUnlockedPeriodForLevel,
  periodState,
} from './periods';

describe('Bible periods', () => {
  it('defines ten increasingly unlocked periods', () => {
    expect(biblePeriods).toHaveLength(10);
    expect(Object.values(characterPeriods).every((period) => period >= 1 && period <= 10)).toBe(
      true,
    );
    expect(biblePeriods.map((period) => period.unlockLevel)).toEqual([
      1, 3, 6, 9, 13, 17, 22, 27, 33, 40,
    ]);
    expect([1, 3, 21, 40].map(highestUnlockedPeriodForLevel)).toEqual([1, 2, 6, 10]);
  });

  it('uses the specified period progress states', () => {
    expect([49, 50, 80, 100].map(periodState)).toEqual([
      'Starting',
      'Developing',
      'Advanced',
      'Period Complete',
    ]);
  });
});
