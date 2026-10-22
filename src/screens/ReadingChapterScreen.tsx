import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { ReadingInteraction } from '../components/ReadingInteraction';
import { BottomNavigation, Button, Card, ProgressBar } from '../components/ui';
import {
  backReadingSession,
  readingCompletionNeeded,
  readingNextStep,
  readingQuizCompletionNeeded,
  restoreReadingSession,
  transitionReadingSession,
} from '../lib/readingFlow';
import { uiText } from '../lib/uiText';
import { useAppStore } from '../store/AppStore';
import { colors } from '../theme';
import type { ReadingChapterDefinition, ReadingSessionState, Verse } from '../types';
import { ChestRewardScreen } from './ReviewScreen';

export function ReadingChapterScreen(props: React.ComponentProps<typeof ReadingChapterContent>) {
  // Each chapter restores its own saved session, never the previous chapter's UI state.
  return <ReadingChapterContent key={`${props.pathId}:${props.beatId}`} {...props} />;
}

function ReadingChapterContent({
  pathId,
  beatId,
  title,
  chapter,
  verses,
  hasNextChapter,
  onBackToPath,
  onNextChapter,
}: {
  pathId: string;
  beatId: string;
  title: string;
  chapter: ReadingChapterDefinition;
  verses: Verse[];
  hasNextChapter: boolean;
  onBackToPath: () => void;
  onNextChapter: () => void;
}) {
  const store = useAppStore();
  const node = store.progress.pathStates?.[pathId]?.nodeProgress?.[beatId];
  const context = useMemo(
    () => ({
      sectionIds: chapter.sections.map((section) => section.id),
      recapCount: chapter.recap.length,
      definitionRevision: chapter.revision,
    }),
    [chapter],
  );
  const [session, setSession] = useState<ReadingSessionState>(() => {
    return restoreReadingSession(node?.chapter?.readingSession, context);
  });
  const [openingChest, setOpeningChest] = useState(false);
  const [completionXpEarned, setCompletionXpEarned] = useState(false);
  const u = (value: string) => uiText(store.uiLanguage, value);
  const chestRewardId = `reading-chapter:${pathId}:${beatId}:chest`;
  const chestClaimed = Boolean(store.progress.claimedStageRewards[chestRewardId]);
  const section = chapter.sections[session.sectionIndex];
  const interaction =
    session.phase === 'recap' ? chapter.recap[session.recapIndex] : section?.interaction;
  const totalSteps = chapter.sections.length + chapter.recap.length;
  const completedSteps =
    session.completedSectionIds.length +
    (session.phase === 'recap'
      ? session.recapIndex
      : session.phase === 'complete'
        ? chapter.recap.length
        : 0);
  const needsReadingCompletion = readingCompletionNeeded(
    session,
    context,
    Boolean(node?.chapter?.readingCompleted),
  );
  const needsQuizCompletion = readingQuizCompletionNeeded(
    session,
    context,
    Boolean(node?.chapter?.quizCompleted),
  );

  const completeQuiz = () => {
    store.recordPathActivity({
      pathId,
      beatId,
      activity: 'challenge',
      success: true,
      completion: { type: 'chapter-part', part: 'quiz' },
    });
    setCompletionXpEarned(true);
    if (!chestClaimed) setOpeningChest(true);
  };

  useEffect(() => {
    if (needsReadingCompletion) store.recordReading(verses);
  }, [needsReadingCompletion, store.recordReading, verses]);
  useEffect(() => {
    if (needsQuizCompletion && !needsReadingCompletion) completeQuiz();
  }, [needsQuizCompletion, needsReadingCompletion]);

  const save = (next: ReadingSessionState) => {
    setSession(next);
    store.setReadingSession(pathId, beatId, next);
  };
  const answer = (correct: boolean) =>
    (() => {
      const next = transitionReadingSession(session, { type: 'answer', correct }, context);
      if (correct && next.completedSectionIds.length > session.completedSectionIds.length)
        store.emitFeedback({
          type: 'PATH_PROGRESS',
          tier: 2,
          tone: 'reflective',
          message: u('Section complete'),
          amount: 1,
        });
      if (
        correct &&
        readingCompletionNeeded(next, context, Boolean(node?.chapter?.readingCompleted))
      )
        store.recordReading(verses);
      if (
        correct &&
        readingQuizCompletionNeeded(next, context, Boolean(node?.chapter?.quizCompleted))
      )
        completeQuiz();
      save(next);
    })();
  const continueFlow = () => {
    const next = transitionReadingSession(session, { type: 'continue' }, context);
    save(next);
  };
  const back = () => {
    if (session.phase === 'intro' || session.phase === 'complete') return onBackToPath();
    save(backReadingSession(session, context));
  };
  const nextStep = readingNextStep(session, context);
  const sectionMinutes = Math.max(
    1,
    Math.round(chapter.estimatedMinutes / chapter.sections.length),
  );

  if (openingChest)
    return (
      <ChestRewardScreen
        language={store.uiLanguage}
        baseTier={1}
        seed={chestRewardId}
        scores={[1]}
        onReveal={(tier) => store.openChest(chestRewardId, tier)}
        onNext={() => setOpeningChest(false)}
        onClose={() => setOpeningChest(false)}
      />
    );

  return (
    <ScrollView
      key={`${session.phase}-${session.sectionIndex}-${session.recapIndex}`}
      contentContainerStyle={styles.page}
    >
      <Text style={styles.eyebrow}>
        {session.phase === 'recap' ? u('Chapter recap') : u('Chapter journey')}
      </Text>
      <Text style={styles.title}>{title}</Text>
      <ProgressBar value={totalSteps ? completedSteps / totalSteps : 0} color={colors.mint} />

      {session.phase === 'intro' && (
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>{u('Chapter journey')}</Text>
          <Text style={styles.body}>{u('Short reading sections with one reflection each.')}</Text>
          <Text style={styles.meta}>
            {chapter.sections.length} {u('sections')} · {chapter.estimatedMinutes} {u('min read')}
          </Text>
        </Card>
      )}

      {session.phase === 'reading' && section && (
        <View style={styles.reading}>
          <Text style={styles.step}>
            {session.sectionIndex + 1} / {chapter.sections.length}
          </Text>
          <Text style={styles.sectionTitle}>
            {section.titles?.[store.uiLanguage] ?? section.title}
          </Text>
          {verses
            .filter(
              (verse) =>
                verse.verseStart >= section.passage.startVerse &&
                verse.verseStart <= section.passage.endVerse,
            )
            .map((verse) => (
              <View key={verse.id} style={styles.verse}>
                <Text style={styles.verseNumber}>{verse.verseStart}</Text>
                <Text
                  selectable
                  style={[styles.verseText, verse.languageTag.startsWith('zh') && styles.chinese]}
                >
                  {verse.text}
                </Text>
              </View>
            ))}
        </View>
      )}

      {(session.phase === 'interaction' || session.phase === 'recap') && interaction && (
        <View style={styles.reading}>
          <Text style={styles.step}>
            {session.phase === 'recap'
              ? `${u('Chapter recap')} ${session.recapIndex + 1} / ${chapter.recap.length}`
              : u('Think about the passage')}
          </Text>
          <ReadingInteraction
            key={`${session.phase}-${session.sectionIndex}-${session.recapIndex}`}
            interaction={interaction}
            language={store.uiLanguage}
            answerState={session.answerState}
            onAnswer={answer}
            onRetry={() => save(transitionReadingSession(session, { type: 'retry' }, context))}
          />
          {session.answerState === 'correct' && (
            <Card style={styles.nextCard}>
              <Text style={styles.nextLabel}>{u('Next')}</Text>
              <Text style={styles.nextTitle}>
                {nextStep.kind === 'section'
                  ? `${u('Section')} ${nextStep.position} / ${nextStep.total}`
                  : nextStep.kind === 'recap'
                    ? `${u('Chapter recap')} ${nextStep.position} / ${nextStep.total}`
                    : u('Chapter Complete')}
              </Text>
              {nextStep.kind === 'section' && (
                <Text style={styles.meta}>
                  {u('About')} {sectionMinutes} {u('min')}
                </Text>
              )}
            </Card>
          )}
        </View>
      )}

      {session.phase === 'complete' && (
        <Card style={styles.completeCard}>
          <Text style={styles.completeMark}>✓</Text>
          <Text style={styles.sectionTitle}>{u('Chapter Complete')}</Text>
          <Text style={styles.body}>
            {u('You read, reflected on, and completed this chapter.')}
          </Text>
          {completionXpEarned && <Text style={styles.xpReward}>+10 XP</Text>}
          {!chestClaimed && (
            <Button label={u('Open chapter chest')} onPress={() => setOpeningChest(true)} />
          )}
        </Card>
      )}

      <BottomNavigation
        backLabel={session.phase === 'complete' ? u('Back to Path') : u('Back')}
        continueLabel={
          session.phase === 'intro'
            ? u('Begin reading')
            : session.phase === 'complete'
              ? hasNextChapter
                ? `${u('Next Chapter')} →`
                : `${u('Back to Path')} →`
              : `${uiText(store.uiLanguage, 'Continue')} →`
        }
        continueDisabled={
          (session.phase === 'interaction' || session.phase === 'recap') &&
          session.answerState !== 'correct'
        }
        onBack={back}
        onContinue={() => {
          if (session.phase === 'intro')
            return save(transitionReadingSession(session, { type: 'begin' }, context));
          if (session.phase === 'reading')
            return save(transitionReadingSession(session, { type: 'finish-reading' }, context));
          if (session.phase === 'complete')
            return hasNextChapter ? onNextChapter() : onBackToPath();
          continueFlow();
        }}
      />
      {(session.phase === 'interaction' || session.phase === 'recap') &&
        session.answerState === 'correct' && (
          <Button label={u('Done for now')} variant="secondary" onPress={onBackToPath} />
        )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    padding: 18,
    paddingBottom: 54,
    gap: 18,
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  title: { color: colors.ink, fontSize: 34, lineHeight: 40, fontWeight: '900' },
  card: { gap: 10 },
  reading: { gap: 14 },
  step: { color: colors.primary, fontSize: 14, fontWeight: '900' },
  sectionTitle: { color: colors.ink, fontSize: 24, lineHeight: 30, fontWeight: '900' },
  body: { color: colors.muted, fontSize: 16, lineHeight: 24 },
  meta: { color: colors.primary, fontSize: 15, fontWeight: '800' },
  nextCard: { gap: 5, paddingVertical: 14 },
  nextLabel: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  nextTitle: { color: colors.ink, fontSize: 18, lineHeight: 24, fontWeight: '900' },
  verse: { flexDirection: 'row', alignItems: 'flex-start', gap: 11 },
  verseNumber: { color: colors.gold, fontSize: 13, fontWeight: '900', paddingTop: 5, width: 24 },
  verseText: { flex: 1, color: colors.ink, fontSize: 19, lineHeight: 31 },
  chinese: { fontSize: 21, lineHeight: 36 },
  completeCard: { alignItems: 'center', gap: 10, paddingVertical: 34 },
  completeMark: { color: colors.mint, fontSize: 48, fontWeight: '900' },
  xpReward: { color: colors.gold, fontSize: 22, fontWeight: '900' },
});
