import { beatTitle } from '../data/paths';
import type { PathActivityType, PathDefinition, PathState, UiLanguage } from '../types';
import { nextPathBeat, pathProgressRatio } from './pathProgress';

export interface PathNextAction {
  activity: PathActivityType | 'complete';
  label: string;
  detail: string;
  beatId?: string;
}

const labels: Record<UiLanguage, Record<PathActivityType | 'complete', string>> = {
  en: {
    reading: 'Read next',
    memorization: 'Memorize next',
    review: 'Review next',
    challenge: 'Take the challenge',
    complete: 'Path complete',
  },
  sv: {
    reading: 'Läs nästa',
    memorization: 'Memorera nästa',
    review: 'Repetera nästa',
    challenge: 'Gör utmaningen',
    complete: 'Path klar',
  },
  'zh-Hans': {
    reading: '继续阅读',
    memorization: '继续背诵',
    review: '继续复习',
    challenge: '开始挑战',
    complete: '路径完成',
  },
  'zh-Hant': {
    reading: '繼續閱讀',
    memorization: '繼續背誦',
    review: '繼續複習',
    challenge: '開始挑戰',
    complete: '路徑完成',
  },
};

const activityWasUsed = (
  state: PathState | undefined,
  beatId: string,
  activity: PathActivityType,
) =>
  Object.entries(state?.activityCounts ?? {}).some(
    ([key, count]) => count > 0 && key.endsWith(`:${beatId}:${activity}`),
  );

export function nextPathAction(
  path: PathDefinition,
  state: PathState | undefined,
  language: UiLanguage,
): PathNextAction {
  if (state?.status === 'completed') {
    return {
      activity: 'complete',
      label: labels[language].complete,
      detail: labels[language].complete,
    };
  }
  const beat = nextPathBeat(path, state) ?? path.beats?.[0];
  let activity: PathActivityType = path.kind === 'memorization' ? 'memorization' : 'reading';
  if (path.kind === 'mixed' && beat) {
    activity = !activityWasUsed(state, beat.id, 'reading')
      ? 'reading'
      : !activityWasUsed(state, beat.id, 'memorization')
        ? 'memorization'
        : 'challenge';
  }
  const beatLabel = beat ? beatTitle(beat, language) : path.title;
  return { activity, label: labels[language][activity], detail: beatLabel, beatId: beat?.id };
}

export const pathTypeLabel = (path: PathDefinition, language: UiLanguage) => {
  const values: Record<UiLanguage, Record<PathDefinition['kind'], string>> = {
    en: { reading: 'Reading Path', memorization: 'Memorization Path', mixed: 'Mixed Path' },
    sv: { reading: 'Reading-Path', memorization: 'Memorization-Path', mixed: 'Blandad Path' },
    'zh-Hans': { reading: '阅读路径', memorization: '背诵路径', mixed: '混合路径' },
    'zh-Hant': { reading: '閱讀路徑', memorization: '背誦路徑', mixed: '混合路徑' },
  };
  return values[language][path.kind];
};

export const pathResumeSummary = (
  path: PathDefinition,
  state: PathState | undefined,
  language: UiLanguage,
) => {
  const percent = Math.round(pathProgressRatio(path, state) * 100);
  const action = nextPathAction(path, state, language);
  return `${percent}% · ${action.label}: ${action.detail}`;
};
