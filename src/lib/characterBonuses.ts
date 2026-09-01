import { characterById, characters } from '../data/characters';
import type { BiblePeriodId, CharacterId, UserProgress } from '../types';

export type CharacterRole =
  | 'Scholar'
  | 'Teacher'
  | 'Faithful'
  | 'Explorer'
  | 'Steward'
  | 'Focus'
  | 'Disciple'
  | 'Achiever'
  | 'Historian'
  | 'Perseverer';

export type HeroMechanic = 'guidedHint' | 'mistakeShield' | 'comboGuard';

export interface CharacterSpecialty {
  role: CharacterRole;
  mechanic: HeroMechanic;
  description: string;
}

export interface CharacterSetBonus {
  id: string;
  name: string;
  members: CharacterId[];
  mechanic: HeroMechanic;
  description: string;
}

export interface HeroGameplayEffects {
  guidedHints: number;
  mistakeShields: number;
  comboGuards: number;
  sources: CharacterId[];
}

const roleMechanic: Record<CharacterRole, HeroMechanic> = {
  Scholar: 'guidedHint',
  Teacher: 'guidedHint',
  Focus: 'guidedHint',
  Faithful: 'mistakeShield',
  Perseverer: 'mistakeShield',
  Steward: 'mistakeShield',
  Disciple: 'comboGuard',
  Achiever: 'comboGuard',
  Explorer: 'comboGuard',
  Historian: 'comboGuard',
};

const mechanicDescription: Record<HeroMechanic, string> = {
  guidedHint: 'Once per session, reveal a guided hint without lowering the result.',
  mistakeShield: 'Once per session, a wrong answer does not cost a heart.',
  comboGuard: 'Once per session, a wrong answer does not break the combo.',
};

const uniqueRoles: Partial<Record<CharacterId, CharacterRole>> = {
  adam: 'Focus',
  eve: 'Scholar',
  abel: 'Disciple',
  noah: 'Faithful',
  abraham: 'Scholar',
  sarah: 'Focus',
  isaac: 'Focus',
  jacob: 'Faithful',
  joseph: 'Historian',
  judah: 'Achiever',
  moses: 'Explorer',
  aaron: 'Teacher',
  miriam: 'Disciple',
  joshua: 'Perseverer',
  deborah: 'Focus',
  gideon: 'Achiever',
  ruth: 'Historian',
  david: 'Teacher',
  samuel: 'Disciple',
  hannah: 'Focus',
  solomon: 'Scholar',
  elijah: 'Perseverer',
  elisha: 'Teacher',
  josiah: 'Scholar',
  esther: 'Achiever',
  daniel: 'Teacher',
  nehemiah: 'Explorer',
  ezra: 'Scholar',
  isaiah: 'Scholar',
  jeremiah: 'Disciple',
  ezekiel: 'Teacher',
  jonah: 'Perseverer',
  mary: 'Focus',
  peter: 'Perseverer',
  martha: 'Historian',
  paul: 'Scholar',
  timothy: 'Teacher',
  lydia: 'Steward',
  barnabas: 'Faithful',
  priscilla: 'Disciple',
};

const periodRoles: Record<BiblePeriodId, CharacterRole> = {
  1: 'Scholar',
  2: 'Faithful',
  3: 'Explorer',
  4: 'Perseverer',
  5: 'Teacher',
  6: 'Scholar',
  7: 'Historian',
  8: 'Teacher',
  9: 'Disciple',
  10: 'Scholar',
};

export const characterSpecialties: Record<CharacterId, CharacterSpecialty> = Object.fromEntries(
  characters.map((character) => {
    const role = uniqueRoles[character.id] ?? periodRoles[character.period];
    const mechanic = roleMechanic[role];
    return [character.id, { role, mechanic, description: mechanicDescription[mechanic] }];
  }),
);

export const characterSetBonuses: CharacterSetBonus[] = [
  {
    id: 'patriarchs',
    name: 'Patriarchs',
    members: ['abraham', 'isaac', 'jacob'],
    mechanic: 'guidedHint',
    description: 'Set synergy: enables Guided Hint when one member is active.',
  },
  {
    id: 'exodus-leaders',
    name: 'Exodus Leaders',
    members: ['moses', 'aaron', 'joshua'],
    mechanic: 'mistakeShield',
    description: 'Set synergy: enables Mistake Shield when one member is active.',
  },
  {
    id: 'restoration',
    name: 'Restoration',
    members: ['esther', 'daniel', 'nehemiah'],
    mechanic: 'comboGuard',
    description: 'Set synergy: enables Combo Guard when one member is active.',
  },
  {
    id: 'early-church',
    name: 'Early Church',
    members: ['paul', 'barnabas', 'timothy'],
    mechanic: 'guidedHint',
    description: 'Set synergy: enables Guided Hint when one member is active.',
  },
];

const isUnlocked = (progress: UserProgress, characterId: CharacterId) => {
  const character = characterById(characterId);
  return (progress.characterShards[characterId] ?? 0) >= character.unlockCost;
};

export const completedCharacterSets = (progress: UserProgress) =>
  characterSetBonuses.filter((set) => set.members.every((id) => isUnlocked(progress, id)));

export const heroGameplayEffects = (progress: UserProgress): HeroGameplayEffects => {
  const activeIds = [...new Set(progress.activeCharacters ?? [])].filter((id) =>
    isUnlocked(progress, id),
  );
  const mechanics = new Set(
    activeIds.map((id) => characterSpecialties[id]?.mechanic).filter(Boolean),
  );
  for (const set of completedCharacterSets(progress)) {
    if (set.members.some((id) => activeIds.includes(id))) mechanics.add(set.mechanic);
  }
  return {
    guidedHints: mechanics.has('guidedHint') ? 1 : 0,
    mistakeShields: mechanics.has('mistakeShield') ? 1 : 0,
    comboGuards: mechanics.has('comboGuard') ? 1 : 0,
    sources: activeIds,
  };
};
