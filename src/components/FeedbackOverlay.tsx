import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { feedbackPresentation } from '../lib/feedback';
import { useAppStore } from '../store/AppStore';
import { colors, radius, shadow } from '../theme';
import type { FeedbackEventType } from '../types';

const feedbackSounds: Record<FeedbackEventType, number> = {
  ACTIVITY_CORRECT: require('../../assets/audio/correct.wav'),
  ACTIVITY_WRONG: require('../../assets/audio/wrong.wav'),
  ACTIVITY_PARTIAL: require('../../assets/audio/partial.wav'),
  PATH_PROGRESS: require('../../assets/audio/progress.wav'),
  BEAT_COMPLETED: require('../../assets/audio/beat-complete.wav'),
  PATH_COMPLETED: require('../../assets/audio/path-complete.wav'),
  MAJOR_UNLOCK: require('../../assets/audio/path-complete.wav'),
  FRAGMENT_REVEALED: require('../../assets/audio/fragment.wav'),
};

function playHaptic(type: FeedbackEventType): void {
  if (type === 'ACTIVITY_CORRECT') {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } else if (type === 'ACTIVITY_WRONG') {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  } else if (type === 'ACTIVITY_PARTIAL') {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  } else {
    const style =
      type === 'PATH_PROGRESS'
        ? Haptics.ImpactFeedbackStyle.Light
        : type === 'BEAT_COMPLETED'
          ? Haptics.ImpactFeedbackStyle.Medium
          : Haptics.ImpactFeedbackStyle.Heavy;
    void Haptics.impactAsync(style);
  }
}

export function FeedbackOverlay() {
  const store = useAppStore();
  const event = store.feedbackEvent;
  const animation = useRef(new Animated.Value(0)).current;
  const effectPlayer = useAudioPlayer();
  const ambientPlayer = useAudioPlayer(require('../../assets/audio/ambient.wav'));
  const veteranCompletions = Object.values(store.progress.pathStates ?? {}).reduce(
    (sum, path) => sum + path.completedBeatIds.length,
    0,
  );
  const presentation = useMemo(
    () => (event ? feedbackPresentation(event, store.feedbackSettings, veteranCompletions) : null),
    [event, store.feedbackSettings, veteranCompletions],
  );

  useEffect(() => {
    ambientPlayer.loop = true;
    ambientPlayer.volume = 0.08;
    if (store.feedbackSettings.ambientMusic) ambientPlayer.play();
    else ambientPlayer.pause();
  }, [ambientPlayer, store.feedbackSettings.ambientMusic]);

  useLayoutEffect(() => {
    if (!event || !presentation) return;
    animation.setValue(0);
    if (store.feedbackSettings.soundEffects) {
      effectPlayer.replace(feedbackSounds[event.type]);
      effectPlayer.volume = Math.min(1, Math.max(0.15, presentation.intensity));
      effectPlayer.playbackRate = presentation.playbackRate;
      effectPlayer.play();
    }
    if (store.feedbackSettings.haptics) playHaptic(event.type);
    Animated.timing(animation, {
      toValue: 1,
      duration: presentation.durationMs,
      useNativeDriver: true,
    }).start();
    const timer = setTimeout(store.dismissFeedback, Math.max(700, presentation.durationMs + 450));
    return () => clearTimeout(timer);
  }, [animation, effectPlayer, event, presentation, store.dismissFeedback, store.feedbackSettings]);

  if (!event || !presentation) return null;
  const major = event.tier >= 2;
  const translateY = store.feedbackSettings.reduceMotion
    ? 0
    : animation.interpolate({ inputRange: [0, 1], outputRange: [major ? 18 : -12, 0] });
  const progressWidth = `${Math.max(20, 100 - (event.diminishingLevel ?? 0) * 32)}%` as const;
  return (
    <View pointerEvents="box-none" style={styles.layer}>
      <Pressable
        accessibilityRole={major ? 'button' : undefined}
        accessibilityLabel={`${event.message}${major ? '. Tap to skip animation.' : ''}`}
        onPress={major ? store.dismissFeedback : undefined}
        pointerEvents={major ? 'auto' : 'none'}
        style={[styles.position, major && styles.majorPosition]}
      >
        <Animated.View
          accessibilityLiveRegion="assertive"
          style={[
            styles.card,
            major && styles.majorCard,
            { borderColor: presentation.color, opacity: animation, transform: [{ translateY }] },
          ]}
        >
          <View style={[styles.icon, { backgroundColor: presentation.color }]}>
            <Ionicons name={presentation.icon} size={major ? 30 : 20} color={colors.white} />
          </View>
          <View style={styles.copy}>
            <Text style={[styles.message, major && styles.majorMessage]}>{event.message}</Text>
            {event.amount !== undefined && (
              <Text style={styles.detail}>
                +{event.amount} Path progress
                {(event.diminishingLevel ?? 0) > 0 ? ' · reduced repeat reward' : ''}
              </Text>
            )}
            <View style={styles.track}>
              <View
                style={[
                  styles.progress,
                  { width: progressWidth, backgroundColor: presentation.color },
                ]}
              />
            </View>
            {major && <Text style={styles.skip}>Tap to continue</Text>}
          </View>
        </Animated.View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { position: 'absolute', inset: 0, zIndex: 50 },
  position: { position: 'absolute', top: 78, left: 14, right: 14, alignItems: 'center' },
  majorPosition: {
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    backgroundColor: 'rgba(29,18,48,0.28)',
  },
  card: {
    width: '100%',
    maxWidth: 520,
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: radius.md,
    borderWidth: 2,
    backgroundColor: '#FFF8E8',
    ...shadow,
  },
  majorCard: { maxWidth: 420, minHeight: 150, padding: 22, borderBottomWidth: 6 },
  icon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { flex: 1, gap: 5 },
  message: { color: colors.ink, fontSize: 14, fontWeight: '900' },
  majorMessage: { fontSize: 20 },
  detail: { color: colors.muted, fontSize: 11, fontWeight: '700' },
  track: { height: 5, borderRadius: 3, backgroundColor: '#DED4BE', overflow: 'hidden' },
  progress: { height: '100%', borderRadius: 3 },
  skip: { color: colors.muted, fontSize: 10, fontWeight: '800', marginTop: 5 },
});
