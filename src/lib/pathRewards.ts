import type { PathDefinition } from '../types';
import type { PathProgressResult } from './pathProgress';
import { pathTarget } from './pathProgress';

export interface PathReward {
  xp: number;
  gold: number;
  fragments: number;
}

export function pathRewardFor(path: PathDefinition, result: PathProgressResult): PathReward {
  const completedTargets = (path.beats ?? [])
    .filter((beat) => result.completedBeatIds.includes(beat.id))
    .reduce((sum, beat) => sum + beat.target, 0);
  const beatXp = Math.min(30, Math.round(completedTargets / 10));
  const beatGold = Math.min(15, Math.round(completedTargets / 20));
  if (!result.pathCompleted) return { xp: beatXp, gold: beatGold, fragments: 0 };

  const target = pathTarget(path);
  const curated = path.source === 'curated';
  return {
    xp: beatXp + Math.min(curated ? 100 : 15, Math.max(1, Math.round(target / 10))),
    gold: beatGold + (curated ? Math.min(100, Math.max(5, Math.round(target / 20))) : 0),
    fragments: curated && target >= 1000 ? 1 : 0,
  };
}
