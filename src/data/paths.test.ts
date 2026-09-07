import { describe, expect, it } from 'vitest';
import type { UiLanguage } from '../types';
import { getReferencedPassage } from './content';
import { beatTitle, pathDefinitions, pathTitle } from './paths';

const languages: UiLanguage[] = ['en', 'sv', 'zh-Hans', 'zh-Hant'];
const byId = (id: string) => pathDefinitions.find((path) => path.id === id)!;
const contentNodes = (id: string) =>
  byId(id).beats?.filter((beat) => beat.nodeKind === 'content') ?? [];

describe('canonical Path catalog', () => {
  it('contains exactly the six selected user-facing Paths', () => {
    expect(pathDefinitions.map((path) => path.id)).toEqual([
      'reading-mark',
      'reading-luke',
      'reading-new-testament',
      'memorization-psalm-23',
      'memorization-matthew-5-7',
      'memorization-romans',
    ]);
  });

  it('uses Chapter nodes for the three Reading Paths', () => {
    expect(byId('reading-mark').structure).toBe('chapter');
    expect(contentNodes('reading-mark')).toHaveLength(16);
    expect(contentNodes('reading-luke')).toHaveLength(24);
    expect(contentNodes('reading-new-testament')).toHaveLength(260);
    expect(byId('reading-new-testament').regions).toHaveLength(27);
  });

  it('uses Verse nodes and a trailing Final Boss for the three Memorization Paths', () => {
    const expected = {
      'memorization-psalm-23': 6,
      'memorization-matthew-5-7': 111,
      'memorization-romans': 433,
    };
    for (const [id, count] of Object.entries(expected)) {
      const path = byId(id);
      expect(path.structure).toBe('verse');
      expect(contentNodes(id)).toHaveLength(count);
      expect(path.beats).toHaveLength(count + 1);
      const boss = path.beats?.at(-1);
      expect(boss?.nodeKind).toBe('final-boss');
      expect(boss?.boss?.kind).toBe('final-boss');
      expect(boss?.boss?.coverage).toHaveLength(1);
      expect(getReferencedPassage('webp', boss!.boss!.coverage[0]!)).toHaveLength(count);
    }
  });

  it('localizes every Path and keeps every content node backed by Bible references', () => {
    for (const path of pathDefinitions) {
      for (const language of languages) expect(pathTitle(path, language)).toBeTruthy();
      for (const beat of path.beats ?? []) {
        expect(beatTitle(beat, 'en')).toBeTruthy();
        if (beat.nodeKind !== 'content') continue;
        expect(beat.passage).toBeDefined();
        expect(getReferencedPassage('webp', beat.passage!)).not.toHaveLength(0);
        expect('text' in beat.passage!).toBe(false);
      }
      const coverage = (path.beats ?? []).flatMap((beat) =>
        beat.passage ? getReferencedPassage('cuv-s', beat.passage) : [],
      );
      expect(coverage.length).toBeGreaterThan(0);
    }
  });
});
