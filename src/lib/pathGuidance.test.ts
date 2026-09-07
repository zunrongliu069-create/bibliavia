import { describe, expect, it } from 'vitest';
import type { PathDefinition, PathState } from '../types';
import { nextPathAction, pathResumeSummary } from './pathGuidance';
import { createPathState } from './pathProgress';

const path: PathDefinition = {
  id: 'mixed',
  title: 'Mixed',
  source: 'curated',
  kind: 'mixed',
  beats: [{ id: 'one', title: 'First Beat', target: 10 }],
};

describe('Path guidance', () => {
  it('moves a mixed Path from reading to memorization to challenge', () => {
    const state = createPathState(path);
    expect(nextPathAction(path, state, 'en').activity).toBe('reading');
    state.activityCounts['2026-01-01:one:reading'] = 1;
    expect(nextPathAction(path, state, 'en').activity).toBe('memorization');
    state.activityCounts['2026-01-01:one:memorization'] = 1;
    expect(nextPathAction(path, state, 'en').activity).toBe('challenge');
  });

  it('summarizes progress and the exact resume point', () => {
    const state = { ...createPathState(path), pathProgress: 5 } as PathState;
    expect(pathResumeSummary(path, state, 'sv')).toContain('50% · Läs nästa: First Beat');
  });

  it('recommends the chapter quiz after reading is complete', () => {
    const chapterPath: PathDefinition = {
      id: 'chapter',
      title: 'Chapter',
      source: 'curated',
      kind: 'reading',
      structure: 'chapter',
      beats: [{ id: 'chapter-1', title: 'Chapter 1', target: 1, nodeKind: 'content' }],
    };
    const state = createPathState(chapterPath);
    state.nodeProgress!['chapter-1']!.chapter!.readingCompleted = true;
    expect(nextPathAction(chapterPath, state, 'en').activity).toBe('challenge');
  });
});
