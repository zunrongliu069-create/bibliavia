import { describe, expect, it } from 'vitest';
import { initialMastery } from './scheduler';
import { calculateXp, dailyXpAward } from './xp';

describe('anti-farming XP', () => {
  it('guarantees at least ten XP from relevant activity each day', () => {
    expect(dailyXpAward(1, 0)).toBe(10);
    expect(dailyXpAward(4, 7)).toBe(4);
    expect(dailyXpAward(4, 10)).toBe(4);
  });
  it('rewards full no-hint recall more than assisted reading', () => {
    const mastery = initialMastery('verse');
    const recall = calculateXp({
      grade: 'good',
      accuracy: 1,
      hintsUsed: 0,
      mode: 'recall',
      mastery,
    });
    const read = calculateXp({ grade: 'good', accuracy: 1, hintsUsed: 0, mode: 'read', mastery });
    expect(recall).toBeGreaterThan(read);
  });

  it('gives minimal XP for a failed attempt', () => {
    expect(
      calculateXp({
        grade: 'again',
        accuracy: 0.2,
        hintsUsed: 3,
        mode: 'recall',
        mastery: initialMastery('verse'),
      }),
    ).toBe(2);
  });
});
