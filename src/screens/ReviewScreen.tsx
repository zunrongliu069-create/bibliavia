import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Button, ProgressBar } from '../components/ui';
import { characterById } from '../data/characters';
import { chestImageForTier } from '../data/chests';
import { pathById, pathForBook } from '../data/paths';
import {
  createLessonPlan,
  exactSentenceChoice,
  finishSentenceChoice,
  isLessonPlanStageEnd,
  lessonLevelForPlanEnd,
  lessonStageForPlanExercise,
  lessonStageStart,
  mustRetryLessonStep,
  nextVerseChoice,
  recommendedMode,
  understandingChoices,
  verseMatchPairs,
  wordChoice,
} from '../lib/exercise';
import { inferReviewGrade } from '../lib/adaptiveGrade';
import { answerWordDiff, mistakeFeedbackKey } from '../lib/answerFeedback';
import { heroGameplayEffects } from '../lib/characterBonuses';
import { t } from '../lib/i18n';
import { uiText } from '../lib/uiText';
import { learningSequence, nextVerseAfter } from '../lib/learningSequence';
import { lessonOutcome } from '../lib/lessonOutcome';
import { chestTierAfterTap, lessonChestTierForStage } from '../lib/rewards';
import {
  blankExercise,
  initials,
  lessonSectionForParts,
  normalizeRecall,
  recallAccuracy,
  reorderedWords,
  shortRecallExercise,
  tokenize,
  verseLearningChunks,
} from '../lib/tokenize';
import { colors, radius } from '../theme';
import type {
  ChestLoot,
  ChestReward,
  ExerciseMode,
  ReviewGrade,
  UiLanguage,
  Verse,
  VersePathLevel,
} from '../types';
import type { ReviewMode } from '../lib/reviewQueue';
import { useAppStore } from '../store/AppStore';

type SessionKind = 'lesson' | 'challenge' | 'chapterQuiz' | ReviewMode;

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult?: (event: {
    results: ArrayLike<{ 0: { transcript: string } }>;
    resultIndex: number;
  }) => void;
  onerror?: () => void;
  onend?: () => void;
  start: () => void;
  stop: () => void;
};
const lessonXp = [4, 5, 11, 3, 3, 5, 4, 3, 5, 7];
const stageTotals = [20, 35, 50];
const lessonWorld = require('../../assets/game/scriptora-path-world.png');

