import { describe, expect, it } from 'vitest';
import { pathById } from '../data/paths';
import type { PathState, UserProgress } from '../types';
import {
  applyActivityToProgress,
  completeVersePathLevel,
  createPathState,
  recallEligibleBeatIds,
  setCurrentPathNode,
} from './pathProgress';

describe('complete Romans memorization Path', () => {
  it('progresses through every canonical verse, persists, revisits, and completes the Final Boss', () => {
    const path = pathById('memorization-romans')!;
    const content = path.beats!.filter((beat) => beat.nodeKind === 'content');
    const finalBoss = path.beats!.find((beat) => beat.nodeKind === 'final-boss')!;
    expect(content).toHaveLength(433);
    expect(content[0]?.id).toBe('romans-1-1');
    expect(content.at(-1)?.id).toBe('romans-16-24');

    let state = createPathState(path);
    content.forEach((beat, index) => {
      if (index > 0) state = setCurrentPathNode(path, state, beat.id);
      state = completeVersePathLevel(path, state, beat.id, 'learn');
      if (index === 199) state = JSON.parse(JSON.stringify(state)) as PathState;
    });
    expect(state.nodeProgress?.[finalBoss.id]?.status).toBe('available');

    state = setCurrentPathNode(path, state, finalBoss.id);
    const activeBeforePractice = state.activeBeatIds;
    state = completeVersePathLevel(path, state, content[0]!.id, 'practice');
    state = completeVersePathLevel(path, state, content[0]!.id, 'master');
    expect(state.activeBeatIds).toEqual(activeBeforePractice);
    expect(recallEligibleBeatIds(path, state)).toContain(content[0]!.id);

    const progress = {
      pathStates: { [path.id]: state },
      activePathIds: [path.id],
    } as unknown as UserProgress;
    const failed = applyActivityToProgress(progress, path, {
      beatId: finalBoss.id,
      activity: 'challenge',
      completion: { type: 'boss-challenge' },
      success: false,
      at: new Date('2026-09-13T10:00:00Z'),
    });
    expect(failed.result.state.status).toBe('active');
    expect(failed.result.state.activeBeatIds).toEqual([finalBoss.id]);

    const passed = applyActivityToProgress(failed.progress, path, {
      beatId: finalBoss.id,
      activity: 'challenge',
      completion: { type: 'boss-challenge' },
      success: true,
      at: new Date('2026-09-13T10:05:00Z'),
    });
    const restored = JSON.parse(JSON.stringify(passed.result.state)) as PathState;
    expect(passed.result.pathCompleted).toBe(true);
    expect(restored.status).toBe('completed');
    expect(restored.completedAt).toBe('2026-09-13T10:05:00.000Z');
  });
});
