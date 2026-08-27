import { describe, expect, it } from 'vitest';
import {
  blankExercise,
  blankedText,
  initials,
  recallAccuracy,
  shortRecallExercise,
  tokenize,
} from './tokenize';

describe('language-aware exercises', () => {
  it('calculates forgiving punctuation-insensitive accuracy', () => {
    expect(
      recallAccuracy(
        'Trust in the LORD with all your heart.',
        'trust in the lord with all your heart',
      ),
    ).toBe(1);
    expect(recallAccuracy('one two three four', 'one two four')).toBeCloseTo(0.75);
  });

  it('accepts apostrophe and whitespace differences', () => {
    expect(recallAccuracy("God’s love  doesn't fail.", 'gods love doesnt fail')).toBe(1);
    expect(recallAccuracy('Grace, peace; and hope!', '  GRACE peace and hope  ')).toBe(1);
  });

  it('treats small spelling slips as minor rather than a missing word', () => {
    expect(
      recallAccuracy('In the beginning was the Word', 'in the begining was the word'),
    ).toBeGreaterThan(0.95);
    expect(recallAccuracy('faithful servant', 'faithful servnat')).toBeGreaterThan(0.8);
  });

  it('still penalizes changed biblical wording', () => {
    expect(recallAccuracy('grace and peace', 'love and peace')).toBeCloseTo(2 / 3);
    expect(
      recallAccuracy('the Lord is my shepherd', 'the king is my fortress'),
    ).toBeLessThanOrEqual(0.6);
  });

  it('segments Chinese without whitespace', () => {
    expect(tokenize('我们晓得万事都互相效力', 'zh-Hans').length).toBeGreaterThan(3);
  });

  it('creates progressive prompts', () => {
    const verse = 'Trust in the LORD with all your heart';
    expect(blankedText(verse, 'en')).toContain('____');
    expect(initials(verse, 'en')).toContain('T');
  });

  it('keeps short exercises short', () => {
    const verse = 'Trust in the LORD with all your heart and lean not on your own understanding';
    const gaps = blankExercise(verse, 'en', 0.65);
    expect(gaps.prompt.match(/____/g)).toHaveLength(3);
    expect(tokenize(gaps.answer, 'en')).toHaveLength(3);
    expect(
      tokenize(shortRecallExercise(verse, 'en', 'middle').phrase, 'en').length,
    ).toBeLessThanOrEqual(6);
  });
});
