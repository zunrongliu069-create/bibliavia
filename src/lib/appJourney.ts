export const primaryAppTabs = ['campaign', 'recall', 'collection', 'settings'] as const;
export type PrimaryAppTab = (typeof primaryAppTabs)[number];

export const initialAppTab = (): PrimaryAppTab => 'campaign';

export type JourneySurface = 'active-path' | 'create-path';

export const initialJourneySurface = (): JourneySurface => 'active-path';

export const journeySurfaceAfter = (
  action: 'create-path' | 'back-to-journey' | 'path-created',
): JourneySurface => (action === 'create-path' ? 'create-path' : 'active-path');

export const initialJourneyPathId = (
  focusedId: string | null | undefined,
  activeIds: string[],
): string | null => (focusedId && activeIds.includes(focusedId) ? focusedId : activeIds[0]) ?? null;

export const journeyEntryMode = (activeIds: string[]): 'first-path' | 'active-path' =>
  activeIds.length > 0 ? 'active-path' : 'first-path';

export const showJourneyRecall = (dueCount: number): boolean => dueCount > 0;

export const journeyHudItems = (progress: { xp: number; streak: number; gold: number }) => [
  { id: 'xp', value: progress.xp },
  { id: 'streak', value: progress.streak },
  { id: 'gold', value: progress.gold },
];

export const pathCarouselPreviewId = (pathIds: string[], index: number): string | null =>
  pathIds[Math.max(0, Math.min(index, pathIds.length - 1))] ?? null;

export const pathCarouselAction = (activeIds: string[], previewId: string): 'continue' | 'begin' =>
  activeIds.includes(previewId) ? 'continue' : 'begin';

export const showGlobalHud = (tab: string, pathView: string): boolean =>
  tab !== 'campaign' || pathView !== 'journey';

export const orderJourneyPathIds = (
  allIds: string[],
  activeIds: string[],
  focusedId: string | null,
): string[] => {
  const priority = [focusedId, ...activeIds, ...allIds].filter(
    (id): id is string => Boolean(id) && allIds.includes(id!),
  );
  return [...new Set(priority)];
};
