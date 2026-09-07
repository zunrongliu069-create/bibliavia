import type { UiLanguage } from '../types';

export type WorldTemplate = 'route' | 'ascent' | 'atlas';
export type CameraPreset = 'compact' | 'segmented';

export interface PathWorldRegion {
  id: string;
  chapters: readonly [number, number];
  titles: Record<UiLanguage, string>;
  landmark: 'gate' | 'bridge' | 'overlook' | 'olive-terrace' | 'gathering-court';
  landmarkChapter: number;
  light: 'dusk' | 'morning' | 'sunrise' | 'afternoon' | 'golden';
}

export interface PathWorldDefinition {
  pathId: string;
  template: WorldTemplate;
  camera: CameraPreset;
  palette: {
    limestone: string;
    terracotta: string;
    olive: string;
    ink: string;
    gold: string;
  };
  regions: readonly PathWorldRegion[];
}

const titles = (en: string, sv: string): Record<UiLanguage, string> => ({
  en,
  sv,
  'zh-Hans': en,
  'zh-Hant': en,
});

export const romansWorld: PathWorldDefinition = {
  pathId: 'memorization-romans',
  template: 'route',
  camera: 'segmented',
  palette: {
    limestone: '#D8C9AE',
    terracotta: '#A85D45',
    olive: '#65724A',
    ink: '#2F2940',
    gold: '#C99A3B',
  },
  regions: [
    {
      id: 'measure-and-need',
      chapters: [1, 3],
      titles: titles('Measure and Need', 'Mått och behov'),
      landmark: 'gate',
      landmarkChapter: 3,
      light: 'dusk',
    },
    {
      id: 'promise-and-peace',
      chapters: [4, 5],
      titles: titles('Promise and Peace', 'Löfte och frid'),
      landmark: 'bridge',
      landmarkChapter: 5,
      light: 'morning',
    },
    {
      id: 'new-life',
      chapters: [6, 8],
      titles: titles('New Life', 'Nytt liv'),
      landmark: 'overlook',
      landmarkChapter: 8,
      light: 'sunrise',
    },
    {
      id: 'mercy-and-mystery',
      chapters: [9, 11],
      titles: titles('Mercy and Mystery', 'Barmhärtighet och mysterium'),
      landmark: 'olive-terrace',
      landmarkChapter: 11,
      light: 'afternoon',
    },
    {
      id: 'living-community',
      chapters: [12, 16],
      titles: titles('Living Community', 'Levande gemenskap'),
      landmark: 'gathering-court',
      landmarkChapter: 16,
      light: 'golden',
    },
  ],
};

export const milestoneCount = (nodeCount: number) =>
  Math.min(10, Math.max(1, Math.round(Math.sqrt(Math.max(0, nodeCount) / 2))));

export const milestoneIndexes = (nodeCount: number) => {
  if (nodeCount <= 0) return [];
  const count = milestoneCount(nodeCount);
  return Array.from(
    new Set(
      Array.from({ length: count }, (_, index) =>
        Math.min(nodeCount - 1, Math.round(((index + 1) * nodeCount) / count) - 1),
      ),
    ),
  );
};

export const pathWorldFor = (pathId: string): PathWorldDefinition | undefined =>
  pathId === romansWorld.pathId ? romansWorld : undefined;

export const chapterFromNodeId = (nodeId: string) => {
  const match = nodeId.match(/romans-(\d+)(?:-|$)/);
  return match ? Number(match[1]) : undefined;
};

export const regionForChapter = (world: PathWorldDefinition, chapter?: number) =>
  world.regions.find(
    (region) =>
      chapter !== undefined && chapter >= region.chapters[0] && chapter <= region.chapters[1],
  ) ?? world.regions[0]!;
