import { describe, expect, it } from 'vitest';
import type { PathDefinition, UserProgress } from '../types';
import { applyActivityToProgress, applyPathActivity, createPathState } from './pathProgress';

const path: PathDefinition = {
  id: 'romans-reading',
  title: 'Read Romans',
  source: 'curated',
  kind: 'reading',
  beats: [
    { id: 'romans-1', title: 'Romans 1', target: 20 },
    { id: 'romans-2', title: 'Romans 2', target: 20, parentId: 'romans-1' },
    { id: 'romans-3', title: 'Romans 3', target: 20, parentId: 'romans-2' },
  ],
};

describe('Path progression', () => {
  it('keeps diminishing returns separate by activity, Beat, and local day', () => {
    let state = createPathState(path);
    const at = new Date(2026, 7, 31, 10);
    const awards: number[] = [];
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const result = applyPathActivity(path, state, {
        activity: 'review',
        beatId: 'romans-1',
        at,
      });
      awards.push(result.progressAwarded);
      state = result.state;
    }
    expect(awards).toEqual([8, 4, 2, 2]);

    const memorization = applyPathActivity(path, state, {
      activity: 'memorization',
      beatId: 'romans-1',
      at,
    });
    expect(memorization.diminishingMultiplier).toBe(1);

    const nextBeatSameDay = applyPathActivity(path, memorization.state, {
      activity: 'review',
      beatId: 'romans-2',
      at,
    });
    expect(nextBeatSameDay.diminishingMultiplier).toBe(1);

    const tomorrow = applyPathActivity(path, nextBeatSameDay.state, {
      activity: 'review',
      beatId: 'romans-2',
      at: new Date(2026, 8, 1, 10),
    });
    expect(tomorrow.diminishingMultiplier).toBe(1);
  });

  it('gives failed Challenges partial, non-zero progress', () => {
    const result = applyPathActivity(path, createPathState(path), {
      activity: 'challenge',
      beatId: 'romans-1',
      success: false,
      at: new Date('2026-08-31T10:00:00Z'),
    });
    expect(result.feedback).toBe('partial');
    expect(result.performanceMultiplier).toBe(0.4);
    expect(result.progressAwarded).toBe(12);
  });

  it('carries overflow through multiple linear Beats and persists completion', () => {
    const fastConfig = {
      activityPoints: { reading: 75, memorization: 22, review: 8, challenge: 30 },
      diminishingMultipliers: [1, 0.5, 0.25],
      minimumMultiplier: 0.25,
      failedChallengeMultiplier: 0.4,
      readingMinimumMultiplier: 0.7,
      memorizationMinimumMultiplier: 0.6,
      reviewMinimumMultiplier: 0.5,
      challengeMaximumMultiplier: 1.3,
    } as const;
    const result = applyPathActivity(
      path,
      createPathState(path),
      { activity: 'reading', at: new Date('2026-08-31T10:00:00Z') },
      fastConfig,
    );
    const persisted = JSON.parse(JSON.stringify(result.state));
    expect(result.completedBeatIds).toEqual(['romans-1', 'romans-2', 'romans-3']);
    expect(result.pathCompleted).toBe(true);
    expect(result.appliedProgress).toBe(60);
    expect(persisted.status).toBe('completed');
    expect(persisted.completedAt).toBe('2026-08-31T10:00:00.000Z');
  });

  it('supports a small Path without Beats', () => {
    const small: PathDefinition = {
      id: 'psalm-23',
      title: 'Psalm 23',
      source: 'user',
      kind: 'reading',
      target: 10,
    };
    const result = applyPathActivity(small, createPathState(small), {
      activity: 'reading',
      at: new Date('2026-08-31T10:00:00Z'),
    });
    expect(result.pathCompleted).toBe(true);
    expect(result.state.activeBeatIds).toEqual([]);
  });

  it('keeps future branching possible without choosing a branch automatically', () => {
    const branching: PathDefinition = {
      id: 'david',
      title: 'David',
      source: 'curated',
      kind: 'mixed',
      beats: [
        { id: 'goliath', title: 'David and Goliath', target: 10, nextIds: ['saul', 'psalms'] },
        { id: 'saul', title: 'David and Saul', target: 10, parentId: 'goliath' },
        { id: 'psalms', title: 'Psalms of David', target: 10, parentId: 'goliath' },
      ],
    };
    const result = applyPathActivity(branching, createPathState(branching), {
      activity: 'reading',
      at: new Date('2026-08-31T10:00:00Z'),
    });
    expect(result.completedBeatIds).toEqual(['goliath']);
    expect(result.state.activeBeatIds).toEqual(['saul', 'psalms']);
    expect(result.appliedProgress).toBe(10);
  });

  it('activates, persists, and removes a completed Path from the active list', () => {
    const small: PathDefinition = {
      id: 'one-reading',
      title: 'One reading',
      source: 'user',
      kind: 'reading',
      target: 10,
    };
    const initial = { pathStates: {}, activePathIds: [] } as unknown as UserProgress;
    const updated = applyActivityToProgress(initial, small, {
      activity: 'reading',
      at: new Date('2026-08-31T10:00:00Z'),
    });
    expect(updated.progress.pathStates?.[small.id]?.status).toBe('completed');
    expect(updated.progress.activePathIds).not.toContain(small.id);
  });
});
