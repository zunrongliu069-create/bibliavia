import { describe, expect, it } from 'vitest';
import type { UiLanguage } from '../types';
import { getReferencedPassage } from './content';
import { beatTitle, pathDefinitions, pathTitle, scripturePaths } from './paths';

const languages: UiLanguage[] = ['en', 'sv', 'zh-Hans', 'zh-Hant'];

describe('generalized Paths', () => {
  it('provides equal reading and memorization Paths for each local curriculum', () => {
    expect(scripturePaths.filter((path) => path.id.startsWith('reading-'))).toHaveLength(2);
    expect(scripturePaths.filter((path) => path.id.startsWith('memorization-'))).toHaveLength(2);
  });

  it('localizes every curated Path and Beat in all UI languages', () => {
    for (const path of pathDefinitions) {
      for (const language of languages) expect(pathTitle(path, language)).not.toBe(path.id);
      for (const beat of path.beats ?? []) {
        for (const language of languages) expect(beatTitle(beat, language)).toBeTruthy();
      }
    }
  });

  it('keeps Beat targets positive and parent references valid', () => {
    for (const path of pathDefinitions) {
      const ids = new Set(path.beats?.map((beat) => beat.id));
      for (const beat of path.beats ?? []) {
        expect(beat.target).toBeGreaterThan(0);
        if (beat.parentId) expect(ids.has(beat.parentId)).toBe(true);
      }
    }
  });

  it('stores passage references instead of duplicated Bible text', () => {
    for (const path of pathDefinitions)
      for (const beat of path.beats ?? []) {
        const references = [...(beat.passage ? [beat.passage] : []), ...(beat.passages ?? [])];
        expect(references.length, `${path.id}/${beat.id}`).toBeGreaterThan(0);
        for (const reference of references) {
          expect(getReferencedPassage('webp', reference).length).toBeGreaterThan(0);
          expect(getReferencedPassage('cuv-s', reference).length).toBeGreaterThan(0);
          expect('text' in reference).toBe(false);
        }
      }
  });
});
