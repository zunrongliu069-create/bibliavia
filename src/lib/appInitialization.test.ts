import { describe, expect, it } from 'vitest';

type InitializationModule = {
  createInitialPreferences?: () => { uiLanguage: string; translationId: string };
  normalizeUiLanguage?: (value: unknown) => string;
  reconcilePersistedJourney?: (
    progress:
      | {
          activePathIds?: string[];
          customPaths?: Array<{ id: string; source?: string }>;
          focusedPathId?: string | null;
        }
      | undefined,
    shippedPathIds: string[],
  ) => {
    activePathIds: string[];
    customPaths: Array<{ id: string; source?: string }>;
    focusedPathId: string | null;
  };
  parsePersistedJson?: <T>(raw: string | null) => T | null;
  isHydratedForIdentity?: (
    authReady: boolean,
    currentUserId: string | null,
    hydratedUserId: string | null,
  ) => boolean;
};

const loadInitialization = async (): Promise<InitializationModule> =>
  import('./appInitialization').catch(() => ({}));

describe('App initialization', () => {
  it('starts a fresh user in English with the English Bible', async () => {
    const initialization = await loadInitialization();

    expect(initialization.createInitialPreferences?.()).toEqual({
      uiLanguage: 'en',
      translationId: 'webp',
    });
  });

  it('only exposes hydrated state for the current authenticated identity', async () => {
    const initialization = await loadInitialization();
    const readyFor = initialization.isHydratedForIdentity;

    expect(readyFor?.(false, null, null)).toBe(false);
    expect(readyFor?.(true, 'english-user', 'previous-user')).toBe(false);
    expect(readyFor?.(true, 'english-user', 'english-user')).toBe(true);
    expect(readyFor?.(true, 'chinese-user', 'chinese-user')).toBe(true);
  });

  it('defaults missing or obsolete language values to English without overriding an explicit choice', async () => {
    const initialization = await loadInitialization();
    const normalize = initialization.normalizeUiLanguage;

    expect(normalize?.(undefined)).toBe('en');
    expect(normalize?.('obsolete-locale')).toBe('en');
    expect(normalize?.('zh-Hans')).toBe('zh-Hans');
    expect(normalize?.('sv')).toBe('sv');
  });

  it('removes obsolete generated Paths while preserving shipped and user-created journeys', async () => {
    const initialization = await loadInitialization();
    const reconcile = initialization.reconcilePersistedJourney;

    expect(
      reconcile?.(
        {
          activePathIds: ['demo-genesis-1-1', 'reading-mark', 'user-42'],
          customPaths: [
            { id: 'demo-genesis-1-1', source: 'curated' },
            { id: 'user-42', source: 'user' },
          ],
          focusedPathId: 'demo-genesis-1-1',
        },
        ['reading-mark', 'memorization-psalm-23'],
      ),
    ).toEqual({
      activePathIds: ['reading-mark', 'user-42'],
      customPaths: [{ id: 'user-42', source: 'user' }],
      focusedPathId: 'reading-mark',
    });
    expect(reconcile?.(undefined, ['reading-mark'])).toEqual({
      activePathIds: [],
      customPaths: [],
      focusedPathId: null,
    });
  });

  it('falls back safely when persisted client state is malformed', async () => {
    const initialization = await loadInitialization();
    const parse = initialization.parsePersistedJson;

    expect(parse?.<{ uiLanguage: string }>('{broken-json')).toBeNull();
    expect(parse?.<{ uiLanguage: string }>(null)).toBeNull();
    expect(parse?.<{ uiLanguage: string }>('{"uiLanguage":"en"}')).toEqual({
      uiLanguage: 'en',
    });
  });
});
