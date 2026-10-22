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

  it('resumes the integrated recap instead of opening a chapter recall challenge', () => {
    const chapterPath: PathDefinition = {
      id: 'chapter',
      title: 'Chapter',
      source: 'curated',
      kind: 'reading',
      structure: 'chapter',
      beats: [
        {
          id: 'chapter-1',
          title: 'Chapter 1',
          target: 1,
          nodeKind: 'content',
          sections: [
            {
              id: 'one',
              title: 'Spoiler title',
              passage: {
                bookId: 'mark',
                startChapter: 1,
                startVerse: 1,
                endChapter: 1,
                endVerse: 8,
              },
            },
          ],
        },
      ],
    };
    const state = createPathState(chapterPath);
    state.nodeProgress!['chapter-1']!.chapter = {
      readingCompleted: true,
      quizCompleted: false,
      readingSession: {
        phase: 'recap',
        sectionIndex: 0,
        recapIndex: 1,
        completedSectionIds: ['one'],
        answerState: 'idle',
      },
    };
    expect(nextPathAction(chapterPath, state, 'en')).toMatchObject({
      activity: 'reading',
      detail: 'Chapter recap 2',
    });
  });

  it('opens an editorial chapter in Reading even for legacy progress without a saved session', () => {
    const chapterPath: PathDefinition = {
      id: 'chapter',
      title: 'Chapter',
      source: 'curated',
      kind: 'reading',
      structure: 'chapter',
      beats: [
        {
          id: 'chapter-1',
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
                endVerse: 8,
              },
            },
          ],
        },
      ],
    };
    const state = createPathState(chapterPath);
    state.nodeProgress!['chapter-1']!.chapter!.readingCompleted = true;
    expect(nextPathAction(chapterPath, state, 'en').activity).toBe('reading');
  });

  it('points to recap immediately after the final section is understood', () => {
    const chapterPath: PathDefinition = {
      id: 'chapter',
      title: 'Chapter',
      source: 'curated',
      kind: 'reading',
      structure: 'chapter',
      beats: [
        {
          id: 'chapter-1',
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
                endVerse: 8,
              },
            },
          ],
          reading: {
            estimatedMinutes: 4,
            recap: [
              {
                kind: 'choose',
                prompt: { en: 'Q', sv: 'Q', 'zh-Hans': 'Q', 'zh-Hant': 'Q' },
                options: [],
                correctOptionId: 'a',
                explanation: { en: 'E', sv: 'E', 'zh-Hans': 'E', 'zh-Hant': 'E' },
              },
            ],
          },
        },
      ],
    };
    const state = createPathState(chapterPath);
    state.nodeProgress!['chapter-1']!.chapter!.readingSession = {
      phase: 'interaction',
      sectionIndex: 0,
      recapIndex: 0,
      completedSectionIds: ['one'],
      answerState: 'correct',
    };
    expect(nextPathAction(chapterPath, state, 'en').detail).toBe('Chapter recap 1');
  });

  it('does not invent a recap question after the final recap answer', () => {
    const chapterPath: PathDefinition = {
      id: 'chapter',
      title: 'Chapter',
      source: 'curated',
      kind: 'reading',
      structure: 'chapter',
      beats: [
        {
          id: 'chapter-1',
          title: 'Chapter 1',
          target: 1,
          nodeKind: 'content',
          sections: [],
          reading: {
            estimatedMinutes: 1,
            recap: Array.from({ length: 3 }, () => ({
              kind: 'choose' as const,
              prompt: { en: 'Q', sv: 'Q', 'zh-Hans': 'Q', 'zh-Hant': 'Q' },
              options: [],
              correctOptionId: 'a',
              explanation: { en: 'E', sv: 'E', 'zh-Hans': 'E', 'zh-Hant': 'E' },
            })),
          },
        },
      ],
    };
    const state = createPathState(chapterPath);
    state.nodeProgress!['chapter-1']!.chapter!.readingSession = {
      phase: 'recap',
      sectionIndex: 0,
      recapIndex: 2,
      completedSectionIds: [],
      answerState: 'correct',
    };
    expect(nextPathAction(chapterPath, state, 'en').detail).toBe('Chapter 1');
  });
});
