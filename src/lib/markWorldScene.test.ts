import { describe, expect, it } from 'vitest';
import { markWorldObjects, type MarkWorldObject } from '../data/markJourneyWorld';
import { composeMarkWorld, isMarkHeroPosition } from './markWorldScene';

const objects: MarkWorldObject[] = [
  { id: 'ground', type: 'terrain', tone: 'sand', x: 0.5, y: 0.5, width: 300, height: 300 },
  {
    id: 'tree',
    type: 'vegetation',
    variant: 'olive',
    count: 1,
    x: 0.5,
    y: 0.5,
    width: 100,
    height: 100,
  },
  {
    id: 'house',
    type: 'building',
    variant: 'village',
    count: 1,
    x: 0.6,
    y: 0.47,
    width: 100,
    height: 100,
  },
  {
    id: 'wall',
    type: 'foreground',
    variant: 'wall',
    count: 1,
    x: 0.5,
    y: 0.52,
    width: 100,
    height: 100,
  },
  {
    id: 'gate',
    type: 'landmark',
    variant: 'gate',
    anchorNodeId: 'step',
    offsetY: -20,
    label: 'Gate',
    x: 0.7,
    y: 0,
    width: 100,
    height: 80,
  },
];

describe('Mark world composition', () => {
  it('keeps the art pass confined to the selected world stretch', () => {
    expect(isMarkHeroPosition(2000, 4000)).toBe(true);
    expect(isMarkHeroPosition(3000, 4000)).toBe(false);
    expect(isMarkHeroPosition(1000, 4000)).toBe(false);
  });

  it('composes the authored settlement-to-hillside art as separate visible actors and ground', () => {
    const scene = composeMarkWorld(markWorldObjects, [], {
      contentHeight: 4000,
      worldWidth: 390,
      visibleTop: 1400,
      viewportHeight: 800,
    });

    expect(scene.ground.some((item) => item.object.type === 'art')).toBe(true);
    expect(scene.actors.some((item) => item.asset === 'fisher-house')).toBe(true);
    expect(scene.actors.some((item) => item.asset === 'olive-tree')).toBe(true);
  });

  it('does not mix primitive actors into the authored settlement and grove view', () => {
    const scene = composeMarkWorld(markWorldObjects, [], {
      contentHeight: 4000,
      worldWidth: 390,
      visibleTop: 1400,
      viewportHeight: 1000,
    });

    expect(scene.actors.filter((item) => item.kind !== 'art' && item.kind !== 'landmark')).toEqual(
      [],
    );
  });

  it('places independent hero art by world coordinates and sorts actors by ground contact', () => {
    const hero: MarkWorldObject[] = [
      {
        id: 'earth',
        type: 'art',
        layer: 'ground',
        asset: 'earth-patch',
        x: 0.5,
        y: 0.5,
        width: 200,
        height: 100,
      },
      {
        id: 'tree',
        type: 'art',
        layer: 'actor',
        asset: 'olive-tree',
        x: 0.5,
        y: 0.5,
        width: 90,
        height: 100,
      },
      {
        id: 'foreground-props',
        type: 'art',
        layer: 'actor',
        asset: 'shore-props',
        x: 0.7,
        y: 0.45,
        width: 80,
        height: 60,
      },
    ];
    const scene = composeMarkWorld(hero, [], {
      contentHeight: 1000,
      worldWidth: 400,
      visibleTop: 350,
      viewportHeight: 350,
    });

    expect(scene.ground.map((item) => [item.id, item.left, item.top])).toEqual([
      ['earth', 100, 450],
    ]);
    expect(scene.actors.map((item) => [item.id, item.left, item.top, item.footY])).toEqual([
      ['tree', 155, 450, 540],
      ['foreground-props', 240, 520, 574],
    ]);
    expect(scene.actors.map((item) => item.asset)).toEqual(['olive-tree', 'shore-props']);

    const hidden = composeMarkWorld(hero, [], {
      contentHeight: 1000,
      worldWidth: 400,
      visibleTop: 800,
      viewportHeight: 100,
    });
    expect(hidden.ground).toEqual([]);
    expect(hidden.actors).toEqual([]);
  });

  it('projects modular objects into stable world positions and sorts by their ground contact', () => {
    const scene = composeMarkWorld(objects, [{ nodeId: 'step', x: 200, y: 450 }], {
      contentHeight: 1000,
      worldWidth: 400,
      visibleTop: 300,
      viewportHeight: 400,
    });

    expect(scene.ground.map((item) => item.id)).toEqual(['ground']);
    expect(scene.actors.map((item) => item.id)).toEqual(['gate', 'wall-0', 'tree-0', 'house-0']);
    expect(scene.actors.map((item) => item.footY)).toEqual([450, 488, 508, 538]);
    expect(scene.actors[1]?.kind).toBe('wall');
    expect(scene.actors.every((item) => item.depth === Math.floor(item.footY))).toBe(true);
  });

  it('keeps offscreen actors out of the rendered scene while retaining their world coordinates', () => {
    const scene = composeMarkWorld(objects, [{ nodeId: 'step', x: 200, y: 450 }], {
      contentHeight: 1000,
      worldWidth: 400,
      visibleTop: 850,
      viewportHeight: 100,
    });

    expect(scene.actors).toEqual([]);
    expect(scene.ground).toEqual([]);
  });
});
