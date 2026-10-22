# Bibliavia Visual Style Contract

The Mark settlement-to-olive-hill hero area is the quality reference for future Path worlds. Reuse its rendering language, not its Mediterranean scenery. Every route, node, Traveler, fog layer, landmark and interaction remains a separate world element.

## World assets

- **Camera and scale:** Use one elevated 2.5D view. Doors, trees, walls and Traveler should suggest the same human scale; distant details become smaller and simpler, not a different perspective.
- **Depth:** Compose connected places around the route: ground texture below, buildings and trunks grounded on it, foliage and props overlapping naturally, then readable gameplay markers above. Keep useful negative space around the current action and destination.
- **Light and shadow:** Soft warm light comes from the upper left. Contact shadows fall gently down/right. Trees, buildings, rocks, walls and Traveler must agree; avoid isolated hard-edged drop shadows.
- **Materials and detail:** Use authored, softly painted earth, foliage and warm stone with readable silhouettes at phone size. Important landmarks can be more detailed; adjacent objects must still share a similar texture scale and edge softness. No flat geometric stand-ins beside illustrated assets.
- **Color:** Favor a warm, restrained range with controlled contrast. Path-specific palettes may change, but neighboring assets in one region must share saturation and lighting. Interactive states may use stronger contrast than scenery.
- **Vegetation:** Asymmetric branching, irregular canopies, clustered ground growth and believable contact with soil. Related variants may differ in age, size and silhouette, not in rendering style.
- **Architecture and props:** Stone mass, roof/parapet variation, recessed openings, visible material changes and shared camera angle. Place walls and small props to form a location, not as filler.

## Gameplay layers

- **Route:** An independent, continuous, textured ground path tied to node positions. Edges should be irregular and visually meet courtyards and terrain; never bake the route into environment art.
- **Landmarks:** Make destinations recognizable by silhouette, composition, position and modest contrast. Labels identify a place after the world already reads as that place; avoid giant icons or arbitrary glow.
- **Traveler:** Keep the same camera, palette, detail density and shadow direction as the world. Preserve its dynamic position and progression semantics.
- **Nodes and labels:** Clear touch targets and Locked/Available/Current/Completed semantics take priority. Use a restrained warm material, consistent rim/shadow and compact legible labels so markers belong to the world without losing accessibility.
- **Fog:** Render discovery separately as soft atmospheric loss of contrast with a continuous fade, never a geometric panel. Keep the next destination readable while farther territory remains uncertain.

Future Paths can define their own geography, architecture, vegetation, landmarks and atmosphere. Their art should still pass the same perspective, grounding, light, detail-density, gameplay-clarity and mobile-readability checks.