export function ReviewScreen({
  initialVerse,
  reviewVerses = [initialVerse],
  kind,
  onClose,
  onSessionComplete,
  successThreshold = 0.55,
}: {
  initialVerse: Verse;
  reviewVerses?: Verse[];
  kind: SessionKind;
  onClose: () => void;
  onSessionComplete?: (success: boolean) => void;
  successThreshold?: number;
}) {
  const store = useAppStore();
  const isChallenge = kind === 'challenge' || kind === 'chapterQuiz';
  const u = (text: string) => uiText(store.uiLanguage, text);
  const [lessonVerse, setLessonVerse] = useState(initialVerse);
  const lessonId = lessonVerse.id;
  const lessonChunks = useMemo(
    () => verseLearningChunks(lessonVerse.text, lessonVerse.languageTag),
    [lessonVerse.languageTag, lessonVerse.text],
  );
  const lessonPlan = useMemo(() => createLessonPlan(lessonChunks.length), [lessonChunks.length]);
  const focusedLessonPath = store.progress.focusedPathId
    ? pathById(store.progress.focusedPathId)
    : undefined;
  const lessonBeatId = `${initialVerse.bookId}-${initialVerse.chapter}-${initialVerse.verseStart}`;
  const lessonNode = focusedLessonPath
    ? store.progress.pathStates?.[focusedLessonPath.id]?.nodeProgress?.[lessonBeatId]
    : undefined;
  const savedResume = store.progress.lessonProgress[lessonId] ?? 0;
  const practiceStart = lessonStageStart(lessonPlan, 1);
  const masterStart = lessonStageStart(lessonPlan, 2);
  const resumeIndex =
    kind !== 'lesson'
      ? 0
      : lessonNode?.levels?.master
        ? masterStart
        : lessonNode?.levels?.practice
          ? masterStart
          : lessonNode?.levels?.learn
            ? Math.max(practiceStart, Math.min(masterStart - 1, savedResume))
            : Math.max(0, Math.min(practiceStart - 1, savedResume));
  const [phase, setPhase] = useState<'intro' | 'practice' | 'checkpoint' | 'reward'>('intro');
  const [pendingChestTier, setPendingChestTier] = useState(1);
  const [sessionScores, setSessionScores] = useState<number[]>([]);
  const [exerciseIndex, setExerciseIndex] = useState(resumeIndex);
  const [combo, setCombo] = useState(0);
  const [hearts, setHearts] = useState(3);
  const [guidedHintsUsed, setGuidedHintsUsed] = useState(0);
  const [mistakeShieldsUsed, setMistakeShieldsUsed] = useState(0);
  const [comboGuardsUsed, setComboGuardsUsed] = useState(0);
  const [guidedHintActive, setGuidedHintActive] = useState(false);
  const heroEffects = useMemo(
    () => heroGameplayEffects(store.progress),
    [store.progress.activeCharacters, store.progress.characterShards],
  );
  const [verse, setVerse] = useState(initialVerse);
  const sequence = useMemo(() => learningSequence(store.availableVerses), [store.availableVerses]);
  const reviewSequence = kind === 'lesson' ? [] : reviewVerses;
  const currentIndex =
    kind !== 'lesson'
      ? Math.max(
          0,
          reviewSequence.findIndex((item) => item.id === verse.id),
        )
      : exerciseIndex;
  const sessionCount = kind === 'lesson' ? lessonPlan.length : reviewSequence.length;
  const mastery = store.progress.mastery[verse.id];
  const [mode, setMode] = useState<ExerciseMode>(() =>
    kind === 'lesson'
      ? lessonPlan[resumeIndex]!.mode
      : isChallenge
        ? 'recall'
        : recommendedMode(store.progress.mastery[initialVerse.id]),
  );
  const [answer, setAnswer] = useState('');
  const [reorderSelection, setReorderSelection] = useState<number[]>([]);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [selectedPairLeft, setSelectedPairLeft] = useState<string | null>(null);
  const [selectedPairRight, setSelectedPairRight] = useState<string | null>(null);
  const [matchedPairIds, setMatchedPairIds] = useState<string[]>([]);
  const [pairMistakes, setPairMistakes] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [hints, setHints] = useState(0);
  const visibleHints = hints + (guidedHintActive ? 1 : 0);
  const [accuracy, setAccuracy] = useState(0);
  const [suggestedGrade, setSuggestedGrade] = useState<ReviewGrade>('good');
  const [minorDifferences, setMinorDifferences] = useState(false);
  const [listening, setListening] = useState(false);
  const [playingAudio, setPlayingAudio] = useState(false);
  const [xpFeedback, setXpFeedback] = useState<number | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const advancingRef = useRef(false);
  const startedAt = useRef(Date.now());
  const sessionId = useRef(`${kind}-${lessonId}-${Date.now()}`);
  const lessonStep = lessonPlan[Math.min(exerciseIndex, lessonPlan.length - 1)]!;
  const lessonSection = useMemo(
    () =>
      lessonSectionForParts(
        verse.text,
        verse.languageTag,
        kind === 'lesson' && lessonStep.scope !== 'full' && lessonStep.scope !== 'structure'
          ? lessonStep.partStart
          : undefined,
        kind === 'lesson' && lessonStep.scope !== 'full' && lessonStep.scope !== 'structure'
          ? lessonStep.partEnd
          : undefined,
      ),
    [
      kind,
      lessonStep.partEnd,
      lessonStep.partStart,
      lessonStep.scope,
      verse.languageTag,
      verse.text,
    ],
  );
  const exerciseVerse = useMemo(
    () => ({ ...verse, text: lessonSection.text }),
    [lessonSection.text, verse],
  );
  const choice = useMemo(() => wordChoice(exerciseVerse), [exerciseVerse]);
  const lightGaps = useMemo(
    () => blankExercise(lessonSection.text, verse.languageTag, 0.35),
    [lessonSection.text, verse.languageTag],
  );
  const strongGaps = useMemo(
    () => blankExercise(lessonSection.text, verse.languageTag, 0.65),
    [lessonSection.text, verse.languageTag],
  );
  const initialPhrase = useMemo(
    () => shortRecallExercise(lessonSection.text, verse.languageTag, 'start'),
    [lessonSection.text, verse.languageTag],
  );
  const keywordPhrase = useMemo(
    () => shortRecallExercise(lessonSection.text, verse.languageTag, 'middle'),
    [lessonSection.text, verse.languageTag],
  );
  const finishChoice = useMemo(() => finishSentenceChoice(exerciseVerse), [exerciseVerse]);
  const sentenceChoice = useMemo(() => exactSentenceChoice(exerciseVerse), [exerciseVerse]);
  const understanding = useMemo(() => understandingChoices(verse), [verse]);
  const shuffled = useMemo(
    () => reorderedWords(lessonSection.text, verse.languageTag),
    [lessonSection.text, verse.languageTag],
  );
  const sequenceIndex = sequence.findIndex((item) => item.id === verse.id);
  const previousVerse = sequence[sequenceIndex - 1];
  const nextVerse = sequence[sequenceIndex + 1];
  const followingVerse = sequence[sequenceIndex + 2];
  const contextChoice = useMemo(
    () => nextVerseChoice(verse, nextVerse, followingVerse),
    [verse, nextVerse, followingVerse],
  );
  const matchPairs = useMemo(
    () =>
      verseMatchPairs(
        sequence.slice(Math.max(0, sequenceIndex), Math.max(0, sequenceIndex) + 3),
        verse.languageTag,
      ),
    [sequence, sequenceIndex, verse.languageTag],
  );
  const matchRightOptions = useMemo(() => [...matchPairs].reverse(), [matchPairs]);
  const recommended = recommendedMode(mastery);
  const stageIndex = lessonStageForPlanExercise(lessonPlan, exerciseIndex);
  const stageLabel = [
    t(store.uiLanguage, 'stageLearn'),
    t(store.uiLanguage, 'stagePractice'),
    t(store.uiLanguage, 'stageMaster'),
  ][stageIndex]!;
  const answerTarget =
    mode === 'blanks'
      ? lightGaps.answer
      : mode === 'moreBlanks'
        ? strongGaps.answer
        : mode === 'initials'
          ? lessonSection.text
          : mode === 'keywords'
            ? keywordPhrase.phrase
            : mode === 'context'
              ? initialPhrase.phrase
              : lessonSection.text;
  const answerDiff = useMemo(
    () => answerWordDiff(answerTarget, answer, verse.languageTag),
    [answerTarget, answer, verse.languageTag],
  );
  useEffect(() => {
    if (Platform.OS === 'web') globalThis.scrollTo?.(0, 0);
  }, [phase, exerciseIndex]);
  useEffect(
    () => () => {
      Speech.stop();
      recognitionRef.current?.stop();
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    },
    [],
  );

  const labels: Record<ExerciseMode, string> = {
    read: t(store.uiLanguage, 'readMode'),
    understand: t(store.uiLanguage, 'understandMode'),
    listen: t(store.uiLanguage, 'listenMode'),
    blanks: t(store.uiLanguage, 'blanksMode'),
    moreBlanks: t(store.uiLanguage, 'moreBlanksMode'),
    reorder: t(store.uiLanguage, 'reorderMode'),
    choice: t(store.uiLanguage, 'choiceMode'),
    finish: t(store.uiLanguage, 'finishMode'),
    sentenceCheck: t(store.uiLanguage, 'sentenceCheckMode'),
    match: t(store.uiLanguage, 'matchMode'),
    contextChoice: t(store.uiLanguage, 'contextChoiceMode'),
    initials: t(store.uiLanguage, 'initialsMode'),
    keywords: t(store.uiLanguage, 'keywordsMode'),
    recall: t(store.uiLanguage, 'recallMode'),
    speak: t(store.uiLanguage, 'speakMode'),
    context: t(store.uiLanguage, 'contextMode'),
  };

  const prompt = useMemo(() => {
    if (mode === 'read')
      return kind === 'lesson' && lessonStep.scope === 'structure'
        ? lessonChunks
            .map((chunk, index) => `${String.fromCharCode(65 + index)} · ${chunk}`)
            .join('\n\n')
        : lessonSection.text;
    if (mode === 'blanks')
      return `${lightGaps.prompt}\n\n${t(store.uiLanguage, 'missingWordsOnly')}`;
    if (mode === 'moreBlanks')
      return `${strongGaps.prompt}\n\n${t(store.uiLanguage, 'missingWordsOnly')}`;
    if (mode === 'initials')
      return `${initials(lessonSection.text, verse.languageTag)}\n\n${t(store.uiLanguage, 'shortPhrasePrompt')}`;
    if (mode === 'keywords')
      return `${keywordPhrase.keywords}\n\n${t(store.uiLanguage, 'shortPhrasePrompt')}`;
    if (mode === 'choice') return choice.prompt;
    if (mode === 'finish') return finishChoice.prompt;
    if (mode === 'sentenceCheck')
      return `${sentenceChoice.statement}\n\n${t(store.uiLanguage, 'exactSentencePrompt')}`;
    if (mode === 'match') return t(store.uiLanguage, 'matchPrompt');
    if (mode === 'contextChoice')
      return `${contextChoice.prompt}\n\n${t(store.uiLanguage, 'nextVerseChoicePrompt')}`;
    if (mode === 'listen') return t(store.uiLanguage, 'listenPrompt');
    if (mode === 'speak') return t(store.uiLanguage, 'speakPrompt');
    if (mode === 'understand') return t(store.uiLanguage, 'understandingPrompt');
    if (mode === 'context')
      return previousVerse
        ? `${previousVerse.reference}\n${previousVerse.text}\n\n${t(store.uiLanguage, 'contextShortPrompt')}`
        : `${verse.reference}\n${t(store.uiLanguage, 'shortPhrasePrompt')}`;
    if (mode === 'reorder') return t(store.uiLanguage, 'reorderPrompt');
    return verse.reference;
  }, [
    mode,
    verse,
    choice,
    finishChoice,
    sentenceChoice,
    contextChoice,
    previousVerse,
    lightGaps,
    strongGaps,
    initialPhrase,
    keywordPhrase,
    kind,
    lessonChunks,
    lessonStep.scope,
    lessonSection.text,
    store.uiLanguage,
  ]);

  const hintText = useMemo(
    () =>
      tokenize(answerTarget, verse.languageTag)
        .slice(0, Math.min(2 + visibleHints * 2, 6))
        .join(verse.languageTag.startsWith('zh') ? '' : ' '),
    [answerTarget, verse.languageTag, visibleHints],
  );
  const usesTextInput = ![
    'read',
    'understand',
    'choice',
    'finish',
    'sentenceCheck',
    'match',
    'contextChoice',
    'reorder',
    'listen',
  ].includes(mode);

  const reorderAnswer = (indexes: number[]) =>
    indexes
      .map((index) => shuffled[index] ?? '')
      .join(verse.languageTag.startsWith('zh') ? '' : ' ');
  const resetAttempt = (nextMode: ExerciseMode) => {
    setMode(nextMode);
    setAnswer('');
    setReorderSelection([]);
    setSelectedChoice(null);
    setSelectedPairLeft(null);
    setSelectedPairRight(null);
    setMatchedPairIds([]);
    setPairMistakes(0);
    setRevealed(false);
    setHints(0);
    setGuidedHintActive(false);
    setAccuracy(0);
    setSuggestedGrade('good');
    setMinorDifferences(false);
    setListening(false);
    startedAt.current = Date.now();
  };
  const addReorderToken = (index: number) => {
    if (reorderSelection.includes(index)) return;
    const next = [...reorderSelection, index];
    setReorderSelection(next);
    setAnswer(reorderAnswer(next));
  };
  const removeReorderToken = (position: number) => {
    const next = reorderSelection.filter((_, index) => index !== position);
    setReorderSelection(next);
    setAnswer(reorderAnswer(next));
  };
  const chooseMatch = (side: 'left' | 'right', id: string) => {
    const left = side === 'left' ? id : selectedPairLeft;
    const right = side === 'right' ? id : selectedPairRight;
    if (side === 'left') setSelectedPairLeft(id);
    else setSelectedPairRight(id);
    if (left && right) {
      if (left === right) setMatchedPairIds((old) => (old.includes(left) ? old : [...old, left]));
      else setPairMistakes((old) => old + 1);
      setSelectedPairLeft(null);
      setSelectedPairRight(null);
    }
  };
  const openCurrentChest = (tier: number) => {
    setPendingChestTier(tier);
    setPhase('reward');
  };
  const recordSessionPath = (scores: number[], level?: VersePathLevel) => {
    const average = scores.length
      ? scores.reduce((sum, item) => sum + item, 0) / scores.length
      : 0.7;
    const activity = kind === 'lesson' ? 'memorization' : isChallenge ? 'challenge' : 'review';
    const verseBeatId = `${verse.bookId}-${verse.chapter}-${verse.verseStart}`;
    const chapterBeatId = `${verse.bookId}-${verse.chapter}`;
    const focusedPath = store.progress.focusedPathId
      ? pathById(store.progress.focusedPathId)
      : undefined;
    const beatId = focusedPath?.structure === 'chapter' ? chapterBeatId : verseBeatId;
    const focusedHasNode = focusedPath?.beats?.some((beat) => beat.id === beatId);
    const defaultPath = pathForBook(verse.bookId, 'memorization');
    const focusedPathId = store.progress.focusedPathId;
    const path =
      focusedPath && focusedHasNode && store.progress.activePathIds?.includes(focusedPathId ?? '')
        ? focusedPath
        : defaultPath;
    if (!path) return;
    store.recordPathActivity({
      pathId: path.id,
      beatId,
      activity,
      quality: activity === 'challenge' ? 1 + Math.max(0, average - 0.8) * 1.5 : average,
      success: average >= 0.55,
      completion:
        kind === 'lesson' && level && path.structure === 'verse'
          ? { type: 'verse-level', level }
          : kind === 'chapterQuiz' && average >= 0.55 && path.structure === 'chapter'
            ? { type: 'chapter-part', part: 'quiz' }
            : undefined,
    });
  };
  const nextLessonVerse = nextVerseAfter(sequence, lessonVerse.id);
  const startNextVerse = () => {
    if (!nextLessonVerse) {
      onClose();
      return;
    }
    store.setLessonProgress(nextLessonVerse.id, 0);
    if (
      nextLessonVerse.bookId !== lessonVerse.bookId &&
      (nextLessonVerse.bookId === 'romans' || nextLessonVerse.bookId === 'proverbs')
    )
      store.setCampaign(nextLessonVerse.bookId);
    setLessonVerse(nextLessonVerse);
    setVerse(nextLessonVerse);
    setExerciseIndex(0);
    setSessionScores([]);
    setCombo(0);
    setHearts(3);
    setGuidedHintsUsed(0);
    setMistakeShieldsUsed(0);
    setComboGuardsUsed(0);
    sessionId.current = `lesson-${nextLessonVerse.id}-${Date.now()}`;
    resetAttempt('read');
    setPhase('practice');
  };
  const reveal = () => {
    const recallMs = Date.now() - startedAt.current;
    const score =
      mode === 'read' || mode === 'listen'
        ? 1
        : mode === 'understand'
          ? understanding.find((item) => item.label === selectedChoice)?.correct
            ? 1
            : 0
          : mode === 'choice'
            ? selectedChoice === choice.correct
              ? 1
              : 0
            : mode === 'finish'
              ? selectedChoice === finishChoice.correct
                ? 1
                : 0
              : mode === 'sentenceCheck'
                ? selectedChoice === sentenceChoice.correct
                  ? 1
                  : 0
                : mode === 'contextChoice'
                  ? selectedChoice === contextChoice.correct
                    ? 1
                    : 0
                  : mode === 'match'
                    ? matchedPairIds.length / Math.max(1, matchPairs.length + pairMistakes)
                    : recallAccuracy(answerTarget, answer);
    const normalizedExpected = normalizeRecall(answerTarget).join(' ');
    const normalizedAnswer = normalizeRecall(answer).join(' ');
    const isRecallAnswer = usesTextInput;
    setAccuracy(score);
    setSuggestedGrade(
      mode === 'read' || mode === 'listen'
        ? 'good'
        : inferReviewGrade({
            accuracy: score,
            hintsUsed: hints,
            recallMs,
            wordCount: tokenize(answerTarget, verse.languageTag).length,
          }),
    );
    setMinorDifferences(isRecallAnswer && score >= 0.9 && normalizedExpected !== normalizedAnswer);
    setRevealed(true);
  };
  const grade = (gradeValue: ReviewGrade) => {
    if (advancingRef.current) return;
    advancingRef.current = true;
    const score = mode === 'read' || mode === 'listen' ? 1 : accuracy;
    const baseOutcome = lessonOutcome(gradeValue, score);
    const success =
      kind === 'lesson' && lessonStep.gate
        ? !mustRetryLessonStep(lessonStep, gradeValue, score)
        : baseOutcome.success;
    const now = new Date();
    const alreadyReceivedFailureProgress = store.progress.reviews.some(
      (review) =>
        review.verseId === verse.id &&
        review.grade === 'again' &&
        new Date(review.reviewedAt).toDateString() === now.toDateString(),
    );
    const fixedXp = success
      ? kind !== 'lesson'
        ? 5
        : (lessonXp[exerciseIndex] ?? 0)
      : alreadyReceivedFailureProgress
        ? 0
        : 1;
    const awardedXp = store.recordReview({
      verse,
      grade: gradeValue,
      mode,
      accuracy: score,
      hintsUsed: hints,
      recallMs: Date.now() - startedAt.current,
      xpOverride: fixedXp,
    });
    setXpFeedback(awardedXp);
    const nextScores = [...sessionScores, score];
    setSessionScores(nextScores);
    const protectsHeart = !success && mistakeShieldsUsed < heroEffects.mistakeShields;
    const protectsCombo = !success && comboGuardsUsed < heroEffects.comboGuards;
    if (success) setCombo((old) => old + 1);
    else if (protectsCombo) setComboGuardsUsed((old) => old + 1);
    else setCombo(0);
    if (protectsHeart) setMistakeShieldsUsed((old) => old + 1);
    store.emitFeedback({
      type: success ? 'ACTIVITY_CORRECT' : 'ACTIVITY_WRONG',
      tier: 1,
      tone: 'reflective',
      message: success
        ? u('Correct')
        : [
            u('Wrong'),
            protectsHeart ? u('Hero protected a heart') : '',
            protectsCombo ? u('Hero kept the combo') : '',
          ]
            .filter(Boolean)
            .join(' · '),
    });
    if (!success && !protectsHeart) setHearts((old) => Math.max(0, old - 1));
    advanceTimerRef.current = setTimeout(() => {
      setXpFeedback(null);
      advancingRef.current = false;
      if (kind !== 'lesson') {
        const nextVerse = reviewSequence[currentIndex + 1];
        if (!nextVerse) {
          const average = nextScores.reduce((sum, item) => sum + item, 0) / nextScores.length;
          if (onSessionComplete) onSessionComplete(average >= successThreshold);
          else recordSessionPath(nextScores);
          openCurrentChest(1);
          return;
        }
        setVerse(nextVerse);
        resetAttempt(
          isChallenge ? 'recall' : recommendedMode(store.progress.mastery[nextVerse.id]),
        );
        return;
      }
      if (kind === 'lesson' && mustRetryLessonStep(lessonStep, gradeValue, score)) {
        resetAttempt(mode);
        return;
      }
      const nextIndex = exerciseIndex + 1;
      if (nextIndex >= lessonPlan.length) store.completeLesson(lessonId);
      else store.setLessonProgress(lessonId, nextIndex);
      setExerciseIndex(nextIndex);
      if (isLessonPlanStageEnd(lessonPlan, nextIndex)) {
        recordSessionPath(nextScores, lessonLevelForPlanEnd(lessonPlan, nextIndex));
        setPhase('checkpoint');
        return;
      }
      resetAttempt(lessonPlan[nextIndex]!.mode);
    }, 1100);
  };

  const skipOptionalExercise = () => {
    Speech.stop();
    recognitionRef.current?.stop();
    setPlayingAudio(false);
    setListening(false);
    if (kind !== 'lesson') {
      const nextReviewVerse = reviewSequence[currentIndex + 1];
      if (!nextReviewVerse) return onClose();
      setVerse(nextReviewVerse);
      resetAttempt(
        isChallenge ? 'recall' : recommendedMode(store.progress.mastery[nextReviewVerse.id]),
      );
      return;
    }
    const nextIndex = exerciseIndex + 1;
    if (nextIndex >= lessonPlan.length) store.completeLesson(lessonId);
    else store.setLessonProgress(lessonId, nextIndex);
    setExerciseIndex(nextIndex);
    if (isLessonPlanStageEnd(lessonPlan, nextIndex)) {
      recordSessionPath(sessionScores, lessonLevelForPlanEnd(lessonPlan, nextIndex));
      setPhase('checkpoint');
      return;
    }
    resetAttempt(lessonPlan[nextIndex]!.mode);
  };

  const playVerse = () => {
    if (playingAudio) {
      Speech.stop();
      setPlayingAudio(false);
      return;
    }
    Speech.speak(lessonSection.text, {
      language: verse.languageTag,
      rate: 0.82,
      onStart: () => setPlayingAudio(true),
      onDone: () => setPlayingAudio(false),
      onStopped: () => setPlayingAudio(false),
      onError: () => setPlayingAudio(false),
    });
  };

  const startSpeech = () => {
    const root = globalThis as typeof globalThis & {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const Constructor = root.SpeechRecognition ?? root.webkitSpeechRecognition;
    if (!Constructor) {
      setAnswer(u('Speech recognition is not available on this device.'));
      return;
    }
    const recognition = new Constructor();
    recognition.lang = verse.languageTag;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const result = event.results[event.resultIndex];
      if (result?.[0]?.transcript) setAnswer(result[0].transcript);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  };

  if (phase === 'intro')
    return (
      <LessonIntro
        verse={lessonVerse}
        count={sessionCount}
        language={store.uiLanguage}
        kind={kind === 'lesson' ? 'lesson' : 'quick'}
        resumeIndex={resumeIndex}
        resumeStage={lessonStageForPlanExercise(lessonPlan, resumeIndex)}
        onStart={() => setPhase('practice')}
        onClose={onClose}
      />
    );
  if (phase === 'checkpoint') {
    const completedStage = lessonStageForPlanExercise(lessonPlan, Math.max(0, exerciseIndex - 1));
    const checkpointChestTier = lessonChestTierForStage(completedStage);
    return (
      <StageCheckpoint
        language={store.uiLanguage}
        stageIndex={completedStage}
        scores={sessionScores}
        hearts={hearts}
        onFinish={() => (checkpointChestTier ? openCurrentChest(checkpointChestTier) : onClose())}
        onContinue={() => {
          setHearts((old) => Math.min(3, old + 1));
          if (exerciseIndex >= lessonPlan.length) {
            openCurrentChest(lessonChestTierForStage(2)!);
            return;
          }
          resetAttempt(lessonPlan[exerciseIndex]!.mode);
          setPhase('practice');
        }}
      />
    );
  }
  if (phase === 'reward')
    return (
      <ChestRewardScreen
        language={store.uiLanguage}
        baseTier={pendingChestTier}
        seed={sessionId.current}
        scores={sessionScores}
        onReveal={(tier) => store.openChest(`${sessionId.current}-chest`, tier)}
        nextVerse={kind === 'lesson' ? nextLessonVerse : undefined}
        onNext={kind === 'lesson' ? startNextVerse : onClose}
        onClose={onClose}
      />
    );

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ImageBackground
        source={lessonWorld}
        resizeMode="cover"
        style={styles.adventureBackground}
        imageStyle={styles.adventureImage}
      >
        <View style={styles.adventureScrim} />
        {xpFeedback !== null && (
          <View pointerEvents="none" accessibilityLiveRegion="assertive" style={styles.xpFeedback}>
            <Ionicons name="star" size={22} color="#2A1455" />
            <Text style={styles.xpFeedbackText}>
              {xpFeedback > 0 ? '+' : ''}
              {xpFeedback} XP
            </Text>
          </View>
        )}
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            onPress={onClose}
            style={styles.stopButton}
            accessibilityLabel={t(store.uiLanguage, 'stopLesson')}
          >
            <Ionicons name="close" size={20} color="#FFD66B" />
            <Text style={styles.stopText}>{t(store.uiLanguage, 'stopLesson')}</Text>
          </Pressable>
          {kind === 'lesson' && (
            <View style={styles.hearts}>
              <Ionicons name="heart" size={17} color="#FF8D7D" />
              <Text style={styles.heartsText}>{hearts}/3</Text>
            </View>
          )}
          <View style={styles.headerProgress}>
            <ProgressBar value={(currentIndex + 1) / sessionCount} color="#A46BFF" />
          </View>
          <Text style={styles.sequenceCount}>
            {currentIndex + 1}/{sessionCount}
          </Text>
        </View>
        <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
          <View style={styles.practiceCard}>
            <View style={styles.adaptive}>
              <Ionicons
                name={kind !== 'lesson' ? 'flash' : 'layers'}
                size={18}
                color={colors.primary}
              />
              <Text style={styles.adaptiveText}>
                {kind !== 'lesson'
                  ? t(
                      store.uiLanguage,
                      kind === 'quick'
                        ? 'quickPractice'
                        : kind === 'normal'
                          ? 'normalReview'
                          : 'fullReview',
                    )
                  : `${stageLabel} · ${labels[mode]}`}
              </Text>
              <Text style={styles.combo}>
                {combo > 1 ? `${combo}× ${t(store.uiLanguage, 'combo')}` : ''}
              </Text>
            </View>
            <View style={styles.referenceRow}>
              <Text style={styles.referenceEyebrow}>{verse.reference.toUpperCase()}</Text>
              <Text style={styles.stage}>{u(mastery?.stage ?? 'new')}</Text>
            </View>
            <View style={styles.masteryRow}>
              <Strength
                label={t(store.uiLanguage, 'recognition')}
                value={mastery?.recognitionStrength ?? 0}
                color={colors.gold}
              />
              <Strength
                label={t(store.uiLanguage, 'recallStrength')}
                value={mastery?.recallStrength ?? 0}
                color={colors.mint}
              />
            </View>
            {!lessonSection.fullVerse && (
              <Text style={styles.sectionLabel}>
                {u('Verse part')} {lessonSection.partStart}
                {lessonSection.partEnd > lessonSection.partStart
                  ? `–${lessonSection.partEnd}`
                  : ''}{' '}
                / {lessonSection.partCount}
              </Text>
            )}
            <Text
              selectable
              style={[styles.prompt, verse.languageTag.startsWith('zh') && styles.chinese]}
            >
              {prompt}
            </Text>
            {mode === 'speak' && (
              <Button
                label={u(listening ? 'Stop speaking' : 'Start speaking')}
                variant="secondary"
                onPress={() => (listening ? recognitionRef.current?.stop() : startSpeech())}
              />
            )}
            {mode === 'listen' && (
              <Button
                label={u(playingAudio ? 'Stop audio' : 'Play verse')}
                variant="secondary"
                onPress={playVerse}
              />
            )}
            {mode === 'understand' && (
              <View style={styles.choices}>
                {understanding.map((item) => (
                  <Choice
                    key={item.label}
                    label={item.label}
                    selected={selectedChoice === item.label}
                    onPress={() => setSelectedChoice(item.label)}
                  />
                ))}
              </View>
            )}
            {mode === 'choice' && (
              <View style={styles.wordChoices}>
                {choice.options.map((item) => (
                  <Choice
                    key={item}
                    label={item}
                    selected={selectedChoice === item}
                    onPress={() => setSelectedChoice(item)}
                  />
                ))}
              </View>
            )}
            {mode === 'finish' && (
              <View style={styles.twoChoices}>
                {finishChoice.options.map((item) => (
                  <Choice
                    key={item}
                    label={item}
                    selected={selectedChoice === item}
                    onPress={() => setSelectedChoice(item)}
                  />
                ))}
              </View>
            )}
            {mode === 'sentenceCheck' && (
              <View style={styles.twoChoices}>
                <Choice
                  label={t(store.uiLanguage, 'yesExact')}
                  selected={selectedChoice === 'yes'}
                  onPress={() => setSelectedChoice('yes')}
                />
                <Choice
                  label={t(store.uiLanguage, 'notExact')}
                  selected={selectedChoice === 'no'}
                  onPress={() => setSelectedChoice('no')}
                />
              </View>
            )}
            {mode === 'contextChoice' && (
              <View style={styles.choices}>
                {contextChoice.options.map((item) => (
                  <Choice
                    key={item}
                    label={item}
                    selected={selectedChoice === item}
                    onPress={() => setSelectedChoice(item)}
                  />
                ))}
              </View>
            )}
            {mode === 'match' && (
              <View style={styles.matchGrid}>
                <View style={styles.matchColumn}>
                  {matchPairs.map((item) => (
                    <Choice
                      key={`l-${item.id}`}
                      label={item.left}
                      selected={selectedPairLeft === item.id || matchedPairIds.includes(item.id)}
                      disabled={matchedPairIds.includes(item.id)}
                      onPress={() => chooseMatch('left', item.id)}
                    />
                  ))}
                </View>
                <View style={styles.matchColumn}>
                  {matchRightOptions.map((item) => (
                    <Choice
                      key={`r-${item.id}`}
                      label={item.right}
                      selected={selectedPairRight === item.id || matchedPairIds.includes(item.id)}
                      disabled={matchedPairIds.includes(item.id)}
                      onPress={() => chooseMatch('right', item.id)}
                    />
                  ))}
                </View>
              </View>
            )}
            {mode === 'reorder' && (
              <>
                <View style={styles.answerBuilder}>
                  {reorderSelection.length ? (
                    <View style={styles.selectedTokens}>
                      {reorderSelection.map((tokenIndex, position) => (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`${shuffled[tokenIndex]} · ${t(store.uiLanguage, 'removeWord')}`}
                          key={`${tokenIndex}-${position}`}
                          style={styles.selectedToken}
                          onPress={() => removeReorderToken(position)}
                        >
                          <Text style={styles.selectedTokenText}>{shuffled[tokenIndex]}</Text>
                          <Ionicons name="close-circle" size={16} color={colors.primary} />
                        </Pressable>
                      ))}
                    </View>
                  ) : (
                    <Text style={styles.answerBuilderText}>…</Text>
                  )}
                </View>
                <View style={styles.tokens}>
                  {shuffled.map((word, index) => {
                    const used = reorderSelection.includes(index);
                    return (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={word}
                        accessibilityState={{ disabled: used }}
                        disabled={used}
                        key={`${word}-${index}`}
                        style={[styles.token, used && styles.tokenUsed]}
                        onPress={() => addReorderToken(index)}
                      >
                        <Text style={styles.tokenText}>{word}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Button
                  label={t(store.uiLanguage, 'clearAnswer')}
                  variant="secondary"
                  onPress={() => {
                    setReorderSelection([]);
                    setAnswer('');
                  }}
                />
              </>
            )}
            {usesTextInput && (
              <TextInput
                multiline
                value={answer}
                onChangeText={setAnswer}
                placeholder={
                  mode === 'recall'
                    ? t(store.uiLanguage, 'recallMode')
                    : t(store.uiLanguage, 'shortAnswer')
                }
                placeholderTextColor={colors.muted}
                style={[styles.input, verse.languageTag.startsWith('zh') && styles.chinese]}
                autoCorrect={false}
                accessibilityLabel={u('Your recalled verse')}
              />
            )}
            {visibleHints > 0 && !revealed && (
              <View style={styles.hint}>
                <Ionicons name="bulb" color={colors.gold} size={19} />
                <Text style={styles.hintText}>{hintText}…</Text>
              </View>
            )}
            {!revealed ? (
              <View style={styles.actions}>
                {(mode === 'listen' || mode === 'speak') && (
                  <Button
                    label={u('Skip exercise')}
                    variant="ghost"
                    onPress={skipOptionalExercise}
                  />
                )}
                {mode !== 'read' && !(kind === 'lesson' && stageIndex === 2) && (
                  <Button
                    label={t(store.uiLanguage, 'showHint')}
                    variant="secondary"
                    onPress={() => {
                      if (guidedHintsUsed < heroEffects.guidedHints) {
                        setGuidedHintsUsed((old) => old + 1);
                        setGuidedHintActive(true);
                        store.emitFeedback({
                          type: 'ACTIVITY_PARTIAL',
                          tier: 1,
                          tone: 'reflective',
                          message: u('Hero revealed a guided hint'),
                        });
                      } else setHints((old) => old + 1);
                    }}
                  />
                )}
                <Button
                  label={
                    mode === 'read' || mode === 'listen'
                      ? t(store.uiLanguage, 'continue')
                      : t(store.uiLanguage, 'check')
                  }
                  onPress={reveal}
                />
              </View>
            ) : (
              <View style={styles.answerPanel}>
                <View style={styles.scoreRow}>
                  <Text style={styles.answerTitle}>{t(store.uiLanguage, 'accuracy')}</Text>
                  <Text
                    style={[
                      styles.score,
                      {
                        color:
                          accuracy >= 0.9
                            ? colors.mint
                            : accuracy >= 0.6
                              ? colors.gold
                              : colors.coral,
                      },
                    ]}
                  >
                    {Math.round(accuracy * 100)}%
                  </Text>
                </View>
                <View
                  style={[
                    styles.acceptance,
                    {
                      borderColor:
                        accuracy >= 0.9
                          ? colors.mint
                          : accuracy >= 0.55
                            ? colors.gold
                            : colors.coral,
                    },
                  ]}
                >
                  <Ionicons
                    name={
                      accuracy >= 0.9
                        ? 'checkmark-circle'
                        : accuracy >= 0.55
                          ? 'analytics'
                          : 'refresh-circle'
                    }
                    size={20}
                    color={
                      accuracy >= 0.9 ? colors.mint : accuracy >= 0.55 ? colors.gold : colors.coral
                    }
                  />
                  <Text style={styles.acceptanceText}>
                    {mode === 'read'
                      ? t(store.uiLanguage, 'stepComplete')
                      : minorDifferences
                        ? t(store.uiLanguage, 'acceptedMinor')
                        : accuracy >= 0.9
                          ? t(store.uiLanguage, 'acceptedCorrect')
                          : accuracy >= 0.55
                            ? t(store.uiLanguage, 'acceptedPractice')
                            : t(store.uiLanguage, 'tryAgainSoon')}
                  </Text>
                </View>
                {mode !== 'read' && (
                  <Text style={styles.mistakeFeedback}>
                    {t(store.uiLanguage, mistakeFeedbackKey(mode, accuracy, answerDiff))}
                  </Text>
                )}
                {usesTextInput && answerDiff.tokens.length > 0 && (
                  <View style={styles.wordDiff} accessibilityRole="text">
                    {answerDiff.tokens.map((token, index) => {
                      const symbol =
                        token.kind === 'correct'
                          ? '✓'
                          : token.kind === 'minor'
                            ? '~'
                            : token.kind === 'missing'
                              ? '−'
                              : token.kind === 'extra'
                                ? '+'
                                : '↔';
                      const text =
                        token.kind === 'changed'
                          ? `${token.actual} → ${token.expected}`
                          : token.kind === 'missing'
                            ? token.expected
                            : token.actual;
                      return (
                        <Text
                          key={`${index}-${token.kind}-${text}`}
                          style={[
                            styles.diffToken,
                            token.kind === 'correct'
                              ? styles.diffCorrect
                              : token.kind === 'minor'
                                ? styles.diffMinor
                                : token.kind === 'extra'
                                  ? styles.diffExtra
                                  : styles.diffWrong,
                          ]}
                        >
                          {symbol} {text}
                        </Text>
                      );
                    })}
                  </View>
                )}
                {mode !== 'read' && (
                  <Text
                    selectable
                    style={[
                      styles.answerText,
                      verse.languageTag.startsWith('zh') && styles.chinese,
                    ]}
                  >
                    {usesTextInput && mode !== 'recall' && mode !== 'speak'
                      ? answerTarget
                      : lessonSection.text}
                  </Text>
                )}
                <Button
                  label={`${t(store.uiLanguage, 'continue')} · ${t(store.uiLanguage, suggestedGrade)}`}
                  disabled={xpFeedback !== null}
                  onPress={() => grade(suggestedGrade)}
                />
                <Text style={styles.gradeHint}>{t(store.uiLanguage, 'adaptiveAssessment')}</Text>
                <View style={styles.grades}>
                  <Grade
                    language={store.uiLanguage}
                    icon="refresh"
                    label={t(store.uiLanguage, 'again')}
                    color={colors.coral}
                    recommended={suggestedGrade === 'again'}
                    onPress={() => grade('again')}
                  />
                  <Grade
                    language={store.uiLanguage}
                    icon="analytics"
                    label={t(store.uiLanguage, 'hard')}
                    color={colors.gold}
                    recommended={suggestedGrade === 'hard'}
                    onPress={() => grade('hard')}
                  />
                  <Grade
                    language={store.uiLanguage}
                    icon="checkmark"
                    label={t(store.uiLanguage, 'good')}
                    color={colors.mint}
                    recommended={suggestedGrade === 'good'}
                    onPress={() => grade('good')}
                  />
                  <Grade
                    language={store.uiLanguage}
                    icon="flash"
                    label={t(store.uiLanguage, 'easy')}
                    color={colors.primary}
                    recommended={suggestedGrade === 'easy'}
                    onPress={() => grade('easy')}
                  />
                </View>
              </View>
            )}
            <Text style={styles.source}>
              {verse.translationId.toUpperCase()} · {t(store.uiLanguage, 'source')}
            </Text>
          </View>
        </ScrollView>
      </ImageBackground>
    </KeyboardAvoidingView>
  );
}

function AdventureShell({ children }: { children: React.ReactNode }) {
  return (
    <ImageBackground
      source={lessonWorld}
      resizeMode="cover"
      style={styles.adventureBackground}
      imageStyle={styles.adventureImage}
    >
      <View style={styles.adventureScrim} />
      <View style={styles.lessonShell}>
        <View style={styles.lessonPanel}>{children}</View>
      </View>
    </ImageBackground>
  );
}

function LessonIntro({
  verse,
  count,
  language,
  kind,
  resumeIndex,
  resumeStage,
  onStart,
  onClose,
}: {
  verse: Verse;
  count: number;
  language: UiLanguage;
  kind: 'lesson' | 'quick';
  resumeIndex: number;
  resumeStage: 0 | 1 | 2;
  onStart: () => void;
  onClose: () => void;
}) {
  const resumeStageLabel = [
    t(language, 'stageLearn'),
    t(language, 'stagePractice'),
    t(language, 'stageMaster'),
  ][resumeStage]!;
  return (
    <AdventureShell>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={uiText(language, 'Close lesson introduction')}
        onPress={onClose}
        style={styles.introClose}
      >
        <Ionicons name="close" size={25} color="#F8DA78" />
      </Pressable>
      <View style={styles.lessonHero}>
        <View style={[styles.lessonIcon, kind === 'quick' && { backgroundColor: colors.gold }]}>
          <Ionicons name={kind === 'quick' ? 'flash' : 'star'} size={42} color={colors.white} />
        </View>
        <Text style={styles.gameEyebrow}>
          {(kind === 'quick' ? t(language, 'quickPractice') : t(language, 'lesson')).toUpperCase()}
        </Text>
        <Text style={styles.lessonTitle}>{verse.reference}</Text>
        <Text style={styles.lessonSubtitle}>
          {kind === 'quick' ? `${t(language, 'reviewFive')} · +25 XP` : t(language, 'lessonIntro')}
        </Text>
      </View>
      <View style={styles.lessonFacts}>
        <View style={styles.lessonFact}>
          <Ionicons name="fitness" size={22} color="#F4C95D" />
          <Text style={styles.lessonFactText}>
            {count} {t(language, 'lessonSteps').replace(/^\d+\s*/, '')}
          </Text>
        </View>
        <View style={styles.lessonFact}>
          <Ionicons name="git-branch" size={22} color="#78E2BD" />
          <Text style={styles.lessonFactText}>
            {kind === 'quick' ? '+25 XP' : `${resumeStageLabel} · ${stageTotals[resumeStage]} XP`}
          </Text>
        </View>
      </View>
      {kind === 'lesson' && resumeIndex > 0 && (
        <View style={styles.resume}>
          <Text style={styles.resumeText}>
            {t(language, 'progressSaved')} {resumeStageLabel}
          </Text>
          <ProgressBar value={resumeIndex / Math.max(1, count)} color={colors.mint} />
        </View>
      )}
      <Button label={t(language, 'startLesson')} onPress={onStart} />
      <Button label={t(language, 'finish')} variant="secondary" onPress={onClose} />
    </AdventureShell>
  );
}

function StageCheckpoint({
  language,
  stageIndex,
  scores,
  hearts,
  onFinish,
  onContinue,
}: {
  language: UiLanguage;
  stageIndex: number;
  scores: number[];
  hearts: number;
  onFinish: () => void;
  onContinue: () => void;
}) {
  const average = scores.length ? scores.reduce((sum, item) => sum + item, 0) / scores.length : 0;
  const isFinal = stageIndex === 2;
  const hasChest = stageIndex > 0;
  return (
    <AdventureShell>
      <View style={styles.checkpointIcon}>
        <Ionicons name={isFinal ? 'trophy' : 'checkmark'} size={52} color={colors.white} />
      </View>
      <Text style={styles.gameEyebrow}>{t(language, 'stageComplete').toUpperCase()}</Text>
      <Text style={styles.completeTitle}>
        {
          [t(language, 'stageLearn'), t(language, 'stagePractice'), t(language, 'stageMaster')][
            stageIndex
          ]
        }
      </Text>
      <Text style={styles.xpEarned}>+{stageTotals[stageIndex]} XP</Text>
      {hasChest && (
        <View style={styles.chestPreview}>
          <Image source={chestImageForTier(stageIndex)} style={styles.chestPreviewImage} />
          <View style={{ flex: 1 }}>
            <Text style={styles.chestPreviewTitle}>
              {t(language, 'chest')} Lv.{stageIndex}
            </Text>
            <Text style={styles.chestPreviewSub}>
              {isFinal ? t(language, 'chestReady') : t(language, 'chestUpgradeHint')}
            </Text>
          </View>
          <Text style={styles.rewardChip}>❤️ {Math.min(3, hearts + 1)}/3</Text>
        </View>
      )}
      <Text style={styles.completeSub}>
        {t(language, 'progressSaved')}
        {'\n'}
        {t(language, 'continueTomorrow')}
      </Text>
      <View style={styles.checkpointProgress}>
        <View style={styles.strengthTop}>
          <Text style={styles.strengthLabel}>{t(language, 'lessonAccuracy')}</Text>
          <Text style={styles.strengthValue}>{Math.round(average * 100)}%</Text>
        </View>
        <ProgressBar value={average} color={colors.mint} />
      </View>
      <Button
        label={hasChest ? t(language, 'openChest') : t(language, 'finishForToday')}
        onPress={onFinish}
      />
      {!isFinal && (
        <Button
          label={stageIndex === 0 ? t(language, 'continue') : t(language, 'upgradeChest')}
          variant="secondary"
          onPress={onContinue}
        />
      )}
    </AdventureShell>
  );
}

export function ChestRewardScreen({
  language,
  baseTier,
  seed,
  scores,
  onReveal,
  nextVerse,
  onNext,
  onClose,
}: {
  language: UiLanguage;
  baseTier: number;
  seed: string;
  scores: number[];
  onReveal: (tier: number) => ChestReward;
  nextVerse?: Verse;
  onNext: () => void;
  onClose: () => void;
}) {
  const [taps, setTaps] = useState(0);
  const [tier, setTier] = useState(baseTier);
  const [reward, setReward] = useState<ChestReward | null>(null);
  const [tapMessage, setTapMessage] = useState('');
  const chestSpin = useRef(new Animated.Value(0)).current;
  const spinning = useRef(false);
  const average = scores.length ? scores.reduce((sum, item) => sum + item, 0) / scores.length : 0;
  const tapChest = () => {
    if (reward || spinning.current || taps >= 3) return;
    spinning.current = true;
    chestSpin.stopAnimation();
    chestSpin.setValue(0);
    const nextTap = taps + 1;
    const nextTier = chestTierAfterTap(seed, nextTap, tier, average);
    Animated.timing(chestSpin, {
      toValue: 1,
      duration: 520,
      easing: Easing.out(Easing.back(1.35)),
      useNativeDriver: true,
    }).start(() => {
      spinning.current = false;
      if (nextTap === 3) setReward(onReveal(nextTier));
    });
    setTaps(nextTap);
    setTier(nextTier);
    setTapMessage(nextTier > tier ? t(language, 'chestUpgraded') : t(language, 'chestStayed'));
  };
  const animatedChestStyle = {
    transform: [
      { perspective: 700 },
      { rotateY: chestSpin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) },
      { scale: chestSpin.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.12, 1] }) },
    ],
  };
  if (!reward)
    return (
      <AdventureShell>
        <Text style={styles.gameEyebrow}>{t(language, 'rewardEarned').toUpperCase()}</Text>
        <Text style={styles.completeTitle}>
          {t(language, 'chest')} Lv.{tier}
        </Text>
        <Text style={styles.completeSub}>{t(language, 'surpriseReward')}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t(language, 'tapToOpen')}
          onPress={tapChest}
          style={({ pressed }) => [styles.closedChest, pressed && styles.closedChestPressed]}
        >
          <View style={styles.chestGlow} />
          <Animated.Image
            source={chestImageForTier(tier)}
            style={[styles.closedChestImage, animatedChestStyle]}
          />
          <View style={styles.chestQuestion}>
            <Text style={styles.chestQuestionText}>{3 - taps}</Text>
          </View>
        </Pressable>
        <View style={styles.tapDots}>
          {[1, 2, 3].map((item) => (
            <View key={item} style={[styles.tapDot, item <= taps && styles.tapDotDone]} />
          ))}
        </View>
        <Text
          style={[
            styles.tapChest,
            tapMessage === t(language, 'chestUpgraded') && { color: colors.mint },
          ]}
        >
          {taps ? tapMessage : `${t(language, 'tapToOpen')} · 3×`}
        </Text>
        <View style={styles.checkpointProgress}>
          <View style={styles.strengthTop}>
            <Text style={styles.strengthLabel}>{t(language, 'lessonAccuracy')}</Text>
            <Text style={styles.strengthValue}>{Math.round(average * 100)}%</Text>
          </View>
          <ProgressBar value={average} color={colors.mint} />
        </View>
      </AdventureShell>
    );
  return (
    <AdventureShell>
      <View style={styles.openChest}>
        <View style={styles.openChestGlow} />
        <Image source={chestImageForTier(reward.tier)} style={styles.openChestImage} />
        <Text style={styles.openChestSparkle}>✨</Text>
      </View>
      <Text style={styles.gameEyebrow}>{t(language, 'rewardEarned').toUpperCase()}</Text>
      <Text style={styles.completeTitle}>
        {t(language, 'chest')} Lv.{reward.tier}
      </Text>
      <View style={styles.rewardList}>
        {reward.rewards.map((loot, index) => (
          <View key={`${loot.type}-${index}`} style={styles.lootReward}>
            <Text style={styles.lootRewardText}>{lootLabel(loot, language)}</Text>
            {index > 0 && <Text style={styles.bonusBadge}>{uiText(language, 'BONUS')}</Text>}
          </View>
        ))}
      </View>
      <Button
        label={
          nextVerse
            ? `${t(language, 'nextVerse')} · ${nextVerse.reference}`
            : t(language, 'backHome')
        }
        onPress={onNext}
      />
      {nextVerse && (
        <Button label={t(language, 'backHome')} variant="secondary" onPress={onClose} />
      )}
    </AdventureShell>
  );
}

