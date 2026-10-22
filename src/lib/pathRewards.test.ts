import { describe, expect, it } from 'vitest';
import type { PathDefinition, UserProgress } from '../types';
import { applyActivityToProgress, applyPathActivity, createPathState } from './pathProgress';
import { pathRewardFor } from './pathRewards';

describe('Path rewards', () => {
  it('rewards completed Beats and scales curated Path completion by effort', () => {
    const path: PathDefinition = {
      id: 'large',
      title: 'Large curated Path',
      source: 'curated',
      kind: 'mixed',
      beats: [{ id: 'beat', title: 'Beat', target: 1000 }],
    };
    const result = applyPathActivity(
      path,
      createPathState(path),
      { activity: 'challenge', at: new Date('2026-08-31T10:00:00Z') },
      {
        activityPoints: { reading: 15, memorization: 22, review: 8, challenge: 1000 },
        diminishingMultipliers: [1],
        minimumMultiplier: 0.25,
        failedChallengeMultiplier: 0.4,
        readingMinimumMultiplier: 0.7,
        memorizationMinimumMultiplier: 0.6,
        reviewMinimumMultiplier: 0.5,
        challengeMaximumMultiplier: 1.3,
      },
    );
    expect(pathRewardFor(path, result)).toEqual({ xp: 130, gold: 65, fragments: 1 });
  });

  it('does not let tiny user-created Paths generate Gold or Fragments', () => {
    const path: PathDefinition = {
      id: 'tiny',
      title: 'Tiny',
      source: 'user',
      kind: 'mixed',
      target: 1,
    };
    const result = applyPathActivity(path, createPathState(path), {
      activity: 'reading',
      at: new Date('2026-08-31T10:00:00Z'),
    });
    expect(pathRewardFor(path, result)).toEqual({ xp: 1, gold: 0, fragments: 0 });
  });

  it('awards chapter completion XP once when reading and recap are complete', () => {
    const path: PathDefinition = {
      id: 'reading-path',
      title: 'Reading Path',
      source: 'curated',
      kind: 'reading',
      structure: 'chapter',
      beats: [
        { id: 'mark-1', title: 'Mark 1', target: 1, nodeKind: 'content' },
        { id: 'mark-2', title: 'Mark 2', target: 1, nodeKind: 'content', parentId: 'mark-1' },
      ],
    };
    const reading = applyActivityToProgress({} as UserProgress, path, {
      activity: 'reading',
      beatId: 'mark-1',
      completion: { type: 'chapter-part', part: 'reading' },
      at: new Date('2026-09-15T10:00:00Z'),
    });
    const completion = applyActivityToProgress(reading.progress, path, {
      activity: 'challenge',
      beatId: 'mark-1',
      completion: { type: 'chapter-part', part: 'quiz' },
      success: true,
      at: new Date('2026-09-15T10:05:00Z'),
    });

    expect(pathRewardFor(path, completion.result)).toEqual({ xp: 10, gold: 0, fragments: 0 });

    const replay = applyActivityToProgress(completion.progress, path, {
      activity: 'challenge',
      beatId: 'mark-1',
      completion: { type: 'chapter-part', part: 'quiz' },
      success: true,
      at: new Date('2026-09-15T10:10:00Z'),
    });
    expect(pathRewardFor(path, replay.result)).toEqual({ xp: 0, gold: 0, fragments: 0 });
  });
});
