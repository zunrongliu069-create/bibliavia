# Design QA — Composed Mark Journey World

- Source visual truth:
  - `C:\Users\liuba\AppData\Local\Temp\codex-clipboard-fa778940-b463-4e11-9322-3eae58d02c56.png`
  - `C:\Users\liuba\AppData\Local\Temp\codex-clipboard-8634dbd3-97c2-40d1-bb44-b5c57c120098.png`
  - `C:\Users\liuba\.codex\attachments\1eddc59c-a811-4b31-82ab-28ab212559d1\已粘贴的文本.txt`
- Source role: visual direction plus the non-negotiable composed-world architecture; not a pixel-copy target.
- Implementation evidence: browser-rendered captures from `http://localhost:8081/`, in-app browser tab 6. The browser connector displayed the captures inline but did not expose a persistent screenshot filepath.
- Phone viewport: 390 × 844 CSS pixels, device scale factor 1.5. The viewport was reloaded after resizing and reset after QA.
- State: persisted Mark 3 first section current, Mark 1–2 completed, Mark 3–5 future.

## Full-view comparison evidence

- Mark remains a 3,822 px vertical world inside a bounded, natively scrolling Journey viewport.
- The environment contains no Mark raster images, full-size `<img>`, or environment `background-image`.
- Terrain, water, shoreline, vegetation, buildings, foreground props, route, nodes, Traveler, landmarks, labels, and fog are independently rendered objects.
- Mark 1–5 read as one geography: lower shoreline and fishing boat, road into settlement, denser town/courtyard, fields and olives, lake crossing, rocky opposite shore, and settlement ahead.
- Rounded overlapping terrain and water areas avoid rectangular chapter wallpaper boundaries.
- Future landmark objects remain faintly visible through dynamic fog, while completed locations remain below and revisitable.

## Focused evidence

- Raster-off acceptance: all five generated Mark environment images and their image-loading code were removed. The browser still clearly showed terrain changes, water, shoreline, road, trees, rocks, buildings, landmark labels, Traveler, completed route, and future direction.
- Upward phone scroll reached the fogged Mark 5 opposite-shore settlement.
- Downward phone scroll reached the completed Mark 1 shoreline and independently positioned fishing-shore landmark.
- Reload returned to the persisted current Mark 3 node and Traveler location.
- Activating `A hand restored` opened the existing Mark 3 Reading flow, proving the environment does not intercept node hit areas.
- Reduce Motion was enabled, Journey re-opened successfully with a correctly positioned Traveler, then the original preference was restored.
- No progression state was changed during visual navigation.

## Required fidelity surfaces

- Fonts and typography: existing Bibliavia typography and compact mobile hierarchy remain; no reference typography was copied.
- Spacing and layout rhythm: the world fills the usable Journey area, HUD and tabs remain fixed, and all environment objects scroll in the world coordinate system.
- Colors and tokens: warm sand, field, olive, stone, and lake tokens create region identity without chapter cards.
- Image quality and asset fidelity: Mark uses no environment images. Small reusable CSS/DOM primitives make the world understandable independently of any art asset.
- Copy and content: real editorial Mark section titles remain; landmark labels describe physical destinations rather than gameplay state.

## Comparison history

### Iteration 1 — blocked

- P0 architecture: five large chapter-sized generated landscape images still functioned as wallpaper under route and nodes.
- Fix: removed every Mark landscape file, all image imports/requirements, crossfade masks, and chapter art configuration.

### Iteration 2 — passed

- Replaced wallpaper with typed world-object configuration and reusable composed primitives.
- Moved the Traveler beside the current node label and clamped landmark objects within world bounds.
- Post-fix mobile evidence confirms bidirectional scrolling, current-position restoration, independent landmarks, readable node states, working hit areas, dynamic fog, and no raster dependency.
- No actionable P0/P1/P2 findings remain.

## Follow-up polish

- P3: reusable trees, houses, rocks, grass, and boats can receive richer small-asset illustration later without changing the composed-world architecture.

final result: passed
