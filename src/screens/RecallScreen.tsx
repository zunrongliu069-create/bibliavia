import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { uiText } from '../lib/uiText';
import { useAppStore } from '../store/AppStore';
import { colors, shadow } from '../theme';
import type { Verse } from '../types';

export function RecallScreen({ verses, onStart }: { verses: Verse[]; onStart: () => void }) {
  const store = useAppStore();
  const u = (text: string) => uiText(store.uiLanguage, text);
  const hasRecall = verses.length > 0;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.page}>
      <View style={styles.icon}>
        <Ionicons name="refresh" size={28} color={colors.white} />
      </View>
      <Text style={styles.title}>{u('Recall')}</Text>
      <Text style={styles.subtitle}>
        {hasRecall
          ? u('Strengthen Scripture you have already learned.')
          : u('You are caught up for now.')}
      </Text>
      {hasRecall ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${u('Start Recall')} · ${verses.length}`}
          onPress={onStart}
          style={({ pressed }) => [styles.action, pressed && styles.pressed]}
        >
          <View>
            <Text style={styles.actionTitle}>{u('Start Recall')}</Text>
            <Text style={styles.actionMeta}>
              {verses.length} {u('ready to recall')}
            </Text>
          </View>
          <Ionicons name="arrow-forward-circle" size={29} color={colors.primary} />
        </Pressable>
      ) : (
        <Text style={styles.emptyHint}>
          {u('Learned Scripture will appear here when it is ready for Recall.')}
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  page: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  icon: {
    width: 58,
    height: 58,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    ...shadow,
  },
  title: {
    marginTop: 14,
    color: colors.ink,
    fontFamily: 'Georgia',
    fontSize: 28,
    fontWeight: '900',
  },
  subtitle: {
    maxWidth: 310,
    marginTop: 7,
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  action: {
    width: '100%',
    maxWidth: 360,
    minHeight: 72,
    marginTop: 24,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 20,
    borderWidth: 2,
    borderBottomWidth: 5,
    borderColor: '#B58C3E',
    backgroundColor: '#FFF4C7',
    ...shadow,
  },
  actionTitle: { color: colors.ink, fontSize: 16, fontWeight: '900' },
  actionMeta: { marginTop: 3, color: colors.primary, fontSize: 11, fontWeight: '800' },
  emptyHint: {
    maxWidth: 300,
    marginTop: 20,
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  pressed: { opacity: 0.78, transform: [{ scale: 0.98 }] },
});
