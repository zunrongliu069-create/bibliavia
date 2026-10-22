import { describe, expect, it } from 'vitest';
import { t } from './i18n';

type AppJourneyModule = {
  initialAppTab?: () => string;
  initialJourneySurface?: () => string;
  journeySurfaceAfter?: (action: 'create-path' | 'back-to-journey' | 'path-created') => string;
  initialJourneyPathId?: (focusedId: string | null, activeIds: string[]) => string | null;
  journeyEntryMode?: (activeIds: string[]) => string;
  showJourneyRecall?: (dueCount: number) => boolean;
  showGlobalHud?: (tab: string, pathView: string) => boolean;
  journeyHudItems?: (progress: { xp: number; streak: number; gold: number }) => Array<{
    id: string;
    value: number;
  }>;
  pathCarouselPreviewId?: (pathIds: string[], index: number) => string | null;
  pathCarouselAction?: (activeIds: string[], previewId: string) => 'continue' | 'begin';
  primaryAppTabs?: readonly string[];
  orderJourneyPathIds?: (
    allIds: string[],
    activeIds: string[],
    focusedId: string | null,
  ) => string[];
};

const loadAppJourney = async (): Promise<AppJourneyModule> =>
  import('./appJourney').catch(() => ({}));

describe('unified Journey entry', () => {
  it('opens on Journey without a separate Home tab', async () => {
    const journey = await loadAppJourney();

    expect(journey.initialAppTab?.()).toBe('campaign');
    expect(journey.primaryAppTabs).toEqual(['campaign', 'recall', 'collection', 'settings']);
    expect(t('en', 'campaign')).toBe('Journey');
  });

  it('puts the focused Path first, then active Paths, then Paths to explore', async () => {
    const journey = await loadAppJourney();

    expect(
      journey.orderJourneyPathIds?.(
        ['reading-mark', 'reading-luke', 'memorization-psalm-23', 'memorization-romans'],
        ['memorization-psalm-23', 'reading-mark'],
        'reading-mark',
      ),
    ).toEqual(['reading-mark', 'memorization-psalm-23', 'reading-luke', 'memorization-romans']);
  });

  it('shows the first-journey choice until a Path is active', async () => {
    const journey = await loadAppJourney();

    expect(journey.journeyEntryMode?.([])).toBe('first-path');
    expect(journey.initialJourneyPathId?.(null, [])).toBeNull();
    expect(journey.journeyEntryMode?.(['reading-mark'])).toBe('active-path');
    expect(journey.initialJourneyPathId?.('memorization-psalm-23', ['reading-mark'])).toBe(
      'reading-mark',
    );
    expect(
      journey.initialJourneyPathId?.('memorization-psalm-23', [
        'reading-mark',
        'memorization-psalm-23',
      ]),
    ).toBe('memorization-psalm-23');
  });

  it('shows global Recall only when material is due', async () => {
    const journey = await loadAppJourney();

    expect(journey.showJourneyRecall?.(0)).toBe(false);
    expect(journey.showJourneyRecall?.(4)).toBe(true);
  });

  it('gives the active Journey world the full space instead of reserving a HUD row', async () => {
    const journey = await loadAppJourney();

    expect(journey.showGlobalHud?.('campaign', 'journey')).toBe(false);
    expect(journey.showGlobalHud?.('campaign', 'reader')).toBe(true);
    expect(journey.showGlobalHud?.('settings', 'journey')).toBe(true);
  });

  it('maps the existing progress totals into the compact Journey HUD', async () => {
    const journey = await loadAppJourney();

    expect(journey.journeyHudItems?.({ xp: 420, streak: 7, gold: 120 })).toEqual([
      { id: 'xp', value: 420 },
      { id: 'streak', value: 7 },
      { id: 'gold', value: 120 },
    ]);
  });

  it('previews a swiped Path without activating it and requires an explicit entry action', async () => {
    const journey = await loadAppJourney();

    expect(journey.pathCarouselPreviewId?.(['mark', 'psalm-23', 'romans'], 1)).toBe('psalm-23');
    expect(journey.pathCarouselAction?.(['mark'], 'mark')).toBe('continue');
    expect(journey.pathCarouselAction?.(['mark'], 'psalm-23')).toBe('begin');
  });

  it('keeps Path management hidden until the user explicitly opens creation', async () => {
    const journey = await loadAppJourney();

    expect(journey.initialJourneySurface?.()).toBe('active-path');
    expect(journey.journeySurfaceAfter?.('create-path')).toBe('create-path');
    expect(journey.journeySurfaceAfter?.('back-to-journey')).toBe('active-path');
    expect(journey.journeySurfaceAfter?.('path-created')).toBe('active-path');
  });
});
