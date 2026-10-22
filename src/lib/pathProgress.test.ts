import { describe, expect, it } from 'vitest';
import type { PathDefinition, UserProgress } from '../types';
import {
  applyActivityToProgress,
  applyPathActivity,
  completeChapterPathPart,
  completeVersePathLevel,
  createPathState,
  finalBossChallengeVerses,
  migrateStructuredPathState,
  recallEligibleBeatIds,
  recallEligibleVerses,
  pathProgressRatio,
  setCurrentPathNode,
} from './pathProgress';

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
  it('samples a practical Final Boss across the complete passage', () => {
    const verses = Array.from({ length: 433 }, (_, index) => ({
      id: `v${index + 1}`,
    })) as import('../types').Verse[];
    const selected = finalBossChallengeVerses(verses);
    expect(selected).toHaveLength(12);
    expect(selected[0]?.id).toBe('v1');
    expect(selected.at(-1)?.id).toBe('v433');
    expect(new Set(selected.map((verse) => verse.id))).toHaveLength(12);
  });
  it('unlocks only the next Verse node after Learn and keeps Recall locked until Master', () => {
    const versePath: PathDefinition = {
      id: 'verse-path',
      title: 'Verse Path',
      source: 'curated',
      kind: 'memorization',
      structure: 'verse',
      beats: [
        { id: 'v1', title: 'Verse 1', target: 1 },
        { id: 'v2', title: 'Verse 2', target: 1, parentId: 'v1' },
        { id: 'v3', title: 'Verse 3', target: 1, parentId: 'v2' },
      ],
    };
    const learned = completeVersePathLevel(versePath, createPathState(versePath), 'v1', 'learn');
    expect(learned.nodeProgress?.v2?.status).toBe('available');
    expect(learned.nodeProgress?.v3?.status).toBe('locked');
    expect(recallEligibleBeatIds(versePath, learned)).toEqual([]);

    expect(() => completeVersePathLevel(versePath, learned, 'v1', 'master')).toThrow(
      'Practice must be completed before Master.',
    );
    const practiced = completeVersePathLevel(versePath, learned, 'v1', 'practice');
    const mastered = completeVersePathLevel(versePath, practiced, 'v1', 'master');
    expect(recallEligibleBeatIds(versePath, mastered)).toEqual(['v1']);
    expect(learned.nodeProgress?.v1?.levels?.practice).toBe(false);
    const advanced = setCurrentPathNode(versePath, mastered, 'v2');
    expect(advanced.nodeProgress?.v1?.status).toBe('completed');
    expect(advanced.nodeProgress?.v2?.status).toBe('current');
  });

  it('requires reading and then quiz to complete a Chapter node', () => {
    const chapterPath: PathDefinition = {
      id: 'chapter-path',
      title: 'Chapter Path',
      source: 'curated',
      kind: 'reading',
      structure: 'chapter',
      beats: [
        { id: 'c1', title: 'Chapter 1', target: 1 },
        { id: 'c2', title: 'Chapter 2', target: 1, parentId: 'c1' },
      ],
    };
    const initial = createPathState(chapterPath);
    expect(() => completeChapterPathPart(chapterPath, initial, 'c1', 'quiz')).toThrow(
      'Chapter reading must be completed before its quiz.',
    );
    const read = completeChapterPathPart(chapterPath, initial, 'c1', 'reading');
    expect(read.nodeProgress?.c2?.status).toBe('locked');
    const quizzed = completeChapterPathPart(chapterPath, read, 'c1', 'quiz');
    expect(quizzed.nodeProgress?.c1?.status).toBe('completed');
    expect(quizzed.nodeProgress?.c2?.status).toBe('available');
  });

  it('shows partial section progress without unlocking the next chapter', () => {
    const chapterPath: PathDefinition = {
      id: 'chapter-path',
      title: 'Chapter Path',
      source: 'curated',
      kind: 'reading',
      structure: 'chapter',
      beats: [
        {
          id: 'c1',
          title: 'Chapter 1',
          target: 1,
          nodeKind: 'content',
          sections: [
            {
              id: 'one',
              title: 'One',
              passage: {
                bookId: 'mark',
                startChapter: 1,
                startVerse: 1,
                endChapter: 1,
                endVerse: 3,
              },
            },
            {
              id: 'two',
              title: 'Two',
              passage: {
                bookId: 'mark',
                startChapter: 1,
                startVerse: 4,
                endChapter: 1,
                endVerse: 8,
              },
            },
          ],
          reading: { estimatedMinutes: 4, recap: [] },
        },
        { id: 'c2', title: 'Chapter 2', target: 1, nodeKind: 'content', parentId: 'c1' },
      ],
    };
    const state = createPathState(chapterPath);
    state.nodeProgress!.c1!.chapter!.readingSession = {
      phase: 'reading',
      sectionIndex: 1,
      recapIndex: 0,
      completedSectionIds: ['one'],
      answerState: 'idle',
    };
    expect(pathProgressRatio(chapterPath, state)).toBeCloseTo(0.25);
    expect(state.nodeProgress?.c2?.status).toBe('locked');
  });

  it('completes a Verse Path only after its available Final Boss succeeds', () => {
    const versePath: PathDefinition = {
      id: 'short-verse-path',
      title: 'Short Verse Path',
      source: 'curated',
      kind: 'memorization',
      structure: 'verse',
      beats: [
        { id: 'v1', title: 'Verse 1', target: 1, nodeKind: 'content' },
        {
          id: 'final',
          title: 'Final Boss',
          target: 1,
          parentId: 'v1',
          nodeKind: 'final-boss',
          boss: { kind: 'final-boss', coverage: [] },
        },
      ],
    };
    const learned = completeVersePathLevel(versePath, createPathState(versePath), 'v1', 'learn');
    const atBoss = setCurrentPathNode(versePath, learned, 'final');
    const progress = {
      pathStates: { [versePath.id]: atBoss },
      activePathIds: [versePath.id],
    } as unknown as UserProgress;
    const failed = applyActivityToProgress(progress, versePath, {
      activity: 'challenge',
      beatId: 'final',
      completion: { type: 'boss-challenge' },
      success: false,
      at: new Date('2026-09-11T10:00:00Z'),
    });
    expect(failed.result.state.status).toBe('active');
    expect(failed.result.state.activeBeatIds).toEqual(['final']);
    expect(failed.result.state.nodeProgress?.v1?.status).toBe('completed');
    expect(failed.result.state.nodeProgress?.v1?.levels?.learn).toBe(true);

    const passed = applyActivityToProgress(failed.progress, versePath, {
      activity: 'challenge',
      beatId: 'final',
      completion: { type: 'boss-challenge' },
      success: true,
      at: new Date('2026-09-11T10:05:00Z'),
    });
    expect(passed.result.pathCompleted).toBe(true);
    expect(passed.result.state.status).toBe('completed');
    expect(passed.result.state.completedBeatIds).toEqual(['final']);
  });

  it('applies structured completion without using legacy numeric Beat progress', () => {
    const versePath: PathDefinition = {
      id: 'structured',
      title: 'Structured',
      source: 'curated',
      kind: 'memorization',
      structure: 'verse',
      beats: [
        {
          id: 'romans-1-1',
          title: 'Romans 1:1',
          target: 100,
          nodeKind: 'content',
          passage: {
            bookId: 'romans',
            startChapter: 1,
            startVerse: 1,
            endChapter: 1,
            endVerse: 1,
          },
        },
      ],
    };
    const progress = { pathStates: {}, activePathIds: [] } as unknown as UserProgress;
    const applied = applyActivityToProgress(progress, versePath, {
      activity: 'memorization',
      beatId: 'romans-1-1',
      completion: { type: 'verse-level', level: 'learn' },
      at: new Date('2026-09-02T10:00:00Z'),
    });
    expect(applied.result.state.nodeProgress?.['romans-1-1']?.levels?.learn).toBe(true);
    expect(applied.result.state.beatProgress['romans-1-1']).toBe(0);
    const review = applyActivityToProgress(applied.progress, versePath, {
      activity: 'review',
      beatId: 'romans-1-1',
      at: new Date('2026-09-03T10:00:00Z'),
    });
    expect(review.result.appliedProgress).toBe(0);
    expect(review.result.state.beatProgress['romans-1-1']).toBe(0);
  });

  it('derives the global Recall pool from Master and migrates completed legacy lessons', () => {
    const versePath: PathDefinition = {
      id: 'memory',
      title: 'Memory',
      source: 'curated',
      kind: 'memorization',
      structure: 'verse',
      beats: [
        {
          id: 'romans-1-1',
          title: 'Romans 1:1',
          target: 1,
          nodeKind: 'content',
          passage: {
            bookId: 'romans',
            startChapter: 1,
            startVerse: 1,
            endChapter: 1,
            endVerse: 1,
          },
        },
      ],
    };
    const migrated = migrateStructuredPathState(
      versePath,
      { ...createPathState({ ...versePath, structure: undefined }), nodeProgress: undefined },
      ['webp-romans-1-1'],
    );
    const verses = [
      {
        id: 'webp-romans-1-1',
        bookId: 'romans',
        chapter: 1,
        verseStart: 1,
      },
      {
        id: 'webp-romans-1-2',
        bookId: 'romans',
        chapter: 1,
        verseStart: 2,
      },
    ] as import('../types').Verse[];
    expect(recallEligibleVerses([versePath], { memory: migrated }, verses)).toEqual([verses[0]]);
  });

  it('reconciles saved progress with an updated Path definition', () => {
    const oldPath: PathDefinition = {
      id: 'reading-mark',
      title: 'Mark',
      source: 'curated',
      kind: 'reading',
      structure: 'chapter',
      beats: [
        { id: 'mark-1', title: 'Mark 1', target: 1, nodeKind: 'content' },
        {
          id: 'mark-2',
          title: 'Mark 2',
          target: 1,
          nodeKind: 'content',
          parentId: 'mark-1',
        },
      ],
    };
    const updatedPath: PathDefinition = {
      ...oldPath,
      beats: [
        ...oldPath.beats!,
        {
          id: 'mark-3',
          title: 'Mark 3',
          target: 1,
          nodeKind: 'content',
          parentId: 'mark-2',
        },
      ],
    };
    let saved = createPathState(oldPath);
    saved = completeChapterPathPart(oldPath, saved, 'mark-1', 'reading');
    saved = completeChapterPathPart(oldPath, saved, 'mark-1', 'quiz');
    saved = setCurrentPathNode(oldPath, saved, 'mark-2');
    saved.nodeProgress!['mark-2']!.chapter!.readingSession = {
      phase: 'reading',
      sectionIndex: 1,
      recapIndex: 0,
      completedSectionIds: ['mark-2-one'],
      answerState: 'idle',
    };

    const reconciled = migrateStructuredPathState(updatedPath, saved, []);

    expect(Object.keys(reconciled.nodeProgress!)).toEqual(['mark-1', 'mark-2', 'mark-3']);
    expect(reconciled.nodeProgress?.['mark-1']?.chapter).toMatchObject({
      readingCompleted: true,
      quizCompleted: true,
    });
    expect(reconciled.nodeProgress?.['mark-2']).toMatchObject({
      status: 'current',
      chapter: { readingSession: { sectionIndex: 1 } },
    });
    expect(reconciled.nodeProgress?.['mark-3']?.status).toBe('locked');
  });

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
