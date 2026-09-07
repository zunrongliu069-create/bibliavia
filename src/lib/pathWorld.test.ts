import { describe, expect, it } from 'vitest';
import {
  chapterFromNodeId,
  milestoneCount,
  milestoneIndexes,
  pathWorldFor,
  regionForChapter,
} from './pathWorld';

describe('path world configuration', () => {
  it.each([
    [3, 1],
    [7, 2],
    [15, 3],
    [30, 4],
    [100, 7],
    [200, 10],
  ])('uses the locked milestone formula for %i nodes', (nodes, expected) => {
    expect(milestoneCount(nodes)).toBe(expected);
    expect(milestoneIndexes(nodes)).toHaveLength(expected);
    expect(milestoneIndexes(nodes).at(-1)).toBe(nodes - 1);
  });

  it('defines Romans as five connected Route districts', () => {
    const world = pathWorldFor('memorization-romans')!;
    expect(world.template).toBe('route');
    expect(world.camera).toBe('segmented');
    expect(world.regions).toHaveLength(5);
    expect(regionForChapter(world, chapterFromNodeId('romans-8-1')).landmark).toBe('overlook');
    expect(world.regions.at(-1)?.landmark).toBe('gathering-court');
  });
});
