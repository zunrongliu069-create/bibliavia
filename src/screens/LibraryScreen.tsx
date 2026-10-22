import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BottomNavigation, Button, Card, ProgressBar } from '../components/ui';
import { getReferencedPassage, translations } from '../data/content';
import { beatTitle, pathById } from '../data/paths';
import { readingChapterForBeat } from '../data/readingChapters';
import { t } from '../lib/i18n';
import { readingNextAction } from '../lib/readingNavigation';
import { uiText } from '../lib/uiText';
import { colors, radius } from '../theme';
import type { Verse } from '../types';
import { useAppStore } from '../store/AppStore';
import { ReadingChapterScreen } from './ReadingChapterScreen';

export function LibraryScreen({
  onStart,
  initialPassage,
  onBack,
  onContinueReading,
}: {
  onStart: (verse: Verse) => void;
  initialPassage?: { label: string; verses: Verse[] } | null;
  onBack?: () => void;
  onContinueReading?: (verses: Verse[]) => void;
}) {
  const store = useAppStore();
  const u = (text: string) => uiText(store.uiLanguage, text);
  const [bibleOpen] = useState(true);
  const [showBibleText, setShowBibleText] = useState(false);
  const [bookId, setBookId] = useState<Verse['bookId']>('romans');
  const [chapter, setChapter] = useState(1);
  const [selectedVerse, setSelectedVerse] = useState(1);
  const [calm, setCalm] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [planPassage, setPlanPassage] = useState<{ label: string; verses: Verse[] } | null>(null);
  const translation = translations.find((item) => item.id === store.translationId);
  const available = store.availableVerses;
  const books = useMemo(
    () =>
      Array.from(
        new Map(
          available.map((verse) => [verse.bookId, { id: verse.bookId, name: verse.bookName }]),
        ).values(),
      ),
    [store.translationId],
  );
  const chapters = useMemo(
    () =>
      [
        ...new Set(
          available.filter((verse) => verse.bookId === bookId).map((verse) => verse.chapter),
        ),
      ].sort((a, b) => a - b),
    [store.translationId, bookId],
  );
  const chapterVerses = available
    .filter((verse) => verse.bookId === bookId && verse.chapter === chapter)
    .sort((a, b) => a.verseStart - b.verseStart);
  const passages = useMemo(
    () =>
      Array.from({ length: Math.ceil(chapterVerses.length / 6) }, (_, index) =>
        chapterVerses.slice(index * 6, index * 6 + 6),
      ),
    [chapterVerses],
  );
  const readingPassages = useMemo(
    () =>
      passages
        .map((passage) => passage.filter((verse) => verse.verseStart >= selectedVerse))
        .filter((passage) => passage.length),
    [passages, selectedVerse],
  );
  const nextChapter = chapters.find((item) => item > chapter);
  const focusedPath = store.progress.focusedPathId
    ? pathById(store.progress.focusedPathId)
    : undefined;
  const planVerse = planPassage?.verses[0];
  const planBeatId = planVerse ? `${planVerse.bookId}-${planVerse.chapter}` : undefined;
  const planBeatIndex = planBeatId
    ? (focusedPath?.beats?.findIndex((beat) => beat.id === planBeatId) ?? -1)
    : -1;
  const planBeat = planBeatIndex >= 0 ? focusedPath?.beats?.[planBeatIndex] : undefined;
  const readingChapter = planBeat ? readingChapterForBeat(planBeat.id) : undefined;
  const nextPlanBeat =
    planBeatIndex >= 0
      ? focusedPath?.beats
          ?.slice(planBeatIndex + 1)
          .find((beat) => beat.nodeKind === 'content' && beat.passage)
      : undefined;
  const planNode =
    focusedPath && planBeatId
      ? store.progress.pathStates?.[focusedPath.id]?.nodeProgress?.[planBeatId]
      : undefined;
  const hasChapterQuiz = Boolean(focusedPath?.structure === 'chapter' && planBeat);
  const planNextAction = readingNextAction({
    hasChapterQuiz,
    quizCompleted: Boolean(planNode?.chapter?.quizCompleted),
    hasNextChapter: Boolean(nextPlanBeat),
  });
  const readCount = available.filter((verse) => store.progress.readVerseIds[verse.id]).length;
  const hasEnglishRomansAudio =
    Platform.OS === 'web' &&
    store.translationId === 'webp' &&
    bookId === 'romans' &&
    chapter === 1 &&
    chapterVerses.length === 32;
  useEffect(() => {
    const first = available[0];
    if (first) {
      setBookId(first.bookId);
      setChapter(first.chapter);
      setSelectedVerse(first.verseStart);
      setShowBibleText(false);
    }
  }, [available, store.translationId]);
  useEffect(() => {
    if (initialPassage) setPlanPassage(initialPassage);
  }, [initialPassage]);
  useEffect(
    () => () => {
      if (Platform.OS === 'web') globalThis.speechSynthesis?.cancel();
    },
    [],
  );
  useEffect(() => {
    if (Platform.OS === 'web' && speaking) {
      globalThis.speechSynthesis?.cancel();
      setSpeaking(false);
    }
  }, [bookId, chapter, store.translationId]);
  const chooseBook = (nextBook: Verse['bookId']) => {
    const first = available.find((verse) => verse.bookId === nextBook);
    if (!first) return;
    setBookId(nextBook);
    setChapter(first.chapter);
    setSelectedVerse(first.verseStart);
    setShowBibleText(false);
  };
  const chooseChapter = (nextChapter: number) => {
    const first = available.find(
      (verse) => verse.bookId === bookId && verse.chapter === nextChapter,
    );
    setChapter(nextChapter);
    setSelectedVerse(first?.verseStart ?? 1);
    setShowBibleText(false);
  };
  const toggleChapterAudio = () => {
    if (Platform.OS !== 'web') return;
    const synth = globalThis.speechSynthesis;
    if (!synth || typeof SpeechSynthesisUtterance === 'undefined') return;
    if (speaking) {
      synth.cancel();
      setSpeaking(false);
      return;
    }
    synth.cancel();
    setSpeaking(true);
    chapterVerses.forEach((verse, index) => {
      const utterance = new SpeechSynthesisUtterance(`Verse ${verse.verseStart}. ${verse.text}`);
      utterance.lang = 'en-US';
      utterance.rate = 0.84;
      if (index === chapterVerses.length - 1) {
        utterance.onend = () => setSpeaking(false);
        utterance.onerror = () => setSpeaking(false);
      }
      synth.speak(utterance);
    });
  };
  if (planPassage && readingChapter && focusedPath && planBeat)
    return (
      <ReadingChapterScreen
        pathId={focusedPath.id}
        beatId={planBeat.id}
        title={beatTitle(planBeat, store.uiLanguage)}
        chapter={readingChapter}
        verses={
          planBeat.passage
            ? getReferencedPassage(store.translationId, planBeat.passage)
            : planPassage.verses
        }
        hasNextChapter={Boolean(nextPlanBeat?.passage)}
        onBackToPath={() => (onBack ? onBack() : setPlanPassage(null))}
        onNextChapter={() => {
          if (!nextPlanBeat?.passage) return onBack?.();
          const verses = getReferencedPassage(store.translationId, nextPlanBeat.passage);
          if (verses.length)
            setPlanPassage({
              label: beatTitle(nextPlanBeat, store.uiLanguage),
              verses,
            });
        }}
      />
    );
  if (planPassage)
    return (
      <ScrollView key={planPassage.label} contentContainerStyle={[styles.page, styles.planReader]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={u('Back to Path')}
          onPress={() => (onBack ? onBack() : setPlanPassage(null))}
          style={styles.readerBack}
        >
          <Ionicons name="arrow-back" size={21} color={colors.ink} />
          <Text style={styles.readerBackText}>{u('Back to Path')}</Text>
        </Pressable>
        <Text style={styles.chapterTitle}>{planPassage.label}</Text>
        <Text style={styles.subtitle}>{translation?.name}</Text>
        {!planPassage.verses.length && (
          <Card>
            <Text style={styles.subtitle}>{u('Bible text unavailable for this version.')}</Text>
          </Card>
        )}
        <View style={styles.passage}>
          {planPassage.verses.map((verse) => (
            <View key={verse.id} style={styles.readVerse}>
              <Text style={styles.verseNumber}>{verse.verseStart}</Text>
              <Text
                selectable
                style={[styles.readText, verse.languageTag.startsWith('zh') && styles.chinese]}
              >
                {verse.text}
              </Text>
            </View>
          ))}
          <View style={styles.readActions}>
            <Button
              label={
                planPassage.verses.every((verse) => store.progress.readVerseIds[verse.id])
                  ? t(store.uiLanguage, 'readComplete')
                  : t(store.uiLanguage, 'markRead')
              }
              variant={
                planPassage.verses.every((verse) => store.progress.readVerseIds[verse.id])
                  ? 'secondary'
                  : 'primary'
              }
              onPress={() => store.recordReading(planPassage.verses)}
            />
            <Button
              label={t(store.uiLanguage, 'keyVerse')}
              variant="ghost"
              onPress={() => planPassage.verses[0] && onStart(planPassage.verses[0])}
            />
          </View>
          <BottomNavigation
            backLabel={u('Back to Path')}
            continueLabel={
              planNextAction === 'next-chapter'
                ? `${u('Next Chapter')} →`
                : `${t(store.uiLanguage, 'continue')} →`
            }
            onBack={() => (onBack ? onBack() : setPlanPassage(null))}
            onContinue={() => {
              if (planNextAction === 'quiz') {
                store.recordReading(planPassage.verses);
                onContinueReading?.(planPassage.verses);
                return;
              }
              if (planNextAction === 'next-chapter' && nextPlanBeat?.passage) {
                const verses = getReferencedPassage(store.translationId, nextPlanBeat.passage);
                if (verses.length)
                  setPlanPassage({
                    label: beatTitle(nextPlanBeat, store.uiLanguage),
                    verses,
                  });
                return;
              }
              onBack?.();
            }}
          />
        </View>
      </ScrollView>
    );
  return (
    <ScrollView contentContainerStyle={[styles.page, calm && styles.calmPage]}>
      {onBack && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={u('Back to Path')}
          onPress={onBack}
          style={styles.readerBack}
        >
          <Ionicons name="arrow-back" size={21} color={colors.ink} />
          <Text style={styles.readerBackText}>{u('Back to Path')}</Text>
        </Pressable>
      )}
      <View
        style={[
          styles.header,
          !calm && {
            backgroundColor: '#35205D',
            borderWidth: 2,
            borderBottomWidth: 5,
            borderColor: '#D0A64D',
            borderRadius: 28,
            padding: 17,
          },
        ]}
      >
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, !calm && { color: colors.white }]}>
            {translation?.name ?? u('Bible')}
          </Text>
          <Text style={[styles.subtitle, !calm && { color: '#D8CFEB' }]}>
            {available.length} verified verses · {t(store.uiLanguage, 'readingProgress')}{' '}
            {readCount}/{available.length}
          </Text>
        </View>
        <Pressable
          accessibilityRole="switch"
          accessibilityLabel={t(store.uiLanguage, 'calmMode')}
          accessibilityState={{ checked: calm }}
          onPress={() =>
            setCalm((old) => {
              return !old;
            })
          }
          style={[styles.calm, calm && styles.calmActive]}
        >
          <Ionicons name="leaf" size={18} color={calm ? colors.white : colors.mint} />
          <Text style={[styles.calmText, calm && { color: colors.white }]}>
            {t(store.uiLanguage, 'calmMode')}
          </Text>
        </Pressable>
      </View>
      {!calm && (
        <>
          <ProgressBar
            value={available.length ? readCount / available.length : 0}
            color={colors.mint}
          />
        </>
      )}
      {bibleOpen && (
        <View style={styles.bibleNavigator}>
          <View style={styles.selectorHeader}>
            <Ionicons name="book-outline" size={20} color={colors.primary} />
            <Text style={styles.selectorTitle}>{t(store.uiLanguage, 'choosePassage')}</Text>
          </View>
          <View style={styles.selectorGroup}>
            <View style={styles.selectorLabelRow}>
              <Text style={styles.stepBadge}>1</Text>
              <Text style={styles.selectorLabel}>{t(store.uiLanguage, 'chooseBook')}</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.selectorOptions}
            >
              {books.map((book) => (
                <Pressable
                  key={book.id}
                  accessibilityRole="button"
                  accessibilityLabel={book.name}
                  accessibilityState={{ selected: bookId === book.id }}
                  onPress={() => chooseBook(book.id)}
                  style={[styles.bookOption, bookId === book.id && styles.optionActive]}
                >
                  <Text
                    style={[styles.bookOptionText, bookId === book.id && styles.optionTextActive]}
                  >
                    {book.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
          <View style={styles.selectorGroup}>
            <View style={styles.selectorLabelRow}>
              <Text style={styles.stepBadge}>2</Text>
              <Text style={styles.selectorLabel}>{t(store.uiLanguage, 'chooseChapter')}</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.selectorOptions}
            >
              {chapters.map((item) => (
                <Pressable
                  key={item}
                  accessibilityRole="button"
                  accessibilityLabel={`${t(store.uiLanguage, 'chapterWord')} ${item}`}
                  accessibilityState={{ selected: chapter === item }}
                  onPress={() => chooseChapter(item)}
                  style={[styles.numberOption, chapter === item && styles.optionActive]}
                >
                  <Text
                    style={[styles.numberOptionText, chapter === item && styles.optionTextActive]}
                  >
                    {item}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
          <View style={styles.selectorGroup}>
            <View style={styles.selectorLabelRow}>
              <Text style={styles.stepBadge}>3</Text>
              <Text style={styles.selectorLabel}>{t(store.uiLanguage, 'chooseVerse')}</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.selectorOptions}
            >
              {chapterVerses.map((verse) => (
                <Pressable
                  key={verse.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${t(store.uiLanguage, 'verseWord')} ${verse.verseStart}`}
                  accessibilityState={{ selected: selectedVerse === verse.verseStart }}
                  onPress={() => {
                    setSelectedVerse(verse.verseStart);
                    setShowBibleText(false);
                  }}
                  style={[
                    styles.numberOption,
                    selectedVerse === verse.verseStart && styles.verseOptionActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.numberOptionText,
                      selectedVerse === verse.verseStart && styles.optionTextActive,
                    ]}
                  >
                    {verse.verseStart}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
          <Button
            label={`${t(store.uiLanguage, 'openPassage')} · ${chapterVerses[0]?.bookName ?? ''} ${chapter}:${selectedVerse}`}
            onPress={() => setShowBibleText(true)}
          />
        </View>
      )}
      {showBibleText && (
        <>
          <View style={styles.chapterHeading}>
            <Text style={styles.chapterTitle}>
              {chapterVerses[0]?.bookName ?? u('Romans')} {chapter}
            </Text>
            {hasEnglishRomansAudio && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t(
                  store.uiLanguage,
                  speaking ? 'stopAudio' : 'playChapterAudio',
                )}
                accessibilityState={{ busy: speaking }}
                onPress={toggleChapterAudio}
                style={[styles.audioButton, speaking && styles.audioButtonActive]}
              >
                <Ionicons
                  name={speaking ? 'stop' : 'volume-high'}
                  size={17}
                  color={speaking ? colors.white : colors.primary}
                />
                <Text style={[styles.audioButtonText, speaking && { color: colors.white }]}>
                  {t(store.uiLanguage, speaking ? 'stopAudio' : 'playChapterAudio')}
                </Text>
              </Pressable>
            )}
          </View>
          {readingPassages.map((passage, index) => {
            const read = passage.every((verse) => store.progress.readVerseIds[verse.id]);
            return (
              <View
                key={`${bookId}-${chapter}-${index}`}
                style={[styles.passage, calm && styles.passageCalm]}
              >
                <Text style={styles.passageLabel}>
                  {t(store.uiLanguage, 'passage')} {index + 1} · {passage[0]?.verseStart}–
                  {passage.at(-1)?.verseEnd}
                </Text>
                {passage.map((verse) => (
                  <View
                    key={verse.id}
                    style={[
                      styles.readVerse,
                      verse.verseStart === selectedVerse && styles.selectedReadVerse,
                    ]}
                  >
                    <Text style={styles.verseNumber}>{verse.verseStart}</Text>
                    <Text
                      selectable
                      style={[
                        styles.readText,
                        verse.languageTag.startsWith('zh') && styles.chinese,
                      ]}
                    >
                      {verse.text}
                    </Text>
                  </View>
                ))}
                {!calm && (
                  <View style={styles.readActions}>
                    <Button
                      label={
                        read ? t(store.uiLanguage, 'readComplete') : t(store.uiLanguage, 'markRead')
                      }
                      variant={read ? 'secondary' : 'primary'}
                      onPress={() => store.recordReading(passage)}
                    />
                    <Button
                      label={t(store.uiLanguage, 'keyVerse')}
                      variant="ghost"
                      onPress={() => passage[0] && onStart(passage[0])}
                    />
                  </View>
                )}
              </View>
            );
          })}
        </>
      )}
      {!available.length && (
        <Card>
          <Text style={styles.empty}>{u('Bible text unavailable for this version.')}</Text>
        </Card>
      )}
      {showBibleText && chapterVerses.length > 0 && (
        <BottomNavigation
          backLabel={u('Back')}
          continueLabel={nextChapter ? `${u('Next Chapter')} →` : u('Complete')}
          onBack={() => setShowBibleText(false)}
          onContinue={() => {
            store.recordReading(chapterVerses);
            if (nextChapter) {
              chooseChapter(nextChapter);
              setShowBibleText(true);
            } else setShowBibleText(false);
          }}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 20, gap: 14 },
  planReader: { maxWidth: 720, width: '100%', alignSelf: 'center' },
  readerBack: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8 },
  readerBackText: { fontWeight: '900', color: colors.ink },
  calmPage: { backgroundColor: '#FAF8F1' },
  header: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  title: { fontSize: 30, fontWeight: '900', color: colors.ink },
  subtitle: { color: colors.muted, marginTop: 4, fontSize: 12 },
  calm: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    padding: 10,
    borderRadius: radius.md,
    backgroundColor: colors.mintSoft,
  },
  calmActive: { backgroundColor: colors.mint },
  calmText: { fontSize: 10, fontWeight: '900', color: colors.mint },
  switcher: { flexDirection: 'row', gap: 8 },
  switch: {
    flex: 1,
    minHeight: 48,
    flexDirection: 'row',
    gap: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
  },
  switchActive: { backgroundColor: colors.primary },
  switchText: { fontWeight: '900', color: colors.primary },
  switchTextActive: { color: colors.white },
  bibleNavigator: {
    gap: 14,
    padding: 16,
    borderRadius: radius.lg,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderBottomWidth: 5,
    borderColor: colors.line,
  },
  selectorHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  selectorTitle: { fontSize: 18, fontWeight: '900', color: colors.ink },
  selectorGroup: { gap: 8 },
  selectorLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepBadge: {
    width: 24,
    height: 24,
    lineHeight: 24,
    textAlign: 'center',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.primary,
    color: colors.white,
    fontSize: 11,
    fontWeight: '900',
  },
  selectorLabel: {
    fontSize: 12,
    fontWeight: '900',
    color: colors.inkSoft,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  selectorOptions: { gap: 8, paddingRight: 4 },
  bookOption: {
    minHeight: 42,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.line,
  },
  bookOptionText: { fontSize: 13, fontWeight: '900', color: colors.inkSoft },
  numberOption: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.line,
  },
  numberOptionText: { fontSize: 13, fontWeight: '900', color: colors.muted },
  optionActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  verseOptionActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  optionTextActive: { color: colors.white },
  chapters: { gap: 7, paddingVertical: 2 },
  chapter: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
  },
  chapterActive: { backgroundColor: colors.ink },
  chapterText: { fontWeight: '900', color: colors.muted },
  chapterTextActive: { color: colors.white },
  chapterHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  chapterTitle: { fontSize: 26, fontWeight: '900', color: colors.ink, marginTop: 4 },
  audioButton: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  audioButtonActive: { backgroundColor: colors.primary },
  audioButtonText: { fontSize: 11, fontWeight: '900', color: colors.primary },
  passage: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 18,
    gap: 13,
  },
  passageCalm: { borderWidth: 0, backgroundColor: 'transparent', paddingHorizontal: 8 },
  passageLabel: { fontSize: 11, fontWeight: '900', letterSpacing: 1, color: colors.primary },
  readVerse: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  selectedReadVerse: {
    padding: 8,
    marginHorizontal: -8,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
  },
  verseNumber: {
    fontSize: 11,
    fontWeight: '900',
    color: colors.primary,
    marginTop: 5,
    width: 20,
    textAlign: 'right',
  },
  readText: { flex: 1, fontSize: 18, lineHeight: 30, color: colors.inkSoft },
  chinese: { lineHeight: 34 },
  readActions: { gap: 8, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 14 },
  verseCard: { gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  reference: { fontSize: 17, fontWeight: '900', color: colors.ink },
  text: { fontSize: 13, lineHeight: 19, color: colors.muted, marginTop: 5 },
  strength: { flexDirection: 'row', justifyContent: 'space-between' },
  stage: { fontSize: 11, fontWeight: '900', color: colors.primary, textTransform: 'uppercase' },
  percent: { fontSize: 12, fontWeight: '800', color: colors.muted },
  dual: { flexDirection: 'row', justifyContent: 'space-between' },
  dualText: { fontSize: 10, fontWeight: '700', color: colors.muted },
  empty: { textAlign: 'center', color: colors.muted, lineHeight: 21 },
});
