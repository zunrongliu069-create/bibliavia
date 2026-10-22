import type { Ionicons } from '@expo/vector-icons';
import React from 'react';
import type { UiLanguage } from '../types';
import { RomansVerseWorld } from './RomansVerseWorld';
import { SimpleVersePathWorld } from './SimpleVersePathWorld';
import { VerticalPathWorld } from './VerticalPathWorld';

export type WorldPath = { id: string; title: string; selected: boolean };

export type WorldStep = {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  complete: boolean;
  locked?: boolean;
  onPress: () => void;
};

export type WorldNode = {
  id: string;
  parentId?: string;
  index: number;
  regionId?: string;
  chapterNumber?: number;
  label: string;
  kind?: 'section' | 'recap' | 'verse' | 'guardian';
  complete: boolean;
  current: boolean;
  available?: boolean;
  milestone?: boolean;
  levels?: { learn: boolean; practice: boolean; master: boolean };
  previewKind?: 'guardian' | 'boss';
};

export type PathGameWorldProps = {
  pathId: string;
  title: string;
  ratio: number;
  currentNodeProgress?: number;
  chapterLabel: string;
  nextChapterLabel?: string;
  currentVerseLabel?: string;
  nextVerseLabel?: string;
  paths: WorldPath[];
  nodes: WorldNode[];
  totalNodeCount: number;
  uiLanguage: UiLanguage;
  reduceMotion: boolean;
  steps: WorldStep[];
  continueLabel: string;
  started: boolean;
  complete: boolean;
  onContinue: () => void;
  onStart: () => void;
  onSelectPath: (id: string) => void;
  onSelectNode: (id: string) => void;
  onPracticeNode: (id: string) => void;
};

export function PathGameWorld(props: PathGameWorldProps) {
  if (props.pathId === 'memorization-psalm-23') {
    return <SimpleVersePathWorld {...props} />;
  }
  if (props.pathId === 'memorization-romans') {
    return <RomansVerseWorld {...props} />;
  }
  return <VerticalPathWorld {...props} />;
}
