import { describe, expect, it } from 'vitest';
import { pathById } from '../data/paths';
import { markWorldObjects } from '../data/markJourneyWorld';
import type { PathNodeProgress } from '../types';
import {
  buildMemorizationWorldNodes,
  buildReadingWorldNodes,
  buildVerticalWorldLayout,
  focusOffsetForNode,
  interactionTargetForNode,
  travelerPositionForPoint,
  worldObjectTop,
} from './verticalPathWorld';

const markBeats = pathById('reading-mark')!.beats!;

describe('vertical Path world adapters', () => {
  it('projects fresh Mark 1–5 into editorial section and recap nodes', () => {
    const nodes = buildReadingWorldNodes({
      beats: markBeats,
      nodeProgress: {},
      currentBeatId: 'mark-1',
      language: 'en',
      minimumChapterCount: 5,
    });

    expect(nodes).toHaveLength(28);
    expect(nodes[0]).toMatchObject({
      id: 'mark-1-john',
      parentId: 'mark-1',
      regionId: 'mark-1',
      chapterNumber: 1,
      kind: 'section',
      current: true,
      complete: false,
    });
    expect(nodes.filter((node) => node.current)).toHaveLength(1);
    expect(nodes.find((node) => node.id === 'mark-1-recap')).toMatchObject({
      kind: 'recap',
      current: false,
      available: false,
    });
    expect(nodes.at(-1)).toMatchObject({ parentId: 'mark-5', regionId: 'mark-5' });
  });

  it('maps persisted section progress without unlocking future sections', () => {
    const nodeProgress: Record<string, PathNodeProgress> = {
      'mark-1': {
        status: 'current',
        chapter: {
          readingCompleted: false,
          quizCompleted: false,
          readingSession: {
            definitionRevision: 1,
            phase: 'reading',
            sectionIndex: 2,
            recapIndex: 0,
            completedSectionIds: ['mark-1-john', 'mark-1-baptism'],
            answerState: 'idle',
          },
        },
      },
      'mark-2': { status: 'locked' },
    };

    const nodes = buildReadingWorldNodes({
      beats: markBeats,
      nodeProgress,
      currentBeatId: 'mark-1',
      language: 'en',
      minimumChapterCount: 5,
    });

    expect(nodes.find((node) => node.id === 'mark-1-john')?.complete).toBe(true);
    expect(nodes.find((node) => node.id === 'mark-1-baptism')?.complete).toBe(true);
    expect(nodes.find((node) => node.id === 'mark-1-disciples')).toMatchObject({
      current: true,
      complete: false,
    });
    expect(nodes.find((node) => node.id === 'mark-1-capernaum')).toMatchObject({
      current: false,
      available: false,
    });
    expect(nodes.find((node) => node.id === 'mark-2-paralyzed')).toMatchObject({
      current: false,
      available: false,
    });
  });

  it('moves the Journey position after a correct section saved with Done for now', () => {
    const nodes = buildReadingWorldNodes({
      beats: markBeats,
      nodeProgress: {
        'mark-3': {
          status: 'current',
          chapter: {
            readingCompleted: false,
            quizCompleted: false,
            readingSession: {
              definitionRevision: 1,
              phase: 'interaction',
              sectionIndex: 0,
              recapIndex: 0,
              completedSectionIds: ['mark-3-hand'],
              answerState: 'correct',
            },
          },
        },
      },
      currentBeatId: 'mark-3',
      language: 'en',
      minimumChapterCount: 5,
    });

    expect(nodes.find((node) => node.id === 'mark-3-hand')).toMatchObject({
      complete: true,
      current: false,
    });
    expect(nodes.find((node) => node.id === 'mark-3-crowds')).toMatchObject({
      current: true,
      available: true,
    });
    expect(nodes.find((node) => node.id === 'mark-4-sower')).toMatchObject({
      current: false,
      available: false,
    });
  });

  it('keeps the Journey frontier after Back revisits an already completed section', () => {
    const nodes = buildReadingWorldNodes({
      beats: markBeats,
      nodeProgress: {
        'mark-3': {
          status: 'current',
          chapter: {
            readingCompleted: false,
            quizCompleted: false,
            readingSession: {
              definitionRevision: 1,
              phase: 'reading',
              sectionIndex: 0,
              recapIndex: 0,
              completedSectionIds: ['mark-3-hand'],
              answerState: 'idle',
            },
          },
        },
      },
      currentBeatId: 'mark-3',
      language: 'en',
      minimumChapterCount: 5,
    });

    expect(nodes.find((node) => node.id === 'mark-3-hand')).toMatchObject({
      complete: true,
      current: false,
    });
    expect(nodes.find((node) => node.id === 'mark-3-crowds')).toMatchObject({
      current: true,
      available: true,
    });
  });

  it('makes the chapter recap current without unlocking the next chapter', () => {
    const firstChapterSections = markBeats[0]!.sections!.map((section) => section.id);
    const nodes = buildReadingWorldNodes({
      beats: markBeats,
      nodeProgress: {
        'mark-1': {
          status: 'current',
          chapter: {
            readingCompleted: true,
            quizCompleted: false,
            readingSession: {
              definitionRevision: 1,
              phase: 'recap',
              sectionIndex: firstChapterSections.length,
              recapIndex: 0,
              completedSectionIds: firstChapterSections,
              answerState: 'idle',
            },
          },
        },
      },
      currentBeatId: 'mark-1',
      language: 'en',
      minimumChapterCount: 5,
    });

    expect(nodes.find((node) => node.id === 'mark-1-recap')).toMatchObject({ current: true });
    expect(nodes.find((node) => node.id === 'mark-2-paralyzed')).toMatchObject({
      current: false,
      available: false,
    });
  });

  it('expands the initial five-chapter slice through a later current chapter', () => {
    const nodes = buildReadingWorldNodes({
      beats: markBeats,
      nodeProgress: { 'mark-7': { status: 'current' } },
      currentBeatId: 'mark-7',
      language: 'en',
      minimumChapterCount: 5,
    });

    expect(nodes.some((node) => node.parentId === 'mark-7')).toBe(true);
    expect(nodes.some((node) => node.parentId === 'mark-8')).toBe(false);
    expect(nodes.filter((node) => node.current)).toHaveLength(1);
  });

  it('maps memorization beats without changing level progression', () => {
    const beats = pathById('memorization-psalm-23')!.beats!.slice(0, 3);
    const nodes = buildMemorizationWorldNodes({
      beats,
      nodeProgress: {
        [beats[0]!.id]: {
          status: 'completed',
          levels: { learn: true, practice: false, master: false },
        },
        [beats[1]!.id]: {
          status: 'current',
          levels: { learn: false, practice: false, master: false },
        },
      },
      currentBeatId: beats[1]!.id,
      language: 'en',
    });

    expect(nodes[0]).toMatchObject({
      complete: true,
      current: false,
      levels: { learn: true, practice: false, master: false },
    });
    expect(nodes[1]).toMatchObject({ current: true, complete: false });
    expect(nodes[2]).toMatchObject({ current: false, available: false });
  });
});

