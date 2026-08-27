# PROJECT HANDOFF

## 1. PROJECT

- App name: Scriptora.
- Purpose: Game-like Bible reading and verse memorization optimized for long-term recall.
- Target platforms: Web, iOS, Android via Expo/React Native. Current prototype is primarily tested on web.
- Tech stack: Expo 57, React 19, React Native 0.86, TypeScript, React Native Web, AsyncStorage, Vitest.

## 2. CORE PRODUCT

- Core user loop: Learn a verse -> retrieve it through short exercises -> full/spoken recall -> receive XP/chest rewards -> repeat when due -> increase durable mastery -> unlock characters.
- Main value proposition: Help users retain Scripture long-term; rewards reinforce real retrieval practice, not passive recognition.
- Target user: Bible readers who want brief, motivating, multilingual memorization sessions.

## 3. FINAL PRODUCT DECISIONS

- **FINAL:** Long-term verse retention is priority 1; retrieval and spacing outrank gamification and passive recognition.
- **FINAL:** App name is Scriptora.
- **FINAL:** UI is game-like and cohesive: deep purple, gold, mint, cream; detail level between Duolingo and Clash Royale.
- **FINAL:** Path is the primary lesson journey; lessons also start from Today.
- **FINAL:** Lessons begin at Romans 1 and Proverbs 1 and advance to the next verse, never repeat the completed verse.
- **FINAL:** A user may stop after any stage without failure; progress is saved and resumes later.
- **FINAL:** Only full typed recall or spoken recall can establish durable mastery and long intervals.
- **FINAL:** Except full recall, exercises must use short answers to maximize retrieval attempts per minute.
- **FINAL:** No listening exercise until audio is reliable.
- **FINAL:** HP is not shown globally; use Current Streak and Days Active. Recall Streak must not return.
- **FINAL:** Every completed session/stage yields a chest; opening requires three taps with an upgrade chance per tap.
- **FINAL:** Chest reward is either gold or character shards, never both.
- **FINAL:** All 20 character cards start locked; David is a collectible card, not a guide/mascot.
- **FINAL:** Shard Shop shows exactly three equally rotated mixed-rarity offers.
- **FINAL:** Show All Collection sorts Common -> Rare -> Epic -> Legendary.
- **FINAL:** Read Bible and Reading Plans share one screen; Bible text appears only after Choose Bible Passage and book -> chapter -> verse selection.
- **FINAL:** UI language and Bible translation are independent settings.
- **FINAL:** Cursor must remain visible on web.
- **FINAL:** Free-to-play; no pay-to-win mechanics.

## 4. CURRENTLY IMPLEMENTED

- Five-tab app shell: Today, Path, Verses, Bible Collection, Settings.
- Persistent local user state with migration support.
- Today dashboard: daily goal, quests, achievements, at-risk verses, normal lesson and five-item Quick Practice.
- Romans/Proverbs Path with chapter selection and playable lesson nodes.
- Ten-exercise, three-stage lessons; automatic grading, optional grade override, tolerant text comparison, resume, next-verse progression.
- Adaptive spaced-repetition scheduler with separate recognition, recall and understanding strength.
- Chest opening/upgrading/rewards; XP, levels, gold, streaks, Days Active and achievements.
- Twenty locked collectible Bible characters; filters, details, target selection and daily Shard Shop.
- Read Bible passage selector/reader and eight functioning reading plans.
- Four UI languages and four translation records with license metadata.
- Browser speech recognition for Speak; browser TTS remains in the reader but is unreliable.
- Unit tests for core learning, XP, levels, rewards, shop and related logic. Last verified status: 57 tests passed; TypeScript passed.

## 5. CURRENT UI / UX

