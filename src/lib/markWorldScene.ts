import {
  markHeroWorldRange,
  type MarkHeroAsset,
  type MarkWorldObject,
} from '../data/markJourneyWorld';
import { worldObjectTop, type VerticalWorldPoint } from './verticalPathWorld';

const clusterOffsets = [
  [0.08, 0.58],
  [0.29, 0.22],
  [0.5, 0.7],
  [0.7, 0.31],
  [0.88, 0.62],
  [0.42, 0.43],
  [0.18, 0.82],
  [0.77, 0.84],
  [0.58, 0.16],
  [0.93, 0.18],
  [0.35, 0.9],
  [0.64, 0.55],
] as const;

type GroundObject = Extract<MarkWorldObject, { type: 'terrain' | 'water' | 'art' }>;
type LandmarkObject = Extract<MarkWorldObject, { type: 'landmark' }>;

export type MarkSceneGround = {
  id: string;
  object: GroundObject;
  left: number;
  top: number;
  width: number;
  height: number;
};

export type MarkSceneActor = {
  id: string;
  kind: 'tree' | 'house' | 'rock' | 'grass' | 'grain' | 'wall' | 'landmark' | 'art';
  asset?: MarkHeroAsset;
  variant?: string;
  landmark?: LandmarkObject;
  left: number;
  top: number;
  width: number;
  height: number;
  footY: number;
  depth: number;
  scale: number;
};

type Viewport = {
  contentHeight: number;
  worldWidth: number;
  visibleTop: number;
  viewportHeight: number;
};

const sizes = {
  tree: [58, 78],
  house: [72, 64],
  rock: [40, 30],
  grass: [12, 34],
  grain: [12, 42],
  wall: [92, 42],
} as const;

export const isMarkHeroPosition = (pointY: number, contentHeight: number) => {
  const journeyFraction = 1 - pointY / contentHeight;
  return journeyFraction >= markHeroWorldRange.from && journeyFraction <= markHeroWorldRange.to;
};

export function composeMarkWorld(
  objects: readonly MarkWorldObject[],
  points: readonly VerticalWorldPoint[],
  viewport: Viewport,
): { ground: MarkSceneGround[]; actors: MarkSceneActor[] } {
  const pointMap = new Map(points.map((point) => [point.nodeId, point]));
  const minY = viewport.visibleTop - 180;
  const maxY = viewport.visibleTop + viewport.viewportHeight + 180;
  const visible = (top: number, height: number) => top <= maxY && top + height >= minY;
  const ground: MarkSceneGround[] = [];
  const actors: MarkSceneActor[] = [];

  for (const object of objects) {
    const centerY =
      object.type === 'landmark'
        ? (pointMap.get(object.anchorNodeId)?.y ?? viewport.contentHeight * (1 - object.y)) +
          object.offsetY
        : viewport.contentHeight * (1 - object.y);
    const top = worldObjectTop(centerY, object.height, viewport.contentHeight);
    const left = object.x * viewport.worldWidth - object.width / 2;

    if (object.type === 'art') {
      if (!visible(top, object.height)) continue;
      if (object.layer === 'ground') {
        ground.push({
          id: object.id,
          object,
          left,
          top,
          width: object.width,
          height: object.height,
        });
      } else {
        const footY = top + object.height * 0.9;
        actors.push({
          id: object.id,
          kind: 'art',
          asset: object.asset,
          left,
          top,
          width: object.width,
          height: object.height,
          footY,
          depth: Math.floor(footY),
          scale: 1,
        });
      }
      continue;
    }

    if (object.type === 'terrain' || object.type === 'water') {
      if (visible(top, object.height)) {
        ground.push({
          id: object.id,
          object,
          left,
          top,
          width: object.width,
          height: object.height,
        });
      }
      continue;
    }

    if (object.type === 'landmark') {
      if (!visible(top, object.height)) continue;
      const footY = top + object.height * 0.75;
      actors.push({
        id: object.id,
        kind: 'landmark',
        variant: object.variant,
        landmark: object,
        left,
        top,
        width: object.width,
        height: object.height,
        footY,
        depth: Math.floor(footY),
        scale: 1,
      });
      continue;
    }

    const kind =
      object.type === 'vegetation'
        ? 'tree'
        : object.type === 'building'
          ? 'house'
          : object.variant === 'rocks'
            ? 'rock'
            : object.variant;
    const [width, height] = sizes[kind];
    for (let index = 0; index < object.count; index += 1) {
      const [offsetX, offsetY] = clusterOffsets[index % clusterOffsets.length]!;
      const footY = top + offsetY * object.height;
      const actorTop = footY - height;
      if (!visible(actorTop, height)) continue;
      actors.push({
        id: `${object.id}-${index}`,
        kind,
        variant: object.variant,
        left: left + offsetX * object.width - width / 2,
        top: actorTop,
        width,
        height,
        footY,
        depth: Math.floor(footY),
        scale: 0.84 + (index % 3) * 0.09,
      });
    }
  }

  ground.sort((a, b) => Number(a.object.type === 'water') - Number(b.object.type === 'water'));
  actors.sort((a, b) => a.depth - b.depth);
  return { ground, actors };
}
