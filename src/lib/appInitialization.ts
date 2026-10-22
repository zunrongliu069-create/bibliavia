import type { UiLanguage } from '../types';

const uiLanguages: UiLanguage[] = ['en', 'sv', 'zh-Hans', 'zh-Hant'];

export const createInitialPreferences = (): {
  uiLanguage: UiLanguage;
  translationId: string;
} => ({
  uiLanguage: 'en',
  translationId: 'webp',
});

export const normalizeUiLanguage = (value: unknown): UiLanguage =>
  uiLanguages.includes(value as UiLanguage) ? (value as UiLanguage) : 'en';

export const parsePersistedJson = <T>(raw: string | null): T | null => {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

type PersistedJourney = {
  activePathIds?: string[];
  customPaths?: Array<{ id: string; source?: string }>;
  focusedPathId?: string | null;
};

export const reconcilePersistedJourney = <T extends PersistedJourney>(
  progress: T | null | undefined,
  shippedPathIds: string[],
): T & Required<PersistedJourney> => {
  const source = progress ?? ({} as T);
  const customPaths = (source.customPaths ?? []).filter(
    (path) => path.source === 'user' && path.id.startsWith('user-'),
  );
  const validIds = new Set([...shippedPathIds, ...customPaths.map((path) => path.id)]);
  const activePathIds = (source.activePathIds ?? []).filter((id) => validIds.has(id));
  const focusedPathId =
    source.focusedPathId && validIds.has(source.focusedPathId)
      ? source.focusedPathId
      : (activePathIds[0] ?? null);

  return { ...source, activePathIds, customPaths, focusedPathId };
};

export const isHydratedForIdentity = (
  authReady: boolean,
  currentUserId: string | null,
  hydratedUserId: string | null,
): boolean => Boolean(authReady && currentUserId && currentUserId === hydratedUserId);
