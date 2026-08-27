# Scriptora lesson-flow visual QA

- Source visual truth: live Path screen using `assets/game/scriptora-path-world.png`
- Implementation: live `ReviewScreen` lesson intro and practice states at `http://localhost:4173/`
- Viewport: 607 × 898 CSS pixels, device scale factor 1
- Source and implementation density: browser-rendered at 1 CSS pixel per screenshot pixel
- State: Path → Start Adventure → lesson intro → practice

## Full-view comparison evidence

Before the preview server stopped, the Path reference and revised lesson intro/practice screens were opened and visually inspected at the same viewport. The lesson now reuses the same illustrated world, midnight overlay, purple panels, gold borders, gold primary emphasis, strong white display type, rounded game controls, and chest artwork as Path.

## Focused comparison evidence

- Intro: purple-and-gold adventure panel, bordered star badge, readable lesson facts, primary start action, and secondary exit action.
- Practice: dark HUD, visible hearts and progress, gold stage strip, purple exercise panel, white verse text, and parchment answer controls.
- Cursor: browser-computed button cursor returned `pointer`; the cursor-hiding stylesheet was removed.

## Fidelity surfaces

- Fonts and typography: hierarchy and weight match the Path treatment; the existing native font remains an accepted P3 difference from illustrated display lettering.
- Spacing and layout rhythm: intro and practice fit the portrait viewport and reset to the top when the phase changes.
- Colors and tokens: Path purple, warm gold, midnight navy, parchment, mint, and coral are reused throughout the lesson.
- Image quality: the original high-resolution Scriptora world and chest assets are reused without placeholders.
- Copy and content: the lesson now follows the master specification's 3 + 4 + 3 structure, ten exercises, three checkpoints, and cumulative 20/35/50 XP stages.

## Comparison history

1. P1 — the original lesson used a flat parchment background and visually disconnected white cards.
   - Fix: carried the Path world, purple/gold panels, fantasy HUD, typography hierarchy, and reward styling through intro, exercises, checkpoints, and chest screens.
   - Post-fix evidence: intro and practice browser captures visibly match the Path art direction.
2. P2 — entering an exercise could inherit the previous page's scroll position.
   - Fix: reset scroll position at every lesson phase and exercise transition.
   - Post-fix evidence: browser evaluation returned scroll position 0 after the change.
3. P2 — secondary exit text had insufficient contrast on the purple panel.
   - Fix: changed lesson exit and reward exit actions to the readable secondary button treatment.

## Remaining blocker

The local preview server stopped during final flow testing. It has been restarted and returns HTTP 200, but the browser security policy rejected reloading the already-claimed localhost tab. Therefore the revised ten-exercise checkpoint and reward states could not receive the required final browser capture and console check in this run.

## Automated verification

- TypeScript: passed.
- Tests: 35/35 passed.
- Local preview: running on port 4173 and responding successfully.

final result: blocked
