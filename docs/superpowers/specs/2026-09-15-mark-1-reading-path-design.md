# Mark 1 Reading Path 1.0 design

## Scope

Mark 1 is the first complete vertical slice for a generic, data-driven Reading Path engine. Scripture remains the main content. The engine adds one short, passage-grounded interaction after each natural section and a three-question chapter recap. Existing Path rendering, rewards, memorization, and chapter unlock rules remain unchanged.

## Editorial section boundaries

The boundaries are explicit content metadata because the current WEB and CUV sources contain verses but no paragraph, heading, or pericope metadata.

1. **John prepares the way — Mark 1:1–8.** A single unit introducing John, his baptism, and his announcement of the one coming after him.
2. **Jesus is baptized and tested — Mark 1:9–13.** Jesus' baptism, the heavenly declaration, and the immediately connected wilderness testing.
3. **Jesus calls the first disciples — Mark 1:14–20.** Jesus begins preaching in Galilee and calls Simon, Andrew, James, and John.
4. **Authority in Capernaum — Mark 1:21–34.** The connected Capernaum sequence: teaching in the synagogue, release from an unclean spirit, and healings at Simon and Andrew's house.
5. **Prayer and preaching through Galilee — Mark 1:35–39.** Jesus withdraws to pray and explains why he will continue to other towns.
6. **A man is made clean — Mark 1:40–45.** The request, cleansing, instruction, and consequence of the man's public report form one complete scene.

These sections are shared by WEB and CUV because they refer only to canonical verse ranges. Titles and interaction copy are localized separately from Bible text.

## Content model

`PathChapterSection` remains the section foundation and gains an optional, localized `interaction`. A chapter beat gains optional `readingIntro` and `chapterRecap` metadata. Interactions are a discriminated union:

- `choose`: prompt, answer options, correct option, and a short explanation.
- `order`: prompt, stable event IDs in correct order, localized labels, and explanation.
- `connect`: prompt, stable relationship pairs, localized left/right labels, and explanation.

All answers and explanations are editorial configuration derived directly from the passage. Nothing is generated at runtime. Optional prediction/discovery fields may be added later without changing the renderer, but they are deliberately not implemented in this slice.

## Mark 1 section interactions

1. 1:1–8 — **Choose:** What did John say the one coming after him would do? Correct: baptize with the Holy Spirit.
2. 1:9–13 — **Order:** Jesus is baptized → the Spirit descends and the voice speaks → Jesus goes into the wilderness.
3. 1:14–20 — **Choose:** How did Simon and Andrew respond to Jesus' call? Correct: they left their nets and followed him.
4. 1:21–34 — **Connect:** synagogue ↔ teaching and release from an unclean spirit; Simon and Andrew's house ↔ Simon's mother-in-law is raised; the door ↔ the city gathers with the sick.
5. 1:35–39 — **Choose:** Why did Jesus say they should go to the nearby towns? Correct: so he could preach there also.
6. 1:40–45 — **Order:** the man asks to be made clean → Jesus touches and cleanses him → Jesus sends him to the priest → the man spreads the news.

Wrong answers show the correct passage-grounded explanation and leave progress intact. Choose permits another selection. Order and Connect preserve completed correct work and let the player correct remaining items. Once understanding is established, Continue advances.

## Chapter recap

The recap contains three deterministic questions that cover the whole chapter without copying section questions:

1. **Order:** John prepares the way → Jesus is baptized and tested → Jesus calls disciples → Jesus teaches and heals.
2. **Connect:** John ↔ prepares the way; the first disciples ↔ leave their work and follow; people from everywhere ↔ come to Jesus.
3. **Choose:** Which statement best describes the chapter's visible movement? Correct: Jesus announces God's Kingdom, calls followers, and acts with authority and compassion.

The final Choose wording stays descriptive and text-grounded rather than presenting speculative theology as a scored answer.

## Engine and navigation

One generic `ReadingChapterScreen` renders `intro → section reading → interaction → next section → recap → complete`. It receives the chapter beat and resolved Bible verses. There is no `Mark1Screen`.

Every reading and interaction phase ends with the reusable bottom navigation. Back moves to the previous phase or Path without deleting progress. Continue opens the section interaction, next section, recap, or completion as appropriate. The completion phase offers Back to Path and Next Chapter.

## Persistence and progression

The existing chapter node state is extended with optional reading-session fields: current section index, phase, completed section IDs, and recap index. Defaults make existing saved data compatible. Updates use the existing AppStore persistence path.

Completing the last section records the full chapter as read, preserving `readingCompleted`. Completing the recap records the existing chapter quiz completion, preserving `quizCompleted`. The existing Path progression then marks Mark 1 complete and unlocks Mark 2. Section completion is exposed as a renderer callback/event but does not alter Path unlock rules.

## Testing

Tests cover Mark 1 configuration, passage containment, all correct answers being present and grounded, phase transitions, wrong-answer retry, Back behavior, persistence/resume, WEB/CUV verse resolution, and the existing Mark 1 → Mark 2 unlock rule. Manual QA uses a mobile-sized viewport and includes long-section scrolling and end-of-content navigation.
