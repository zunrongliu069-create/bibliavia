# Bibliavia Path option 1 — visual QA

- Source visual truth: `C:\Users\liuba\.codex\generated_images\01a02e2c-7087-7112-83e1-7b7fb2f66601\exec-897ffc59-905f-4fa8-a61a-99c8a715c77b.png`
- Implementation screenshot: `C:\Users\liuba\Documents\ChatGPT\Memora\path-implementation-final.png`
- Combined comparison: `C:\Users\liuba\Documents\ChatGPT\Memora\path-design-comparison.png`
- Viewport/state: 390 × 844 CSS px, DPR 1, Simplified Chinese, Romans memorization Path started at Romans 1:1.
- Pixel normalization: source 853 × 1844 scaled to 390 × 844; implementation captured at 390 × 844; comparison 780 × 844.

## Full-view comparison

- Hierarchy matches: dark purple/gold book header, chapter progress, illustrated Roman road, current/locked/discovery nodes, next-lesson panel, gold primary action and compact bottom navigation.
- Fonts: Georgia-style display hierarchy and heavy UI labels match the target's classical game tone; Chinese localization necessarily uses platform glyph fallbacks.
- Spacing: primary action and navigation remain visible without scrolling; nodes follow the painted road and do not overlap the lesson panel.
- Colors: purple, antique gold, mint and cream map closely to the source; the existing global HUD and cream app frame are intentional product-shell constraints.
- Imagery: the existing high-resolution Roman world asset matches the selected direction and is not replaced by CSS/SVG imitation.
- Copy: localized Romans 1:1/1:2 content is internally consistent. Activity labels replace generic node numbers so each node remains actionable.
- Focused-region comparison was unnecessary: the normalized 390 × 844 side-by-side image keeps header, nodes, CTA and navigation readable.

## Interaction evidence

- Path tab opens correctly.
- Start Path updates the Path state and reveals the localized continuation action.
- Continuation opens the Romans 1:1 lesson intro; closing returns to Path.
- Read/Recall/Review retain their existing handlers and locked/completed semantics.
- No new console error appeared after the clean reload. Existing React Native Web shadow deprecation warnings remain.

## Comparison history

1. P1 — first implementation targeted unused `CampaignScreen`.
   - Restored that file and moved the design into the active `PathGameWorld` used by `JourneyScreen`.
2. P1 — an unstarted Romans Path displayed the global Genesis fallback.
   - The first beat now becomes the initial Path beat, yielding Romans 1:1 and Romans 1:2.
3. P2 — the CTA fell below the mobile viewport.
   - Reduced the world height and tightened the bottom lesson panel; CTA and navigation now remain visible.

## Follow-up polish

- P3: migrate deprecated React Native Web shadow props separately; unrelated screens currently share them.
- P3: add motion/haptics/audio only after the static Path direction is approved in use.

final result: passed
