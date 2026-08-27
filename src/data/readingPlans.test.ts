import { describe, expect, it } from 'vitest';
import { readingPlanById, readingPlans } from './readingPlans';
import { biblePassageUrl, parseBibleReference } from '../lib/bibleLinks';

describe('reading plans', () => {
  it('keeps every plan aligned with its advertised duration', () => {
    for (const plan of readingPlans) {
      expect(plan.days).toHaveLength(plan.durationDays);
      expect(plan.days.map((day) => day.day)).toEqual(
        Array.from({ length: plan.durationDays }, (_, index) => index + 1),
      );
      expect(
        plan.days.every(
          (day) =>
            day.references.en.length > 0 &&
            day.references.sv.length > 0 &&
            day.references['zh-Hans'].length > 0,
        ),
      ).toBe(true);
    }
  });

  it('covers all 260 New Testament chapters exactly once in 90 days', () => {
    const plan = readingPlanById('nt-90')!;
    const references = plan.days.flatMap((day) => day.references.en);
    expect(plan.days).toHaveLength(90);
    expect(references).toHaveLength(260);
    expect(new Set(references).size).toBe(260);
    expect(references[0]).toBe('Matthew 1');
    expect(references.at(-1)).toBe('Revelation 22');
    expect(
      plan.days.every((day) => day.references.en.length === 2 || day.references.en.length === 3),
    ).toBe(true);
  });

  it('includes Gospel and varied theme lengths', () => {
    expect(readingPlans.some((plan) => plan.id === 'john-21')).toBe(true);
    expect(readingPlans.some((plan) => plan.id === 'mark-16')).toBe(true);
    expect(
      readingPlans.filter((plan) => plan.category === 'theme').map((plan) => plan.durationDays),
    ).toEqual(expect.arrayContaining([7, 14, 21, 30, 31]));
  });

  it('gives every scheduled reference a working Bible-text destination', () => {
    for (const plan of readingPlans)
      for (const day of plan.days)
        for (const reference of day.references.en) {
          expect(
            parseBibleReference(reference),
            `${plan.id} day ${day.day}: ${reference}`,
          ).toBeDefined();
          expect(biblePassageUrl(reference, 'webp')).toMatch(/^https:\/\/ebible\.org\/engwebp\//);
          expect(biblePassageUrl(reference, 'cuv-s')).toMatch(
            /^https:\/\/ebible\.org\/cmn-cu89s\//,
          );
          expect(biblePassageUrl(reference, 'b2000')).toMatch(
            /^https:\/\/www\.bibeln\.se\/bibel\/B2000\//,
          );
        }
  });
});
