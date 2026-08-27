# Product specification

## Product promise

Scriptora makes daily Scripture recall feel inviting and finite while optimizing for what the learner can still produce days, weeks, and months later. It is a guided curriculum, not an empty flashcard box.

## Audience and modes

- Casual: 1–3 minutes, one new unit at most, due reviews prioritized.
- Serious: 10–15 minutes, two new groups, all due reviews.
- Chapter Master: sequential chapter acquisition plus weekly chapter tests.
- Whole-Bible: multiple concurrent books with strict review-load caps.

The private MVP implements the shared daily loop and campaign selector; intensity profiles are phase 2 configuration.

## Primary journeys

### First run

1. Choose UI language independently from Bible language/translation.
2. Choose Romans or Proverbs and an effort profile.
3. See license/source information for the chosen translation.
4. Preview the first semantic group and complete a supported read attempt.
5. Schedule the first retrieval and show what tomorrow will contain.

### Daily practice

1. Home shows streak, XP/level, three quests, current path, due count, at-risk verses, next boss, and one Start action.
2. Due/at-risk reviews come before optional new content.
3. Assistance steps down: read → missing words → initials → full recall.
4. Learner attempts, sees canonical text, receives an accuracy estimate, and rates Again/Hard/Good/Easy.
5. The scheduler updates difficulty, stability, retrievability, due time, mastery, and XP.
6. A short completion screen summarizes retained Scripture rather than time spent.

### Chapter and boss tests

- Chapter test: every semantic group plus random reference matching.
- Section boss: minimal/no hints, mixed ordering, at least one delayed session.
- Book mastery: sequential, random-reference, spoken, and delayed tests across multiple days.
- Failure does not destroy acquired progress; missed groups enter relearning and the boss can be retried after due repair.

## Mastery contract

| State | Meaning | Typical allowed help | Exit evidence |
|---|---|---|---|
| New | Not retrieved yet | Full text/read | First successful retrieval |
| Learning | Fragile initial memory | Missing words and limited hints | Multiple successful recalls over separated sessions |
| Familiar | Usually recalled with modest support | Initials; occasional hint | Stability ≥ 14 days and clean recall history |
| Strong | Reliable unaided recall | Full recall, reference reversal | Stability ≥ 60 days and delayed success |
| Mastered | Long-horizon recall demonstrated | No hints in tests | Sustained high predicted retention; maintained by sparse reviews |

The current MVP maps the states to stability and successful recall count. Production promotion also requires a minimum number of unaided delayed events so same-day repetitions cannot shortcut mastery.

## Game economy

- XP inputs: task difficulty, unaided accuracy, age of the memory, grade, and perfect recall.
- XP deductions: hints and supported modes. Failed attempts get a tiny participation amount but are never an efficient farming path.
- Repeating a not-due item should yield no leaderboard XP in production; the local MVP already favors due/old full recall but needs server-side daily caps before public competition.
- Combo: 2–10% modest bonus for consecutive due, unaided successes; resets on failure; phase 2.
- Streak: one qualifying learning action/day. Historical longest streak remains visible; protection/repair does not claim a review occurred.
- Three daily quests: due reviews, one clean recall, and one new verse. Future fourth quest may be a campaign challenge.
- Levels are presentation only and never gate core memorization.

## Accessibility and trust

- 44–52 pt minimum targets, screen-reader labels, semantic progress bars, keyboard-compatible fields, adjustable text, high contrast, reduced motion, and no color-only states.
- Exact canonical text is always recoverable after an attempt.
- Speech results must expose transcript/confidence and permit correction.
- No manipulative religious claims, public holiness scores, shame notifications, or lost-progress threats.

## Success metrics

North star: number and proportion of verses correctly recalled without hints after 30 days.

Guardrails: D1/D7/D30 return, due-review completion, lapse recovery time, hints per successful recall, 30/90-day accuracy, notification opt-out, deletion/export completion, crash-free sessions, and sync conflict/data-loss rate. Session time and XP are diagnostic only.

## Current MVP acceptance

- Runs from one codebase on Expo-supported iOS, Android, and web.
- Persists settings and review state offline.
- Supports four progressive exercise modes and four review grades.
- Stores per-verse learning signals and schedules adaptive reviews.
- Contains all Romans/Proverbs chapter groups/tests and boss checkpoints.
- Ships only source-linked public-domain starter verses; visibly blocks Bibel 2000 text.
- Localizes the core UI in four target languages and handles Chinese tokenization.
- Passes deterministic tests for scheduling, risk, text comparison, Chinese segmentation, and XP.
