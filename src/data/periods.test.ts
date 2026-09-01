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
      1, 20, 40, 60, 80, 100, 120, 140, 160, 180,
    ]);
    expect([1, 20, 39, 180].map(highestUnlockedPeriodForLevel)).toEqual([1, 2, 2, 10]);
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
