import type {
  PathActivityType,
  PathBeatDefinition,
  PathDefinition,
  PathNodeProgress,
  PathState,
  UserProgress,
  Verse,
  VersePathLevel,
} from '../types';

export interface PathProgressConfig {
  activityPoints: Record<PathActivityType, number>;
  diminishingMultipliers: readonly number[];
  minimumMultiplier: number;
  failedChallengeMultiplier: number;
  readingMinimumMultiplier: number;
  memorizationMinimumMultiplier: number;
  reviewMinimumMultiplier: number;
  challengeMaximumMultiplier: number;
}

export const DEFAULT_PATH_PROGRESS_CONFIG: PathProgressConfig = {
  activityPoints: { reading: 15, memorization: 22, review: 8, challenge: 30 },
  diminishingMultipliers: [1, 0.5, 0.25],
  minimumMultiplier: 0.25,
  failedChallengeMultiplier: 0.4,
  readingMinimumMultiplier: 0.7,
  memorizationMinimumMultiplier: 0.6,
  reviewMinimumMultiplier: 0.5,
  challengeMaximumMultiplier: 1.3,
};

export interface PathActivityInput {
  activity: PathActivityType;
  at: Date;
  beatId?: string;
  quality?: number;
  success?: boolean;
  completion?:
    | { type: 'verse-level'; level: VersePathLevel }
    | { type: 'chapter-part'; part: 'reading' | 'quiz' };
}

export interface PathProgressResult {
  state: PathState;
  progressAwarded: number;
  appliedProgress: number;
  diminishingLevel: number;
  diminishingMultiplier: number;
  performanceMultiplier: number;
  feedback: 'correct' | 'partial';
  completedBeatIds: string[];
  pathCompleted: boolean;
}

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.max(minimum, Math.min(maximum, value));

const localDay = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const beatAfter = (path: PathDefinition, beat: PathBeatDefinition): string[] => {
  if (beat.nextIds) return beat.nextIds;
  const beats = path.beats ?? [];
  const index = beats.findIndex((item) => item.id === beat.id);
  return beats[index + 1] ? [beats[index + 1]!.id] : [];
};

const initialNodeProgress = (path: PathDefinition): Record<string, PathNodeProgress> =>
  Object.fromEntries(
    (path.beats ?? []).map((beat, index) => [
      beat.id,
      {
        status: index === 0 ? 'current' : 'locked',
        ...(path.structure === 'verse' && beat.nodeKind === 'content'
          ? { levels: { learn: false, practice: false, master: false } }
          : path.structure === 'chapter' && beat.nodeKind !== 'boss'
            ? { chapter: { readingCompleted: false, quizCompleted: false } }
            : {}),
      } satisfies PathNodeProgress,
    ]),
  );

const performanceFor = (input: PathActivityInput, config: PathProgressConfig): number => {
  const quality = input.quality ?? 1;
  if (input.activity === 'challenge')
    return input.success === false
      ? config.failedChallengeMultiplier
      : clamp(quality, 1, config.challengeMaximumMultiplier);
  if (input.activity === 'reading') return clamp(quality, config.readingMinimumMultiplier, 1);
  if (input.activity === 'memorization')
    return clamp(quality, config.memorizationMinimumMultiplier, 1);
  return clamp(quality, config.reviewMinimumMultiplier, 1);
};

export function createPathState(path: PathDefinition): PathState {
  const beats = path.beats ?? [];
  return {
    pathId: path.id,
    status: 'active',
    activeBeatIds: beats[0] ? [beats[0].id] : [],
    beatProgress: Object.fromEntries(beats.map((beat) => [beat.id, 0])),
    pathProgress: 0,
    completedBeatIds: [],
    completedAt: null,
    lastActivityAt: null,
    activityCounts: {},
    nodeProgress: path.structure ? initialNodeProgress(path) : undefined,
    mastery:
      path.kind === 'memorization' || path.kind === 'mixed'
        ? { status: 'not-started', retainedBeatIds: [], lastCheckedAt: null }
        : undefined,
  };
}

