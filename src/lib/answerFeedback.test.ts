import { describe, expect, it } from 'vitest';
import { answerWordDiff, mistakeFeedbackKey } from './answerFeedback';

describe('answer feedback', () => {
  it('aligns missing, changed and extra words', () => {
    const diff = answerWordDiff('The Lord is my shepherd', 'The king my shepherd today', 'en');
    expect(diff.tokens.map((token) => token.kind)).toEqual([
      'correct',
      'changed',
      'missing',
      'correct',
      'correct',
      'extra',
    ]);
  });

  it('marks small spelling slips as minor', () => {
    const diff = answerWordDiff('In the beginning', 'In the begining', 'en');
    expect(diff.minor).toBe(1);
    expect(mistakeFeedbackKey('recall', 0.98, diff)).toBe('feedbackMinorSpelling');
  });

  it('segments Chinese for word-level feedback', () => {
    const diff = answerWordDiff('我们晓得万事都互相效力', '我们晓得万事', 'zh-Hans');
    expect(diff.tokens.length).toBeGreaterThan(3);
    expect(diff.missing).toBeGreaterThan(0);
  });

  it('uses mode-specific guidance', () => {
    const diff = answerWordDiff('grace and peace', 'peace and grace', 'en');
    expect(mistakeFeedbackKey('reorder', 0.5, diff)).toBe('feedbackWordOrder');
    expect(mistakeFeedbackKey('choice', 0, diff)).toBe('feedbackRecognition');
  });
});
