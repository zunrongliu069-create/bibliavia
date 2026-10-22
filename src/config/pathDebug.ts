export const PATH_DEBUG_ENABLED = typeof __DEV__ !== 'undefined' && __DEV__;

export const ROMANS_VERSE_COUNTS = [
  32, 29, 31, 25, 21, 23, 25, 39, 33, 21, 36, 21, 14, 23, 33, 27,
] as const;

export const PATH_PREVIEW_STATES = [
  'locked',
  'available',
  'current',
  'completed',
  'milestone',
  'guardian',
  'boss',
] as const;

export type PathPreviewState = (typeof PATH_PREVIEW_STATES)[number];

export type RomansPathPreview = {
  chapter: number;
  verse: number;
  state: PathPreviewState;
};
