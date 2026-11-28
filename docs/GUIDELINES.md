# Guidelines — Code, Design, Performance

## Coding Rules (enforced in review)

1. **Naming:** camelCase for functions/variables, PascalCase for classes/components, SCREAMING_SNAKE for exported constants. Product ids are kebab-case (`waiwai-5pack`).
2. **Functions:** one job, ≤ 40 lines, no boolean-flag parameters (split the function instead).
3. **No magic numbers.** Colors, dimensions, timings, and prices live in named constants (`layout.js`, `catalog.js`, `theme.js`).
4. **Errors:** throw on programmer error (broken invariant); catch on environmental error (storage, WebGL, audio). Never swallow silently — degrade to a documented fallback.
5. **No comments** (per `AGENTS.md`); JSDoc type annotations are not comments.
6. **Imports:** absolute module paths only (`src/…`), ordered: engine → commerce → world → ui.

## Anti-Slop Design Contract (strict)

**Diagnosis:** AI slop is not bad design — it is *design with no author*. An unconstrained generator returns the statistical average of its training data (purple→cyan gradients, glassmorphism, three identical cards, Inter everywhere, dark mode by reflex). Slop is a symptom of **missing constraints**, so the cure is binding decisions made *before* generation. Every rule below is a pre-made decision the implementation may not renegotiate.

### Binding tokens
- **Palette is fixed:** Newari brick `#8f3b26`, timber `#452719`, zinc `#0369a1`, shutter teal `#0f766e`, crimson `#991b1b`, gold `#fbbf24`, marigold `#ea580c` (added M1 for sayapatri toran — binding via reference 01), makhamali `#c2185b` (added M1.5 for globe-amaranth toran mix — cultural constant, not a purple gradient accent; the "no purple" rule targets the AI-slop indigo/violet UI wash, not the flower). No gradients outside the sky. No purple, ever (per above). New accent colors require a doc change first, code second. Lungta prayer flags use the canonical five-color sequence (blue, white, red, green, yellow) as a cultural constant, exempt from the accent rule. Aripana mandalas are rice-flour white `#f2ead9` with mustard-oil and sindoor accents.
- **Typography:** no Inter/Roboto/Open Sans as headline faces. Devanagari-first headings, Latin body; sizes on one scale (12/14/16/20/28/40); body ≥ 16 px; measure 60–80 characters. Devanagari conjuncts must render correctly on canvas textures — verified with the golden test string (`सगरमाथा कर्नर पसल`), rendered with the vendored OFL Noto Sans Devanagari 700 (`vendor/fonts/`, 54 KB woff2 — never a CDN, never a system-font assumption). Latin display/UI text (M2.5) uses the vendored OFL Bitter variable face (`vendor/fonts/bitter-latin-variable.woff2`, 34 KB, license `LICENSE-OFL-Bitter.txt`) — a slab serif that matches the painted-signage voice of the pasal board; `system-ui` remains the generic fallback only, never the identity face.
- **Cards default to borderless.** A 1 px gray border on every surface is the #1 slop tell. Elevation via the 3D scrim and shadow, not outlines.
- **Spacing is a mandated grid** (4/8 px system). 80% of premium feel is spacing rhythm and alignment, not color.

### Binding behaviors
- **No emoji as UI.** Icons are drawn (canvas/SVG), culturally grounded (sayapatri, diyo, thaam motifs).
- **No six-card rows, no icon-heading-two-line-tiles, no bounce-on-hover.** One accent motion per surface.
- **Motion:** cubic ease-out for camera tweens (0.9 s for the landing→in-store transition; all other UI motion ≤ 650 ms), 0.65 s overlay fades, staggered UI entrances ≤ 400 ms total. Motion communicates space; it never decorates. `prefers-reduced-motion` collapses tweens to instant.
- **Sound:** silence is default. Sound is an event (bell chord on entry). All audio behind a user gesture. Volume conservative.
- **Density over emptiness:** a real pasal is visually dense and slightly cluttered — merchandising must feel lived-in, not like a glassmorphic dashboard.

### The gates (a surface ships only if it passes all three)
1. **Specificity test:** could this surface belong to any other product with zero changes? If yes, it is slop — rework with a culturally specific element.
2. **Subtraction test:** anything removable without loss was slop — delete it before adding polish.
3. **Authorship test:** can you name *why* each visual choice works and how to repeat it? If the choices can't be explained, they can't be maintained — normalize into the tokens above.

Enforcement: the Vision Reviewer role (see `SWARM-EXECUTION.md`) checks golden screenshots against all three gates, in addition to functional acceptance criteria.

## Performance Budgets (CI-enforced where measurable)

| Metric | Budget |
|---|---|
| Draw calls per frame | ≤ 88 (raised 80 → 88 in M6 doc-first: shelf facings add 7 `InstancedMesh` shape classes + 1 price-rail + 1 gondola; see `docs/M6-EXECUTION-PLAN.md` §5) |
| Total payload | ≤ 5 MB |
| Frame rate | 60 FPS desktop, ≥ 30 FPS mid-range Android |
| INP (Interaction to Next Paint) | < 200 ms on all HUD interactions |
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
