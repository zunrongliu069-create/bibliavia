import { describe, expect, it, vi } from 'vitest';
import type { UserProgress } from '../types';
import {
  characterSpecialties,
  completedCharacterSets,
  heroGameplayEffects,
} from './characterBonuses';

vi.mock('../data/characters', () => ({
  characterById: (id: string) => ({ id, unlockCost: 100 }),
  characters: [
    { id: 'adam', period: 1 },
    { id: 'noah', period: 1 },
    { id: 'abel', period: 1 },
    { id: 'abraham', period: 2 },
    { id: 'isaac', period: 2 },
    { id: 'jacob', period: 2 },
    { id: 'new-character', period: 8 },
  ],
}));

const makeProgress = () =>
  ({
    characterShards: {},
    activeCharacters: [],
    targetCharacter: 'adam',
  }) as unknown as UserProgress;

const unlock = (progress: UserProgress, id: string) => {
  progress.characterShards[id] = 100;
};

describe('Hero gameplay effects', () => {
  it('assigns a gameplay mechanic to every character, including period defaults', () => {
    expect(Object.keys(characterSpecialties)).toHaveLength(7);
    expect(characterSpecialties['new-character']!.mechanic).toBe('guidedHint');
  });

  it('only activates owned and equipped Heroes', () => {
    const progress = makeProgress();
    progress.activeCharacters = ['adam'];
    expect(heroGameplayEffects(progress).guidedHints).toBe(0);
    unlock(progress, 'adam');
    expect(heroGameplayEffects(progress).guidedHints).toBe(1);
  });

  it('combines different mechanics without stacking duplicate charges', () => {
    const progress = makeProgress();
    for (const id of ['adam', 'noah', 'abel']) unlock(progress, id);
    progress.activeCharacters = ['adam', 'adam', 'noah', 'abel'];
    expect(heroGameplayEffects(progress)).toMatchObject({
      guidedHints: 1,
      mistakeShields: 1,
      comboGuards: 1,
    });
  });

  it('requires an equipped member before a completed set synergy applies', () => {
    const progress = makeProgress();
    for (const id of ['abraham', 'isaac', 'jacob']) unlock(progress, id);
    expect(completedCharacterSets(progress).map((set) => set.id)).toContain('patriarchs');
    expect(heroGameplayEffects(progress).guidedHints).toBe(0);
    progress.activeCharacters = ['jacob'];
    expect(heroGameplayEffects(progress).guidedHints).toBe(1);
  });
});
