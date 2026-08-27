import { describe, expect, it } from 'vitest';
import { initialMastery } from './scheduler';
import {
  adaptiveSequence,
  exactSentenceChoice,
  finishSentenceChoice,
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
  it('removes listening from the adaptive exercise pool', () => {
    expect(adaptiveSequence).not.toContain('listen');
    expect(adaptiveSequence).toEqual(
      expect.arrayContaining([
        'finish',
        'sentenceCheck',
        'match',
        'contextChoice',
        'speak',
        'recall',
      ]),
    );
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