- Shared HUD: Current Streak, Days Active, XP/level and gold. No global HP.
- Today: dense game dashboard with daily goal (50 XP), quests, coach/status, Quick Practice, achievements and due/at-risk verses.
- Path: illustrated world, campaign/chapter controls, lesson nodes and current position; tapping a node enters a lesson.
- Verses: Reading Plans plus collapsed Read Bible. Selecting Read Bible reveals book/chapter/verse controls; opening shows text, reading actions and Memorize.
- Collection: compact locked cards, rarity filters, character detail/target selection and three-offer shop.
- Settings: language, translation/license information and reset controls.
- Lesson: consistent adventure theme from intro through exercises, stage checkpoints, chest and next verse. Primary continue action should remain visible.
- Stage checkpoints are positive exits: “progress saved,” earned XP and option to finish or continue.
- Word Order: tap available words to add; tap placed words to remove; Clear resets.
- Web layout is centered with approximately 820 px maximum app width and safe-area handling.

## 6. GAME SYSTEMS

| System | Current exact rule |
|---|---|
| XP | Daily goal 50. Lesson uses fixed successful-question XP `[4,5,11,3,3,5,4,3,5,7]`, giving cumulative stage totals 20/35/50. A failed lesson answer gives 0 fixed XP. Quick Practice gives 5 XP per successful item, maximum 25. Other reviews use `calculateXp`: failed/Again/accuracy < 0.5 = 2; base 12 for new mastery else 8; recall/speak +8; context/contextChoice/initials/keywords +4; blanks/moreBlanks/reorder/choice/finish/sentenceCheck/match +2; age bonus `min(10,floor(stabilityDays/7))`; perfect +6; hints -3 each; Easy x1.15, Hard x0.75; minimum 3 on success. |
| HP | Three lesson hearts, visible only inside lessons. Unsuccessful answer removes one, minimum 0. A stage continuation restores one, maximum 3. Reaching 0 currently does not terminate the lesson. |
| Lessons | Ten questions. Stage 1 = Q1-3 Learn; Stage 2 = Q4-7 Practice; Stage 3 = Q8-10 Master. Stop after any stage, save index, resume later. Every grade advances. Success requires grade != Again and accuracy >= 0.55. |
| Chest levels | Tiers 1-5: Wood, Bronze, Scroll, Royal, Glory. Base tier after stage 1/2/3 is 1/2/3. |
| Chest progression | Tap closed chest exactly 3 times. Each tap spins/animates and independently upgrades one tier, max 5. Chance per tap = `0.20 + accuracy*0.45` (20-65%), deterministically seeded. No duplicate claim for the same stage reward. |
| Gold | Chest amounts by tier: 12/20/32/50/80. Level rewards: `20 + level*5`. Spend 50 gold for 5 shards in the shop. No purchases/IAP. |
| Character shards | Chest shards by tier: 4/7/12/18/30, awarded to selected target. Shop: +5 for 50 gold. |
| Characters | 20 cards, all initially locked. Unlock costs: Common 40, Rare 60, Epic 80, Legendary 100 shards. |
| Character levels | Level 0 while locked; level 1 at unlock cost; +1 per additional full unlock-cost block; cap 4. Reading-based upgrade requirements are not implemented. |
| User levels | XP threshold for level L: `100*(L-1) + 25*(L-1)^2`. From level 2, claim gold `20 + 5L`; every fifth level also gives 10 target-character shards. Titles at levels 1/5/10/20/35: Beginner, Verse Learner, Scripture Walker, Memory Master, Bible Scholar. |
| Days Active | Count of unique local calendar dates containing practice or recorded reading; non-consecutive. |
| Streaks | Current Streak continues if active yesterday, stays unchanged for repeated activity today, otherwise resets to 1. Longest Streak is stored. No Recall Streak. |
| Achievements | Eight: First Verse (1 successful full/spoken recall); Ten Verses (10 recalled verses); Perfect Recall (>=98%, no hints, full/spoken); Ten Perfect; First Character; Seven Active Days; Chapter Explorer (all locally available verses in a chapter read); Scripture Scholar (1000 XP). |
| Challenges | Daily quests: review 3 items; one perfect hint-free full/spoken recall; learn 1 new verse. Path has a Skip Ahead control but no real placement test. Boss/chapter challenges are not fully implemented. |
| Mastery | Display percent = 15% recognition + 85% recall, decayed by retrievability; capped at 49% until first successful full/spoken recall. Stages: New (0 full recalls), Learning (<3-day stability), Familiar (<14), Strong (<60), Mastered (>=60). |

