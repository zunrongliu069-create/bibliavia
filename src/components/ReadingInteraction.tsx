import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { isReadingInteractionCorrect } from '../lib/readingInteraction';
import { uiText } from '../lib/uiText';
import { colors, radius } from '../theme';
import type { ReadingInteractionDefinition, ReadingSessionState, UiLanguage } from '../types';
import { Button, Card } from './ui';

export function ReadingInteraction({
  interaction,
  language,
  answerState,
  onAnswer,
  onRetry,
}: {
  interaction: ReadingInteractionDefinition;
  language: UiLanguage;
  answerState: ReadingSessionState['answerState'];
  onAnswer: (correct: boolean) => void;
  onRetry: () => void;
}) {
  const [chosen, setChosen] = useState('');
  const [order, setOrder] = useState<string[]>([]);
  const [left, setLeft] = useState('');
  const [connections, setConnections] = useState<Record<string, string>>({});
  const disabled = answerState !== 'idle';
  const u = (value: string) => uiText(language, value);

  useEffect(() => {
    setChosen('');
    setOrder([]);
    setLeft('');
    setConnections({});
  }, [interaction]);

  const check = () => {
    if (interaction.kind === 'choose')
      onAnswer(isReadingInteractionCorrect(interaction, { kind: 'choose', optionId: chosen }));
    if (interaction.kind === 'order')
      onAnswer(isReadingInteractionCorrect(interaction, { kind: 'order', itemIds: order }));
    if (interaction.kind === 'connect')
      onAnswer(isReadingInteractionCorrect(interaction, { kind: 'connect', pairIds: connections }));
  };

  const reset = () => {
    setChosen('');
    setOrder([]);
    setLeft('');
    setConnections({});
    onRetry();
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.prompt}>{interaction.prompt[language]}</Text>

      {interaction.kind === 'choose' &&
        interaction.options.map((option) => (
          <Choice
            key={option.id}
            label={option.label[language]}
            selected={chosen === option.id}
            disabled={disabled}
            onPress={() => setChosen(option.id)}
          />
        ))}

      {interaction.kind === 'order' && (
        <>
          <Text style={styles.caption}>{u('Your order')}</Text>
          <View style={styles.sequence}>
            {order.map((id, index) => {
              const item = interaction.items.find((candidate) => candidate.id === id);
              return item ? (
                <Text
                  key={id}
                  style={styles.sequenceItem}
                >{`${index + 1}. ${item.label[language]}`}</Text>
              ) : null;
            })}
          </View>
          {interaction.items
            .filter((item) => !order.includes(item.id))
            .map((item) => (
              <Choice
                key={item.id}
                label={item.label[language]}
                disabled={disabled}
                onPress={() => setOrder((current) => [...current, item.id])}
              />
            ))}
          {!disabled && order.length > 0 && (
            <Button label={u('Reset')} variant="ghost" onPress={() => setOrder([])} />
          )}
        </>
      )}

      {interaction.kind === 'connect' && (
        <>
          <Text style={styles.caption}>{u('Connect each pair')}</Text>
          <View style={styles.connectGrid}>
            <View style={styles.connectColumn}>
              {interaction.pairs.map((pair) => (
                <Choice
                  key={pair.id}
                  label={pair.left[language]}
                  selected={left === pair.id}
                  disabled={disabled || Boolean(connections[pair.id])}
                  onPress={() => setLeft(pair.id)}
                />
              ))}
            </View>
            <View style={styles.connectColumn}>
              {interaction.pairs.map((pair) => (
                <Choice
                  key={pair.id}
                  label={pair.right[language]}
                  selected={Object.values(connections).includes(pair.id)}
                  disabled={disabled || !left || Object.values(connections).includes(pair.id)}
                  onPress={() => {
                    if (!left) return;
                    setConnections((current) => ({ ...current, [left]: pair.id }));
                    setLeft('');
                  }}
                />
              ))}
            </View>
          </View>
          {!disabled && Object.keys(connections).length > 0 && (
            <Button label={u('Reset')} variant="ghost" onPress={() => setConnections({})} />
          )}
        </>
      )}

      {answerState === 'idle' && (
        <Button
          label={u('Check answer')}
          disabled={
            (interaction.kind === 'choose' && !chosen) ||
            (interaction.kind === 'order' && order.length !== interaction.items.length) ||
            (interaction.kind === 'connect' &&
              Object.keys(connections).length !== interaction.pairs.length)
          }
          onPress={check}
        />
      )}

      {answerState !== 'idle' && (
        <Card style={answerState === 'correct' ? styles.correct : styles.incorrect}>
          <Text style={styles.feedbackTitle}>
            {u(answerState === 'correct' ? 'Correct' : 'Not quite')}
          </Text>
          <Text style={styles.explanation}>{interaction.explanation[language]}</Text>
          {answerState === 'incorrect' && (
            <Button label={u('Try again')} variant="secondary" onPress={reset} />
          )}
        </Card>
      )}
    </View>
  );
}

function Choice({
  label,
  selected = false,
  disabled = false,
  onPress,
}: {
  label: string;
  selected?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.choice, selected && styles.choiceSelected, disabled && styles.choiceDisabled]}
    >
      <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  prompt: { color: colors.ink, fontSize: 22, fontWeight: '800', lineHeight: 29 },
  caption: { color: colors.muted, fontSize: 13, fontWeight: '800', textTransform: 'uppercase' },
  choice: {
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 15,
  },
  choiceSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  choiceDisabled: { opacity: 0.72 },
  choiceText: { color: colors.ink, fontSize: 16, fontWeight: '700', lineHeight: 22 },
  choiceTextSelected: { color: colors.ink },
  sequence: { gap: 6 },
  sequenceItem: { color: colors.ink, fontSize: 16, fontWeight: '700' },
  connectGrid: { flexDirection: 'row', gap: 10 },
  connectColumn: { flex: 1, gap: 8 },
  correct: { borderColor: colors.mint },
  incorrect: { borderColor: colors.gold },
  feedbackTitle: { color: colors.ink, fontSize: 18, fontWeight: '900', marginBottom: 7 },
  explanation: { color: colors.muted, fontSize: 15, lineHeight: 22, marginBottom: 12 },
});
