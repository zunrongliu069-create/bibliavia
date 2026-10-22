import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readingChapterForBeat } from '../data/readingChapters';
import { ReadingChapterScreen } from './ReadingChapterScreen';

vi.mock('react-native', () => ({
  Platform: { select: (options: { web: unknown }) => options.web },
  ScrollView: 'ScrollView',
  Text: 'Text',
  View: 'View',
  StyleSheet: { create: (styles: unknown) => styles },
}));
vi.mock('../components/ui', () => ({
  BottomNavigation: 'BottomNavigation',
  Button: 'Button',
  Card: 'Card',
  ProgressBar: 'ProgressBar',
}));
vi.mock('../components/ReadingInteraction', () => ({ ReadingInteraction: 'ReadingInteraction' }));
vi.mock('./ReviewScreen', () => ({ ChestRewardScreen: 'ChestRewardScreen' }));
const { store } = vi.hoisted(() => ({
  store: {
    uiLanguage: 'en',
    progress: { pathStates: {}, claimedStageRewards: {} },
    setReadingSession: vi.fn(),
    recordReading: vi.fn(),
    recordPathActivity: vi.fn(),
    emitFeedback: vi.fn(),
    openChest: vi.fn(),
  } as any,
}));
vi.mock('../store/AppStore', () => ({ useAppStore: () => store }));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let renderer: ReactTestRenderer;
afterEach(() => {
  if (renderer) act(() => renderer.unmount());
  vi.clearAllMocks();
});

describe('reading chapter navigation', () => {
  it('opens the next chapter independently and restores its own saved position', () => {
    const first = readingChapterForBeat('mark-1')!;
    const third = readingChapterForBeat('mark-3')!;
    const completed = {
      readingCompleted: true,
      quizCompleted: true,
      readingSession: {
        definitionRevision: first.revision,
        phase: 'complete',
        sectionIndex: first.sections.length - 1,
        recapIndex: first.recap.length - 1,
        completedSectionIds: first.sections.map((section) => section.id),
        answerState: 'idle',
      },
    };
    store.progress = {
      claimedStageRewards: {},
      pathStates: {
        mark: {
          nodeProgress: {
            'mark-1': { chapter: completed },
            'mark-3': {
              chapter: {
                readingSession: {
                  definitionRevision: third.revision,
                  phase: 'reading',
                  sectionIndex: 1,
                  recapIndex: 0,
                  completedSectionIds: [third.sections[0]!.id],
                  answerState: 'idle',
                },
              },
            },
          },
        },
      },
    };
    const saved = JSON.stringify(store.progress);
    const screen = (number: number): React.ReactElement => (
      <ReadingChapterScreen
        pathId="mark"
        beatId={`mark-${number}`}
        title={`Mark ${number}`}
        chapter={readingChapterForBeat(`mark-${number}`)!}
        verses={[]}
        hasNextChapter
        onBackToPath={() => {}}
        onNextChapter={() => renderer.update(screen(number + 1))}
      />
    );
    const navigation = () =>
      renderer.root.find((element) => typeof element.props.onContinue === 'function');
    act(() => {
      renderer = create(screen(1));
    });
    expect(navigation().props.continueLabel).toBe('Next Chapter →');
    act(() => navigation().props.onContinue());
    expect(navigation().props.continueLabel).toBe('Begin reading');
    expect(JSON.stringify(renderer.toJSON())).not.toContain('Chapter Complete');
    act(() => navigation().props.onContinue());
    expect(store.setReadingSession).toHaveBeenLastCalledWith(
      'mark',
      'mark-2',
      expect.objectContaining({ phase: 'reading', sectionIndex: 0 }),
    );
    act(() => renderer.update(screen(3)));
    expect(JSON.stringify(renderer.toJSON())).toContain(third.sections[1]!.title);
    act(() => renderer.update(screen(1)));
    expect(navigation().props.continueLabel).toBe('Next Chapter →');
    expect(JSON.stringify(store.progress)).toBe(saved);
    expect(store.recordPathActivity).not.toHaveBeenCalled();
    expect(store.openChest).not.toHaveBeenCalled();
  });
});