Automatic grade: accuracy < 0.55 = Again; accuracy < 0.82 or at least 2 hints = Hard; accuracy >= 0.98, no hints and fast enough = Easy; otherwise Good. Read recommends Good. User may override.

## 7. BIBLE / LEARNING SYSTEM

- Bible reading: choose translation, book, chapter and starting verse; open passages are grouped into at most six verses. Users can mark read or start memorization.
- Passage structure: local `Verse` records contain translation/book/chapter/verse range/reference/language/text/source. Path curriculum groups verse ranges into chapter lessons.
- Memorization sequence: Read -> Finish sentence (2 choices) -> First letters -> Choose word -> Exact/changed sentence -> Word Order -> Match references/openings -> Choose next verse -> Speak -> Full Recall.
- Word Order: shuffled tokens; add, remove or clear; no full typing.
- Fill-in-the-blank: only 2-3 missing words, answered in order.
- First-letter/keyword hints: maximum six-word target phrase; short retrieval, not full-verse typing.
- Recall: case, punctuation, apostrophe style and whitespace are ignored. Minor typos receive partial cost; changed/missing biblical words are penalized; paraphrases do not pass as exact text. Only Full Recall requires typing the entire verse.
- Spaced repetition:
  - Successful full/spoken recall ladder: 0, 1, 3, 7, 14, 30, 60 days, adjusted for grade, accuracy and difficulty.
  - Hard full recall: at least 0.5 day, normally ladder x0.55. Good/Easy: ladder x quality, at least 1 day; Easy advances the ladder index.
  - Successful short recall is capped at 1 day; successful recognition at 0.5 day.
  - Failure due times: full recall 30 min; short recall 2 h; recognition 6 h.
  - Hint penalty: maximum 0.35, adding 0.12 per hint.
  - Due queue sorts lowest retrievability first, then lowest recall strength.
  - Existing state is migrated from actual review history under retention model version 1; previously inflated mastery may decrease.
- Understanding: Understand and Context Choice update understanding strength; semantic comprehension content is currently lightweight/static.
- Reading plans implemented: John 21 days, Mark 16, New Testament 90 (all 260 chapters, usually 3/day), Comfort 7, Prayer 14, Courage 21, Wisdom/Proverbs 31, With Jesus 30. Completing a day gives 5 XP. Missing local passages use an external Bible link.
- Audio: listening exercises are disabled. Reader TTS uses browser `speechSynthesis`; Speak uses browser `SpeechRecognition`/`webkitSpeechRecognition`. Both are browser-dependent and not production-ready.
- Languages: UI supports English, Swedish, Simplified Chinese and Traditional Chinese. Initial setting: Simplified Chinese.
- Translations/licensing: WEB English is public domain; CUV-S/CUV-T source editions are marked public domain but jurisdiction/release status must be reverified; Bibel 2000 requires Svenska Bibelsällskapet permission and is development-only (`publicBuild:false`). Initial translation: CUV-S.
- Local content is incomplete: Romans 1 and Proverbs 1 are the primary populated chapters, plus a few extra verses; full-Bible plans often depend on external links.

## 8. AI FEATURES

- Implemented AI: none. Adaptive grading, scheduling, shop rotation and rewards are deterministic local algorithms, not AI services.
- Planned: mistake-specific feedback and word-level comparison; better multilingual speech grading, including Chinese homophones/pinyin.
- OPTIONAL/FUTURE: generated comprehension questions/distractors only with theological/editorial review and a defined content policy.

## 9. SOCIAL FEATURES

- Current: none; no accounts, friends, leagues, sharing or backend.
- OPTIONAL/FUTURE/UNCERTAIN: private sharing, friend challenges or leaderboards only after user approval, authentication and privacy design.

