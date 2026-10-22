import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { PathGameWorld } from '../components/PathGameWorld';
import { Button, ProgressBar } from '../components/ui';
import {
  bibleVersions,
  booksForVersion,
  getReferencedPassage,
  isBibleVersionEnabled,
} from '../data/content';
import { beatTitle, pathDefinitions, pathTitle } from '../data/paths';
import {
  initialJourneyPathId,
  initialJourneySurface,
  journeyHudItems,
  journeyEntryMode,
  journeySurfaceAfter,
  orderJourneyPathIds,
  pathCarouselAction,
  pathCarouselPreviewId,
  showJourneyRecall,
} from '../lib/appJourney';
import { learningSequence } from '../lib/learningSequence';
import {
  finalBossChallengeVerses,
  nextPathBeat,
  pathProgressRatio,
  pathTarget,
} from '../lib/pathProgress';
import { readingSessionProgress } from '../lib/readingFlow';
import { buildMemorizationWorldNodes, buildReadingWorldNodes } from '../lib/verticalPathWorld';
import { nextPathAction, pathResumeSummary, pathTypeLabel } from '../lib/pathGuidance';
import { t } from '../lib/i18n';
import { uiText } from '../lib/uiText';
import { useAppStore } from '../store/AppStore';
import { colors, radius, shadow } from '../theme';
import type { BiblePassageReference, PathDefinition, PathKind, Verse } from '../types';

const pathIcon = (path: PathDefinition): keyof typeof Ionicons.glyphMap =>
  path.kind === 'reading'
    ? 'book'
    : path.kind === 'memorization'
      ? 'bulb'
      : path.source === 'user'
        ? 'create'
        : 'compass';

const compactPathTitle = (path: PathDefinition, language: Parameters<typeof pathTitle>[1]) =>
  pathTitle(path, language).split('—').at(-1)?.trim() ?? pathTitle(path, language);

