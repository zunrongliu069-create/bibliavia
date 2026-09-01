import type {
  PathActivityType,
  PathBeatDefinition,
  PathDefinition,
  PathState,
  UserProgress,
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
    mastery:
      path.kind === 'memorization' || path.kind === 'mixed'
        ? { status: 'not-started', retainedBeatIds: [], lastCheckedAt: null }
        : undefined,
  };
}

export const pathTarget = (path: PathDefinition): number =>
  path.beats?.length
    ? path.beats.reduce((sum, beat) => sum + Math.max(1, beat.target), 0)
    : Math.max(1, path.target ?? 100);

export const pathProgressRatio = (path: PathDefinition, state?: PathState): number =>
  state ? Math.max(0, Math.min(1, state.pathProgress / pathTarget(path))) : 0;

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
  const result = applyPathActivity(path, activated.pathStates![path.id]!, input, config);
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
