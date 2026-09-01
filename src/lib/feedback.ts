import type { FeedbackEvent, FeedbackEventType, FeedbackSettings, PathTone } from '../types';

export interface FeedbackPresentation {
  durationMs: number;
  intensity: number;
  color: string;
  icon: 'checkmark' | 'close' | 'remove' | 'navigate' | 'flag' | 'star' | 'diamond';
  frequencies: readonly number[];
  playbackRate: number;
  vibration: readonly number[];
}

const toneFrequencies: Record<PathTone, readonly number[]> = {
  triumphant: [392, 494, 587, 784],
  reflective: [330, 392, 494],
  solemn: [262, 294, 392],
  hopeful: [349, 440, 523],
};

const tonePlaybackRates: Record<PathTone, number> = {
  triumphant: 1.08,
  reflective: 0.96,
  solemn: 0.86,
  hopeful: 1.02,
};

const eventConfig: Record<
  FeedbackEventType,
  Omit<FeedbackPresentation, 'frequencies' | 'playbackRate'> & { frequencyScale: number }
> = {
  ACTIVITY_CORRECT: {
    durationMs: 420,
    intensity: 0.55,
    color: '#42A77A',
    icon: 'checkmark',
    frequencyScale: 1,
    vibration: [18],
  },
  ACTIVITY_WRONG: {
    durationMs: 320,
    intensity: 0.42,
    color: '#C95F52',
    icon: 'close',
    frequencyScale: 0.72,
    vibration: [25, 35, 25],
  },
  ACTIVITY_PARTIAL: {
    durationMs: 480,
    intensity: 0.48,
    color: '#C99538',
    icon: 'remove',
    frequencyScale: 0.88,
    vibration: [16, 30, 12],
  },
  PATH_PROGRESS: {
    durationMs: 460,
    intensity: 0.5,
    color: '#8B64D7',
    icon: 'navigate',
    frequencyScale: 1,
    vibration: [14],
  },
  BEAT_COMPLETED: {
    durationMs: 1600,
    intensity: 0.72,
    color: '#D2A53E',
    icon: 'flag',
    frequencyScale: 1,
    vibration: [25, 40, 35],
  },
  PATH_COMPLETED: {
    durationMs: 4800,
    intensity: 1,
    color: '#E2B84F',
    icon: 'star',
    frequencyScale: 1,
    vibration: [30, 55, 45, 55, 60],
  },
  MAJOR_UNLOCK: {
    durationMs: 4200,
    intensity: 0.95,
    color: '#79CBB0',
    icon: 'star',
    frequencyScale: 1.06,
    vibration: [30, 45, 55],
  },
  FRAGMENT_REVEALED: {
    durationMs: 3800,
    intensity: 1,
    color: '#83D6E2',
    icon: 'diamond',
    frequencyScale: 1.12,
    vibration: [25, 45, 35, 45, 65],
  },
};

export function feedbackPresentation(
  event: FeedbackEvent,
  settings: FeedbackSettings,
  veteranCompletions = 0,
): FeedbackPresentation {
  const base = eventConfig[event.type];
  const veteranScale = Math.max(0.65, 1 - Math.min(0.35, veteranCompletions / 500));
  const diminishingScale = Math.max(0.55, 1 - (event.diminishingLevel ?? 0) * 0.18);
  const motionScale = settings.reduceMotion ? 0.35 : 1;
  return {
    durationMs: Math.round(base.durationMs * veteranScale * diminishingScale * motionScale),
    intensity: base.intensity * diminishingScale * (settings.reduceMotion ? 0.65 : 1),
    color: base.color,
    icon: base.icon,
    frequencies: toneFrequencies[event.tone].map((frequency) =>
      Math.round(frequency * base.frequencyScale),
    ),
    playbackRate: tonePlaybackRates[event.tone],
    vibration: settings.reduceMotion ? base.vibration.slice(0, 1) : base.vibration,
  };
}
