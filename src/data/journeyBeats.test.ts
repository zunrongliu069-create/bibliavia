import { describe, expect, it } from 'vitest';
import { completedJourneyBeats, journeyBeats } from './journeyBeats';

describe('journey beats', () => {
  it('provides three ordered beats for every period', () => {
    for (let period = 1; period <= 10; period += 1) {
      const beats = journeyBeats.filter((beat) => beat.period === period);
      expect(beats).toHaveLength(3);
      expect(beats[0]!.requiredLevel).toBeLessThan(beats[1]!.requiredLevel);
      expect(beats[1]!.requiredLevel).toBeLessThan(beats[2]!.requiredLevel);
    }
  });

  it('only completes beats whose level requirement is reached', () => {
    expect(completedJourneyBeats(1)).toHaveLength(0);
    expect(completedJourneyBeats(2).map((beat) => beat.id)).toEqual(['creation']);
    expect(completedJourneyBeats(15).map((beat) => beat.id)).toEqual(['creation', 'fall', 'flood']);
  });
});
