export type ReadingNextAction = 'quiz' | 'next-chapter' | 'path-complete';

export function readingNextAction(input: {
  hasChapterQuiz: boolean;
  quizCompleted: boolean;
  hasNextChapter: boolean;
}): ReadingNextAction {
  if (input.hasChapterQuiz && !input.quizCompleted) return 'quiz';
  if (input.hasNextChapter) return 'next-chapter';
  return 'path-complete';
}
