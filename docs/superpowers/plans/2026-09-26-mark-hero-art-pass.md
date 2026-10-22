# Mark Hero Art Pass Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task by task.

**Goal:** Polish one 1–2 viewport Mark settlement-to-olive-hill segment without changing Journey behavior.

**Architecture:** Add curated, independently rendered sprite placements to the existing Mark world composition. Keep terrain, route, actors, Traveler, nodes, fog, culling and native scrolling separate. Scope art substitution to the Mark 2/3 transition and retain existing primitives elsewhere.

**Tech Stack:** React Native Web, Expo, TypeScript, Vitest, PNG game assets.

**Spec:** User attachment `Bibliavia Mark — Commercial Mobile Game Art Pass`.

## Global constraints

- No progression, Reading, persistence, navigation, accessibility, Reduce Motion or architecture rewrite.
- No baked scene, giant SVG, WebGL or deployment.
- Preserve clean node hit areas and culling; visual objects must not intercept touch.

## Review focus

- An offscreen hero sprite must be culled without shifting its world position.
- A foreground sprite must sort by foot position, not array order.
- Existing non-hero Mark regions must retain their current visuals.
- Nodes, route and Traveler must remain independent and usable in the polished region.
- Lower, central and destination mobile views must read as one place with distinct compositions.

### Task 1: Curated scene projection

**Files:** `src/data/markJourneyWorld.ts`, `src/lib/markWorldScene.ts`, `src/lib/markWorldScene.test.ts`

- [ ] Write tests for independent hero sprite coordinates, culling and depth.
- [ ] Run the focused test and observe expected failure.
- [ ] Add typed hero placements in the existing object data and project them through the current composer.
- [ ] Run focused tests green.

### Task 2: Asset integration and composition

**Files:** `assets/game/mark/hero/*`, `src/components/MarkWorldPrimitives.tsx`, `src/components/VerticalPathWorld.tsx`, `src/data/markJourneyWorld.ts`

- [ ] Add optimized independent vegetation, houses, props, landmark, terrain decal and Traveler assets.
- [ ] Render only the hero placements with independent layers and touch passthrough.
- [ ] Refine the hero road, node surfaces and environmental hierarchy without changing their logic.
- [ ] Inspect lower, current and destination mobile views and correct visual flaws.

### Task 3: Regression and handoff

**Files:** only those changed above, plus accepted QA screenshots.

- [ ] Verify mobile up/down scroll, node hit targets, Traveler, fog, current-position restoration and Reduce Motion.
- [ ] Run focused tests and `npm run verify` once at final handoff.
- [ ] Confirm local server responds on 8081, open Bibliavia, report screenshots and limitations; do not deploy.
