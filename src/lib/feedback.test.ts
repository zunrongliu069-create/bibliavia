import { describe, expect, it } from 'vitest';
import type { FeedbackEvent, FeedbackSettings } from '../types';
import { feedbackPresentation } from './feedback';

const settings: FeedbackSettings = {
  soundEffects: true,
  ambientMusic: false,
  haptics: true,
  reduceMotion: false,
};
const event: FeedbackEvent = {
  id: 'beat',
  type: 'BEAT_COMPLETED',
  tier: 2,
  tone: 'reflective',
  message: 'Beat complete',
  diminishingLevel: 0,
};

describe('feedback presentation', () => {
  it('shortens repeated and veteran feedback without hiding it', () => {
    const normal = feedbackPresentation(event, settings);
    const shortened = feedbackPresentation({ ...event, diminishingLevel: 2 }, settings, 200);
    expect(shortened.durationMs).toBeLessThan(normal.durationMs);
    expect(shortened.durationMs).toBeGreaterThan(0);
    expect(shortened.intensity).toBeGreaterThan(0);
  });

  it('keeps symbolic feedback while reducing motion', () => {
    const reduced = feedbackPresentation(event, { ...settings, reduceMotion: true });
    expect(reduced.durationMs).toBeLessThan(1000);
    expect(reduced.icon).toBe('flag');
    expect(reduced.vibration.length).toBeLessThanOrEqual(1);
  });

  it('does not rely on color to distinguish correct, wrong, and partial', () => {
    const iconFor = (type: FeedbackEvent['type']) =>
      feedbackPresentation({ ...event, type }, settings).icon;
    expect([
      iconFor('ACTIVITY_CORRECT'),
      iconFor('ACTIVITY_WRONG'),
      iconFor('ACTIVITY_PARTIAL'),
    ]).toEqual(['checkmark', 'close', 'remove']);
  });

  it('varies major-event sound by the content tone tag', () => {
    const solemn = feedbackPresentation({ ...event, tone: 'solemn' }, settings);
    const triumphant = feedbackPresentation({ ...event, tone: 'triumphant' }, settings);
    expect(solemn.playbackRate).toBeLessThan(triumphant.playbackRate);
    expect(solemn.frequencies).not.toEqual(triumphant.frequencies);
  });
});
