import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ImageBackground, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { curricula } from '../data/curriculum';
import { uiText } from '../lib/uiText';
import { shadow } from '../theme';
import type { CampaignId, Verse } from '../types';
import { useAppStore } from '../store/AppStore';

const parchmentPath = require('../../assets/game/scriptora-parchment-path.png');

export function CampaignScreen({ onStart }: { onStart: (verse: Verse) => void }) {
  const store = useAppStore();
  const u = (text: string) => uiText(store.uiLanguage, text);
  const [showChapters, setShowChapters] = useState(false);
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
  const displayBook = nextVerse?.bookName ?? u(current.title);
  const displayChapter = activeChapter?.chapter ?? 1;
  const selectableCurricula = curricula.filter((item) =>
    store.availableVerses.some((verse) => verse.bookId === item.id),
  );

  const selectChapter = (chapter: number) => {
    store.setPathChapter(current.id, chapter);
    setShowChapters(false);
  };

  return (
    <View style={styles.screen}>
      <ImageBackground source={parchmentPath} resizeMode="cover" style={styles.background}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.chapterBanner}>
            <Text style={styles.illuminatedInitial}>{displayBook.charAt(0)}</Text>
            <View style={styles.chapterCopy}>
              <Text style={styles.chapterTitle}>
                {displayBook} {displayChapter}
              </Text>
              <Text style={styles.chapterSubtitle}>
                {store.uiLanguage === 'en'
                  ? (activeChapter?.theme ?? u('The journey begins'))
                  : `${u('Chapter')} ${displayChapter}`}
              </Text>
              <View style={styles.progressRow}>
                <View style={styles.progressTrack}>
                  <View
                    style={[styles.progressFill, { width: `${Math.max(5, progress * 100)}%` }]}
                  />
                </View>
                <Text style={styles.progressText}>{Math.round(progress * 100)}%</Text>
              </View>
            </View>
          </View>

          <View style={styles.controlsRow}>
            <View style={styles.bookSwitch}>
              {selectableCurricula.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => store.setCampaign(item.id as CampaignId)}
                  style={[styles.bookPill, item.id === current.id && styles.bookPillActive]}
                >
                  <Text
                    style={[
                      styles.bookPillText,
                      item.id === current.id && styles.bookPillTextActive,
                    ]}
                  >
                    {u(item.title)}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={u('Choose a chapter')}
              onPress={() => setShowChapters((value) => !value)}
              style={styles.chapterButton}
            >
              <Ionicons name="list" size={17} color="#F4D26C" />
            </Pressable>
          </View>

          {showChapters && (
            <View style={styles.chapterPanel}>
              <Text style={styles.panelTitle}>{u('Choose a chapter')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {availableChapters.map((chapter) => (
                  <Pressable
                    key={chapter.chapter}
                    accessibilityRole="button"
                    accessibilityLabel={`${u('Chapter')} ${chapter.chapter}`}
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

          <View style={styles.timeline}>
            {pathVerses.map((verse, index) => {
              const done = (store.progress.mastery[verse.id]?.successfulRecalls ?? 0) > 0;
              const isNext = verse.id === nextVerse?.id;
              return (
                <View key={verse.id} style={[styles.lessonRow, isNext && styles.currentLessonRow]}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${u('Start lesson')} ${verse.reference}`}
                    onPress={() => onStart(verse)}
                    style={({ pressed }) => [
                      styles.node,
                      done && styles.nodeDone,
                      isNext && styles.nodeCurrent,
                      pressed && styles.pressed,
                    ]}
                  >
                    {done ? (
                      <Ionicons name="checkmark" size={24} color="#23483F" />
                    ) : isNext ? (
                      <Ionicons name="book" size={22} color="#2E174F" />
                    ) : (
                      <Text style={styles.nodeNumber}>{index + pathWindowStart + 1}</Text>
                    )}
                  </Pressable>

                  <View style={[styles.lessonCopy, isNext && styles.currentLessonCard]}>
                    <Text style={styles.lessonLabel}>
                      {u(done ? 'LESSON COMPLETE' : isNext ? 'CURRENT LESSON' : 'UPCOMING')}
                    </Text>
                    <Text style={styles.lessonReference}>{verse.reference}</Text>
                    {isNext && (
                      <>
                        <Text numberOfLines={3} style={styles.lessonPreview}>
                          {verse.text}
                        </Text>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`${u('Start adventure')} ${verse.reference}`}
                          onPress={() => onStart(verse)}
                          style={({ pressed }) => [styles.startButton, pressed && styles.pressed]}
                        >
                          <Ionicons name="book" size={18} color="#2E174F" />
                          <Text style={styles.startText}>{u('START ADVENTURE')}</Text>
                          <Ionicons name="chevron-forward" size={18} color="#2E174F" />
                        </Pressable>
                      </>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F1E4C8' },
  background: { flex: 1 },
  scrollContent: { paddingTop: 16, paddingBottom: 40, minHeight: 910 },
  chapterBanner: {
    marginHorizontal: 14,
    minHeight: 116,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#C9A64D',
    backgroundColor: 'rgba(48, 25, 82, 0.96)',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    ...shadow,
  },
  illuminatedInitial: {
    width: 64,
    textAlign: 'center',
    fontFamily: 'Georgia',
    fontSize: 62,
    lineHeight: 70,
    color: '#F3D77A',
    textShadowColor: '#150A28',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 2,
  },
  chapterCopy: { flex: 1, marginLeft: 12 },
  chapterTitle: { color: '#FFF8E7', fontFamily: 'Georgia', fontSize: 24, fontWeight: '700' },
  chapterSubtitle: { color: '#D8C9E5', fontSize: 12, marginTop: 2, marginBottom: 10 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  progressTrack: {
    flex: 1,
    height: 7,
    borderRadius: 9,
    backgroundColor: '#1D1032',
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 9, backgroundColor: '#F3D77A' },
  progressText: { color: '#F3D77A', fontSize: 11, fontWeight: '800' },
  controlsRow: { marginTop: 12, marginHorizontal: 14, flexDirection: 'row', gap: 8 },
  bookSwitch: {
    flex: 1,
    flexDirection: 'row',
    borderRadius: 22,
    padding: 3,
    backgroundColor: 'rgba(255,250,236,0.94)',
    borderWidth: 1,
    borderColor: '#BFA56B',
  },
  bookPill: {
    flex: 1,
    minHeight: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    paddingHorizontal: 8,
  },
  bookPillActive: { backgroundColor: '#3A205D' },
  bookPillText: { color: '#725C46', fontSize: 12, fontWeight: '700' },
  bookPillTextActive: { color: '#FFF7E6' },
  chapterButton: {
    width: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3A205D',
    borderWidth: 1,
    borderColor: '#D0AC50',
  },
  chapterPanel: {
    marginHorizontal: 14,
    marginTop: 8,
    borderRadius: 14,
    padding: 12,
    backgroundColor: 'rgba(48,25,82,0.96)',
    ...shadow,
  },
  panelTitle: { color: '#FFF8E7', fontFamily: 'Georgia', fontWeight: '700', marginBottom: 8 },
  chapterPick: {
    width: 38,
    height: 38,
    borderRadius: 19,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#5D4177',
  },
  chapterPickActive: { backgroundColor: '#C99C37' },
  chapterPickText: { color: '#FFF8E7', fontWeight: '800' },
  timeline: { marginTop: 16, paddingBottom: 16 },
  lessonRow: {
    minHeight: 124,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: '39%',
    paddingRight: 12,
  },
  currentLessonRow: { minHeight: 224 },
  node: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E2D9EE',
    borderWidth: 3,
    borderColor: '#745A92',
    ...shadow,
  },
  nodeDone: { backgroundColor: '#A8DACB', borderColor: '#568F80' },
  nodeCurrent: {
    width: 62,
    height: 62,
    borderRadius: 31,
    marginLeft: -4,
    marginRight: -4,
    backgroundColor: '#F5D56F',
    borderColor: '#B77820',
    borderWidth: 4,
  },
  nodeNumber: { color: '#3C2658', fontFamily: 'Georgia', fontSize: 21, fontWeight: '800' },
  lessonCopy: { flex: 1, marginLeft: 12, paddingVertical: 8 },
  currentLessonCard: {
    borderRadius: 14,
    padding: 12,
    backgroundColor: 'rgba(255,250,238,0.9)',
    borderWidth: 1,
    borderColor: '#C7A65C',
    ...shadow,
  },
  lessonLabel: { color: '#8A6231', fontSize: 9, fontWeight: '900', letterSpacing: 1.1 },
  lessonReference: {
    color: '#35204E',
    fontFamily: 'Georgia',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 2,
  },
  lessonPreview: {
    color: '#554A43',
    fontFamily: 'Georgia',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 6,
  },
  startButton: {
    minHeight: 42,
    marginTop: 10,
    borderRadius: 12,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0C85D',
    borderWidth: 1,
    borderColor: '#A97223',
  },
  startText: { color: '#2E174F', fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.98 }] },
});
