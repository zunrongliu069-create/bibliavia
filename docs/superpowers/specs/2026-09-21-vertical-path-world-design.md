# Bibliavia Vertical Path World Design

## Goal

Make the active Path a genuinely vertically scrollable Journey world. Validate the engine with Mark 1–5 before broad visual work on other Paths.

## Locked product behavior

- Every Path progresses upward: completed territory below, current position in the middle, future above.
- Mark Reading uses editorial reading sections as world nodes and chapters as regions.
- Chapter recap remains the chapter-completion gate. A visual section node does not change unlock rules.
- Route, nodes, Traveler, fog, region labels, and backgrounds remain independent render layers.
- The supplied mockup controls spatial hierarchy only. It does not set art direction, palette, typography, node appearance, or Traveler design.
- New-user English/WEB defaults, stale Path reconciliation, and removal of Genesis fallback remain untouched.
- No production deployment.

## Architecture

`verticalPathWorld.ts` owns framework-independent adapters and geometry. The Reading adapter projects existing `PathBeatDefinition.sections` and `ReadingSessionState` into typed section and recap nodes. The Memorization adapter maps existing verse beats without changing Learn/Practice/Master state.

`VerticalPathWorld.tsx` owns the scroll viewport and render layers. Content height is derived from node count and region boundaries and must exceed the phone viewport. Chronologically later nodes receive smaller Y coordinates, so progression is visually upward. Initial focus is derived from the current node; free user scrolling is not continuously overridden.

`JourneyScreen.tsx` supplies Mark's existing editorial data and persisted node/session state to the adapter. Initial Mark rendering includes at least chapters 1–5, and expands far enough to include a returning user's current chapter. Existing activity callbacks remain the only way progression changes.

## Mark 1–5 behavior

- Each existing reading section becomes a node with its localized meaningful title.
- A recap node ends each chapter region.
- Completed section nodes remain below the Traveler.
- The saved current section becomes the current node.
- Later section and chapter nodes stay locked and appear above.
- Far-future nodes are obscured by a separate non-interactive fog layer.
- Selecting the current node runs the existing Reading flow; selecting completed content reuses existing reread behavior through its parent chapter.

## Path selection

The current intentional selector remains an overlay. Its Path choices become a horizontally scrollable, snapping row in which adjacent destinations peek at the sides. Browse Bible and Create Path remain explicit secondary actions and never occupy the Journey world permanently.

## Accessibility and motion

- Nodes remain buttons with state-specific accessibility labels and disabled state.
- Current-position focusing is immediate with Reduce Motion and animated otherwise.
- Route animation is decorative only; progress state is authoritative.
- Normal `ScrollView` touch, wheel, and trackpad behavior provides two-way scrolling.

## Acceptance evidence

- Pure geometry tests prove later nodes are above earlier nodes and Mark 1–5 creates more than two phone viewports of scroll range.
- Adapter tests prove completed/current/locked section and recap state from existing persisted Reading state.
- Mobile browser QA demonstrates moving away from and back to the current position, node interaction, and reload focus.
- Existing verification and production build complete without deploying.
