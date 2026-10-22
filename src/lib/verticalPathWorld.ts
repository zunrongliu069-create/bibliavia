import type { PathBeatDefinition, PathNodeProgress, UiLanguage, VersePathLevel } from '../types';
import { restoreReadingSession } from './readingFlow';

export type VerticalWorldNodeKind = 'section' | 'recap' | 'verse' | 'guardian';

export type VerticalWorldNode = {
  id: string;
  parentId?: string;
  index: number;
  regionId: string;
  chapterNumber?: number;
  label: string;
  kind: VerticalWorldNodeKind;
  complete: boolean;
  current: boolean;
  available: boolean;
  milestone?: boolean;
  levels?: Record<VersePathLevel, boolean>;
  previewKind?: 'guardian' | 'boss';
};

type AdapterInput = {
  beats: PathBeatDefinition[];
  nodeProgress: Record<string, PathNodeProgress>;
  currentBeatId?: string;
  language: UiLanguage;
};

type ReadingAdapterInput = AdapterInput & {
  minimumChapterCount: number;
};

export type VerticalWorldPoint = {
  nodeId: string;
  x: number;
  y: number;
};

export type VerticalWorldRegionBand = {
  id: string;
  chapterNumber?: number;
  label: string;
  top: number;
  bottom: number;
};

export type VerticalWorldLayout = {
  contentHeight: number;
  points: VerticalWorldPoint[];
  regions: VerticalWorldRegionBand[];
};

const localizedTitle = (item: Pick<PathBeatDefinition, 'title' | 'titles'>, language: UiLanguage) =>
  item.titles?.[language] ?? item.title;

const recapLabel = (chapterLabel: string, language: UiLanguage) => {
  const recap: Record<UiLanguage, string> = {
    en: 'recap',
    sv: 'sammanfattning',
    'zh-Hans': '回顾',
    'zh-Hant': '回顧',
  };
  return `${chapterLabel} · ${recap[language]}`;
};

export const buildReadingWorldNodes = ({
  beats,
  nodeProgress,
  currentBeatId,
  language,
  minimumChapterCount,
}: ReadingAdapterInput): VerticalWorldNode[] => {
  const contentBeats = beats.filter(
    (beat) => beat.nodeKind !== 'boss' && beat.nodeKind !== 'final-boss',
  );
  const currentIndex = Math.max(
    0,
    contentBeats.findIndex((beat) => beat.id === currentBeatId),
  );
  const visibleCount = Math.max(minimumChapterCount, currentIndex + 1);
  const visibleBeats = contentBeats.slice(0, visibleCount);
  const nodes: VerticalWorldNode[] = [];

  visibleBeats.forEach((beat) => {
    const progress = nodeProgress[beat.id];
    const session = progress?.chapter?.readingSession;
    const resumedSession = session
      ? restoreReadingSession(session, {
          sectionIds: (beat.sections ?? []).map((section) => section.id),
          recapCount: beat.reading?.recap.length ?? 0,
        })
      : undefined;
    const chapterComplete =
      progress?.status === 'completed' || Boolean(progress?.chapter?.quizCompleted);
    const isCurrentChapter = beat.id === currentBeatId;
    const completedSections = new Set(resumedSession?.completedSectionIds ?? []);
    const sections = beat.sections ?? [];
    const nextIncompleteIndex = sections.findIndex((section) => !completedSections.has(section.id));
    const allSectionsComplete = sections.length > 0 && nextIncompleteIndex === -1;
    const chapterNumber = beat.passage?.startChapter;
    const chapterLabel = localizedTitle(beat, language);

    sections.forEach((section, sectionIndex) => {
      const complete = chapterComplete || completedSections.has(section.id);
      const current =
        isCurrentChapter &&
        !chapterComplete &&
        !allSectionsComplete &&
        sectionIndex === nextIncompleteIndex;
      nodes.push({
        id: section.id,
        parentId: beat.id,
        index: nodes.length,
        regionId: beat.id,
        chapterNumber,
        label: section.titles?.[language] ?? section.title,
        kind: 'section',
        complete,
        current,
        available: current,
      });
    });

    const recapCurrent = isCurrentChapter && !chapterComplete && allSectionsComplete;
    nodes.push({
      id: `${beat.id}-recap`,
      parentId: beat.id,
      index: nodes.length,
      regionId: beat.id,
      chapterNumber,
      label: recapLabel(chapterLabel, language),
      kind: 'recap',
      complete: chapterComplete,
      current: recapCurrent,
      available: recapCurrent,
      milestone: true,
    });
  });

  return nodes;
};