export function JourneyScreen({
  onBrowseBible,
  onRead,
  onMemorize,
  onChallenge,
  recallVerses,
  onRecall,
}: {
  onBrowseBible: () => void;
  onRead: (passage: { label: string; versionId: string; verses: Verse[] }) => void;
  onMemorize: (verse: Verse) => void;
  onChallenge: (
    verses: Verse[],
    kind?: 'challenge' | 'chapterQuiz',
    onSessionComplete?: (success: boolean) => void,
    successThreshold?: number,
  ) => void;
  recallVerses: Verse[];
  onRecall: (verses: Verse[]) => void;
}) {
  const store = useAppStore();
  const u = (text: string) => uiText(store.uiLanguage, text);
  const allPaths = useMemo(
    () => [...pathDefinitions, ...(store.progress.customPaths ?? [])],
    [store.progress.customPaths],
  );
  const activePaths = (store.progress.activePathIds ?? [])
    .map((id) => allPaths.find((path) => path.id === id))
    .filter((path): path is PathDefinition => Boolean(path));
  const [selectedPathId, setSelectedPathId] = useState(
    initialJourneyPathId(
      store.progress.focusedPathId,
      activePaths.map((path) => path.id),
    ),
  );
  const entryMode = journeyEntryMode(activePaths.map((path) => path.id));
  const choosingFirstPath = entryMode === 'first-path' && selectedPathId === null;
  const [pathSelectorOpen, setPathSelectorOpen] = useState(false);
  const [pathPreviewId, setPathPreviewId] = useState<string | null>(selectedPathId);
  const [journeySurface, setJourneySurface] = useState(initialJourneySurface);
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [newPathTitle, setNewPathTitle] = useState('');
  const [newVersionId, setNewVersionId] = useState(store.translationId);
  const [newBookId, setNewBookId] = useState('john');
  const [newChapter, setNewChapter] = useState(3);
  const [newVerseStart, setNewVerseStart] = useState('16');
  const [newVerseEnd, setNewVerseEnd] = useState('21');
  const [newPathKind, setNewPathKind] = useState<PathKind>('mixed');
  const [romansChapter, setRomansChapter] = useState(1);
  const selectedPath =
    allPaths.find((path) => path.id === selectedPathId) ?? activePaths[0] ?? allPaths[0]!;
  const orderedPaths = orderJourneyPathIds(
    allPaths.map((path) => path.id),
    activePaths.map((path) => path.id),
    selectedPath.id,
  )
    .map((id) => allPaths.find((path) => path.id === id))
    .filter((path): path is PathDefinition => Boolean(path));
  const selectedState = store.progress.pathStates?.[selectedPath.id];
  const nextBeat =
    nextPathBeat(selectedPath, selectedState) ??
    (!selectedState ? selectedPath.beats?.[0] : undefined);
  const ratio = pathProgressRatio(selectedPath, selectedState);
  const smartAction = nextPathAction(selectedPath, selectedState, store.uiLanguage);
  const selectedBeats = selectedPath.beats ?? [];
  const selectedActiveIndex = Math.max(
    0,
    selectedBeats.findIndex((beat) => selectedState?.activeBeatIds.includes(beat.id)),
  );
  const beatWindowStart = Math.max(0, selectedActiveIndex - 1);
  const visibleBeatCount = selectedPath.id === 'memorization-romans' ? 8 : 6;
  const visibleBeats =
    selectedPath.id === 'memorization-psalm-23'
      ? selectedBeats
      : selectedBeats.slice(beatWindowStart, beatWindowStart + visibleBeatCount);
  const completedPaths = Object.values(store.progress.pathStates ?? {}).filter(
    (path) => path.status === 'completed',
  ).length;
  const nextVerse =
    learningSequence(store.availableVerses).find(
      (verse) => !store.progress.mastery[verse.id]?.successfulRecalls,
    ) ?? store.availableVerses[0];
  const preferredVersionId = selectedPath.bibleVersionId ?? store.translationId;
  const selectedReference = nextBeat?.passage ?? nextBeat?.passages?.[0] ?? selectedPath.passage;
  const selectedVersionId = selectedReference
    ? ([
        preferredVersionId,
        ...bibleVersions
          .filter((version) => isBibleVersionEnabled(version.id))
          .map((version) => version.id),
      ].find((versionId) => getReferencedPassage(versionId, selectedReference).length > 0) ??
      preferredVersionId)
    : preferredVersionId;
  const selectedVersion = bibleVersions.find((version) => version.id === selectedVersionId);
  const versionPassage = selectedReference
    ? getReferencedPassage(selectedVersionId, selectedReference)
    : [];
  const selectedVerses =
    versionPassage.length || !selectedReference
      ? versionPassage
      : store.availableVerses.filter(
          (verse) =>
            verse.bookId === selectedReference.bookId &&
            verse.chapter >= selectedReference.startChapter &&
            verse.chapter <= selectedReference.endChapter &&
            (verse.chapter > selectedReference.startChapter ||
              verse.verseStart >= selectedReference.startVerse) &&
            (verse.chapter < selectedReference.endChapter ||
              verse.verseEnd <= selectedReference.endVerse),
        );
  const selectedPassageEnd = selectedVerses.at(-1);
  const pathActivityVerses = selectedReference ? selectedVerses : store.availableVerses;
  const previewPath = allPaths.find((path) => path.id === pathPreviewId) ?? selectedPath;
  const previewAction = pathCarouselAction(
    activePaths.map((path) => path.id),
    previewPath.id,
  );
  const romansChapterBeats = useMemo(
    () =>
      selectedPath.id === 'memorization-romans'
        ? selectedBeats.filter(
            (beat) => beat.nodeKind === 'content' && beat.passage?.startChapter === romansChapter,
          )
        : [],
    [romansChapter, selectedBeats, selectedPath.id],
  );
  const createVersions = bibleVersions.filter((version) => isBibleVersionEnabled(version.id));
  const createBooks = booksForVersion(newVersionId);
  const createBook = createBooks.find((book) => book.id === newBookId) ?? createBooks[0];
  const createChapter = createBook?.chapters.find((chapter) => chapter.number === newChapter);
  useEffect(() => {
    if (!createBooks.some((book) => book.id === newBookId) && createBooks[0]) {
      setNewBookId(createBooks[0].id);
      setNewChapter(createBooks[0].chapters[0]?.number ?? 1);
    }
  }, [createBooks, newBookId]);
  useEffect(() => {
    if (selectedPath.id === 'memorization-romans' && nextBeat?.passage)
      setRomansChapter(nextBeat.passage.startChapter);
  }, [nextBeat?.id, nextBeat?.passage, selectedPath.id]);
  const selectPath = (pathId: string) => {
    setSelectedPathId(pathId);
    store.focusPath(pathId);
  };
  const startFirstPath = (pathId: string) => {
    store.startPath(pathId);
    store.focusPath(pathId);
    setSelectedPathId(pathId);
  };

  const createCustomPath = () => {
    const title = newPathTitle.trim();
    if (!title) return;
    if (!createBook || !createChapter) return;
    const maxVerse = createChapter.verses.at(-1)?.number ?? 1;
    const first = Math.min(maxVerse, Math.max(1, Number(newVerseStart) || 1));
    const last = Math.min(maxVerse, Math.max(first, Number(newVerseEnd) || first));
    const passage: BiblePassageReference = {
      bookId: createBook.id,
      startChapter: createChapter.number,
      startVerse: first,
      endChapter: createChapter.number,
      endVerse: last,
    };
    const id = store.createPath({
      title,
      bibleVersionId: newVersionId,
      passage,
      kind: newPathKind,
    });
    setSelectedPathId(id);
    setNewPathTitle('');
    setJourneySurface(journeySurfaceAfter('path-created'));
  };
  const performSmartAction = () => {
    if (smartAction.activity === 'complete') return;
    if (nextBeat?.boss) {
      const bossVerses = finalBossChallengeVerses(
        nextBeat.boss.coverage.flatMap((reference) =>
          getReferencedPassage(selectedVersionId, reference),
        ),
      );
      onChallenge(
        bossVerses,
        'challenge',
        (success) => {
          store.recordPathActivity({
            pathId: selectedPath.id,
            beatId: nextBeat.id,
            activity: 'challenge',
            success,
            completion: { type: 'boss-challenge' },
          });
        },
        0.75,
      );
      return;
    }
    if (smartAction.activity === 'reading') {
      onRead({
        label: pathTitle(selectedPath, store.uiLanguage),
        versionId: selectedVersionId,
        verses: pathActivityVerses,
      });
    } else if (smartAction.activity === 'memorization') {
      const verse = pathActivityVerses[0] ?? nextVerse;
      if (verse) onMemorize(verse);
    } else
      onChallenge(
        selectedPath.structure === 'chapter' ? selectedVerses : pathActivityVerses.slice(0, 5),
        selectedPath.structure === 'chapter' ? 'chapterQuiz' : 'challenge',
      );
  };

  const incompleteVerseIndex = selectedVerses.findIndex((verse) => {
    const read = store.progress.readVerseIds[verse.id];
    const recalled = (store.progress.mastery[verse.id]?.successfulRecalls ?? 0) > 0;
    if (selectedPath.kind === 'reading') return !read;
    if (selectedPath.kind === 'memorization') return !recalled;
    return !read || !recalled;
  });
  const currentVerseIndex = incompleteVerseIndex >= 0 ? incompleteVerseIndex : 0;
  const currentPathVerse = selectedVerses[currentVerseIndex] ?? nextVerse;
  const followingPathVerse = selectedVerses[currentVerseIndex + 1];
  const currentNodeProgress = nextBeat ? selectedState?.nodeProgress?.[nextBeat.id] : undefined;
  const currentReadingProgress =
    nextBeat?.sections && currentNodeProgress?.chapter?.readingSession
      ? readingSessionProgress(currentNodeProgress.chapter.readingSession, {
          sectionIds: nextBeat.sections.map((section) => section.id),
          recapCount: nextBeat.reading?.recap.length ?? 0,
        })
      : 0;
  const currentRead = currentPathVerse
    ? Boolean(store.progress.readVerseIds[currentPathVerse.id])
    : false;
  const currentBeatIndex = nextBeat
    ? selectedBeats.findIndex((beat) => beat.id === nextBeat.id)
    : 0;
  const followingBeat = selectedBeats[Math.max(0, currentBeatIndex) + 1];
  const worldNodes =
    selectedPath.id === 'reading-mark'
      ? buildReadingWorldNodes({
          beats: selectedBeats,
          nodeProgress: selectedState?.nodeProgress ?? {},
          currentBeatId: nextBeat?.id,
          language: store.uiLanguage,
          minimumChapterCount: selectedState?.status === 'completed' ? selectedBeats.length : 5,
        })
      : selectedPath.structure === 'verse'
        ? buildMemorizationWorldNodes({
            beats: visibleBeats,
            nodeProgress: selectedState?.nodeProgress ?? {},
            currentBeatId: nextBeat?.id,
            language: store.uiLanguage,
          }).map((node) => ({
            ...node,
            index: selectedBeats.findIndex((beat) => beat.id === node.id),
          }))
        : visibleBeats.map((beat) => ({
            id: beat.id,
            parentId: beat.id,
            index: selectedBeats.indexOf(beat),
            regionId: beat.regionId,
            chapterNumber: beat.passage?.startChapter,
            label: beatTitle(beat, store.uiLanguage),
            kind:
              beat.nodeKind === 'boss' || beat.nodeKind === 'final-boss'
                ? ('guardian' as const)
                : ('verse' as const),
            complete:
              selectedState?.nodeProgress?.[beat.id]?.status === 'completed' ||
              (selectedState?.completedBeatIds.includes(beat.id) ?? false),
            current:
              selectedState?.nodeProgress?.[beat.id]?.status === 'current' ||
              beat.id === nextBeat?.id,
            available: selectedState?.nodeProgress?.[beat.id]?.status === 'available',
            milestone: beat.milestone,
            levels: selectedState?.nodeProgress?.[beat.id]?.levels,
          }));
  const currentWorldNode = worldNodes.find((node) => node.current);
  const showLegacyPathManager = false as boolean;
  const showLegacyRomansNavigator = false as boolean;
  const immersiveJourney = journeySurface === 'active-path' && !choosingFirstPath;
  const hudItems = journeyHudItems(store.progress);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.page, immersiveJourney && styles.immersivePage]}
      scrollEnabled={!immersiveJourney}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.journeyIntro, immersiveJourney && styles.journeyIntroOverlay]}>
        <View style={styles.journeyControls}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={u('Choose a Path')}
            accessibilityState={{ expanded: pathSelectorOpen }}
            onPress={() => {
              setPathPreviewId(selectedPath.id);
              setPathSelectorOpen((open) => !open);
            }}
            style={({ pressed }) => [styles.pathSwitcher, pressed && styles.pressed]}
          >
            <View style={styles.pathSwitcherIcon}>
              <Ionicons
                name={choosingFirstPath ? 'compass' : pathIcon(selectedPath)}
                size={18}
                color={colors.white}
              />
            </View>
            <Text numberOfLines={1} style={styles.pathSwitcherTitle}>
              {choosingFirstPath
                ? u('Choose a Path')
                : compactPathTitle(selectedPath, store.uiLanguage)}
            </Text>
            <Ionicons
              name={pathSelectorOpen ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={colors.primary}
            />
          </Pressable>
          <View accessibilityLabel={u('Game status')} style={styles.journeyHud}>
            {hudItems.map((item) => {
              const icon = item.id === 'xp' ? 'star' : item.id === 'streak' ? 'flame' : 'cash';
              const color = item.id === 'streak' ? '#FF9B32' : '#F3CB61';
              return (
                <View
                  key={item.id}
                  accessibilityLabel={`${item.id === 'xp' ? 'XP' : u(item.id === 'streak' ? 'Streak' : 'Gold')} · ${item.value}`}
                  style={styles.journeyHudItem}
                >
                  {item.id === 'xp' && <Text style={styles.journeyHudXp}>XP</Text>}
                  <Ionicons name={icon} size={13} color={color} />
                  <Text style={styles.journeyHudValue}>{item.value}</Text>
                </View>
              );
            })}
          </View>
        </View>
        {showJourneyRecall(recallVerses.length) && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${u('Recall')} · ${recallVerses.length}`}
            onPress={() => onRecall(recallVerses)}
            style={({ pressed }) => [styles.globalRecall, pressed && styles.pressed]}
          >
            <Ionicons name="refresh" size={14} color={colors.white} />
            <Text style={styles.globalRecallText}>
              {u('Recall')} · {recallVerses.length}
            </Text>
          </Pressable>
        )}
        {pathSelectorOpen && (
          <View style={styles.pathSelectorPanel}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              decelerationRate="fast"
              snapToInterval={284}
              scrollEventThrottle={16}
              onScroll={(event) => {
                const index = Math.round(event.nativeEvent.contentOffset.x / 284);
                setPathPreviewId(
                  pathCarouselPreviewId(
                    orderedPaths.map((path) => path.id),
                    index,
                  ),
                );
              }}
              contentContainerStyle={styles.pathSelectorCarousel}
            >
              {orderedPaths.map((path) => {
                const active = activePaths.some((activePath) => activePath.id === path.id);
                const previewed = path.id === previewPath.id;
                const pathState = store.progress.pathStates?.[path.id];
                return (
                  <Pressable
                    key={path.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected: previewed }}
                    onPress={() => setPathPreviewId(path.id)}
                    style={[
                      styles.pathSelectorOption,
                      styles.pathSelectorWorld,
                      previewed && styles.pathSelectorOptionSelected,
                    ]}
                  >
                    <Ionicons name={pathIcon(path)} size={22} color={colors.primary} />
                    <View style={styles.pathSelectorOptionCopy}>
                      <Text numberOfLines={2} style={styles.pathSelectorOptionTitle}>
                        {pathTitle(path, store.uiLanguage)}
                      </Text>
                      <Text style={styles.pathSelectorOptionMeta}>
                        {active ? u('Active Path') : u('Explore Path')} ·{' '}
                        {Math.round(pathProgressRatio(path, pathState) * 100)}%
                      </Text>
                    </View>
                    {active && <Ionicons name="checkmark-circle" size={20} color={colors.mint} />}
                  </Pressable>
                );
              })}
            </ScrollView>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                previewAction === 'continue' ? u('Continue Journey') : u('Begin Journey')
              }
              onPress={() => {
                if (previewAction === 'begin') store.startPath(previewPath.id);
                store.focusPath(previewPath.id);
                setSelectedPathId(previewPath.id);
                setPathSelectorOpen(false);
              }}
              style={({ pressed }) => [styles.pathSelectorEnter, pressed && styles.pressed]}
            >
              <Text style={styles.pathSelectorEnterText}>
                {previewAction === 'continue' ? u('Continue Journey') : u('Begin Journey')}
              </Text>
              <Ionicons name="arrow-forward" size={18} color={colors.white} />
            </Pressable>
            <View style={styles.pathSelectorActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={u('Read Bible')}
                onPress={() => {
                  setPathSelectorOpen(false);
                  onBrowseBible();
                }}
                style={styles.pathSelectorSecondary}
              >
                <Ionicons name="book-outline" size={16} color={colors.primary} />
                <Text style={styles.pathSelectorSecondaryText}>{u('Read Bible')}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={u('Create a Path')}
                onPress={() => {
                  setPathSelectorOpen(false);
                  setJourneySurface(journeySurfaceAfter('create-path'));
                }}
                style={styles.pathSelectorSecondary}
              >
                <Ionicons name="create-outline" size={16} color={colors.primary} />
                <Text style={styles.pathSelectorSecondaryText}>{u('Create a Path')}</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>
      {journeySurface === 'active-path' ? (
        choosingFirstPath ? (
          <View style={styles.firstJourney}>
            <View style={styles.firstJourneyHeading}>
              <Ionicons name="compass" size={28} color={colors.gold} />
              <Text style={styles.firstJourneyTitle}>{u('Where will your journey begin?')}</Text>
              <Text style={styles.firstJourneyHint}>
                {u('Begin with one small step. You can change Paths whenever you want.')}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => startFirstPath('reading-mark')}
              style={({ pressed }) => [styles.firstJourneyChoice, pressed && styles.pressed]}
            >
              <View style={styles.firstJourneyIcon}>
                <Ionicons name="book" size={22} color={colors.white} />
              </View>
              <View style={styles.firstJourneyCopy}>
                <Text style={styles.firstJourneyChoiceTitle}>{u('Mark')}</Text>
                <Text style={styles.firstJourneyChoiceDetail}>
                  {u('Reading')} · {u('First step')} · ~3 min
                </Text>
                <Text style={styles.firstJourneyChoiceAction}>{u('Begin Journey')}</Text>
              </View>
              <Ionicons name="arrow-forward" size={19} color={colors.primary} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => startFirstPath('memorization-psalm-23')}
              style={({ pressed }) => [styles.firstJourneyChoice, pressed && styles.pressed]}
            >
              <View style={[styles.firstJourneyIcon, styles.firstJourneyMemoryIcon]}>
                <Ionicons name="bulb" size={22} color={colors.white} />
              </View>
              <View style={styles.firstJourneyCopy}>
                <Text style={styles.firstJourneyChoiceTitle}>{u('Psalm 23')}</Text>
                <Text style={styles.firstJourneyChoiceDetail}>
                  {u('Memorization')} · {u('First verse')} · ~3 min
                </Text>
                <Text style={styles.firstJourneyChoiceAction}>{u('Begin Journey')}</Text>
              </View>
              <Ionicons name="arrow-forward" size={19} color={colors.primary} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setPathPreviewId(allPaths[0]?.id ?? null);
                setPathSelectorOpen(true);
              }}
              style={({ pressed }) => [styles.exploreMore, pressed && styles.pressed]}
            >
              <Text style={styles.exploreMoreText}>{u('Explore more Paths')}</Text>
              <Ionicons name="chevron-forward" size={17} color={colors.primary} />
            </Pressable>
          </View>
        ) : (
          <>
            <PathGameWorld
              pathId={selectedPath.id}
              title={pathTitle(selectedPath, store.uiLanguage)}
              ratio={ratio}
              currentNodeProgress={currentReadingProgress}
              chapterLabel={
                nextBeat
                  ? beatTitle(nextBeat, store.uiLanguage)
                  : currentPathVerse
                    ? `${currentPathVerse.bookName} ${currentPathVerse.chapter}`
                    : pathTitle(selectedPath, store.uiLanguage)
              }
              nextChapterLabel={
                followingBeat ? beatTitle(followingBeat, store.uiLanguage) : undefined
              }
              currentVerseLabel={
                selectedPath.id === 'reading-mark' && currentWorldNode
                  ? currentWorldNode.label
                  : selectedPath.structure === 'chapter'
                    ? smartAction.detail
                    : currentPathVerse?.reference
              }
              nextVerseLabel={followingPathVerse?.reference}
              paths={(activePaths.length ? activePaths : [selectedPath])
                .slice(0, 3)
                .map((path) => ({
                  id: path.id,
                  title: pathTitle(path, store.uiLanguage),
                  selected: path.id === selectedPath.id,
                }))}
              nodes={worldNodes}
              totalNodeCount={worldNodes.length}
              uiLanguage={store.uiLanguage}
              reduceMotion={store.feedbackSettings.reduceMotion}
              steps={
                nextBeat?.boss
                  ? [
                      {
                        id: 'boss',
                        icon: 'shield-checkmark-outline' as const,
                        label: u('FINAL CHALLENGE'),
                        complete: selectedState?.status === 'completed',
                        onPress: performSmartAction,
                      },
                    ]
                  : selectedPath.structure === 'verse'
                    ? [
                        {
                          id: 'learn',
                          icon: 'book-outline' as const,
                          label: t(store.uiLanguage, 'stageLearn'),
                          complete: currentNodeProgress?.levels?.learn ?? false,
                          onPress: () => currentPathVerse && onMemorize(currentPathVerse),
                        },
                        {
                          id: 'practice',
                          icon: 'bulb-outline' as const,
                          label: t(store.uiLanguage, 'stagePractice'),
                          complete: currentNodeProgress?.levels?.practice ?? false,
                          locked: !currentNodeProgress?.levels?.learn,
                          onPress: () => currentPathVerse && onMemorize(currentPathVerse),
                        },
                        {
                          id: 'master',
                          icon: 'sparkles-outline' as const,
                          label: t(store.uiLanguage, 'stageMaster'),
                          complete: currentNodeProgress?.levels?.master ?? false,
                          locked: !currentNodeProgress?.levels?.practice,
                          onPress: () => currentPathVerse && onMemorize(currentPathVerse),
                        },
                      ]
                    : [
                        {
                          id: 'read',
                          icon: 'book-outline' as const,
                          label: u('READ'),
                          complete: currentNodeProgress?.chapter?.readingCompleted ?? currentRead,
                          onPress: () =>
                            onRead({
                              label: nextBeat
                                ? beatTitle(nextBeat, store.uiLanguage)
                                : selectedPath.title,
                              versionId: selectedVersionId,
                              verses: pathActivityVerses,
                            }),
                        },
                        {
                          id: 'quiz',
                          icon: 'help-circle-outline' as const,
                          label: nextBeat?.sections?.length ? u('CHAPTER RECAP') : u('CHALLENGE'),
                          complete: currentNodeProgress?.chapter?.quizCompleted ?? false,
                          locked: !currentNodeProgress?.chapter?.readingCompleted,
                          onPress: nextBeat?.sections?.length
                            ? performSmartAction
                            : () => onChallenge(selectedVerses, 'chapterQuiz'),
                        },
                      ]
              }
              continueLabel={smartAction.label}
              started={Boolean(selectedState)}
              complete={selectedState?.status === 'completed'}
              onContinue={performSmartAction}
              onStart={() => {
                store.startPath(selectedPath.id);
                store.focusPath(selectedPath.id);
              }}
              onSelectPath={selectPath}
              onSelectNode={(beatId) => store.selectPathNode(selectedPath.id, beatId)}
              onPracticeNode={(beatId) => {
                const reference = selectedBeats.find((beat) => beat.id === beatId)?.passage;
                const verses = reference ? getReferencedPassage(selectedVersionId, reference) : [];
                if (selectedPath.structure === 'verse') {
                  if (verses[0]) onMemorize(verses[0]);
                } else if (verses.length) {
                  onRead({
                    label: beatTitle(
                      selectedBeats.find((beat) => beat.id === beatId)!,
                      store.uiLanguage,
                    ),
                    versionId: selectedVersionId,
                    verses,
                  });
                }
              }}
            />

            {showLegacyRomansNavigator && selectedPath.id === 'memorization-romans' && (
              <View style={styles.romansNavigator}>
                <View style={styles.romansNavigatorHeader}>
                  <View>
                    <Text style={styles.romansNavigatorTitle}>{u('ROMANS VERSE NAVIGATOR')}</Text>
                    <Text style={styles.romansNavigatorDetail}>
                      {nextBeat?.passage
                        ? `${u('Current')}: Romans ${nextBeat.passage.startChapter}:${nextBeat.passage.startVerse}`
                        : u('Romans Path complete')}
                    </Text>
                  </View>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.romansChapters}>
                    {Array.from({ length: 16 }, (_, index) => index + 1).map((chapter) => (
                      <Pressable
                        key={chapter}
                        accessibilityRole="button"
                        accessibilityLabel={`Romans ${chapter}`}
                        accessibilityState={{ selected: romansChapter === chapter }}
                        onPress={() => setRomansChapter(chapter)}
                        style={[
                          styles.romansChapter,
                          romansChapter === chapter && styles.romansChapterSelected,
                        ]}
                      >
                        <Text style={styles.romansChapterText}>{chapter}</Text>
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>
                <View style={styles.romansVerseGrid}>
                  {romansChapterBeats.map((beat) => {
                    const node = selectedState?.nodeProgress?.[beat.id];
                    const locked = selectedState
                      ? node?.status === 'locked'
                      : beat !== selectedBeats[0];
                    const verse = beat.passage
                      ? getReferencedPassage(selectedVersionId, beat.passage)[0]
                      : undefined;
                    return (
                      <Pressable
                        key={beat.id}
                        accessibilityRole="button"
                        accessibilityLabel={`${beat.title}. ${node?.levels?.master ? 'Mastered' : node?.levels?.practice ? 'Practiced' : node?.levels?.learn ? 'Learned' : (node?.status ?? 'Locked')}`}
                        accessibilityState={{ disabled: locked }}
                        disabled={locked || !verse}
                        onPress={() => {
                          if (!selectedState) {
                            store.startPath(selectedPath.id);
                            store.focusPath(selectedPath.id);
                          } else if (node?.status === 'available') {
                            store.selectPathNode(selectedPath.id, beat.id);
                          }
                          if (verse) onMemorize(verse);
                        }}
                        style={[
                          styles.romansVerse,
                          node?.status === 'current' && styles.romansVerseCurrent,
                          node?.levels?.learn && styles.romansVerseLearned,
                          node?.levels?.master && styles.romansVerseMastered,
                          locked && styles.romansVerseLocked,
                        ]}
                      >
                        <Text style={styles.romansVerseNumber}>{beat.passage?.startVerse}</Text>
                        <Text style={styles.romansVerseLevels}>
                          {node?.levels?.master
                            ? 'L · P · M'
                            : node?.levels?.practice
                              ? 'L · P'
                              : node?.levels?.learn
                                ? 'L'
                                : node?.status === 'current'
                                  ? u('NEXT')
                                  : '—'}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            {showLegacyPathManager && (
              <>
                <View style={styles.hero}>
                  <Text style={styles.brand}>BIBLIAVIA PATHS</Text>
                  <Text style={styles.title}>{u('Where are you going?')}</Text>
                  <Text style={styles.subtitle}>
                    {u('Choose long-term goals. Reading and memorization are equal ways forward.')}
                  </Text>
                  <View style={styles.heroStats}>
                    <PathStat value={activePaths.length} label={u('Active Paths')} />
                    <PathStat value={completedPaths} label={u('Completed')} />
                    <PathStat
                      value={Object.values(store.progress.pathStates ?? {}).reduce(
                        (sum, path) => sum + path.completedBeatIds.length,
                        0,
                      )}
                      label={u('Beats')}
                    />
                  </View>
                </View>

                {activePaths.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionLabel}>{u('ACTIVE PATHS')}</Text>
                    <View style={styles.activeGrid}>
                      {activePaths.slice(0, 3).map((path) => {
                        const state = store.progress.pathStates?.[path.id];
                        const active = selectedPath.id === path.id;
                        return (
                          <Pressable
                            key={path.id}
                            accessibilityRole="button"
                            accessibilityState={{ selected: active }}
                            onPress={() => selectPath(path.id)}
                            style={[styles.activeCard, active && styles.activeCardSelected]}
                          >
                            <Ionicons name={pathIcon(path)} size={20} color={colors.primary} />
                            <Text numberOfLines={2} style={styles.activeTitle}>
                              {pathTitle(path, store.uiLanguage)}
                            </Text>
                            <ProgressBar
                              value={pathProgressRatio(path, state)}
                              color={colors.mint}
                            />
                            <Text style={styles.activeDetail}>
                              {Math.round(pathProgressRatio(path, state) * 100)}% ·{' '}
                              {(nextPathBeat(path, state) &&
                                beatTitle(nextPathBeat(path, state)!, store.uiLanguage)) ??
                                u('Path complete')}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                )}

                <View style={styles.selectedPath}>
                  <View style={styles.selectedTop}>
                    <View style={styles.selectedIcon}>
                      <Ionicons name={pathIcon(selectedPath)} size={26} color={colors.white} />
                    </View>
                    <View style={styles.selectedCopy}>
                      <Text style={styles.sourceLabel}>
                        {pathTypeLabel(selectedPath, store.uiLanguage)} ·{' '}
                        {selectedPath.source === 'curated' ? u('CURATED PATH') : u('YOUR PATH')}
                      </Text>
                      <Text style={styles.selectedTitle}>
                        {pathTitle(selectedPath, store.uiLanguage)}
                      </Text>
                      <Text style={styles.selectedDetail}>
                        {selectedState?.pathProgress ?? 0} / {pathTarget(selectedPath)} ·{' '}
                        {selectedState?.status === 'completed'
                          ? u('Path complete')
                          : nextBeat
                            ? `${u('Next')}: ${beatTitle(nextBeat, store.uiLanguage)}`
                            : u('Ready to begin')}
                      </Text>
                      {selectedReference && (
                        <Text style={styles.referenceDetail}>
                          {selectedVersion?.abbreviation ?? selectedVersionId} ·{' '}
                          {selectedVerses[0]?.bookName ?? selectedReference.bookId}{' '}
                          {selectedReference.startChapter}:{selectedReference.startVerse}–
                          {selectedPassageEnd?.chapter === selectedReference.startChapter
                            ? selectedPassageEnd.verseEnd
                            : `${selectedPassageEnd?.chapter ?? selectedReference.endChapter}:${selectedPassageEnd?.verseEnd ?? selectedReference.endVerse}`}
                        </Text>
                      )}
                    </View>
                    <Text style={styles.percent}>{Math.round(ratio * 100)}%</Text>
                  </View>
                  <ProgressBar value={ratio} color={colors.gold} />
                  {selectedState && selectedState.status !== 'completed' && (
                    <View style={styles.resumeCard}>
                      <Text style={styles.resumeLabel}>{u('RESUME PATH')}</Text>
                      <Text style={styles.resumeText}>
                        {pathResumeSummary(selectedPath, selectedState, store.uiLanguage)}
                      </Text>
                    </View>
                  )}
                  {!selectedState && (
                    <View style={styles.previewCard}>
                      <Text style={styles.previewTitle}>{u('PATH PREVIEW')}</Text>
                      <Text style={styles.previewText}>
                        {selectedPath.beats?.length ?? 1} {u('Beats')} ·{' '}
                        {selectedPath.beats?.filter((beat) => beat.milestone).length ?? 0}{' '}
                        {u('milestones')}
                      </Text>
                      {selectedPath.beats?.slice(0, 3).map((beat, index) => (
                        <Text key={beat.id} style={styles.previewStep}>
                          {index + 1}. {beatTitle(beat, store.uiLanguage)}
                        </Text>
                      ))}
                      <Button
                        label={u('Start Path')}
                        onPress={() => {
                          store.startPath(selectedPath.id);
                          store.focusPath(selectedPath.id);
                        }}
                      />
                    </View>
                  )}
                  {selectedState?.status === 'completed' ? (
                    <View style={styles.completionCard}>
                      <Ionicons name="checkmark-circle" size={26} color={colors.mint} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.completionTitle}>{u('THIS GOAL IS COMPLETE')}</Text>
                        <Text style={styles.completionText}>
                          {u('Your completed journey remains here.')}
                        </Text>
                      </View>
                    </View>
                  ) : selectedState ? (
                    <Button
                      label={`${smartAction.label} · ${smartAction.detail}`}
                      onPress={performSmartAction}
                    />
                  ) : null}
                  {selectedState?.status !== 'completed' && (
                    <Button
                      label={showAlternatives ? u('Hide other activities') : u('Other activities')}
                      variant="ghost"
                      onPress={() => setShowAlternatives((value) => !value)}
                    />
                  )}
                  {showAlternatives && selectedState?.status !== 'completed' && (
                    <View style={styles.actions}>
                      <PathAction
                        icon="book"
                        label={u('READ')}
                        detail={u('Calm progress')}
                        disabled={!pathActivityVerses.length}
                        onPress={() =>
                          onRead({
                            label: pathTitle(selectedPath, store.uiLanguage),
                            versionId: selectedVersionId,
                            verses: pathActivityVerses,
                          })
                        }
                      />
                      <PathAction
                        icon="bulb"
                        label={u('MEMORIZE')}
                        detail={u('Focused recall')}
                        disabled={!pathActivityVerses[0] && !nextVerse}
                        onPress={() =>
                          (pathActivityVerses[0] ?? nextVerse) &&
                          onMemorize(pathActivityVerses[0] ?? nextVerse!)
                        }
                      />
                      <PathAction
                        icon="trophy"
                        label={u('CHALLENGE')}
                        detail={u('Risk · larger progress')}
                        disabled={!pathActivityVerses.length}
                        onPress={() => onChallenge(pathActivityVerses.slice(0, 5))}
                      />
                    </View>
                  )}
                  {selectedReference && !selectedVerses.length && (
                    <Text style={styles.unavailable}>
                      {u('Bible text unavailable for this version.')}
                    </Text>
                  )}

                  {visibleBeats.length ? (
                    <View style={styles.beatMap}>
                      {visibleBeats.map((beat, windowIndex) => {
                        const index = beatWindowStart + windowIndex;
                        const completed =
                          selectedState?.completedBeatIds.includes(beat.id) ?? false;
                        const active =
                          selectedState?.activeBeatIds.includes(beat.id) ?? index === 0;
                        const distance = index - selectedActiveIndex;
                        const revealed = completed || active || distance <= 1;
                        const partlyRevealed = !revealed && distance === 2;
                        const beatRatio = Math.min(
                          1,
                          (selectedState?.beatProgress[beat.id] ?? 0) / Math.max(1, beat.target),
                        );
                        return (
                          <View key={beat.id} style={styles.beatRow}>
                            <View
                              style={[
                                styles.beatNode,
                                completed && styles.beatNodeComplete,
                                active && styles.beatNodeActive,
                              ]}
                            >
                              <Ionicons
                                name={completed ? 'checkmark' : active ? 'navigate' : 'lock-closed'}
                                size={17}
                                color={completed || active ? colors.white : colors.muted}
                              />
                            </View>
                            <View style={[styles.beatCard, !revealed && styles.fogCard]}>
                              <Text style={styles.beatTitle}>
                                {beat.milestone && revealed ? '◆ ' : ''}
                                {revealed
                                  ? beatTitle(beat, store.uiLanguage)
                                  : partlyRevealed
                                    ? `${beatTitle(beat, store.uiLanguage).slice(0, 8)}…`
                                    : '•••'}
                              </Text>
                              {revealed ? (
                                <>
                                  <ProgressBar
                                    value={beatRatio}
                                    color={completed ? colors.mint : colors.gold}
                                  />
                                  <Text style={styles.beatDetail}>
                                    {completed
                                      ? u('Complete')
                                      : active
                                        ? `${selectedState?.beatProgress[beat.id] ?? 0} / ${beat.target}`
                                        : u('Coming next')}
                                  </Text>
                                  {completed && beat.milestone && beat.discovery && (
                                    <Text style={styles.discoveryText}>
                                      {beat.discovery[store.uiLanguage] ?? beat.discovery.en}
                                    </Text>
                                  )}
                                </>
                              ) : (
                                <Text style={styles.fogText}>
                                  {u('A future Beat waits in the fog.')}
                                </Text>
                              )}
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  ) : !selectedPath.beats?.length ? (
                    <View style={styles.singleGoal}>
                      <Ionicons name="flag" size={21} color={colors.primary} />
                      <Text style={styles.singleGoalText}>
                        {u('One focused goal — no extra Beats needed.')}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </>
            )}
          </>
        )
      ) : (
        <View style={styles.createCard}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={u('Back to Journey')}
            onPress={() => setJourneySurface(journeySurfaceAfter('back-to-journey'))}
            style={styles.createBack}
          >
            <Ionicons name="arrow-back" size={19} color={colors.primary} />
            <Text style={styles.createBackText}>{u('Back to Journey')}</Text>
          </Pressable>
          <Text style={styles.sectionLabel}>{u('CREATE A PATH')}</Text>
          <Text style={styles.createHint}>
            {u('Start with one honest goal. Rewards come from activity, not from creating Paths.')}
          </Text>
          <TextInput
            accessibilityLabel={u('Path name')}
            value={newPathTitle}
            onChangeText={setNewPathTitle}
            placeholder={u('Example: Read Psalm 23')}
            placeholderTextColor={colors.muted}
            style={styles.input}
          />
          <Text style={styles.selectorLabel}>{u('Path type')}</Text>
          <View style={styles.choiceRow}>
            {(['reading', 'memorization', 'mixed'] as PathKind[]).map((kind) => (
              <Pressable
                key={kind}
                accessibilityRole="button"
                accessibilityState={{ selected: newPathKind === kind }}
                onPress={() => setNewPathKind(kind)}
                style={[styles.choiceChip, newPathKind === kind && styles.choiceChipSelected]}
              >
                <Text style={styles.choiceText}>
                  {pathTypeLabel({ ...selectedPath, kind }, store.uiLanguage)}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.selectorLabel}>{u('Bible version')}</Text>
          <View style={styles.choiceRow}>
            {createVersions.map((version) => (
              <Pressable
                key={version.id}
                accessibilityRole="button"
                accessibilityState={{ selected: newVersionId === version.id }}
                onPress={() => setNewVersionId(version.id)}
                style={[
                  styles.choiceChip,
                  newVersionId === version.id && styles.choiceChipSelected,
                ]}
              >
                <Text style={styles.choiceText}>{version.abbreviation}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.selectorLabel}>{u('Bible book')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.choiceRow}>
              {createBooks.map((book) => (
                <Pressable
                  key={book.id}
                  accessibilityRole="button"
                  accessibilityState={{ selected: createBook?.id === book.id }}
                  onPress={() => {
                    setNewBookId(book.id);
                    setNewChapter(book.chapters[0]?.number ?? 1);
                    setNewVerseStart('1');
                    setNewVerseEnd('1');
                  }}
                  style={[
                    styles.choiceChip,
                    createBook?.id === book.id && styles.choiceChipSelected,
                  ]}
                >
                  <Text style={styles.choiceText}>{book.name}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
          <Text style={styles.selectorLabel}>{u('Chapter')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.choiceRow}>
              {createBook?.chapters.map((chapter) => (
                <Pressable
                  key={chapter.number}
                  accessibilityRole="button"
                  accessibilityState={{ selected: newChapter === chapter.number }}
                  onPress={() => {
                    setNewChapter(chapter.number);
                    setNewVerseStart('1');
                    setNewVerseEnd('1');
                  }}
                  style={[
                    styles.choiceChip,
                    newChapter === chapter.number && styles.choiceChipSelected,
                  ]}
                >
                  <Text style={styles.choiceText}>{chapter.number}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>
          <View style={styles.rangeRow}>
            <View style={styles.rangeField}>
              <Text style={styles.selectorLabel}>{u('Start verse')}</Text>
              <TextInput
                accessibilityLabel={u('Start verse')}
                keyboardType="number-pad"
                value={newVerseStart}
                onChangeText={setNewVerseStart}
                style={styles.input}
              />
            </View>
            <View style={styles.rangeField}>
              <Text style={styles.selectorLabel}>{u('End verse')}</Text>
              <TextInput
                accessibilityLabel={u('End verse')}
                keyboardType="number-pad"
                value={newVerseEnd}
                onChangeText={setNewVerseEnd}
                style={styles.input}
              />
            </View>
          </View>
          <Button
            label={u('Create Path')}
            disabled={!newPathTitle.trim() || !createChapter}
            onPress={createCustomPath}
          />
        </View>
      )}
    </ScrollView>
  );
}

function PathStat({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function PathAction({
  icon,
  label,
  detail,
  disabled,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  detail: string;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}. ${detail}`}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <Ionicons name={icon} size={22} color={colors.primary} />
      <Text style={styles.actionLabel}>{label}</Text>
      <Text style={styles.actionDetail}>{detail}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#B9C79A' },
  page: { paddingHorizontal: 10, paddingTop: 10, paddingBottom: 130, gap: 10 },
  immersivePage: { flexGrow: 1, paddingHorizontal: 0, paddingTop: 0, paddingBottom: 0, gap: 0 },
  journeyIntro: { gap: 5, zIndex: 20 },
  journeyIntroOverlay: { position: 'absolute', top: 10, left: 10, right: 10 },
  journeyControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  journeyHud: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  journeyHudItem: {
    minWidth: 43,
    height: 31,
    paddingHorizontal: 7,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    backgroundColor: 'rgba(23, 19, 46, 0.86)',
    ...shadow,
  },
  journeyHudXp: { color: '#F3CB61', fontSize: 8, fontWeight: '900' },
  journeyHudValue: { color: colors.white, fontSize: 11, fontWeight: '900' },
  journeyEyebrow: { color: colors.gold, fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
  journeyTitle: { color: colors.ink, fontFamily: 'Georgia', fontSize: 27, fontWeight: '900' },
  journeySubtitle: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  pathSwitcher: {
    minHeight: 48,
    flex: 1,
    paddingHorizontal: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 16,
    borderWidth: 2,
    borderBottomWidth: 3,
    borderColor: '#B58C3E',
    backgroundColor: '#FFF9EC',
    ...shadow,
  },
  pathSwitcherIcon: {
    width: 32,
    height: 32,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  pathSwitcherCopy: { flex: 1, minWidth: 0 },
  pathSwitcherTitle: { flex: 1, color: colors.ink, fontSize: 13, fontWeight: '900' },
  pathSwitcherMeta: { marginTop: 3, color: colors.primary, fontSize: 10, fontWeight: '800' },
  pathSelectorPanel: {
    marginTop: 3,
    padding: 8,
    gap: 5,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#B58C3E',
    backgroundColor: '#FFFDF7',
    ...shadow,
  },
  pathSelectorCarousel: { gap: 8, paddingHorizontal: 22, paddingRight: 82 },
  pathSelectorOption: {
    minHeight: 50,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    borderRadius: 13,
  },
  pathSelectorOptionSelected: { backgroundColor: colors.primarySoft },
  pathSelectorWorld: {
    width: 276,
    minHeight: 94,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#D8C9AE',
    backgroundColor: '#FFF9EC',
  },
  pathSelectorOptionCopy: { flex: 1, minWidth: 0 },
  pathSelectorOptionTitle: { color: colors.ink, fontSize: 12, fontWeight: '900' },
  pathSelectorOptionMeta: { marginTop: 2, color: colors.muted, fontSize: 9, fontWeight: '700' },
  pathSelectorEnter: {
    minHeight: 44,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    backgroundColor: colors.primary,
  },
  pathSelectorEnterText: { color: colors.white, fontSize: 12, fontWeight: '900' },
  pathSelectorActions: { flexDirection: 'row', gap: 6 },
  pathSelectorSecondary: {
    flex: 1,
    minHeight: 36,
    paddingHorizontal: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
  },
  pathSelectorSecondaryText: { color: colors.primary, fontSize: 10, fontWeight: '900' },
  globalRecall: {
    minHeight: 32,
    alignSelf: 'flex-end',
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    backgroundColor: 'rgba(23, 19, 46, 0.86)',
    ...shadow,
  },
  globalRecallText: { color: colors.white, fontSize: 10, fontWeight: '900' },
  firstJourney: {
    minHeight: 560,
    paddingHorizontal: 10,
    paddingTop: 54,
    gap: 12,
  },
  firstJourneyHeading: { alignItems: 'center', gap: 8, marginBottom: 12 },
  firstJourneyTitle: {
    color: colors.ink,
    fontFamily: 'Georgia',
    fontSize: 26,
    fontWeight: '900',
    textAlign: 'center',
  },
  firstJourneyHint: {
    maxWidth: 300,
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: 'center',
  },
  firstJourneyChoice: {
    minHeight: 76,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    borderRadius: 20,
    borderWidth: 2,
    borderBottomWidth: 5,
    borderColor: '#B58C3E',
    backgroundColor: '#FFFDF7',
    ...shadow,
  },
  firstJourneyIcon: {
    width: 44,
    height: 44,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  firstJourneyMemoryIcon: { backgroundColor: '#7153B8' },
  firstJourneyCopy: { flex: 1, minWidth: 0 },
  firstJourneyChoiceTitle: { color: colors.ink, fontSize: 15, fontWeight: '900' },
  firstJourneyChoiceDetail: { marginTop: 4, color: colors.muted, fontSize: 11, fontWeight: '700' },
  firstJourneyChoiceAction: {
    marginTop: 6,
    color: colors.primary,
    fontSize: 10,
    fontWeight: '900',
  },
  exploreMore: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  exploreMoreText: { color: colors.primary, fontSize: 12, fontWeight: '900' },
  romansNavigator: {
    gap: 12,
    padding: 14,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: '#B58C3E',
    backgroundColor: '#FFF9EC',
    ...shadow,
  },
  romansNavigatorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  romansNavigatorTitle: { color: colors.ink, fontSize: 13, fontWeight: '900' },
  romansNavigatorDetail: { marginTop: 2, color: colors.muted, fontSize: 10, fontWeight: '700' },
  recallDueButton: {
    minHeight: 38,
    paddingHorizontal: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  recallDueButtonDisabled: { opacity: 0.42 },
  recallDueText: { color: colors.white, fontSize: 9, fontWeight: '900' },
  romansChapters: { flexDirection: 'row', gap: 6 },
  romansChapter: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
  },
  romansChapterSelected: { borderColor: colors.gold, backgroundColor: colors.primary },
  romansChapterText: { color: colors.ink, fontSize: 11, fontWeight: '900' },
  romansVerseGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  romansVerse: {
    width: 52,
    minHeight: 49,
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.white,
  },
  romansVerseCurrent: { borderWidth: 3, borderColor: colors.gold },
  romansVerseLearned: { backgroundColor: '#EFE6FA', borderColor: '#9A73B9' },
  romansVerseMastered: { backgroundColor: '#E0F4EA', borderColor: colors.mint },
  romansVerseLocked: { opacity: 0.38, backgroundColor: '#E5E1E7' },
  romansVerseNumber: { color: colors.ink, fontSize: 14, fontWeight: '900' },
  romansVerseLevels: { color: colors.primary, fontSize: 7, fontWeight: '900' },
  hero: {
    padding: 21,
    borderRadius: 28,
    borderWidth: 2,
    borderBottomWidth: 6,
    borderColor: '#CAA345',
    backgroundColor: '#34205D',
    ...shadow,
  },
  brand: { color: '#F2CB65', fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  title: { color: colors.white, fontSize: 28, fontWeight: '900', marginTop: 6 },
  subtitle: { color: '#D8CFEB', fontSize: 13, lineHeight: 19, marginTop: 5 },
  heroStats: { flexDirection: 'row', gap: 8, marginTop: 17 },
  stat: {
    flex: 1,
    padding: 9,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,.1)',
    alignItems: 'center',
  },
  statValue: { color: colors.white, fontSize: 18, fontWeight: '900' },
  statLabel: { color: '#D8CFEB', fontSize: 9, fontWeight: '800', textAlign: 'center' },
  section: {
    padding: 14,
    gap: 11,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderBottomWidth: 5,
    borderColor: colors.line,
    backgroundColor: '#FFF9EC',
    ...shadow,
  },
  sectionLabel: { color: '#86611F', fontSize: 11, fontWeight: '900', letterSpacing: 1.1 },
  activeGrid: { flexDirection: 'row', gap: 8 },
  activeCard: {
    flex: 1,
    minWidth: 0,
    gap: 7,
    padding: 10,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.white,
  },
  activeCardSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  activeTitle: { minHeight: 32, color: colors.ink, fontSize: 12, fontWeight: '900' },
  activeDetail: { color: colors.muted, fontSize: 9, lineHeight: 13 },
  selectedPath: {
    gap: 15,
    padding: 17,
    borderRadius: 26,
    borderWidth: 2,
    borderBottomWidth: 6,
    borderColor: '#B58C3E',
    backgroundColor: '#F4E6C6',
    ...shadow,
  },
  selectedTop: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  selectedIcon: {
    width: 48,
    height: 48,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  selectedCopy: { flex: 1 },
  sourceLabel: { color: '#8A641F', fontSize: 9, fontWeight: '900', letterSpacing: 0.9 },
  selectedTitle: { color: colors.ink, fontSize: 21, fontWeight: '900', marginTop: 2 },
  selectedDetail: { color: colors.muted, fontSize: 11, marginTop: 3 },
  referenceDetail: { color: colors.primary, fontSize: 10, fontWeight: '800', marginTop: 3 },
  percent: { color: colors.primary, fontSize: 19, fontWeight: '900' },
  resumeCard: { padding: 11, borderRadius: radius.md, backgroundColor: '#FFFFFF99' },
  resumeLabel: { color: colors.primary, fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
  resumeText: { color: colors.ink, fontSize: 12, fontWeight: '800', marginTop: 3 },
  previewCard: { gap: 7, padding: 12, borderRadius: radius.md, backgroundColor: '#FFFFFF99' },
  previewTitle: { color: colors.primary, fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  previewText: { color: colors.inkSoft, fontSize: 12, fontWeight: '800' },
  previewStep: { color: colors.muted, fontSize: 11 },
  completionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: '#E0F4EA',
  },
  completionTitle: { color: '#225C47', fontSize: 11, fontWeight: '900' },
  completionText: { color: colors.inkSoft, fontSize: 10, marginTop: 2 },
  actions: { flexDirection: 'row', gap: 7 },
  action: {
    flex: 1,
    minHeight: 82,
    padding: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderBottomWidth: 4,
    borderColor: '#B7965A',
    backgroundColor: colors.white,
  },
  actionLabel: { color: colors.ink, fontSize: 10, fontWeight: '900', marginTop: 4 },
  actionDetail: { color: colors.muted, fontSize: 8, textAlign: 'center', marginTop: 2 },
  beatMap: { gap: 0, paddingTop: 4 },
  beatRow: { flexDirection: 'row', gap: 10, minHeight: 82 },
  beatNode: {
    width: 34,
    height: 34,
    marginTop: 6,
    borderRadius: 17,
    borderWidth: 2,
    borderColor: '#B5A78D',
    backgroundColor: '#E4D9C4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  beatNodeActive: { borderColor: '#E2B84F', backgroundColor: colors.primary },
  beatNodeComplete: { borderColor: '#5EA689', backgroundColor: colors.mint },
  beatCard: {
    flex: 1,
    gap: 6,
    marginBottom: 9,
    padding: 11,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#CDB98F',
    backgroundColor: 'rgba(255,255,255,.72)',
  },
  fogCard: { opacity: 0.48, backgroundColor: '#DCD5C8' },
  beatTitle: { color: colors.ink, fontSize: 13, fontWeight: '900' },
  beatDetail: { color: colors.muted, fontSize: 10, fontWeight: '700' },
  discoveryText: { color: colors.primary, fontSize: 10, fontWeight: '800' },
  fogText: { color: colors.muted, fontSize: 10, fontStyle: 'italic' },
  singleGoal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },
  singleGoalText: { flex: 1, color: colors.inkSoft, fontSize: 12, fontWeight: '800' },
  browseList: { gap: 7 },
  browseCard: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
  },
  browseCopy: { flex: 1 },
  browseTitle: { color: colors.ink, fontSize: 13, fontWeight: '900' },
  browseDetail: { color: colors.muted, fontSize: 10, marginTop: 2 },
  createCard: {
    gap: 10,
    padding: 16,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.line,
    backgroundColor: '#FFF9EC',
  },
  createBack: { flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start' },
  createBackText: { color: colors.primary, fontSize: 12, fontWeight: '900' },
  createHint: { color: colors.muted, fontSize: 11, lineHeight: 16 },
  input: {
    minHeight: 50,
    paddingHorizontal: 13,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.white,
    color: colors.ink,
  },
  selectorLabel: { color: colors.inkSoft, fontSize: 10, fontWeight: '900' },
  choiceRow: { flexDirection: 'row', gap: 7 },
  choiceChip: {
    minHeight: 36,
    minWidth: 42,
    paddingHorizontal: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.white,
  },
  choiceChipSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  choiceText: { color: colors.ink, fontSize: 11, fontWeight: '800' },
  rangeRow: { flexDirection: 'row', gap: 10 },
  rangeField: { flex: 1, gap: 6 },
  unavailable: {
    color: '#A33E36',
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
  },
  disabled: { opacity: 0.42 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.99 }] },
});