## 10. COLLECTION / PROGRESSION

- Implemented roster:
  - Common: Samuel, Nehemiah, Gideon, Hannah, Timothy, Lydia.
  - Rare: Ruth, Elijah, Deborah, Joshua, John the Baptist.
  - Epic: Peter, Esther, Daniel, Mary, Joseph.
  - Legendary: David, Moses, Abraham, Paul.
- Rarity roughly reflects narrative prominence. Do not change assignments without approval.
- All cards start locked; compact cards, rarity filters and Common-first Show All sorting are implemented.
- Users select one target; chest/shop shards apply to it. Daily deterministic shop has three mixed-rarity offers and equal long-run character frequency.
- Bible Journey is the implemented Path: campaigns, chapters and verse lessons.
- PLANNED: add character-specific reading/reference quests as upgrade requirements alongside shards (for example, read chapters about that person). Exact requirements are not finalized.
- OPTIONAL/FUTURE: Museum and Skill Tree. No approved mechanics or implementation exist; do not invent them.

## 11. TECHNICAL ARCHITECTURE

- Framework: Expo-managed React Native app with React Native Web and TypeScript.
- Navigation: custom tab/overlay state in `App.tsx`; no routing library. Review is a full-app overlay.
- Database: none. One versioned JSON state object in AsyncStorage.
- Authentication: none.
- State management: React Context/reducer-style actions in `AppStore.tsx`; persistence key `scriptora/state/v2`, with migrations from `scriptora/state/v1` and `memora/state/v3`.
- Backend: none.
- APIs: no application API. External browser links for unavailable Bible passages; browser Web Speech APIs for TTS/STT.
- Storage: AsyncStorage; reviews capped at 500, reward history at 100. Character/path images bundled locally.
- Important packages: Expo, React/React Native, AsyncStorage, Expo Localization/Font/StatusBar, Safe Area Context, Expo Vector Icons, Vitest.
- Environment variables: none currently.
- Build/deployment: `npm start`, `npm run web|ios|android`, `npm run typecheck`, `npm test`. Local web commonly runs at `http://localhost:4173`; no production hosting/release pipeline is configured.

## 12. FILE STRUCTURE

```text
App.tsx                         App shell, HUD, custom tabs, review overlay
index.js / app.json             Expo entry and app configuration
src/
  store/AppStore.tsx            State, persistence, migrations, actions/rewards
  types.ts                      Domain/state type definitions
  screens/
    HomeScreen.tsx              Today, goal, quests, review entry, achievements
    CampaignScreen.tsx          Path/campaign/chapter/lesson nodes
    ReviewScreen.tsx            Lesson, exercises, checkpoints, chest flow
    LibraryScreen.tsx           Bible selector/reader and memorization entry
    ReadingPlansView.tsx        Reading plan catalog and progress
    CollectionScreen.tsx        Cards, details, targeting and Shard Shop
    SettingsScreen.tsx          UI language, translation/licenses, reset
  data/
    content.ts                  Translation metadata and local verse registry
    curriculum.ts               Romans/Proverbs Path curriculum
    readingPlans.ts             Eight localized plan definitions
    characters.ts / chests.ts   Collection and chest assets/rules
    generated/                  Generated CUV-S content
    licensed/                   Development-only licensed content
  lib/
    scheduler.ts                Retention scheduling/mastery
    exercise.ts / tokenize.ts   Exercise generation and answer comparison
    adaptiveGrade.ts            Automatic grade recommendation
    lessonOutcome.ts            Lesson success/XP outcome
    xp.ts / level.ts            XP and account levels
    rewards.ts / shardShop.ts   Chest rewards/upgrades and daily shop
    achievements.ts             Achievement progress
    learningSequence.ts         Verse ordering/next verse
    bibleLinks.ts / i18n.ts     External passage links/localized copy
  components/ui.tsx             Shared UI components
  theme.ts                      Scriptora design tokens
assets/                         Character, chest and Path artwork
docs/                           Product/design notes and audits
```

