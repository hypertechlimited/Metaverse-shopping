# M3.5 — Premium Pass: Flagship Design Upgrade

**Status:** IN PROGRESS (branch `milestone/m3.5-premium-pass`, stacked on main `3161500` / merged PR #8)
**Driver:** user verdict "not impressed — make premium, flagship grade." M3 shipped correct commerce; this pass upgrades how the world *looks and feels* to 2026 flagship standard.
**Discipline:** this doc is binding. Every upgrade is R-numbered with acceptance criteria (AC) that double as unit/golden assertions. No code lands that this doc does not describe.

## 1. Research basis (2026-11 web crawl)

Findings from the current three.js / spatial-design corpus that bind the decisions below:

- **r187 reality (Oct 2026):** `PMREMGenerator` now runs on cube render targets (CubeUV atlas removed); PBR materials preserve IBL energy better and read brighter — old intensity values are visually stale. `MeshPhysicalMaterial` gains an EON diffuse BRDF. Our vendored r187 therefore rewards re-grading light constants, not just geometry.
- **Materials:** "use the cheapest model that explains the surface." Clearcoat = glazed ceramic/varnish; transmission = glass with `thickness` + `ior`; metal needs only a good IBL. Transmission renders the opaque scene to an internal buffer once per frame — affordable only on a small scene (ours is ~50 calls), so reserve it for the single hero glass.
- **Lighting hierarchy:** a scene reads premium when light communicates hierarchy — one dominant warm key (our golden-hour sun), broad IBL fill, nothing flat. Env-maps make products stop looking like plastic.
- **Depth stage:** flagship spatial composition frames the subject — the pasal must sit inside a fog-faded galli (alley) context, not on an infinite plane. Masses belong behind the fog line, merged geometry only.
- **Performance-budget-first:** every addition must be paid for in the draw-call ledger before it is built.

## 2. Upgrades (binding)

### R1 — Flagship sky (feeds background + IBL)
`art.js` `drawSky` rewritten; `SKY_COLORS`/`SKY` re-graded.
- Richer vertical grade: deep alpine zenith → dusty upper band → warm horizon → bright glow → terracotta ground (6+ stops, named constants).
- Authored sun: layered radial halo + crisp disc with soft edge at 18° golden-hour elevation (glowY 0.4); halo localized (0.11 × width) so the zenith grade stays deep — vision review of CI run 1 showed a 0.2-radius halo washed the whole sky beige.
- Horizon ridge silhouette (sine-sum polyline, far distance) so the equirect reads as a valley, not a void.
- Stratified cloud bands: thin high streaks + soft mid haze, deterministic.
- **AC:** pure function of `(ctx, w, h)`; all colors from named constants; no `Math.random`. Theme test asserts new constants exist and sun disc coords match `SKY.glowX/glowY`.

### R2 — Galli depth stage (new `src/world/facades.js`)
6–8 hand-authored neighbor building masses ringing the street, fog-faded at 14–20 units.
- Pure `facadesLayout()` derived from `layout.js` STREET bounds — masses on the north/west backdrop (what the entrance/overview cameras actually see) plus east/south far masses so the landing orbit sweep never shows void.
- Each mass: plaster body + zinc roof slab + recessed window grid on the street-facing side. Bodies merged to one draw call, windows to one, roofs to one (reuse `drawZinc` texture).
- Facade grounding: per-vertex color lift (0.7 at base → 1.0 at top) fakes AO so masses don't read ambient-flat (vision review, CI run 1).
- **AC (tests):** 6–8 masses; every mass ≥ 11.5 units from origin (never intersects landing orbit r=9.8 or any `CAMERA_PRESETS` position); all masses ≤ 26 units (inside the fog read); layout deterministic; masses never overlap `OBSTACLES`.
- **Budget:** exactly 3 draw calls.

### R3 — Physical hero materials (`props.js`)
- Glazed jars → `MeshPhysicalMaterial` clearcoat 1.0, clearcoatRoughness 0.18 (ceramic varnish response under IBL).
- Chiya glass → `MeshPhysicalMaterial` transmission 0.85, thickness 0.04, ior 1.45 (real refraction of the counter behind it).
- **Adaptive tier (CI-mandated):** transmission renders the opaque scene to an internal buffer every frame — on software rasterizers (SwiftShader/llvmpipe) it starves the main thread and the golden suite cannot complete. `isSoftwareGpu()` (pure, unit-tested) probes `WEBGL_debug_renderer_info`; software GL falls back to blended transparency (`fallbackOpacity 0.35`). Hardware gets full transmission.
- Brass balance scale stays `MeshStandardMaterial` (metal + IBL is the correct cheap model).
- **AC:** material parameters live in `PROPS` constants (named, testable); props draw-call budget stays ≤ 9; hover states never apply transforms to clickable rows/buttons (Playwright actionability hazard).

### R4 — Instanced ground detail (`props.js`)
- Pure `scatterPlacements()`: deterministic pebbles + marigold petals across the street, rejecting `OBSTACLES` interiors and the south aripana mandala.
- Two `InstancedMesh` (one pebble geometry, one petal geometry) — 2 draw calls for ~120 instances.
- **AC:** placements deterministic; none inside an obstacle box; none within mandala radius; counts match named constants; scatter adds exactly 2 to the props budget (7 → 9).

### R5 — Grade re-tune (`theme.js`)
- `environmentIntensity` 0.5 → 0.62 and `hemisphere.intensity` 0.65 → 0.7 (r187 energy-preserving IBL reads brighter; rebalance for hierarchy).
- `exposure` 1.05 → 1.08; `fogDensity` 0.022 → 0.02 (clearer distance read so the galli stage shows depth without haze wash-out).
- **AC:** existing bounds hold (exposure ∈ (0.8, 1.2], fog < 0.028, 2048² shadow); new bounds asserted for env intensity ∈ [0.5, 0.8].

### R6 — Thumbnail craft (`thumbs.js`)
- Per-shape premium treatment: sheen highlight arc, stitched/seamed edges, accent label band, deeper contact shadow. Deterministic, pure.
- **AC:** `THUMBS` keys unchanged (17 art keys, parity-tested); `drawThumb` remains `(ctx, w, h, key)` pure.

### R7 — UI premium treatment (`styles.css`)
- Drawer/inspector/bill/HUD re-grade: solid ink-timber panels (no glassmorphism — anti-slop), layered soft shadows instead of borders (borderless rule), Bitter display numerals, gold `:focus-visible` rings, letter-spaced eyebrow labels, tabular-numeral price columns, refined hover/press states within the ≤650 ms motion rule.
- No new colors, no gradients outside the sky, spacing stays on the 4/8 px grid.
- **AC:** golden commerce/bill/enter specs still pass; no selector introduces a `linear-gradient`/`backdrop-filter`.

## 3. Draw-call ledger (after pass)

| Group | Calls |
|---|---|
| Shell (ground + 5 boxes) | 6 |
| Architecture | ~20 |
| Culture + mandala + atmosphere | ~25 |
| Props (M3) | 7 |
| Contact decals | 5 |
| Facades (R2) | 3 |
| Ground scatter (R4) | 2 |
| **Total** | **~68 ≤ 80** ✅ |

Payload delta: zero (all procedural). No new runtime dependencies.

## 4. Verification plan

1. `npx tsc --noEmit` and `npx vitest run` green locally (node env; Chromium unavailable in sandbox per M0/M1.5/M2/M3 precedent — goldens gate in CI).
2. Push → CI golden suite → download `golden-screenshots` artifact → vision-review every screenshot against the three anti-slop gates → iterate until flagship grade.
3. Update `docs/TASKS.md` with the M3.5 DONE record at acceptance.
