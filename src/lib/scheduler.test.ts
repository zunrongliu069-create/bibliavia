import { describe, expect, it } from 'vitest';
import { initialMastery, masteryPercent, recallRisk, scheduleReview, stageFor } from './scheduler';

describe('adaptive scheduler', () => {
  it('extends stability after successful effortful recall', () => {
    const now = new Date('2026-01-01T12:00:00Z');
    const initial = initialMastery('verse', now);
    const reviewed = scheduleReview(initial, {
      grade: 'good',
      mode: 'recall',
      accuracy: 1,
      hintsUsed: 0,
      recallMs: 18_000,
      now,
    });
    expect(reviewed.stabilityDays).toBeGreaterThan(initial.stabilityDays);
    expect(reviewed.successfulRecalls).toBe(1);
    expect(new Date(reviewed.dueAt).getTime()).toBeGreaterThan(now.getTime());
  });

  it('regresses stability and increments lapses after forgetting', () => {
    const current = {
      ...initialMastery('verse'),
      stabilityDays: 20,
      successfulRecalls: 8,
      stage: 'strong' as const,
      lastReviewedAt: '2026-01-01T00:00:00Z',
    };
    const reviewed = scheduleReview(current, {
      grade: 'again',
      mode: 'recall',
      accuracy: 0.2,
      hintsUsed: 2,
      recallMs: 60_000,
      now: new Date('2026-01-15T00:00:00Z'),
    });
    expect(reviewed.stabilityDays).toBeLessThan(current.stabilityDays);
    expect(reviewed.lapses).toBe(1);
    expect(reviewed.difficulty).toBeGreaterThan(current.difficulty);
  });

  it('penalizes hints relative to the same correct grade', () => {
    const current = { ...initialMastery('verse'), lastReviewedAt: '2026-01-01T00:00:00Z' };
    const now = new Date('2026-01-02T00:00:00Z');
    const noHints = scheduleReview(current, {
      grade: 'good',
      mode: 'recall',
      accuracy: 1,
      hintsUsed: 0,
      recallMs: 20_000,
      now,
    });
    const hints = scheduleReview(current, {
      grade: 'good',
      mode: 'recall',
      accuracy: 1,
      hintsUsed: 2,
      recallMs: 20_000,
      now,
    });
    expect(noHints.stabilityDays).toBeGreaterThan(hints.stabilityDays);
  });

  it('maps durable memory to visible mastery stages', () => {
    expect(stageFor(0.2, 0)).toBe('new');
    expect(stageFor(5, 3)).toBe('familiar');
    expect(stageFor(75, 12)).toBe('mastered');
  });

  it('raises risk as time passes', () => {
    const mastery = {
      ...initialMastery('verse'),
      stabilityDays: 10,
      lastReviewedAt: '2026-01-01T00:00:00Z',
    };
    expect(recallRisk(mastery, new Date('2026-02-01T00:00:00Z'))).toBeGreaterThan(
      recallRisk(mastery, new Date('2026-01-02T00:00:00Z')),
    );
  });

  it('tracks recognition separately from recall and adapts the learning step', () => {
    const initial = initialMastery('verse', new Date('2026-01-01T00:00:00Z'));
    const recognized = scheduleReview(initial, {
      grade: 'easy',
      mode: 'choice',
      accuracy: 1,
      hintsUsed: 0,
      recallMs: 5000,
      now: new Date('2026-01-01T00:00:00Z'),
    });
    expect(recognized.recognitionStrength).toBeGreaterThan(recognized.recallStrength);
    expect(recognized.learningStep).toBe(1);
    expect(recognized.successfulRecalls).toBe(0);
    expect(recognized.stage).toBe('new');
    const recalled = scheduleReview(recognized, {
      grade: 'good',
      mode: 'recall',
      accuracy: 1,
      hintsUsed: 0,
      recallMs: 12000,
      now: new Date('2026-01-02T00:00:00Z'),
    });
    expect(recalled.recallStrength).toBeGreaterThan(recognized.recallStrength);
    expect(recalled.successfulRecalls).toBe(1);
    expect(new Date(recalled.dueAt).getTime()).toBe(new Date('2026-01-03T00:00:00Z').getTime());
  });

  it('uses short recall for learning without granting durable mastery', () => {
    const now = new Date('2026-01-01T00:00:00Z');
    const practiced = scheduleReview(initialMastery('verse', now), {
      grade: 'good',
      mode: 'initials',
      accuracy: 1,
      hintsUsed: 0,
      recallMs: 9000,
      now,
    });
    expect(practiced.recallStrength).toBeGreaterThan(0);
    expect(practiced.successfulRecalls).toBe(0);
    expect(practiced.stage).toBe('new');
    expect(new Date(practiced.dueAt).getTime()).toBe(new Date('2026-01-02T00:00:00Z').getTime());
  });

  it('caps mastery before the first full recall', () => {
    const recognized = {
      ...initialMastery('verse'),
      recognitionStrength: 1,
      recallStrength: 0.8,
      lastReviewedAt: '2026-01-01T00:00:00Z',
    };
    expect(masteryPercent(recognized)).toBeLessThanOrEqual(49);
  });

  it('tracks understanding without inflating recognition or recall', () => {
    const initial = initialMastery('verse', new Date('2026-01-01T00:00:00Z'));
    const understood = scheduleReview(initial, {
      grade: 'good',
      mode: 'understand',
      accuracy: 1,
      hintsUsed: 0,
      recallMs: 8000,
      now: new Date('2026-01-01T00:00:00Z'),
    });
    expect(understood.understandingStrength).toBeGreaterThan(0);
    expect(understood.recognitionStrength).toBe(0);
    expect(understood.recallStrength).toBe(0);
  });
});
