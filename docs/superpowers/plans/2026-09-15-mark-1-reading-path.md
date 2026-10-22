# Mark 1 Reading Path 1.0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a reusable mobile Reading Path engine and use Mark 1 as its first complete, passage-grounded chapter.

**Architecture:** Extend `PathChapterSection` with editorial interaction data, keep Mark 1 content in configuration, drive one generic reading screen with a tested state reducer, and persist its session inside the existing chapter node progress. Completion still uses `readingCompleted + quizCompleted`.

**Tech Stack:** TypeScript, React Native/Expo, AppStore persistence, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-15-mark-1-reading-path-design.md`

## Global Constraints

- Scripture dominates the mobile reading screen.
- One Choose, Order, or Connect interaction follows each section.
- Questions and explanations are explicitly grounded in Mark 1.
- Wrong answers never remove progress or restart the chapter.
- No automatic Bible splitter, Path renderer redesign, rewards, lives, or new art.
- Existing `readingCompleted + quizCompleted` remains the chapter unlock rule.

---

### Task 1: Reading content types and Mark 1 configuration

**Files:**

- Modify: `src/types.ts`
- Modify: `src/data/paths.ts`
- Create: `src/data/readingChapters.ts`
- Create: `src/data/readingChapters.test.ts`

**Interfaces:**

- Produces: `ReadingInteractionDefinition`, `ReadingChapterDefinition`, `readingChapterForBeat(beatId)`.
- Extends: `PathChapterSection.interaction` and `PathBeatDefinition.reading`.

- [ ] Write failing tests asserting six Mark 1 ranges (`1–8`, `9–13`, `14–20`, `21–34`, `35–39`, `40–45`), one interaction per section, three recap questions, valid Choose answers, Order permutations, Connect pairs, and WEB/CUV passage resolution.
- [ ] Run `npm test -- src/data/readingChapters.test.ts` and confirm failures are caused by missing content APIs.
- [ ] Add localized content types and explicit Mark 1 section/interaction configuration.
- [ ] Attach the six sections and intro/recap metadata to the `mark-1` chapter beat without altering other beats.
- [ ] Run `npm test -- src/data/readingChapters.test.ts` and confirm it passes.

### Task 2: Deterministic reading flow and persistence shape

**Files:**

- Modify: `src/types.ts`
- Create: `src/lib/readingFlow.ts`
- Create: `src/lib/readingFlow.test.ts`
- Modify: `src/store/AppStore.tsx`

**Interfaces:**

- Produces: `ReadingSessionState`, `initialReadingSession()`, `advanceReadingSession()`, `backReadingSession()`.
- Store method: `setReadingSession(pathId, beatId, session)` writes `nodeProgress[beatId].chapter.readingSession` through existing persisted state.

- [ ] Write failing reducer tests for intro → reading → interaction → next section → recap → complete, wrong-answer retry, Back, and restoration from a saved state.
- [ ] Run `npm test -- src/lib/readingFlow.test.ts` and confirm the intended transition failures.
- [ ] Implement the smallest pure reducer and optional persisted chapter-session fields.
- [ ] Add the AppStore update method without creating separate storage.
- [ ] Run `npm test -- src/lib/readingFlow.test.ts src/lib/pathProgress.test.ts` and confirm both pass.

### Task 3: Reusable Choose, Order, and Connect interaction UI

**Files:**

- Create: `src/components/ReadingInteraction.tsx`
- Modify: `src/lib/uiText.ts`

**Interfaces:**

- Consumes: `ReadingInteractionDefinition`, UI language, `onResolved(correct)`.
- Produces: a single content-driven interaction view with retry feedback and no progression side effects.

- [ ] Implement Choose with one selected option and explicit correct/incorrect feedback.
- [ ] Implement Order with tappable items, a user-built sequence, and correction without losing chapter progress.
- [ ] Implement Connect with tappable left/right relationships and correction of unmatched pairs.
- [ ] Reuse existing `Button`, `Card`, colors, feedback language, and accessibility roles.

### Task 4: Generic Reading chapter renderer

**Files:**

- Create: `src/screens/ReadingChapterScreen.tsx`
- Modify: `src/screens/LibraryScreen.tsx`

**Interfaces:**

- Consumes: Path, chapter beat, resolved verses, saved `ReadingSessionState`, store callbacks, and Back/Next Chapter callbacks.
- Produces: intro, one-section reading, interaction, recap, and completion phases using `BottomNavigation`.

- [ ] Render the lightweight intro with section count and estimated time.
- [ ] Render only the active section's Bible verses and keep Scripture visually primary.
- [ ] Connect Continue to the section interaction and interaction completion to the next section.
- [ ] Render the three recap interactions sequentially.
- [ ] Persist every phase/index transition and restore it on reload.
- [ ] On final section, call existing `recordReading()` with all chapter verses; on recap completion, call existing chapter quiz completion through `recordPathActivity()`.
- [ ] Render Back/Continue at every bottom boundary and Back to Path/Next Chapter at completion.
- [ ] Route configured Path chapters from `LibraryScreen` into the generic renderer; retain the legacy reader for unconfigured chapters.

### Task 5: Progression integration and verification

**Files:**

- Modify: `src/lib/pathProgress.test.ts`
- Modify only if required by test evidence: `App.tsx`, `src/screens/JourneyScreen.tsx`

**Interfaces:**

- Confirms: Mark 1 recap completion sets the existing quiz flag and unlocks Mark 2.

- [ ] Add a failing integration test that completes Mark 1 reading and recap and asserts `mark-2` becomes current/available.
- [ ] Apply only the minimal navigation glue required by the failing test.
- [ ] Run the focused Reading and progression tests.
- [ ] Format only edited files.
- [ ] Run `npm run verify` once.
- [ ] Manually test WEB and CUV at a mobile-sized viewport: full flow, wrong answer, Back, reload/resume, long scrolling, completion, and next chapter.