export function migrateStructuredPathState(
  path: PathDefinition,
  current: PathState,
  completedLessonIds: string[],
): PathState {
  if (!path.structure || current.nodeProgress) return current;
  const state = { ...createPathState(path), ...current, nodeProgress: initialNodeProgress(path) };
  const contentNodes = (path.beats ?? []).filter((beat) => beat.nodeKind === 'content');
  if (path.structure === 'verse') {
    for (const beat of contentNodes) {
      if (!completedLessonIds.some((id) => id === beat.id || id.endsWith(`-${beat.id}`))) continue;
      state.nodeProgress![beat.id] = {
        status: 'completed',
        levels: { learn: true, practice: true, master: true },
      };
    }
  } else {
    for (const beat of contentNodes) {
      if (!current.completedBeatIds.includes(beat.id)) continue;
      state.nodeProgress![beat.id] = {
        status: 'completed',
        chapter: { readingCompleted: true, quizCompleted: true },
      };
    }
  }
  const firstIncomplete = contentNodes.find(
    (beat) => state.nodeProgress?.[beat.id]?.status !== 'completed',
  );
  if (firstIncomplete) {
    state.nodeProgress![firstIncomplete.id] = {
      ...state.nodeProgress![firstIncomplete.id]!,
      status: 'current',
    };
    state.activeBeatIds = [firstIncomplete.id];
  }
  state.pathProgress = contentNodes.filter(
    (beat) => state.nodeProgress?.[beat.id]?.status === 'completed',
  ).length;
  return state;
}

const structuredState = (path: PathDefinition, current: PathState): PathState => ({
  ...current,
  activeBeatIds: [...current.activeBeatIds],
  completedBeatIds: [...current.completedBeatIds],
  nodeProgress: Object.fromEntries(
    Object.entries(current.nodeProgress ?? initialNodeProgress(path)).map(([id, node]) => [
      id,
      {
        ...node,
        levels: node.levels ? { ...node.levels } : undefined,
        chapter: node.chapter ? { ...node.chapter } : undefined,
      },
    ]),
  ),
});

const unlockNextNodes = (path: PathDefinition, state: PathState, beatId: string) => {
  const beat = path.beats?.find((item) => item.id === beatId);
  if (!beat || !state.nodeProgress) return;
  for (const nextId of beatAfter(path, beat)) {
    const next = state.nodeProgress[nextId];
    if (next?.status === 'locked') state.nodeProgress[nextId] = { ...next, status: 'available' };
  }
};

export function completeVersePathLevel(
  path: PathDefinition,
  current: PathState,
  beatId: string,
  level: VersePathLevel,
): PathState {
  if (path.structure !== 'verse') throw new Error('Path is not a Verse Path.');
  const state = structuredState(path, current);
  const node = state.nodeProgress?.[beatId];
  if (!node || node.status === 'locked') throw new Error(`Unavailable Path node: ${beatId}`);
  if (level === 'practice' && !node.levels?.learn)
    throw new Error('Learn must be completed before Practice.');
  if (level === 'master' && !node.levels?.practice)
    throw new Error('Practice must be completed before Master.');
  state.nodeProgress![beatId] = {
    ...node,
    levels: { learn: false, practice: false, master: false, ...node.levels, [level]: true },
  };
  if (level === 'learn') unlockNextNodes(path, state, beatId);
  return state;
}

export function completeChapterPathPart(
  path: PathDefinition,
  current: PathState,
  beatId: string,
  part: 'reading' | 'quiz',
): PathState {
  if (path.structure !== 'chapter') throw new Error('Path is not a Chapter Path.');
  const state = structuredState(path, current);
  const node = state.nodeProgress?.[beatId];
  if (!node || node.status === 'locked') throw new Error(`Unavailable Path node: ${beatId}`);
  const chapter = {
    readingCompleted: false,
    quizCompleted: false,
    ...node.chapter,
    ...(part === 'reading' ? { readingCompleted: true } : { quizCompleted: true }),
  };
  if (part === 'quiz' && !chapter.readingCompleted)
    throw new Error('Chapter reading must be completed before its quiz.');
  const completed = chapter.readingCompleted && chapter.quizCompleted;
  state.nodeProgress![beatId] = { ...node, chapter, status: completed ? 'completed' : node.status };
  if (completed) {
    if (!state.completedBeatIds.includes(beatId)) state.completedBeatIds.push(beatId);
    unlockNextNodes(path, state, beatId);
  }
  return state;
}

export function setCurrentPathNode(
  path: PathDefinition,
  current: PathState,
  beatId: string,
): PathState {
  const state = structuredState(path, current);
  const target = state.nodeProgress?.[beatId];
  if (!target || target.status !== 'available') throw new Error(`Unavailable Path node: ${beatId}`);
  state.nodeProgress = Object.fromEntries(
    Object.entries(state.nodeProgress!).map(([id, node]) => [
      id,
      id === beatId
        ? { ...node, status: 'current' as const }
        : node.status === 'current'
          ? { ...node, status: 'completed' as const }
          : node,
    ]),
  );
  state.activeBeatIds = [beatId];
  return state;
}

export const recallEligibleBeatIds = (path: PathDefinition, state?: PathState): string[] =>
  path.structure === 'verse'
    ? (path.beats ?? [])
        .filter((beat) => state?.nodeProgress?.[beat.id]?.levels?.master)
        .map((beat) => beat.id)
    : [];