describe('vertical Path world geometry', () => {
  it('places the wilderness start on land and the two shores after their approach', () => {
    const nodes = buildReadingWorldNodes({
      beats: markBeats,
      nodeProgress: {},
      currentBeatId: 'mark-1',
      language: 'en',
      minimumChapterCount: 5,
    });
    const layout = buildVerticalWorldLayout(nodes, { width: 390, viewportHeight: 740 });
    const object = (id: string) => markWorldObjects.find((item) => item.id === id)!;
    const point = (id: string) => layout.points.find((item) => item.nodeId === id)!;
    const centerY = (id: string) => layout.contentHeight * (1 - object(id).y);

    expect(centerY('shore-low') + object('shore-low').height / 2).toBeLessThan(
      point('mark-1-john').y - 200,
    );
    expect(Math.abs(centerY('shore-low') - point('mark-1-recap').y)).toBeLessThan(
      object('shore-low').height / 2,
    );
    expect(object('call-boat')).toMatchObject({ anchorNodeId: 'mark-1-recap' });
    expect(object('lake-crossing').height).toBeLessThan(400);
    expect(centerY('shore-grove')).toBeGreaterThan(
      centerY('lake-crossing') + object('lake-crossing').height / 2,
    );
    expect(centerY('lake-crossing')).toBeLessThan(point('mark-4-storm').y);
    expect(centerY('lake-crossing')).toBeGreaterThan(point('mark-5-legion').y);
  });

  it('composes the Mark geography from positioned world objects without wallpaper assets', () => {
    expect(new Set(markWorldObjects.map((object) => object.type))).toEqual(
      new Set(['terrain', 'water', 'vegetation', 'building', 'landmark', 'foreground', 'art']),
    );
    expect(
      markWorldObjects.every((object) => !('image' in object) && !('backgroundImage' in object)),
    ).toBe(true);
    expect(
      markWorldObjects
        .filter((object) => object.type === 'art')
        .every((object) => 'asset' in object && 'layer' in object && object.width < 600),
    ).toBe(true);
    expect(
      markWorldObjects
        .filter((object) => object.type === 'landmark')
        .every((landmark) => 'anchorNodeId' in landmark),
    ).toBe(true);
  });

  it('puts chronological progress upward and creates multiple phone viewports of scroll range', () => {
    const nodes = buildReadingWorldNodes({
      beats: markBeats,
      nodeProgress: {},
      currentBeatId: 'mark-1',
      language: 'en',
      minimumChapterCount: 5,
    });
    const layout = buildVerticalWorldLayout(nodes, { width: 390, viewportHeight: 700 });

    expect(layout.contentHeight).toBeGreaterThan(2100);
    expect(layout.contentHeight - 700).toBeGreaterThan(1400);
    for (let index = 1; index < layout.points.length; index += 1) {
      expect(layout.points[index]!.y).toBeLessThan(layout.points[index - 1]!.y);
    }
  });

  it('uses a supplied world route to avoid sharp alternating turns', () => {
    const nodes = buildReadingWorldNodes({
      beats: markBeats,
      nodeProgress: {},
      currentBeatId: 'mark-1',
      language: 'en',
      minimumChapterCount: 5,
    });
    const viewport = { width: 390, viewportHeight: 740, xFractions: [0.34, 0.4, 0.48] };
    const layout = buildVerticalWorldLayout(nodes.slice(0, 3), viewport);

    expect(layout.points.map((point) => Math.round(point.x))).toEqual([145, 164, 189]);
  });

  it('clamps the current-position focus within the two-way scroll range', () => {
    expect(focusOffsetForNode(2500, 700, 3200)).toBe(2094);
    expect(focusOffsetForNode(300, 700, 3200)).toBe(0);
    expect(focusOffsetForNode(3150, 700, 3200)).toBe(2500);
  });

  it('routes completed reading sections through their chapter without changing progress', () => {
    expect(
      interactionTargetForNode({
        id: 'mark-1-john',
        parentId: 'mark-1',
      }),
    ).toBe('mark-1');
  });

  it('keeps the Traveler beside the current node instead of over its label', () => {
    expect(travelerPositionForPoint({ x: 120, y: 900 }, 390)).toEqual({ x: 154, y: 885 });
    expect(travelerPositionForPoint({ x: 280, y: 900 }, 390)).toEqual({ x: 216, y: 885 });
  });

  it('keeps world objects inside the scrollable geography', () => {
    expect(worldObjectTop(3832, 90, 3822)).toBe(3724);
    expect(worldObjectTop(-10, 90, 3822)).toBe(8);
    expect(worldObjectTop(1900, 90, 3822)).toBe(1855);
  });
});
