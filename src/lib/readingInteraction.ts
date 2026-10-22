import type { ReadingInteractionDefinition } from '../types';

export type ReadingInteractionResponse =
  | { kind: 'choose'; optionId: string }
  | { kind: 'order'; itemIds: string[] }
  | { kind: 'connect'; pairIds: Record<string, string> };

export const isReadingInteractionCorrect = (
  interaction: ReadingInteractionDefinition,
  response: ReadingInteractionResponse,
): boolean => {
  if (interaction.kind !== response.kind) return false;
  if (interaction.kind === 'choose' && response.kind === 'choose')
    return response.optionId === interaction.correctOptionId;
  if (interaction.kind === 'order' && response.kind === 'order')
    return (
      response.itemIds.length === interaction.correctOrder.length &&
      response.itemIds.every((id, index) => id === interaction.correctOrder[index])
    );
  if (interaction.kind === 'connect' && response.kind === 'connect')
    return interaction.pairs.every((pair) => response.pairIds[pair.id] === pair.id);
  return false;
};