export function recallEligibleVerses(
  paths: PathDefinition[],
  states: Record<string, PathState> | undefined,
  verses: Verse[],
): Verse[] {
  const references = new Set<string>();
  for (const path of paths) {
    const state = states?.[path.id];
    for (const beat of path.beats ?? []) {
      if (!state?.nodeProgress?.[beat.id]?.levels?.master || !beat.passage) continue;
      references.add(
        `${beat.passage.bookId}:${beat.passage.startChapter}:${beat.passage.startVerse}`,
      );
    }
  }
  return verses.filter((verse) =>
    references.has(`${verse.bookId}:${verse.chapter}:${verse.verseStart}`),
  );
}

export const pathTarget = (path: PathDefinition): number =>
  path.beats?.length
    ? path.beats.reduce((sum, beat) => sum + Math.max(1, beat.target), 0)
    : Math.max(1, path.target ?? 100);

export const pathProgressRatio = (path: PathDefinition, state?: PathState): number =>
  !state
    ? 0
    : path.structure
      ? (() => {
          const nodes = (path.beats ?? []).filter((beat) => beat.nodeKind === 'content');
          const completed = nodes.filter((beat) => {
            const node = state.nodeProgress?.[beat.id];
            return path.structure === 'verse'
              ? Boolean(node?.levels?.learn)
              : Boolean(node?.chapter?.readingCompleted && node.chapter.quizCompleted);
          }).length;
          return completed / Math.max(1, nodes.length);
        })()
      : Math.max(0, Math.min(1, state.pathProgress / pathTarget(path)));

export const nextPathBeat = (path: PathDefinition, state?: PathState) =>
  path.beats?.find((beat) => state?.activeBeatIds.includes(beat.id));

export function activatePath(progress: UserProgress, path: PathDefinition): UserProgress {
  if (progress.pathStates?.[path.id]) return progress;
  return {
    ...progress,
    pathStates: { ...(progress.pathStates ?? {}), [path.id]: createPathState(path) },
    activePathIds: [...new Set([...(progress.activePathIds ?? []), path.id])],
  };
}

export function applyActivityToProgress(
  progress: UserProgress,
  path: PathDefinition,
  input: PathActivityInput,
  config = DEFAULT_PATH_PROGRESS_CONFIG,
): { progress: UserProgress; result: PathProgressResult } {
  const activated = activatePath(progress, path);
  const current = activated.pathStates![path.id]!;
  const result = path.structure
    ? input.completion
      ? applyStructuredPathActivity(path, current, input, config)
      : structuredActivityWithoutProgress(current, input, config)
    : applyPathActivity(path, current, input, config);
  return {
    result,
    progress: {
      ...activated,
      pathStates: { ...activated.pathStates, [path.id]: result.state },
      activePathIds: result.pathCompleted
        ? (activated.activePathIds ?? []).filter((id) => id !== path.id)
        : activated.activePathIds,
    },
  };
}

function structuredActivityWithoutProgress(
  current: PathState,
  input: PathActivityInput,
  config: PathProgressConfig,
): PathProgressResult {
  const performanceMultiplier = performanceFor(input, config);
  return {
    state: { ...current, lastActivityAt: input.at.toISOString() },
    progressAwarded: 0,
    appliedProgress: 0,
    diminishingLevel: 0,
    diminishingMultiplier: 0,
    performanceMultiplier,
    feedback: input.activity === 'challenge' && input.success === false ? 'partial' : 'correct',
    completedBeatIds: [],
    pathCompleted: false,
  };
}

function applyStructuredPathActivity(
  path: PathDefinition,
  current: PathState,
  input: PathActivityInput,
  config: PathProgressConfig,
): PathProgressResult {
  const beforeCompleted = new Set(current.completedBeatIds);
  const beforeNode = input.beatId ? current.nodeProgress?.[input.beatId] : undefined;
  if (!input.beatId || !input.completion) throw new Error('Structured Path activity needs a node.');
  let state =
    input.completion.type === 'verse-level'
      ? completeVersePathLevel(path, current, input.beatId, input.completion.level)
      : completeChapterPathPart(path, current, input.beatId, input.completion.part);
  const node = state.nodeProgress?.[input.beatId];
  const changed =
    input.completion.type === 'verse-level'
      ? !beforeNode?.levels?.[input.completion.level] &&
        Boolean(node?.levels?.[input.completion.level])
      : input.completion.part === 'reading'
        ? !beforeNode?.chapter?.readingCompleted && Boolean(node?.chapter?.readingCompleted)
        : !beforeNode?.chapter?.quizCompleted && Boolean(node?.chapter?.quizCompleted);
  const contentNodes = (path.beats ?? []).filter((beat) => beat.nodeKind === 'content');
  if (
    path.structure === 'chapter' &&
    contentNodes.every(
      (beat) =>
        state.nodeProgress?.[beat.id]?.chapter?.readingCompleted &&
        state.nodeProgress?.[beat.id]?.chapter?.quizCompleted,
    )
  ) {
    state = { ...state, status: 'completed', completedAt: input.at.toISOString() };
  }
  state = {
    ...state,
    lastActivityAt: input.at.toISOString(),
    pathProgress: Math.round(pathProgressRatio(path, state) * contentNodes.length),
  };
  const completedBeatIds = state.completedBeatIds.filter((id) => !beforeCompleted.has(id));
  const performanceMultiplier = performanceFor(input, config);
  const progressAwarded = changed
    ? Math.max(1, Math.round(config.activityPoints[input.activity] * performanceMultiplier))
    : 0;
  return {
    state,
    progressAwarded,
    appliedProgress: changed ? 1 : 0,
    diminishingLevel: 0,
    diminishingMultiplier: changed ? 1 : 0,
    performanceMultiplier,
    feedback: input.activity === 'challenge' && input.success === false ? 'partial' : 'correct',
    completedBeatIds,
    pathCompleted: state.status === 'completed' && current.status !== 'completed',
  };
}