function lootLabel(loot: ChestLoot, language: UiLanguage): string {
  if (loot.type === 'gold') return `🪙 +${loot.amount} ${t(language, 'gold')}`;
  if (loot.type === 'wildShards') return `🃏 +${loot.amount} ${uiText(language, 'Wild Shards')}`;
  if (loot.type === 'streakFreeze')
    return `🛡️ +${loot.amount} ${uiText(language, 'Streak Freeze')}`;
  if (loot.type === 'xpBooster' || loot.type === 'goldBooster')
    return `${loot.type === 'xpBooster' ? '⚡' : '🪙'} 2× ${loot.type === 'xpBooster' ? 'XP' : uiText(language, 'Gold')} · ${loot.durationMinutes} min`;
  if (loot.type === 'characterShards')
    return loot.characters
      .map((item) => `🧩 ${characterById(item.characterId).names[language]} +${item.amount}`)
      .join('  ·  ');
  return '';
}

function Choice({
  label,
  selected,
  disabled,
  onPress,
}: {
  label: string;
  selected: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.choice, selected && styles.choiceSelected, disabled && styles.choiceDisabled]}
    >
      <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>{label}</Text>
    </Pressable>
  );
}
function Strength({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.strength}>
      <View style={styles.strengthTop}>
        <Text style={styles.strengthLabel}>{label}</Text>
        <Text style={[styles.strengthValue, { color }]}>{Math.round(value * 100)}%</Text>
      </View>
      <ProgressBar value={value} color={color} />
    </View>
  );
}
function Grade({
  language,
  icon,
  label,
  color,
  recommended,
  onPress,
}: {
  language: UiLanguage;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  recommended?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={recommended ? uiText(language, 'Recommended assessment') : undefined}
      onPress={onPress}
      style={[styles.grade, recommended && { borderColor: color, backgroundColor: `${color}12` }]}
    >
      <View style={[styles.gradeIcon, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.gradeLabel}>{label}</Text>
      {recommended && <Text style={[styles.recommendedMark, { color }]}>{'●'}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#10132D' },
  adventureBackground: { flex: 1 },
  adventureImage: { opacity: 0.9 },
  adventureScrim: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(19,12,38,.42)',
  },
  xpFeedback: {
    position: 'absolute',
    top: 78,
    alignSelf: 'center',
    zIndex: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 22,
    backgroundColor: '#F8DA78',
    borderWidth: 2,
    borderColor: '#FFF3B8',
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  xpFeedbackText: { color: '#2A1455', fontSize: 20, fontWeight: '900' },
  header: {
    height: 68,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(25,16,48,.97)',
    borderBottomWidth: 2,
    borderBottomColor: '#E6B956',
  },
  iconButton: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  stopButton: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 8 },
  stopText: { fontSize: 11, fontWeight: '900', color: '#F8DA78' },
  hearts: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  heartsText: { fontSize: 11, fontWeight: '900', color: '#FFF' },
  headerProgress: { flex: 1 },
  sequenceCount: { fontSize: 12, fontWeight: '900', color: '#F8DA78' },
  page: { padding: 18, maxWidth: 720, width: '100%', alignSelf: 'center' },
  practiceCard: {
    gap: 17,
    padding: 18,
    backgroundColor: 'rgba(62,31,108,.97)',
    borderWidth: 2,
    borderBottomWidth: 5,
    borderColor: '#E6B956',
    borderRadius: 26,
  },
  adaptive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F2C85E',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radius.sm,
  },
  adaptiveText: { fontSize: 12, color: '#2A1455', fontWeight: '900', flex: 1 },
  adaptiveStrong: { fontWeight: '900', color: '#2A1455' },
  combo: { fontSize: 11, fontWeight: '900', color: '#2A1455' },
  modeRow: { gap: 7, paddingVertical: 2 },
  mode: {
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    paddingHorizontal: 13,
    backgroundColor: '#FFF9E8',
    borderWidth: 1,
    borderColor: '#E6B956',
  },
  modeActive: { backgroundColor: '#F2C85E', borderColor: '#F2C85E' },
  modeText: { fontSize: 11, fontWeight: '700', color: '#4A356A' },
  modeTextActive: { color: '#2A1455' },
  referenceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  referenceEyebrow: { fontSize: 11, fontWeight: '900', letterSpacing: 1.1, color: '#F8DA78' },
  stage: {
    fontSize: 12,
    color: '#FFF',
    fontWeight: '800',
    backgroundColor: '#7040C7',
    borderWidth: 1,
    borderColor: '#A87BEB',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    textTransform: 'capitalize',
  },
  masteryRow: { flexDirection: 'row', gap: 12 },
  sectionLabel: {
    alignSelf: 'center',
    color: '#F8DA78',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  strength: { flex: 1, gap: 6 },
  strengthTop: { flexDirection: 'row', justifyContent: 'space-between' },
  strengthLabel: { fontSize: 11, fontWeight: '800', color: '#D8CFEB' },
  strengthValue: { fontSize: 12, fontWeight: '900' },
  prompt: {
    fontSize: 25,
    lineHeight: 38,
    fontWeight: '800',
    color: '#FFF',
    textAlign: 'center',
    paddingVertical: 10,
    textShadowColor: '#241039',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 2,
  },
  chinese: { lineHeight: 44, letterSpacing: 1 },
  input: {
    minHeight: 130,
    backgroundColor: '#FFF9E8',
    borderWidth: 2,
    borderColor: '#E6B956',
    borderRadius: radius.md,
    padding: 17,
    fontSize: 18,
    lineHeight: 29,
    color: colors.ink,
    textAlignVertical: 'top',
  },
  hint: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#FFF5D9',
    padding: 14,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: '#E6B956',
  },
  hintText: { flex: 1, color: colors.inkSoft, lineHeight: 20 },
  actions: { gap: 10, marginTop: 4 },
  choices: { gap: 9 },
  twoChoices: { flexDirection: 'row', gap: 10 },
  wordChoices: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, justifyContent: 'center' },
  matchGrid: { flexDirection: 'row', gap: 10, alignItems: 'stretch' },
  matchColumn: { flex: 1, gap: 9 },
  choice: {
    padding: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
  },
  choiceSelected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  choiceDisabled: { opacity: 0.55 },
  choiceText: { fontWeight: '700', color: colors.inkSoft, textAlign: 'center' },
  choiceTextSelected: { color: colors.primary },
  tokens: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  token: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.sm,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  tokenUsed: { opacity: 0.3 },
  tokenText: { color: colors.ink, fontWeight: '700' },
  answerBuilder: {
    minHeight: 70,
    padding: 14,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
  },
  answerBuilderText: { fontSize: 17, lineHeight: 27, color: colors.ink },
  selectedTokens: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  selectedToken: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  selectedTokenText: { fontSize: 16, color: colors.ink, fontWeight: '800' },
  answerPanel: {
    gap: 17,
    backgroundColor: '#FFF9E8',
    borderRadius: radius.lg,
    padding: 18,
    borderWidth: 2,
    borderColor: '#E6B956',
  },
  scoreRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  answerTitle: { fontWeight: '800', color: colors.muted, textTransform: 'uppercase', fontSize: 12 },
  score: { fontWeight: '900', fontSize: 24 },
  acceptance: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFFB8',
  },
  acceptanceText: { flex: 1, fontSize: 13, fontWeight: '800', color: colors.inkSoft },
  mistakeFeedback: { fontSize: 13, lineHeight: 19, fontWeight: '700', color: colors.inkSoft },
  wordDiff: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  diffToken: { borderRadius: 8, paddingHorizontal: 7, paddingVertical: 4, fontSize: 12 },
  diffCorrect: { color: '#225C47', backgroundColor: '#DFF5E9' },
  diffMinor: { color: '#72540B', backgroundColor: '#FFF0BD' },
  diffWrong: { color: '#843B35', backgroundColor: '#FFE0DC' },
  diffExtra: { color: '#554282', backgroundColor: '#EDE6FF' },
  answerText: { fontSize: 16, lineHeight: 26, color: colors.inkSoft },
  gradeHint: { fontSize: 11, fontWeight: '800', color: colors.muted, textAlign: 'center' },
  grades: { flexDirection: 'row', justifyContent: 'space-between', gap: 5 },
  grade: {
    flex: 1,
    alignItems: 'center',
    gap: 5,
    minHeight: 78,
    borderWidth: 1.5,
    borderColor: 'transparent',
    borderRadius: radius.md,
    paddingVertical: 6,
  },
  gradeIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradeLabel: { fontSize: 11, fontWeight: '800', color: colors.ink },
  recommendedMark: { fontSize: 9, lineHeight: 9 },
  source: { textAlign: 'center', fontSize: 11, color: '#D8CFEB', marginBottom: 4 },
  lessonShell: {
    flex: 1,
    padding: 20,
    maxWidth: 620,
    width: '100%',
    alignSelf: 'center',
    justifyContent: 'center',
  },
  lessonPanel: {
    position: 'relative',
    padding: 24,
    gap: 17,
    backgroundColor: 'rgba(62,31,108,.97)',
    borderWidth: 2,
    borderBottomWidth: 6,
    borderColor: '#E6B956',
    borderRadius: 28,
  },
  introClose: {
    position: 'absolute',
    zIndex: 2,
    top: 8,
    right: 8,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(25,16,48,.72)',
    borderRadius: 22,
  },
  lessonHero: { alignItems: 'center', gap: 9 },
  gameEyebrow: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.3,
    color: '#F8DA78',
    textAlign: 'center',
  },
  lessonIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#7040C7',
    borderWidth: 3,
    borderColor: '#F2C85E',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 7,
  },
  lessonTitle: {
    fontSize: 34,
    fontWeight: '900',
    color: '#FFF',
    textAlign: 'center',
    textShadowColor: '#241039',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 2,
  },
  lessonSubtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: '#D8CFEB',
    textAlign: 'center',
    maxWidth: 420,
  },
  lessonFacts: { flexDirection: 'row', gap: 12 },
  lessonFact: {
    flex: 1,
    minHeight: 74,
    borderRadius: radius.md,
    backgroundColor: 'rgba(28,17,52,.82)',
    borderWidth: 1.5,
    borderColor: '#8C65C2',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  lessonFactText: { fontSize: 12, fontWeight: '800', color: '#FFF', textAlign: 'center' },
  resume: {
    gap: 9,
    backgroundColor: 'rgba(52,127,105,.42)',
    borderWidth: 1,
    borderColor: '#78E2BD',
    padding: 14,
    borderRadius: radius.md,
  },
  resumeText: { fontSize: 12, fontWeight: '800', color: '#FFF', textAlign: 'center' },
  checkpointIcon: {
    width: 102,
    height: 102,
    borderRadius: 51,
    backgroundColor: colors.mint,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#D4FFE9',
  },
  checkpointProgress: {
    gap: 8,
    backgroundColor: '#FFF9E8',
    padding: 16,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: '#E6B956',
  },
  rewardChip: {
    fontSize: 12,
    fontWeight: '900',
    color: colors.inkSoft,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radius.pill,
  },
  chestPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFF7DE',
    borderWidth: 2,
    borderColor: '#E6B956',
    borderRadius: radius.md,
    padding: 14,
  },
  chestPreviewImage: { width: 62, height: 58, resizeMode: 'contain' },
  chestPreviewTitle: { fontSize: 16, fontWeight: '900', color: colors.ink },
  chestPreviewSub: { fontSize: 11, color: colors.muted, marginTop: 3 },
  xpEarned: { fontSize: 31, fontWeight: '900', color: '#F8DA78', textAlign: 'center' },
  completeTitle: {
    fontSize: 34,
    fontWeight: '900',
    color: '#FFF',
    textAlign: 'center',
    textShadowColor: '#241039',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 2,
  },
  completeSub: { fontSize: 14, lineHeight: 21, color: '#D8CFEB', textAlign: 'center' },
  closedChest: {
    width: 220,
    height: 200,
    borderRadius: 70,
    backgroundColor: 'rgba(24,15,45,.7)',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#F0C95B',
  },
  closedChestPressed: { transform: [{ scale: 0.94 }] },
  chestGlow: {
    position: 'absolute',
    width: 170,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255,225,115,.35)',
  },
  closedChestImage: { width: 205, height: 178, resizeMode: 'contain' },
  chestQuestion: {
    position: 'absolute',
    right: 14,
    top: 14,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#7040C7',
    borderWidth: 2,
    borderColor: '#F2C85E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chestQuestionText: { color: colors.white, fontSize: 22, fontWeight: '900' },
  tapChest: { fontSize: 15, fontWeight: '900', color: '#F8DA78', textAlign: 'center' },
  openChest: {
    width: 180,
    height: 145,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  openChestGlow: {
    position: 'absolute',
    width: 132,
    height: 132,
    borderRadius: 66,
    backgroundColor: 'rgba(255,225,115,.38)',
  },
  openChestImage: { width: 172, height: 138, resizeMode: 'contain' },
  openChestSparkle: { position: 'absolute', right: 5, top: 0, fontSize: 35 },
  rewardList: { gap: 9 },
  lootReward: {
    minHeight: 54,
    backgroundColor: '#FFF9E8',
    borderWidth: 2,
    borderColor: '#E6B956',
    borderRadius: radius.md,
    padding: 12,
    justifyContent: 'center',
  },
  lootRewardText: { fontSize: 15, fontWeight: '900', color: colors.ink, textAlign: 'center' },
  bonusBadge: {
    position: 'absolute',
    right: 7,
    top: 5,
    fontSize: 8,
    fontWeight: '900',
    color: colors.primary,
  },
  tapDots: { flexDirection: 'row', alignSelf: 'center', gap: 8 },
  tapDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.line },
  tapDotDone: { backgroundColor: colors.primary },
});
