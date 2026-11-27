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
**Verification:** `tsc --noEmit` green · `vitest` 44/44 green · golden specs (architecture + polish) gate in CI with screenshot artifacts for vision review. CI vision review surfaced two defects — d-pad buttons mounted outside the pad grid (canvas intercepted their pointers) and Devanagari board text blank on the runner (no system Devanagari font) — fixed by mounting buttons inside the grid and vendoring OFL Noto Sans Devanagari 700 (`vendor/fonts/`, woff2+woff, 54 KB) with FontFace load + board-texture redraw.

## M2 — Landing Funnel & Transition ✅ **DONE (2026-11-27, branch `milestone/m2-landing-funnel`)**
**Delivered:** `engine/store.js` (single pub/sub state tree per ARCHITECTURE principle 3 — `storeEntered` is a store flag, not DOM state), `engine/cameraRig.js` (THREE-free pure math rig: landing orbit at r=9.8 h=3.8 with 0.12 rad/s auto-rotate, d-pad orbit nudges, one shared eased progress for position AND lookAt so the view never swings, `easeOutCubic` monotonic 0→1 so overshoot is impossible by construction, transition state machine `orbit → transition → settled` that rejects re-entry, reduced-motion snaps instantly), `engine/audio.js` (bell chord 528/792/1056 Hz synthesized — perfect harmonic series, zero audio files; `AudioContext` created lazily *inside* the click gesture per Chrome autoplay policy, suspended→resume with catch, fail-soft states `idle/started/blocked/unsupported`), `ui/landing.js` (scrim card that leaves pointers open to the canvas so orbit stays live behind the funnel; status pill, Devanagari-first h1, name input ≥16 px, 4 deal chips each mapped to a real `CAMERA_PRESETS` entry — chip click tweens to that shelf's position AND lookAt), `ui/toast.js` (aria-live greeting by name), landing styles (4/8 px grid, borderless cards, staggered entrance ≤ 400 ms, 0.65 s fade-out, reduced-motion collapse).
**Upgrades vs. plan:** deal chips are wired to `CAMERA_PRESETS` positions+lookAts from `layout.js` (the plan's "or deal target" made concrete); `layout.js` constants gained tuple JSDoc types; context-loss restore re-arms the animation loop via a frame ref (previous code never restarted it).
**Verification:** `tsc --noEmit` green · `vitest` 76/76 green (store 9, cameraRig 10 incl. monotonic no-overshoot sweep, audio 8 incl. blocked/unsupported fakes, landing 6) · syntax check green. Golden `landing`/`enter` specs written (screenshot + camera-position tolerance 0.5 + audio state + zero console errors) — like M0/M1.5, Chromium cannot launch in the build sandbox (no root for system libs); they gate the merge in CI.
**Original AC:**
- Landing orbit renders live 3D behind overlay; no page reload on enter.
- Bell chord plays only after the click gesture; audio fails soft when blocked.
- Tween reaches target with no overshoot; 6 px drag guard does not fire during orbit.
- **Golden:** before/after screenshots of landing → in-store positions.

### M2.5 — Render & Presence Overhaul (2026-11-27, branch `milestone/m2.5-render-overhaul`, stacked on the open M2 PR)
**Motivation:** vision audit of the green M2 golden screenshots against Track R references exposed flat harsh lighting, no image-based ambient, no contact grounding, visible texture tiling, boxy geometry, and a washed grade — the scene read as a lit tech demo, not a golden-hour galli.
**Delivered (R1–R6):** `world/theme.js` — procedural equirect golden-hour sky (`drawSky` in `art.js`) driving both `scene.background` and a `PMREMGenerator.fromEquirectangular` IBL environment (`environmentIntensity` 0.5), warm `#ffd7a3` key sun at intensity 2.6 with shadow frustum ±7 (frustum-coverage unit-tested against `OBSTACLES`), `shadow.radius` 3 + `normalBias` 0.02, exposure locked at 1.05, fog retuned to horizon `#d9b183` at 0.022; baked radial-gradient contact-AO decals under counter, pillar, thaam bases and along both pedi fronts (pure `contactDecals()` from `layout.js`, render-ordered above the aripana mandalas). Materials (R2): brick per-course tone + terracotta/fired/washed families with bevel shading and whitewash blotches + roughness map; cobble per-stone grey/brown/moss families, raked highlights, large-scale dirt and dust blotches + roughness map; zinc ridge-polished vs rusty-valley roughness map; lungta cloth weave noise. Geometry (R3): corner-pillar plinth + capital, counter slab with overhang, roof eave fascia boards. Post (R4): minimal sanctioned addon set vendored to `vendor/three/addons/` (EffectComposer, RenderPass, UnrealBloomPass, OutputPass + Pass/ShaderPass/MaskPass, CopyShader, LuminosityHighPassShader, OutputShader, BufferGeometryUtils — 132 KB, import-closure-verified, `three/addons/` import map), `engine/post.js` with pixel-budget quality tier (`postTier`: effective width ≥ 1600 → bloom at strength 0.32 / radius 0.5 / threshold 0.82; else OutputPass-only), fail-soft composer creation (falls back to direct render), context-loss-safe re-mount; zero-draw-call CSS vignette + grain overlay (`#film`). UI/type (R5): vendored OFL Bitter variable face for Latin display text with license, landing typography off `system-ui`, chip/button micro-interactions 0.16 s, pointer-drag orbit during the landing funnel (`createDragStream` + pure `dragOrbit` mapping, d-pad radius limits shared). Props (R6): `world/props.js` — three glazed jars, brass balance scale, chiya glass, QR stand, three-sack burlap line on the east pedi (pure `propPlacements()`/`sackPlacements()` from `layout.js`; same-material parts merged → ≤ 7 draw calls).
**Vendored file SHA-256 (first 8):** EffectComposer `4e079a58`, MaskPass `7cd08eee`, OutputPass `02e4a261`, Pass `444b409c`, RenderPass `817f6c3c`, ShaderPass `e2500a59`, UnrealBloomPass `ba8f2fca`, CopyShader `a33057d5`, LuminosityHighPassShader `5044f780`, OutputShader `353479f7`, BufferGeometryUtils `7bda2a8b`, Bitter variable woff2 `0efe0fbe` (license `LICENSE-OFL-Bitter.txt`).
**Track R:** all four photoreal references generated (Black Forest API, prompts in `REFERENCE-PROMPTS.md`) and vision-gated — reference 02 regenerated once (gate caught a brass bowl standing in for the balance scale).
**Verification:** `tsc --noEmit` green · `vitest` 97/97 green (theme 6, props 6, post 3, dpad drag-orbit 4 added to 76 baseline). Golden suite gates in CI; first CI iteration exposed a real flake class — the deal-chip golden waited on a 0.9 s tween whose wall time stretches under SwiftShader's clamped game time (`loop.js` maxDelta 0.1 s/frame; M2.5's heavier interior view pushes frames past 1.5 s), so both enter goldens now emulate `prefers-reduced-motion` (the rig's first-class snap path) making them deterministic behavior pins — tween physics stay covered by the cameraRig unit sweep — and CI artifacts now upload `if: always()` for failure evidence. Chip interaction hardened while debugging: chip clicks resolve through `closest('.deal-chip')` (a child-span hit previously dropped the preset) and chips are `type="button"` so they can't double-fire form submit. Note — the CI runner's SwiftShader at 1280×1 deliberately lands in the `low` post tier, so CI screenshots show lighting/materials/AO/props/sky but not bloom; bloom is verified on real-GPU review only. Dusk preset (reference 04) deliberately deferred behind the FPS budget until M5.

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
