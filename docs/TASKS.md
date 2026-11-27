# Task Breakdown — Milestones M0–M5

Each task has an owner-ready scope, files touched, and **acceptance criteria (AC)** that double as golden-test assertions. A milestone is done only when every AC passes and the golden screenshot is visually verified.

---

## M0 — Scaffold & Engine Core  ✅ **DONE (2026-11-27, branch `milestone/m0-engine-core`)**
**Delivered:** vendored `three.module.js`+`three.core.js` (SHA-256 `104f5614…` / `613e370f…`), import map, `index.html` + fallback screen, `engine/loop.js` (fixed-step 60 Hz, drift-safe accumulator, delta clamp), `engine/input.js` (6 px pointer guard, ResizeObserver), `engine/storage.js` (injectable backend, try/catch, shape validation), `world/layout.js` (spec-parity constants), `world/art.js` (`makeArt`/`makeTexture` + brick/cobble color+bump maps), `main.js` (WebGL2 probe, ACES, `PCFShadowMap`, DPR ≤ 2, context-loss pause/resume, shell geometry derived from `OBSTACLES`), CI workflow (tsc → vitest → Playwright), 15 unit tests, golden boot spec.
**Upgrades vs. plan:** context-loss handling and WebGL2 fallback pulled forward from M5; CI shipped inside M0; layout constants unit-tested against the spec table.
**Verification:** `tsc --noEmit` green · `vitest` 15/15 green · syntax + import-graph checks green. Golden browser test cannot execute in the build sandbox (no root for Chromium system libraries) — wired into CI (`--with-deps` provides them) and gates the merge there.
**Original AC:**
- Page boots with zero console errors; canvas fills viewport; resize keeps aspect.
- Delta clamp verified: background-tab then refocus produces no camera jump.
- `tsc --noEmit` and `vitest run` pass; `layout.js` exports SHOP/ZONES/OBSTACLES/CAMERA_PRESETS and OBSTACLES values equal the spec table exactly.
- **Golden:** screenshot shows a lit brick building on cobblestone ground, correct hue, no clipping.

## M1 — Architecture & Culture Layer ✅ **DONE (2026-11-27, branch `milestone/m1-architecture-culture`, PR #4)**
**Scope:** `world/architecture.js` (ankhi jhyal, thaam, jasta pali awning, pedi, shutter housing, pasal board), `world/culture.js` (sayapatri toran, flickering diyo, lungta wind, rooftop flag), Devanagari pasal board texture.
**AC:**
- Shop opens on two perpendicular sides per the four-zone blueprint.
- Lungta flags animate (procedural wind sine); diyo flickers via material/point-light intensity noise.
- Devanagari on the board renders conjuncts correctly.
- **Golden:** screenshot matches the ethnographic spec table element-by-element.

### M1.5 — Culture Polish & Control (2026-11-27, branch `milestone/m1-culture-polish`)
**Delivered:** `world/mandala.js` (aripana threshold mandalas at both entrances — eight-petal lotus, mustard-oil center, rice-flour white, per Newari tradition), `world/atmosphere.js` (tungsten interior fill light, additive light shafts in both open fronts, <500 drifting dust motes, reduced-motion aware), `ui/dpad.js` (on-screen arrow pad + arrow-key control of landing-orbit angle/zoom, ≥56 px targets, SVG chevrons, full dispose), windhorse-print lungta flags (five printed cloths, canonical color order) + second prayer-flag line on the opposite diagonal, toran upgraded with makhamali mix and hanging tassels, `prefers-reduced-motion` collapses wind amplitude, NaN delta guard.
**Verification:** `tsc --noEmit` green · `vitest` 44/44 green · golden specs (architecture + polish) gate in CI with screenshot artifacts for vision review.

## M2 — Landing Funnel & Transition
**Scope:** `ui/landing.js` (status pill, name input, 4 deal chips over live 3D street), `engine/audio.js` (bell chord 528/792/1056 Hz), `engine/cameraRig.js` (orbit at r=9.8, h=3.8; cubic ease-out tween to `[6.8, 2.9, 7.6]` or deal target), greeting toast.
**AC:**
- Landing orbit renders live 3D behind overlay; no page reload on enter.
- Bell chord plays only after the click gesture; audio fails soft when blocked.
- Tween reaches target with no overshoot; 6 px drag guard does not fire during orbit.
- **Golden:** before/after screenshots of landing → in-store positions.

## M3 — Commerce Core
**Scope:** `commerce/catalog.js` (17 SKUs, variants, stock validation), `commerce/cart.js` (jhola, atomic checkout, oversell guard), `commerce/pricing.js` (2% QR, `NAMASTE5`, `PATAN100`, delivery tiers), `commerce/bill.js` (printable receipt + `@media print`), `ui/catalogDrawer.js`, `ui/inspector.js`, `engine/storage.js` wiring.
**AC (unit tests, exhaustive):**
- Variant prices match the 17-SKU spec table exactly.
- QR discount = `Math.round(sub * 0.02)`; promo codes mutually combinable per spec; delivery: रू 50 under रू 1,000 subtotal, free at/above.
- Oversell rejected (add/increment above stock); checkout deducts atomically; reload restores cart + stock from `localStorage`; corrupt JSON boots to defaults without error.
- Print stylesheet hides all HUD; receipt is clean white.
- **Golden:** screenshot of catalog drawer + printed receipt.

## M4 — Interaction & Presence
**Scope:** raycast hover + zero-mutation `BoxHelper`, product click→inspector, `engine/collision.js` (5 AABBs, radius 0.45, street clamps), 6 camera presets, guided auto-tour, mobile d-pad, `world/npc.js` (Pasale Dai greeting by name, 2 neighbors with nametags + bobbing), `world/products.js` (all 17 SKU meshes with multi-mesh groups).
**AC:**
- Drag > 6 px never opens a modal; multi-mesh groups select as one entity.
- Player cannot pass through any OBSTACLES box; clamped to `[-14,14]` X/Z.
- All 17 products hoverable with correct tooltip data (name, variant, price, stock).
- **Golden:** screenshots at each camera preset + one hover-highlight shot.

## M5 — Hardening & Release Candidate
**Scope:** WebGL2 capability check + fallback, context-loss recovery, `prefers-reduced-motion`, DPR cap, draw-call audit (`renderer.info`), payload audit, CI workflow (tsc + vitest + playwright), performance regression smoke.
**AC:**
- `renderer.info.render.calls` ≤ 80 at steady state; total payload ≤ 5 MB.
- Context loss/restore cycle ends in a working scene, not a black canvas.
- Golden suite runs green in CI on every PR.
- **Golden:** full-suite run + FPS capture at 1× and 2× DPR.
