import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button, ProgressBar } from '../components/ui';
import {
  bibleVersions,
  booksForVersion,
  getReferencedPassage,
  isBibleVersionEnabled,
} from '../data/content';
import { beatTitle, pathDefinitions, pathTitle } from '../data/paths';
import { learningSequence } from '../lib/learningSequence';
import { nextPathBeat, pathProgressRatio, pathTarget } from '../lib/pathProgress';
import { nextPathAction, pathResumeSummary, pathTypeLabel } from '../lib/pathGuidance';
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

export function JourneyScreen({
  onBrowseBible,
  onRead,
  onMemorize,
  onChallenge,
}: {
  onBrowseBible: () => void;
  onRead: (passage: { label: string; versionId: string; verses: Verse[] }) => void;
  onMemorize: (verse: Verse) => void;
  onChallenge: (verses: Verse[]) => void;
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
    store.progress.focusedPathId ?? activePaths[0]?.id ?? 'memorization-romans',
  );
  const [showAll, setShowAll] = useState(false);
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [newPathTitle, setNewPathTitle] = useState('');
  const [newVersionId, setNewVersionId] = useState(store.translationId);
  const [newBookId, setNewBookId] = useState('john');
  const [newChapter, setNewChapter] = useState(3);
  const [newVerseStart, setNewVerseStart] = useState('16');
  const [newVerseEnd, setNewVerseEnd] = useState('21');
  const [newPathKind, setNewPathKind] = useState<PathKind>('mixed');
  const selectedPath =
    allPaths.find((path) => path.id === selectedPathId) ?? activePaths[0] ?? allPaths[0]!;
  const selectedState = store.progress.pathStates?.[selectedPath.id];
  const nextBeat = nextPathBeat(selectedPath, selectedState);
  const ratio = pathProgressRatio(selectedPath, selectedState);
  const smartAction = nextPathAction(selectedPath, selectedState, store.uiLanguage);
  const selectedBeats = selectedPath.beats ?? [];
  const selectedActiveIndex = Math.max(
    0,
    selectedBeats.findIndex((beat) => selectedState?.activeBeatIds.includes(beat.id)),
  );
  const beatWindowStart = Math.max(0, selectedActiveIndex - 1);
  const visibleBeats = selectedState
    ? selectedBeats.slice(beatWindowStart, beatWindowStart + 6)
    : [];
  const completedPaths = Object.values(store.progress.pathStates ?? {}).filter(
    (path) => path.status === 'completed',
  ).length;
  const nextVerse =
    learningSequence(store.availableVerses).find(
      (verse) => !store.progress.mastery[verse.id]?.successfulRecalls,
    ) ?? store.availableVerses[0];
  const selectedVersionId = selectedPath.bibleVersionId ?? store.translationId;
  const selectedVersion = bibleVersions.find((version) => version.id === selectedVersionId);
  const selectedReference = nextBeat?.passage ?? nextBeat?.passages?.[0] ?? selectedPath.passage;
  const selectedVerses = selectedReference
    ? getReferencedPassage(selectedVersionId, selectedReference)
    : [];
  const selectedPassageEnd = selectedVerses.at(-1);
  const pathActivityVerses = selectedReference ? selectedVerses : store.availableVerses;
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
  const browsePaths = showAll ? allPaths : allPaths.slice(0, 6);
  const selectPath = (pathId: string) => {
    setSelectedPathId(pathId);
    store.focusPath(pathId);
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
  };
  const performSmartAction = () => {
    if (smartAction.activity === 'complete') return;
    if (smartAction.activity === 'reading') {
      onRead({
        label: pathTitle(selectedPath, store.uiLanguage),
        versionId: selectedVersionId,
        verses: pathActivityVerses,
      });
    } else if (smartAction.activity === 'memorization') {
      const verse = pathActivityVerses[0] ?? nextVerse;
      if (verse) onMemorize(verse);
    } else onChallenge(pathActivityVerses.slice(0, 5));
  };

  return (
    <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
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
                  <ProgressBar value={pathProgressRatio(path, state)} color={colors.mint} />
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
            <Text style={styles.selectedTitle}>{pathTitle(selectedPath, store.uiLanguage)}</Text>
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
              {selectedPath.beats?.filter((beat) => beat.milestone).length ?? 0} {u('milestones')}
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
              <Text style={styles.completionText}>{u('Your completed journey remains here.')}</Text>
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
          <Text style={styles.unavailable}>{u('Bible text unavailable for this version.')}</Text>
        )}

        {visibleBeats.length ? (
          <View style={styles.beatMap}>
            {visibleBeats.map((beat, windowIndex) => {
              const index = beatWindowStart + windowIndex;
              const completed = selectedState?.completedBeatIds.includes(beat.id) ?? false;
              const active = selectedState?.activeBeatIds.includes(beat.id) ?? index === 0;
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
                      <Text style={styles.fogText}>{u('A future Beat waits in the fog.')}</Text>
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

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>{u('BROWSE PATHS')}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={u('Read Bible')}
          onPress={onBrowseBible}
          style={styles.browseCard}
        >
          <Ionicons name="book-outline" size={21} color={colors.primary} />
          <View style={styles.browseCopy}>
            <Text style={styles.browseTitle}>{u('Read Bible')}</Text>
            <Text style={styles.browseDetail}>{u('Choose any book, chapter and verse')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </Pressable>
        <View style={styles.browseList}>
          {browsePaths.map((path) => (
            <Pressable
              key={path.id}
              accessibilityRole="button"
              onPress={() => selectPath(path.id)}
              style={styles.browseCard}
            >
              <Ionicons name={pathIcon(path)} size={21} color={colors.primary} />
              <View style={styles.browseCopy}>
                <Text style={styles.browseTitle}>{pathTitle(path, store.uiLanguage)}</Text>
                <Text style={styles.browseDetail}>
                  {pathTypeLabel(path, store.uiLanguage)} ·{' '}
                  {path.beats?.length
                    ? `${path.beats.length} ${u('Beats')}`
                    : u('Small focused Path')}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </Pressable>
          ))}
        </View>
        {allPaths.length > 6 && (
          <Button
            label={showAll ? u('Show less') : u('Show all Paths')}
            variant="secondary"
            onPress={() => setShowAll((current) => !current)}
          />
        )}
      </View>

      <View style={styles.createCard}>
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
              style={[styles.choiceChip, newVersionId === version.id && styles.choiceChipSelected]}
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
                style={[styles.choiceChip, createBook?.id === book.id && styles.choiceChipSelected]}
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
  page: { padding: 18, paddingBottom: 130, gap: 18 },
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
