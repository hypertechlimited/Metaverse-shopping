# Guidelines — Code, Design, Performance

## Coding Rules (enforced in review)

1. **Naming:** camelCase for functions/variables, PascalCase for classes/components, SCREAMING_SNAKE for exported constants. Product ids are kebab-case (`waiwai-5pack`).
2. **Functions:** one job, ≤ 40 lines, no boolean-flag parameters (split the function instead).
3. **No magic numbers.** Colors, dimensions, timings, and prices live in named constants (`layout.js`, `catalog.js`, `theme.js`).
4. **Errors:** throw on programmer error (broken invariant); catch on environmental error (storage, WebGL, audio). Never swallow silently — degrade to a documented fallback.
5. **No comments** (per `AGENTS.md`); JSDoc type annotations are not comments.
6. **Imports:** absolute module paths only (`src/…`), ordered: engine → commerce → world → ui.

## Design Rules (anti-slop contract)

The premium feel comes from specificity and restraint:

- **Palette is fixed:** Newari brick `#8f3b26`, timber `#452719`, zinc `#0369a1`, shutter teal `#0f766e`, crimson `#991b1b`, gold `#fbbf24`. No gradients outside the sky. No purple.
- **No emoji as UI.** Icons are drawn (canvas/SVG), culturally grounded (sayapatri, diyo, thaam motifs).
- **Typography:** Devanagari-first headings, Latin body; sizes on a fixed scale (12/14/16/20/28/40). Devanagari conjuncts must render correctly on canvas textures — verify with a golden test string (`सगरमाथा कर्नर पसल`).
- **Motion:** cubic ease-out for camera tweens, 0.65 s overlay fades, staggered UI entrances ≤ 400 ms total, nothing above 650 ms. Motion communicates space; it never decorates.
- **Sound:** silence is default. Sound is an event (bell chord on entry). All audio behind a user gesture. Volume conservative.
- **Density over emptiness:** a real pasal is visually dense and slightly cluttered — merchandising must feel lived-in, not like a glassmorphic dashboard.

## Performance Budgets (CI-enforced where measurable)

| Metric | Budget |
|---|---|
| Draw calls per frame | ≤ 80 (use `InstancedMesh` past 50 SKUs) |
| Total payload | ≤ 5 MB |
| Frame rate | 60 FPS desktop, ≥ 30 FPS mid-range Android |
| `devicePixelRatio` | capped at 2 |
| Shadow maps | one directional, 2048×2048, `PCFShadowMap` |
| Render-loop allocations | zero (reuse temp objects) |
| Time to interactive on 4G | ≤ 5 s cold |

## Accessibility & Input

- Full keyboard support: WASD/arrows movement, `E` inspect, `Esc` close overlays.
- Touch: on-screen d-pad + drag-orbit; targets ≥ 44 px.
- All DOM overlays have readable contrast (WCAG AA) against the 3D backdrop — use a scrim, never bare text on the canvas.
- Reduced-motion: respect `prefers-reduced-motion` by shortening tweens to instant.

## Stability Rules

- WebGL2 capability check before renderer creation; graceful static fallback message if absent.
- `storage.save()` wrapped in `try/catch` (sandboxed iframes, private mode); cart keeps working in-memory when persistence fails.
- Resize/orientation: `ResizeObserver` on the canvas container; renderer and camera aspect update in the same frame.
- Context-loss: listen for `webglcontextlost` (prevent default, pause) and `webglcontextrestored` (rebuild, resume) — never leave a black screen.
- Print: `@media print` renders only the receipt; 3D HUD hidden.