Core logic tests are colocated as `src/**/*.test.ts`.

## 13. DATABASE

- No relational/cloud database exists.
- Persisted `StoredState` contains settings plus `UserProgress` maps/arrays:
  - Settings: UI language, translation and related preferences.
  - Progress: retention model version, XP, gold, current/longest streak, unique active dates, last practice date.
  - Navigation: active campaign, Path chapter, lesson progress/index.
  - Learning: mastery keyed by verse ID and review-event history.
  - Reading: read verse IDs, active reading plan ID and per-plan/day progress.
  - Collection: character shards keyed by character ID, active shard target.
  - Rewards: opened chests, claimed stage/level rewards and reward history.
- `Mastery` stores stage, difficulty, stability days, retrievability, due/last-reviewed times, successful recalls, lapses, hints, average accuracy/recall time, recognition/recall/understanding strengths and learning step.
- `ReviewEvent` relates to a verse ID and records mode, grade, accuracy, hints, timing and XP.
- No users, sessions, sync, foreign-key enforcement or multi-device conflict handling.

## 14. CURRENT TODO

| Priority | Work |
|---|---|
| P0 | Add deterministic 60-day retention simulation/integration tests covering due selection, full recall, lapse, decay, stage exits, persistence and next-verse flow; fix any exposed scheduler errors. |
| P0 | Create a clean version-control baseline before large edits; current working tree files are untracked. Do not discard user files. |
| P0 | Prevent Bibel 2000 from entering any public/release bundle until written digital permission exists; reverify CUV release status. |
| P1 | Add word-level answer diff and localized, mode-specific mistake feedback. |
| P1 | Replace Path's direct Skip Ahead with a real recall placement challenge and separately label skipped vs mastered content. |
| P1 | Complete local Bible data/import pipeline so every reading-plan reference opens in-app text rather than an external fallback. |
| P1 | Define and implement character reading/reference quest requirements without changing current rarity/cost rules without approval. |
| P1 | Add end-to-end tests for every button and the complete Today/Path -> lesson -> checkpoint -> chest -> next verse flow. |
| P1 | Fix narrow-screen HUD truncation and keep result/continue actions visible; perform accessibility review. |
| P2 | Replace unreliable browser TTS/STT with licensed/cross-platform audio and speech services, then restore listening exercises. |
| P2 | Implement actual boss/chapter challenges and improve Path progress semantics. |
| P2 | Split the single large store and state blob into modular domains before backend/cloud sync work. |
| P2 | Configure production build, hosting, monitoring and release checks. |
| P3 | Museum, Skill Tree and approved social features after core retention is validated. |

## 15. KNOWN BUGS / PROBLEMS

- Path Skip Ahead is chapter selection, not the recall challenge implied by its UI.
- Local Scripture corpus is incomplete; many reading-plan entries leave the app through external links.
- Browser TTS and speech recognition vary by browser/platform; listening remains disabled and Speak may fail.
- Speech error/fallback copy contains hard-coded English in at least one path.
- No word-level diff explains which words caused a tolerant recall mismatch.
- HUD labels can truncate on narrow screens; Today can feel visually dense; some secondary text/controls may be too small or low contrast.
- Accessibility is not fully verified for keyboard, screen readers, text scaling, contrast and reduced motion.
- Reaching zero lesson hearts does not currently impose a consequence; intended behavior is **UNCERTAIN**.
- `listen` remains in legacy mode types/localization although absent from current lessons.
- No E2E coverage, backend, authentication, cloud backup or multi-device synchronization.
- Entire current working tree appears untracked; change history/recovery is fragile until a baseline is created.

## 16. IMPORTANT CONSTRAINTS

