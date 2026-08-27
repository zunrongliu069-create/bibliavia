# Market and learning research

Verified 23 August 2026. Product claims come from current official listings or first-party pages where available; review themes are directional, not a statistically representative survey.

## Competitor matrix

| Product | Strongest current features | Learning model | Motivation/social | Recurring gaps or complaints | Scriptora decision |
|---|---|---|---|---|---|
| Remember Me | Many drills, audio/recording, 300+ translations, 48 languages, collections, offline and sync; free/open source | Configurable spaced-repetition flashcards | Scores, streaks, campaigns/groups | Users still ask for clearer personal plans; an upgrade warning shows backup/migration risk | Keep breadth, offline capability, and flexible categorization; make the guided path and recoverability primary |
| The Bible Memory App | First-letter typing, audio/visual/touch modes, cross-device sync | Decreasing-frequency reviews | Points and groups | Reviews flag expensive pricing, unclear onboarding, reminder gaps, and assisted modes advancing progress too generously | Keep first-letter mode; separate recognition from verified recall; preserve a useful free core |
| VerseLocker | Free, 30+ translations, audio loop, blur/initials/word/type modes, collections and sync | User-selected review cadence; no strong formal adaptive SRS claim | Badges and leaderboard | Requests for native speech practice; manual scheduling puts planning on the learner | Keep audio-loop idea for phase 2; add adaptive due scheduling and guided curricula |
| Verses | Polished progressive games and visual experience | “Memory health” progression | Strong moment-to-moment game feel | Speech recognition can mis-score exact recitation and long passages; historical reliability complaints | Keep progressive assistance removal; speech must show uncertainty and allow user correction |
| MemoryVerses | Curated collections, daily games, groups/church goals, scores by book/chapter | Multiple practice methods | Streaks, games, feeds and group challenges | Social/privacy maturity and game-to-learning alignment require careful validation | Later co-op, with privacy/moderation gates and recall-linked rewards |
| Anki / FSRS | Highly adaptive scheduling; local-first; proven review workflow | Difficulty–stability–retrievability model with personalized parameters | Minimal native motivation | Powerful but requires users to make/import and manage cards; intimidating for casual users | Use D/S/R state and later optimization, but supply complete guided content and friendly explanations |
| Quizlet | Low-friction sets and varied recognition/recall activities | Mixed study/test modes | Classroom sharing | Recognition can masquerade as recall; user-authored quality varies | Use recognition only early; full recall is required for mastery |
| Duolingo | One clear next action, streaks, streak repair, daily/friend quests, visible path, short sessions, celebratory feedback | Progressive exercises and personalization | Highly developed habit loop | XP/league optimization can displace learning; streak anxiety and energy friction can feel manipulative | Keep path, quests, milestones, minimum-effort day, and forgiving streak; reject grindable XP and coercive loss aversion |

Current sources: [Remember Me Google Play listing](https://play.google.com/store/apps/details?id=org.bible.remember_me), [The Bible Memory App listing and reviews](https://play.google.com/store/apps/details?id=com.millennialsolutions.scripturetyper), [VerseLocker official page](https://app.verselocker.com/verselocker/home/index.php), [VerseLocker Google Play listing](https://play.google.com/store/apps/details?id=com.audioverse.smf.audioverse), [Verses App Store reviews](https://apps.apple.com/us/app/verses-bible-memory/id939461663), [MemoryVerses listing](https://play.google.com/store/apps/details?id=com.memoryverses.app), [Anki FSRS manual](https://docs.ankiweb.net/deck-options.html), and [Duolingo Friends Quests](https://blog.duolingo.com/friends-quests/).

## What supports long-term recall

- Retrieval practice produces stronger delayed retention than repeated study. Use low-stakes production, feedback, and repeated later retrieval—not passive exposure as the success event.
- Spacing retrieval episodes out improves retention relative to massed retrieval. The exact schedule should respond to observed forgetting rather than use one fixed ladder for every learner and verse.
- Harder production tasks are more diagnostic than recognition. Multiple choice and visible-word tasks introduce material but cannot certify mastery.
- Feedback matters: after an attempt, show the canonical text and allow a fair self-rating. Speech recognition must not silently turn ASR uncertainty into a memory failure.
- Restudy still has a role during first encoding and after failure. The product should alternate supported study with retrieval rather than fetishize difficulty.
- Delayed tests are the honest product KPI. “Still recalled after 30 days” matters more than session time or XP.

Evidence: [Nature Reviews Psychology overview of spacing and retrieval](https://doi.org/10.1038/s44159-022-00089-1), [2021 meta-analysis of spaced retrieval](https://eric.ed.gov/?id=EJ1310148), and [review of retrieval practice and long-term retention](https://www.sciencedirect.com/science/article/pii/S1364661310002081).

## Keep / Improve / Reject / Invent

### Keep

- First-letter, missing-word, typing, audio loop, speaking, reference reversal, and mixed review.
- Offline practice, flexible collections, translation choice, import/export, and transparent progress.
- A visible path, daily quests, streak milestones, compact sessions, friend encouragement, and celebratory feedback.
- Difficulty–stability–retrievability scheduling with per-user optimization when sufficient history exists.

### Improve

- Award mastery only for production-quality recall; track support level separately.
- Explain “why due” in one sentence: predicted recall, failure pattern, or elapsed time.
- Make chapters and whole books immediately actionable through semantic verse groups.
- Treat streaks as a habit aid: one miss does not erase identity or historical achievement.
- Make import licensing a runtime content gate, not a spreadsheet checked just before launch.
- Preserve years of review history with append-only events, backups, export, and conflict-safe sync.

### Reject

- Infinite XP from repeated easy items, recognition-only “mastery,” paywalling basic memorization, public spiritual-status rankings, guilt messaging, forced notifications, and dark-pattern streak loss.
- AI-generated or reconstructed Bible text.
- A single word-splitting rule for English, Swedish, and Chinese.
- Client-authoritative public leaderboards or purchases.

### Invent

- Retention-weighted XP: an old verse recalled unaided is worth more than a fresh assisted verse.
- Recall confidence with evidence: accuracy, hints, elapsed time, modality, and historical lapses.
- “At risk” inbox that is small, prioritized, and explanatory.
- Boss tests that sample sequential, random-reference, reverse-reference, and delayed recall.
- Minimum-effort mode that protects the practice habit without faking full completion.
- License-aware content packages that refuse public activation when provenance or permissions expire.

## MVP priority

1. Canonical verified text pipeline, active recall, adaptive due scheduling, local durability, and clear daily action.
2. Guided Romans/Proverbs structure, progressive modes, weak-verse queue, learning-linked XP, quests, and forgiving streak.
3. Multilingual UI/content separation, Chinese segmentation, accessibility, export, and deterministic automated tests.
4. Cloud accounts/sync, audio/speech, notifications, analytics, achievements, and production content licensing.
5. Social/co-op, subscriptions, broad catalogs, and personalized parameter training only after privacy and retention evidence are sound.
