import { describe, expect, it } from 'vitest';
import { initialMastery } from './scheduler';
import {
  adaptiveSequence,
  createLessonPlan,
  exactSentenceChoice,
  finishSentenceChoice,
  mustRetryLessonStep,
  nextVerseChoice,
  recommendedMode,
  verseMatchPairs,
  wordChoice,
} from './exercise';
import type { Verse } from '../types';

const verse: Verse = {
  id: 'v',
  translationId: 'cuv-s',
  bookId: 'romans',
  bookName: '罗马书',
  chapter: 1,
  verseStart: 1,
  verseEnd: 1,
  reference: '罗马书 1:1',
  text: '耶稣基督的仆人保罗，奉召为使徒，特派传神的福音。',
  languageTag: 'zh-Hans',
  sourceUrl: '',
};

describe('adaptive exercises', () => {
  it('recommends recall early when recognition is stronger than recall', () => {
    expect(
      recommendedMode({
        ...initialMastery('v'),
        learningStep: 6,
        recognitionStrength: 0.9,
        recallStrength: 0.2,
      }),
    ).toBe('recall');
  });
  it('creates a real blank and includes the correct Chinese word choice', () => {
    const exercise = wordChoice(verse);
    expect(exercise.prompt).toContain('____');
    expect(exercise.options).toContain(exercise.correct);
  });
  it('teaches phrase order before Build and separates the three stages', () => {
    const plan = createLessonPlan(3);
    const learn = plan.filter((step) => step.stage === 0);
    expect(adaptiveSequence).toContain('listen');
    expect(plan[0]).toMatchObject({ mode: 'read', scope: 'full', stage: 0 });
    expect(plan[1]).toMatchObject({ mode: 'read', scope: 'structure', stage: 0 });
    expect(learn.slice(2)).toEqual([
      { mode: 'blanks', stage: 0, scope: 'chunk', partStart: 1, partEnd: 1 },
      { mode: 'blanks', stage: 0, scope: 'chunk', partStart: 2, partEnd: 2 },
      { mode: 'blanks', stage: 0, scope: 'cumulative', partStart: 1, partEnd: 2 },
      { mode: 'blanks', stage: 0, scope: 'chunk', partStart: 3, partEnd: 3 },
      { mode: 'blanks', stage: 0, scope: 'cumulative', partStart: 1, partEnd: 3 },
      { mode: 'initials', stage: 0, scope: 'full', gate: true, minimumAccuracy: 0.55 },
    ]);
    expect(learn.at(-1)?.mode).not.toBe('recall');
    expect(plan.findIndex((step) => step.mode === 'reorder')).toBeGreaterThan(
      plan.findLastIndex((step) => step.stage === 0),
    );
    expect(plan.filter((step) => step.gate).map((step) => step.minimumAccuracy)).toEqual([
      0.55, 0.75, 0.9,
    ]);
    expect(mustRetryLessonStep(plan.find((step) => step.gate)!, 'hard', 0.6)).toBe(false);
    expect(mustRetryLessonStep(plan.find((step) => step.gate)!, 'again', 0.9)).toBe(true);
    expect(adaptiveSequence).toEqual(
      expect.arrayContaining([
        'finish',
        'sentenceCheck',
        'initials',
        'keywords',
        'speak',
        'recall',
      ]),
    );
  });
  it('does not schedule exercises that reveal future verses', () => {
    expect(adaptiveSequence).not.toContain('match');
    expect(adaptiveSequence).not.toContain('contextChoice');
    expect(createLessonPlan(2).map((step) => step.mode)).not.toContain('match');
    expect(createLessonPlan(2).map((step) => step.mode)).not.toContain('contextChoice');
  });

  it('keeps a short verse lesson shorter than a long verse lesson', () => {
    expect(createLessonPlan(1).filter((step) => step.stage === 0)).toHaveLength(3);
    expect(createLessonPlan(4).filter((step) => step.stage === 0).length).toBeGreaterThan(3);
  });
  it('creates a two-choice sentence ending', () => {
    const exercise = finishSentenceChoice(verse);
    expect(exercise.prompt).toContain('____');
    expect(exercise.options).toHaveLength(2);
    expect(exercise.options).toContain(exercise.correct);
  });
  it('creates exact-sentence, matching, and next-verse questions', () => {
    const second = {
      ...verse,
      id: 'v2',
      verseStart: 2,
      verseEnd: 2,
      reference: '罗马书 1:2',
      text: '这福音是神从前借众先知在圣经上所应许的。',
    };
    const third = {
      ...verse,
      id: 'v3',
      verseStart: 3,
      verseEnd: 3,
      reference: '罗马书 1:3',
      text: '论到他儿子我主耶稣基督。',
    };
    expect(exactSentenceChoice(verse).options).toEqual(['yes', 'no']);
    expect(verseMatchPairs([verse, second, third], 'zh-Hans')).toHaveLength(3);
    expect(nextVerseChoice(verse, second, third).correct).toBe(second.text);
  });
});
