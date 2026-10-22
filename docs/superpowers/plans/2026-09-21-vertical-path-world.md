# Vertical Path World Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a generic upward vertical Path renderer and validate it end-to-end with Mark 1–5 editorial chunk nodes.

**Architecture:** Pure typed adapters convert existing Reading and Memorization progress into visual world nodes. Pure geometry places chronological nodes from bottom to top. A React Native `ScrollView` renders separate background, route, node, Traveler, region, fog, and action layers while Journey preserves all existing activity callbacks.

**Tech Stack:** React 19, React Native Web 0.21, Expo 57, TypeScript 6, Vitest 4.

**Spec:** `docs/superpowers/specs/2026-09-21-vertical-path-world-design.md`

## Global Constraints

- Mark 1–5 must be substantially taller than a phone viewport and freely scroll in both directions.
- The reference image is spatial guidance only; preserve Bibliavia's current visual language.
- Preserve new-user English/WEB initialization and stale/demo Path reconciliation.
- Preserve Reading, Memorization, Recall, progression, persistence, Supabase/auth, and Reduce Motion behavior.
- Do not deploy.
- The existing dirty working tree belongs to the user; do not reset, reformat, or commit unrelated changes.

## Review Focus

- A fresh Mark Path with no saved session still has exactly one current section and chapters 1–5 visible.
- A partially read chapter maps completed section IDs below the current section without unlocking later sections.
- A recap-phase session makes the recap node current while the next chapter stays locked.
- A returning user past Mark 5 still receives a world containing the current chapter.
- Initial focus happens on load/progression change but does not repeatedly override arbitrary manual scrolling.

---

### Task 1: Typed adapters and upward geometry

**Files:**
- Create: `src/lib/verticalPathWorld.ts`
- Create: `src/lib/verticalPathWorld.test.ts`

**Interfaces:**
- Produces: `VerticalWorldNode`, `buildReadingWorldNodes`, `buildMemorizationWorldNodes`, `buildVerticalWorldLayout`, and `focusOffsetForNode`.
- Consumes: existing `PathBeatDefinition`, `PathNodeProgress`, `ReadingSessionState`, and `UiLanguage`.

- [ ] Write tests with literal expectations for fresh Mark, partial section progress, recap state, returning users beyond chapter 5, strict upward Y ordering, and mobile scroll range.
- [ ] Run `npx vitest run src/lib/verticalPathWorld.test.ts` and confirm failures are caused by missing production exports.
- [ ] Implement the smallest typed adapters and geometry needed for those tests.
- [ ] Run the focused test and confirm every case passes.

### Task 2: Dedicated vertical renderer

**Files:**
- Create: `src/components/VerticalPathWorld.tsx`
- Modify: `src/components/PathGameWorld.tsx`

**Interfaces:**
- Consumes: `PathGameWorldProps.nodes` using the extended `VerticalWorldNode` fields and pure layout output.
- Produces: normal vertical touch/wheel scrolling, derived initial focus, separate render layers, and existing node callbacks.

- [ ] Add a failing geometry/interaction contract test for parent chapter routing and focus clamping where pure behavior is testable.
- [ ] Route non-specialized worlds through `VerticalPathWorld`; leave Psalm and Romans dedicated renderers intact.
- [ ] Render a content world taller than the viewport with separate region, route, nodes, Traveler, fog, and fixed next-action layers.
- [ ] Ensure content-size callbacks focus only when a new current node requires it, not after arbitrary user scrolling.
- [ ] Run focused tests and TypeScript.

### Task 3: Mark chunk integration and intentional Path carousel

**Files:**
- Modify: `src/screens/JourneyScreen.tsx`
- Modify: `src/components/PathGameWorld.tsx` only if its public node type needs extension.

**Interfaces:**
- Consumes: existing Mark section definitions and persisted `PathState.nodeProgress`.
- Produces: at least Mark 1–5 section/recap nodes and a horizontal snapping selector that keeps Browse/Create intentional.

- [ ] Add a failing adapter test proving Journey's Mark window includes five chapters and expands through a later current chapter.
- [ ] Replace Mark's chapter-node projection with `buildReadingWorldNodes`; keep other Paths on the generic memorization/chapter adapter.
- [ ] Preserve current activity callbacks: current node continues Reading and completed nodes resolve to their parent beat for rereading.
- [ ] Convert the selector's Path list to a horizontally scrolling snap row with adjacent cards visible; preserve Browse and Create actions.
- [ ] Run focused tests, existing Reading tests, and TypeScript.

### Task 4: Browser QA and final verification

**Files:**
- Update: `design-qa.md`
- Create/update: `artifacts/vertical-path-world/*` screenshots only.

**Interfaces:**
- Consumes: local Expo web app at port 8081.
- Produces: visual and interaction evidence; no deployment.

- [ ] Run the local app and open Mark in a mobile-sized in-app browser viewport.
- [ ] Verify the world is taller than the viewport, scroll toward future, scroll back toward completed/start territory, stop mid-world, and activate the current node.
- [ ] Reload and verify the viewport returns near the persisted current node.
- [ ] Compare the implementation with the reference for spatial structure only and save `design-qa.md` with evidence and `final result: passed` or `blocked`.
- [ ] Run `npm run verify` once, then `npm run build:web`.
- [ ] Inspect the final diff for scope and report limitations, fallback UIs, and explicit confirmation that production was not deployed.
