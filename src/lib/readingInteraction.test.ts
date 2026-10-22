import { describe, expect, it } from 'vitest';
import { isReadingInteractionCorrect } from './readingInteraction';
import type { ReadingInteractionDefinition } from '../types';

const localized = { en: 'x', sv: 'x', 'zh-Hans': 'x', 'zh-Hant': 'x' };

describe('reading interaction answers', () => {
  it('checks choose answers', () => {
    const interaction: ReadingInteractionDefinition = {
      kind: 'choose',
      prompt: localized,
      options: [{ id: 'right', label: localized }],
      correctOptionId: 'right',
      explanation: localized,
    };
    expect(isReadingInteractionCorrect(interaction, { kind: 'choose', optionId: 'right' })).toBe(
      true,
    );
    expect(isReadingInteractionCorrect(interaction, { kind: 'choose', optionId: 'wrong' })).toBe(
      false,
    );
  });

  it('checks the complete order', () => {
    const interaction: ReadingInteractionDefinition = {
      kind: 'order',
      prompt: localized,
      items: [
        { id: 'a', label: localized },
        { id: 'b', label: localized },
      ],
      correctOrder: ['a', 'b'],
      explanation: localized,
    };
    expect(isReadingInteractionCorrect(interaction, { kind: 'order', itemIds: ['a', 'b'] })).toBe(
      true,
    );
    expect(isReadingInteractionCorrect(interaction, { kind: 'order', itemIds: ['b', 'a'] })).toBe(
      false,
    );
  });

  it('checks every connected pair', () => {
    const interaction: ReadingInteractionDefinition = {
      kind: 'connect',
      prompt: localized,
      pairs: [
        { id: 'a', left: localized, right: localized },
        { id: 'b', left: localized, right: localized },
      ],
      explanation: localized,
    };
    expect(
      isReadingInteractionCorrect(interaction, {
        kind: 'connect',
        pairIds: { a: 'a', b: 'b' },
      }),
    ).toBe(true);
    expect(
      isReadingInteractionCorrect(interaction, {
        kind: 'connect',
        pairIds: { a: 'b', b: 'a' },
      }),
    ).toBe(false);
  });
});