export function applyPathActivity(
  path: PathDefinition,
  current: PathState,
  input: PathActivityInput,
  config = DEFAULT_PATH_PROGRESS_CONFIG,
): PathProgressResult {
  if (current.pathId !== path.id) throw new Error('Path state does not match definition.');
  if (current.status === 'completed')
    return {
      state: current,
      progressAwarded: 0,
      appliedProgress: 0,
      diminishingLevel: 0,
      diminishingMultiplier: 0,
      performanceMultiplier: 0,
      feedback: 'correct',
      completedBeatIds: [],
      pathCompleted: false,
    };

  const beats = path.beats ?? [];
  const scopeId = input.beatId ?? current.activeBeatIds[0] ?? path.id;
  if (beats.length && !beats.some((beat) => beat.id === scopeId))
    throw new Error(`Unknown Beat: ${scopeId}`);
  const countKey = `${localDay(input.at)}:${scopeId}:${input.activity}`;
  const priorCount = current.activityCounts[countKey] ?? 0;
  const diminishingMultiplier =
    config.diminishingMultipliers[priorCount] ?? config.minimumMultiplier;
  const performanceMultiplier = performanceFor(input, config);
  const progressAwarded = Math.max(
    1,
    Math.round(
      config.activityPoints[input.activity] * performanceMultiplier * diminishingMultiplier,
    ),
  );
  const state: PathState = {
    ...current,
    lastActivityAt: input.at.toISOString(),
    activityCounts: { ...current.activityCounts, [countKey]: priorCount + 1 },
    beatProgress: { ...current.beatProgress },
    completedBeatIds: [...current.completedBeatIds],
    activeBeatIds: [...current.activeBeatIds],
  };
  const newlyCompleted: string[] = [];
  let remaining = progressAwarded;
  let appliedProgress = 0;

  if (!beats.length) {
    const target = Math.max(1, path.target ?? 100);
    const applied = Math.min(remaining, target - state.pathProgress);
    state.pathProgress += applied;
    appliedProgress += applied;
    if (state.pathProgress >= target) state.status = 'completed';
  } else {
    let beatId: string | undefined = scopeId;
    while (beatId && remaining > 0) {
      const beat = beats.find((item) => item.id === beatId);
      if (!beat || state.completedBeatIds.includes(beatId)) break;
      const existing = state.beatProgress[beatId] ?? 0;
      const applied = Math.min(remaining, Math.max(0, beat.target - existing));
      state.beatProgress[beatId] = existing + applied;
      state.pathProgress += applied;
      appliedProgress += applied;
      remaining -= applied;
      if (state.beatProgress[beatId]! < beat.target) break;
      state.completedBeatIds.push(beatId);
      newlyCompleted.push(beatId);
      state.activeBeatIds = state.activeBeatIds.filter((id) => id !== beatId);
      const nextIds = beatAfter(path, beat).filter((id) => !state.completedBeatIds.includes(id));
      state.activeBeatIds = [...new Set([...state.activeBeatIds, ...nextIds])];
      beatId = nextIds.length === 1 ? nextIds[0] : undefined;
    }
    if (state.completedBeatIds.length === beats.length) state.status = 'completed';
  }

  const pathCompleted = state.status === 'completed';
  if (pathCompleted) state.completedAt = input.at.toISOString();
  return {
    state,
    progressAwarded,
    appliedProgress,
    diminishingLevel: Math.min(priorCount, config.diminishingMultipliers.length - 1),
    diminishingMultiplier,
    performanceMultiplier,
    feedback: input.activity === 'challenge' && input.success === false ? 'partial' : 'correct',
    completedBeatIds: newlyCompleted,
    pathCompleted,
  };
}