- Free-to-play: no required payments or pay-to-win progression. Monetization is not designed.
- Licensing: never publish Bibel 2000 without permission; keep it development-only. Revalidate every translation's jurisdiction, attribution and redistribution terms before release.
- Scripture fidelity: do not silently paraphrase source text; exact-recall normalization may ignore formatting/minor typos but not replace biblical wording.
- Learning integrity: rewards must follow meaningful learning; recognition alone cannot create “Mastered.”
- Performance: keep lessons fast, short-answer-heavy and usable in roughly two-minute sessions; avoid unnecessary dependencies/assets/network requests.
- Mobile: all flows must work touch-first on small screens and respect safe areas; web mouse cursor remains visible.
- Accessibility: preserve/add semantic labels, keyboard access, readable contrast, scalable text, reduced-motion behavior and non-color status cues.
- Privacy: speech/account/social services require explicit privacy design and consent before integration.
- Offline/local-first behavior should not regress without an approved architecture change.
- Preserve localized UI and keep translation selection independent from UI language.

## 17. FUTURE IDEAS

- Museum presentation for fully developed character cards.
- Skill Tree for optional mastery specialties.
- Carefully moderated social/friend challenges.
- Editorially reviewed AI comprehension content and multilingual pronunciation coaching.

## 18. DEVELOPMENT RULES FOR FUTURE AI

1. Treat section 3 decisions as final; ask before changing them.
2. Optimize first for measurable long-term recall, not session time or reward frequency.
3. Inspect current files/tests before editing; do not rely only on this summary.
4. Make the smallest coherent change and do not rewrite working features unnecessarily.
5. Preserve user changes and never reset/delete an untracked working tree.
6. Reuse shared components, theme tokens and existing domain logic.
7. Keep scheduler, grading, XP and UI presentation separate; do not duplicate rules in screens.
8. Do not let recognition-only exercises inflate durable mastery.
9. Keep non-full-recall answers short; only Full Recall may require complete typed verse text.
10. Never re-enable listening until audio works reliably across target platforms.
11. Never publish restricted Bible content or invent license permission.
12. Keep all four UI languages functional; localize new visible strings.
13. Preserve next-verse progression from Today and Path, including early stage exits.
14. Preserve three-tap chest behavior, deterministic reward protection and locked-start collection.
15. Add/update unit and flow tests for every changed mechanic; run `npm test` and `npm run typecheck`.
16. Test affected buttons on narrow web and mobile-sized layouts.
17. Do not add dependencies, backend or AI services without a concrete need and approval for resulting cost/privacy scope.
18. Mark uncertainty instead of inventing mechanics or content.
19. Update this handoff's status/TODO when a material feature or rule changes.

## 19. NEXT TASK

Build a deterministic 60-day retention simulation/integration suite and fix any failures, because the scheduler is Scriptora's primary value and must be proven before expanding content or rewards.

## 20. HANDOFF SUMMARY

Scriptora is a local-first Expo/React Native Bible memorization game for web/iOS/Android. Its non-negotiable goal is durable recall: users read Scripture, perform many short retrieval exercises, complete full typed or spoken recall, revisit verses through adaptive spacing, and earn XP/chests/character shards only after meaningful practice. Lessons contain ten exercises across Learn, Practice and Master stages, allow positive early exits, save progress, and continue to the next verse. The implemented game layer includes 50-XP daily goals, account levels, streak/Days Active tracking, achievements, three-tap upgradeable chests, gold, a rotating three-offer Shard Shop and 20 initially locked Bible characters.

The UI uses a cohesive purple/gold/mint game style across Today, Path, Verses, Collection, Settings and lessons. Romans 1 and Proverbs 1 are the main local curricula. Eight reading plans exist, but the local Bible corpus is incomplete, so many references use external links. English WEB and Chinese CUV source editions are marked public; release status must be rechecked. Bibel 2000 is development-only and must not ship without permission.

Architecture is intentionally simple: TypeScript, Expo, custom navigation, React Context and one versioned AsyncStorage JSON object; there is no backend, authentication, database, cloud sync or AI service. Latest validation was 57 passing tests plus TypeScript. Highest priorities are proving long-term retention with simulation/integration tests, establishing a safe version-control baseline, protecting Bible licenses, completing in-app Scripture content, improving answer feedback, and replacing fake Skip Ahead with a real recall challenge.