export const buildMemorizationWorldNodes = ({
  beats,
  nodeProgress,
  currentBeatId,
  language,
}: AdapterInput): VerticalWorldNode[] =>
  beats.map((beat, index) => {
    const progress = nodeProgress[beat.id];
    const current = beat.id === currentBeatId || progress?.status === 'current';
    const guardian = beat.nodeKind === 'boss' || beat.nodeKind === 'final-boss';
    return {
      id: beat.id,
      parentId: beat.id,
      index,
      regionId: beat.regionId ?? beat.id,
      chapterNumber: beat.passage?.startChapter,
      label: localizedTitle(beat, language),
      kind: guardian ? 'guardian' : 'verse',
      complete: progress?.status === 'completed',
      current,
      available: current || progress?.status === 'available',
      milestone: beat.milestone,
      levels: progress?.levels,
      previewKind: guardian ? 'guardian' : undefined,
    };
  });

const X_PATTERN = [0.34, 0.58, 0.43, 0.66, 0.38, 0.55] as const;
const NODE_RISE = 118;
const REGION_RISE = 74;

export const buildVerticalWorldLayout = (
  nodes: VerticalWorldNode[],
  viewport: { width: number; viewportHeight: number; xFractions?: readonly number[] },
): VerticalWorldLayout => {
  const rises: number[] = [];
  let rise = 0;
  nodes.forEach((node, index) => {
    if (index > 0) {
      rise += NODE_RISE;
      if (nodes[index - 1]!.regionId !== node.regionId) rise += REGION_RISE;
    }
    rises.push(rise);
  });
  const contentHeight = Math.max(viewport.viewportHeight + 640, (rises.at(-1) ?? 0) + 340);
  const usableWidth = Math.max(230, viewport.width - 80);
  const xFractions = viewport.xFractions?.length ? viewport.xFractions : X_PATTERN;
  const points = nodes.map((node, index) => ({
    nodeId: node.id,
    x: 40 + usableWidth * xFractions[index % xFractions.length]!,
    y: contentHeight - 160 - rises[index]!,
  }));
  const regions = Array.from(new Set(nodes.map((node) => node.regionId))).map((regionId) => {
    const indexes = nodes
      .map((node, index) => (node.regionId === regionId ? index : -1))
      .filter((index) => index >= 0);
    const regionPoints = indexes.map((index) => points[index]!);
    const firstNode = nodes[indexes[0]!]!;
    return {
      id: regionId,
      chapterNumber: firstNode.chapterNumber,
      label: firstNode.chapterNumber ? `Mark ${firstNode.chapterNumber}` : firstNode.label,
      top: Math.max(0, Math.min(...regionPoints.map((point) => point.y)) - 72),
      bottom: Math.min(contentHeight, Math.max(...regionPoints.map((point) => point.y)) + 82),
    };
  });

  return { contentHeight, points, regions };
};

export const focusOffsetForNode = (nodeY: number, viewportHeight: number, contentHeight: number) =>
  Math.max(0, Math.min(contentHeight - viewportHeight, nodeY - viewportHeight * 0.58));

export const interactionTargetForNode = (node: Pick<VerticalWorldNode, 'id' | 'parentId'>) =>
  node.parentId ?? node.id;

export const travelerPositionForPoint = (point: { x: number; y: number }, worldWidth: number) => ({
  x: point.x < worldWidth / 2 ? point.x + 34 : point.x - 64,
  y: point.y - 15,
});

export const worldObjectTop = (centerY: number, objectHeight: number, contentHeight: number) =>
  Math.max(8, Math.min(contentHeight - objectHeight - 8, centerY - objectHeight / 2));
