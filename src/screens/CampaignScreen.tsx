import { Ionicons } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { chestImageForTier } from '../data/chests';
import { curricula } from '../data/curriculum';
import { shadow } from '../theme';
import type { CampaignId, Verse } from '../types';
import { useAppStore } from '../store/AppStore';

const nodePositions = [
  { top: '27%', left: '53%' },
  { top: '36%', left: '42%' },
  { top: '46%', left: '51%' },
  { top: '56%', left: '40%' },
  { top: '65%', left: '49%' },
] as const;

export function CampaignScreen({ onStart }: { onStart: (verse: Verse) => void }) {
  const store = useAppStore();
  const [showSkip, setShowSkip] = useState(false);
  const [showReward, setShowReward] = useState<'chest' | 'character' | null>(null);
  const mapChestSpin = useRef(new Animated.Value(0)).current;
  const current = curricula.find((item) => item.id === store.progress.activeCampaign)!;
  const campaignVerses = store.availableVerses.filter((verse) => verse.bookId === current.id);
  const availableChapters = current.chapters.filter((chapter) =>
    campaignVerses.some((verse) => verse.chapter === chapter.chapter),
  );
  const storedChapter = store.progress.pathChapter[current.id] ?? 1;
  const activeChapter =
    availableChapters.find((chapter) => chapter.chapter === storedChapter) ?? availableChapters[0];
  const chapterVerses = campaignVerses.filter((verse) => verse.chapter === activeChapter?.chapter);
  const nextVerse =
    chapterVerses.find(
      (verse) => (store.progress.mastery[verse.id]?.successfulRecalls ?? 0) === 0,
    ) ??
    chapterVerses[0] ??
    campaignVerses[0];
  const nextIndex = Math.max(
    0,
    chapterVerses.findIndex((verse) => verse.id === nextVerse?.id),
  );
  const pathWindowStart = Math.max(0, Math.min(nextIndex - 1, chapterVerses.length - 5));
  const pathVerses = chapterVerses.slice(pathWindowStart, pathWindowStart + 5);
  const completed = chapterVerses.filter(
    (verse) => (store.progress.mastery[verse.id]?.successfulRecalls ?? 0) > 0,
  ).length;
  const progress = chapterVerses.length ? completed / chapterVerses.length : 0;
  const displayBook = nextVerse?.bookName ?? current.title;
  const displayChapter = activeChapter?.chapter ?? 1;
  const selectableCurricula = curricula.filter((item) =>
    store.availableVerses.some((verse) => verse.bookId === item.id),
  );
  const selectChapter = (chapter: number) => {
    store.setPathChapter(current.id, chapter);
    setShowSkip(false);
  };
  const spinMapChest = () => {
    mapChestSpin.stopAnimation();
    mapChestSpin.setValue(0);
    Animated.timing(mapChestSpin, {
      toValue: 1,
      duration: 520,
      easing: Easing.out(Easing.back(1.35)),
      useNativeDriver: true,
    }).start();
    setShowReward(showReward === 'chest' ? null : 'chest');
  };
  const mapChestStyle = {
    transform: [
      { perspective: 700 },
      {
        rotateY: mapChestSpin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }),
      },
      { scale: mapChestSpin.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.1, 1] }) },
    ],
  };

  return (
    <View style={styles.screen}>
      <View style={styles.world}>
        <View style={styles.chapterBanner}>
          <Text style={styles.chapterTitle}>
            {displayBook} {displayChapter}
          </Text>
          <Text style={styles.chapterSubtitle}>{activeChapter?.theme ?? 'The journey begins'}</Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.max(6, progress * 100)}%` }]} />
          </View>
          <Text style={styles.progressText}>
            {completed}/{chapterVerses.length} lessons mastered
          </Text>
        </View>

        {selectableCurricula.length > 1 && (
          <View style={styles.bookSwitch}>
            {selectableCurricula.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => store.setCampaign(item.id as CampaignId)}
                style={[styles.bookPill, item.id === current.id && styles.bookPillActive]}
              >
                <Text
                  style={[styles.bookPillText, item.id === current.id && styles.bookPillTextActive]}
                >
                  {item.title}
                </Text>
              </Pressable>
            ))}
          </View>
        )}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Chest milestone"
          onPress={spinMapChest}
          style={styles.chestHotspot}
        >
          <Animated.Image
            source={chestImageForTier(2)}
            style={[styles.mapChestImage, mapChestStyle]}
          />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Locked character card"
          onPress={() => setShowReward(showReward === 'character' ? null : 'character')}
          style={styles.characterHotspot}
        />
        {showReward === 'chest' && (
          <View style={[styles.rewardBubble, styles.chestBubble]}>
            <Text style={styles.rewardEyebrow}>UPGRADE CHEST</Text>
            <Text style={styles.rewardText}>
              Finish this chapter, then tap the chest three times for a chance to upgrade it.
            </Text>
          </View>
        )}
        {showReward === 'character' && (
          <View style={[styles.rewardBubble, styles.characterBubble]}>
            <Text style={styles.rewardEyebrow}>LOCKED CHARACTER</Text>
            <Text style={styles.rewardText}>
              Collect shards and complete reading quests to unlock this card.
            </Text>
          </View>
        )}

        <View style={styles.nodes} pointerEvents="box-none">
          {pathVerses.map((verse, index) => {
            const done = (store.progress.mastery[verse.id]?.successfulRecalls ?? 0) > 0;
            const isNext = verse.id === nextVerse?.id;
            return (
              <Pressable
                key={verse.id}
                accessibilityRole="button"
                accessibilityLabel={`Start lesson ${verse.reference}`}
                onPress={() => onStart(verse)}
                style={({ pressed }) => [
                  styles.node,
                  {
                    top: nodePositions[index]?.top ?? '50%',
                    left: nodePositions[index]?.left ?? '50%',
                  },
                  done && styles.nodeDone,
                  isNext && styles.nodeCurrent,
                  pressed && styles.nodePressed,
                ]}
              >
                {done ? (
                  <Ionicons name="checkmark" size={20} color="#173B31" />
                ) : isNext ? (
                  <Ionicons name="play" size={19} color="#2A1455" />
                ) : (
                  <Text style={styles.nodeText}>{verse.verseStart}</Text>
                )}
                <Text style={[styles.nodeCaption, (done || isNext) && styles.nodeCaptionDark]}>
                  {isNext ? 'NEXT' : done ? 'DONE' : `V${verse.verseStart}`}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Skip ahead challenge"
          onPress={() => setShowSkip(true)}
          style={({ pressed }) => [styles.skipButton, pressed && styles.pressed]}
        >
          <Ionicons name="play-skip-forward" size={18} color="#F8DA78" />
          <Text style={styles.skipText}>Skip ahead</Text>
        </Pressable>

        {nextVerse && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Start lesson ${nextVerse.reference}`}
            onPress={() => onStart(nextVerse)}
            style={({ pressed }) => [styles.nextLesson, pressed && styles.pressed]}
          >
            <Text style={styles.nextEyebrow}>NEXT LESSON</Text>
            <Text style={styles.nextReference}>{nextVerse.reference}</Text>
            <Text numberOfLines={2} style={styles.nextPreview}>
              {nextVerse.text}
            </Text>
            <View style={styles.startRow}>
              <Ionicons name="book" size={19} color="#2A1455" />
              <Text style={styles.startText}>START ADVENTURE</Text>
              <Ionicons name="chevron-forward" size={19} color="#2A1455" />
            </View>
          </Pressable>
        )}

        {showSkip && (
          <View style={styles.skipPanel}>
            <View style={styles.skipHeader}>
              <View>
                <Text style={styles.skipEyebrow}>SKIP CHALLENGE</Text>
                <Text style={styles.skipTitle}>Choose a chapter</Text>
              </View>
              <Pressable accessibilityLabel="Close" onPress={() => setShowSkip(false)}>
                <Ionicons name="close-circle" size={29} color="#F8DA78" />
              </Pressable>
            </View>
            <Text style={styles.skipNote}>
              Jump ahead and prove your recall. You can always return to earlier lessons.
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chapterRow}
            >
              {availableChapters.map((chapter) => (
                <Pressable
                  key={chapter.chapter}
                  onPress={() => selectChapter(chapter.chapter)}
                  style={[
                    styles.chapterPick,
                    chapter.chapter === displayChapter && styles.chapterPickActive,
                  ]}
                >
                  <Text style={styles.chapterPickText}>{chapter.chapter}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  world: { flex: 1, overflow: 'hidden' },
  chapterBanner: {
    position: 'absolute',
    top: 10,
    left: 24,
    right: 24,
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 10,
    backgroundColor: 'rgba(69,34,119,.94)',
    borderWidth: 2,
    borderBottomWidth: 5,
    borderColor: '#E4B951',
    borderRadius: 20,
    ...shadow,
  },
  chapterTitle: {
    fontSize: 27,
    lineHeight: 30,
    fontWeight: '900',
    color: '#FFF',
    textShadowColor: '#241039',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 2,
  },
  chapterSubtitle: { fontSize: 11, fontWeight: '800', color: '#F8DA78', marginTop: 2 },
  progressTrack: {
    width: '78%',
    height: 7,
    borderRadius: 99,
    backgroundColor: '#241339',
    marginTop: 7,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: '#9F65FF', borderRadius: 99 },
  progressText: { fontSize: 9, fontWeight: '800', color: '#EEE5FF', marginTop: 4 },
  bookSwitch: {
    position: 'absolute',
    top: 117,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 7,
  },
  bookPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: 'rgba(16,19,45,.9)',
    borderRadius: 99,
    borderWidth: 1.5,
    borderBottomWidth: 3,
    borderColor: '#756C92',
  },
  bookPillActive: { backgroundColor: '#6F45D8', borderColor: '#F0C55A' },
  bookPillText: { fontSize: 9, fontWeight: '900', color: '#D8D2E8' },
  bookPillTextActive: { color: '#FFF' },
  chestHotspot: {
    position: 'absolute',
    left: 0,
    top: '34%',
    width: '31%',
    height: '23%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapChestImage: { width: 105, height: 94, resizeMode: 'contain' },
  characterHotspot: { position: 'absolute', right: 0, top: '30%', width: '30%', height: '28%' },
  rewardBubble: {
    position: 'absolute',
    zIndex: 8,
    width: 178,
    padding: 12,
    backgroundColor: 'rgba(20,13,39,.96)',
    borderWidth: 2,
    borderColor: '#E6B956',
    borderRadius: 14,
    ...shadow,
  },
  chestBubble: { left: 12, top: '51%' },
  characterBubble: { right: 12, top: '48%' },
  rewardEyebrow: { fontSize: 9, fontWeight: '900', letterSpacing: 1, color: '#F8DA78' },
  rewardText: { fontSize: 11, lineHeight: 15, fontWeight: '700', color: '#FFF', marginTop: 4 },
  nodes: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 6 },
  node: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2B204A',
    borderWidth: 3,
    borderColor: '#8B72AD',
    borderBottomWidth: 6,
    ...shadow,
  },
  nodeDone: { backgroundColor: '#60C9A5', borderColor: '#D9FFF1' },
  nodeCurrent: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#F2C85E',
    borderColor: '#FFF2B8',
  },
  nodePressed: { transform: [{ scale: 0.94 }] },
  nodeText: { fontSize: 17, fontWeight: '900', color: '#FFF' },
  nodeCaption: {
    position: 'absolute',
    bottom: -18,
    minWidth: 44,
    textAlign: 'center',
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 0.6,
    color: '#FFF',
    backgroundColor: 'rgba(26,17,47,.92)',
    borderRadius: 99,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  nodeCaptionDark: { color: '#2A1455', backgroundColor: '#FFF5C7' },
  skipButton: {
    position: 'absolute',
    right: 12,
    bottom: 207,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: 'rgba(44,24,74,.95)',
    borderWidth: 1.5,
    borderColor: '#E2B650',
    borderRadius: 11,
    ...shadow,
  },
  skipText: { fontSize: 11, fontWeight: '900', color: '#FFF' },
  pressed: { transform: [{ scale: 0.97 }], opacity: 0.92 },
  nextLesson: {
    position: 'absolute',
    left: 22,
    right: 22,
    bottom: 18,
    alignItems: 'center',
    padding: 13,
    backgroundColor: 'rgba(86,39,151,.96)',
    borderWidth: 3,
    borderColor: '#F2C85E',
    borderRadius: 22,
    ...shadow,
  },
  nextEyebrow: { fontSize: 10, fontWeight: '900', letterSpacing: 1.2, color: '#F8DA78' },
  nextReference: { fontSize: 25, lineHeight: 29, fontWeight: '900', color: '#FFF', marginTop: 2 },
  nextPreview: {
    fontSize: 11,
    lineHeight: 15,
    textAlign: 'center',
    fontWeight: '700',
    color: '#EEE7FF',
    maxWidth: 300,
    marginTop: 2,
  },
  startRow: {
    height: 35,
    alignSelf: 'stretch',
    marginTop: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F2C85E',
    borderRadius: 11,
  },
  startText: { fontSize: 11, fontWeight: '900', color: '#2A1455' },
  skipPanel: {
    position: 'absolute',
    zIndex: 20,
    left: 12,
    right: 12,
    bottom: 16,
    padding: 16,
    backgroundColor: 'rgba(25,16,48,.98)',
    borderWidth: 2,
    borderColor: '#E6B956',
    borderRadius: 20,
    ...shadow,
  },
  skipHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  skipEyebrow: { fontSize: 9, fontWeight: '900', letterSpacing: 1, color: '#F8DA78' },
  skipTitle: { fontSize: 21, fontWeight: '900', color: '#FFF', marginTop: 2 },
  skipNote: { fontSize: 11, lineHeight: 16, color: '#D8D2E8', marginTop: 7 },
  chapterRow: { gap: 8, paddingTop: 12, paddingBottom: 2 },
  chapterPick: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#342252',
    borderWidth: 1.5,
    borderColor: '#705697',
  },
  chapterPickActive: { backgroundColor: '#7348D7', borderColor: '#F0C55A' },
  chapterPickText: { fontWeight: '900', color: '#FFF' },
});
