# M7 Execution Plan — Fixture Styles: Traditional / Modern / Mini Super-Mart

Authored 2026-11-28. Expands the M7 entry in `docs/TASKS.md`; design background in
`docs/RETAIL-DESIGN.md` §2. Binding execution doc — sequenced T1→T6, each with its
file-level change and test gate.

---

## 1. Goal

The Newari shell (brick, ankhi jhyal, thaam, jasta pali, pedi) is the identity and stays.
The *interior retail furniture* becomes switchable at one store flag across three authored
styles — Traditional (current), Modern (urban Kathmandu laminate + LED), Mini Super-Mart
(Bhatbhateni-mini read) — with style-appropriate light temperature and price-rail ink, so
the same pasal can wear three authentic retail skins with zero commerce/UI impact.

## 2. Research recap (from RETAIL-DESIGN §2, 2026-11-28)

- Real Nepali modern pasals: white-laminate gondolas, cool 5000 K uniform fill, digital
  rail strips. Bhatbhateni-mini: double-sided aisles, end caps, dump bins, basket stacks,
  ceiling fixture grid.
- Style tokens (colors, laminate vs wood, rail hue) must live in one record so a future
  per-shop skin ("Real Pasal Network", ROADMAP long vision #1) is a data change.

## 3. Current-state audit (code facts)

| Fact | Where |
|---|---|
| Ledger **83/88** after M6 (gondola 1, tags 1, facings 3, zones 4) | M6 as-built §10 |
| Gondola furniture is one merged mesh built from `GONDOLA` constants | `src/world/architecture.js` `buildGondola` |
| Player collision + nav grid are built **once** from `OBSTACLES` | `src/main.js:195`, `src/main.js:392` |
| Existing street props are walk-through (not in `OBSTACLES`) | `src/world/props.js`, `OBSTACLES` list |
| Tag rail atlas colors are constants (`cream/ink/price`) | `src/world/shelfTags.js` `TAG_ATLAS` |
| Mood (day/dusk) owns sky/fog/exposure/IBL; no style axis | `src/world/theme.js` |

## 4. Design decisions

**D1 — `FIXTURE_STYLES` pure token record.** New `src/world/fixtureStyles.js` (no Three.js):
`STYLE_NAMES = ['traditional', 'modern', 'supermart']`; per style: `gondolaColor`,
`gondolaRoughness`, `uprightColor`, `counterTopColor`, `counterTopRoughness`,
`ledIntensity`, `tag` (paper/ink/price/soldOut colors), `extras` (booleans: `endCap`,
`dumpBin`, `basketStack`, `ceilingGrid`), `light` (`hemisphereSky`, `sunColor`,
`sunIntensityBoost`, `exposureBoost`). Guard `isStyleName()`; `fixtureTokensFor(name)`.
Geometry truth stays in `layout.js`; tokens are material/light data only.

**D2 — Style axis in the store.** `fixtureStyle: 'traditional'` default (identity
preserved; all existing goldens stay truthful). Switch = one store flag; world rebuilds
fixtures on the store event (event-driven, never per frame). Entry points: `?style=` URL
param (goldens) + a cycle control on the debug HUD (`?debug=1`). Commerce, UI logic,
catalog, planogram untouched — planogram reads spots/tiers, which no style moves.

**D3 — Restyle in place, extras merged.** The gondola and counter-top keep their geometry
and meshes; style tokens swap their **material colors/roughness** (0 extra draw calls).
LED strips (modern/supermart) = thin emissive boxes under each gondola lip, merged into one
mesh (+1). Super-Mart extras, all collision-safe by construction:
- **End cap** at the dead-end pocket east of the rack (x 1.15–1.7, z −4.4…−3.6): walled on
  two sides, no OBSTACLES overlap (unit-asserted), merged into one mesh (+1).
- **Dump-bin chatti** (x 1.15–1.7, z −2.3…−1.5) and **basket stack** at the entrance
  approach: prop-class furniture — walk-through, exactly like today's street props
  (`OBSTACLES` has never contained props; adding mid-floor collision would need a nav-grid
  rebuild, deferred). One merged mesh (+1).
- **Ceiling fixture grid** overhead at y ≈ 2.9 (rails + panel frames, thin boxes), one
  merged mesh (+1). Overhead → no collision relevance.
Double-sided center aisles are **deferred**: they need live OBSTACLES/nav-grid rebuild
machinery that does not exist yet; forcing them now would violate collision truth.

**D4 — Tag rails restyle.** `shelfTags` reads the style's `tag` tokens; modern/supermart
draw digital-looking cells (white paper, near-black ink, red accent, price-first layout).
Redraw is the existing per-cell dirty path; no new mesh.

**D5 — Style lighting overlay.** `theme.js` gains `applyStyleLighting(scene, tokens)`:
modulates the existing hemisphere/sun (color + intensity boost) and tone-mapping exposure —
no new lights, moods (day/dusk) stay orthogonal (style overlay re-applies after mood
switches).

**D6 — Draw-call honesty.** Predicted: traditional 83 (unchanged), modern 84, supermart
87 — **budget stays 88**. The ≤ 96 raise predicted in RETAIL-DESIGN assumed hand-built
aisle gondolas; the revised scope (restyle + merged extras) fits the existing budget, so
**no budget change lands** — GUIDELINES only gains the per-style ledger note.
Doc-first satisfied by this plan + the GUIDELINES note in the same PR.

## 5. Execution steps

| # | Task | Files | Gate |
|---|---|---|---|
| T1 | This plan + GUIDELINES per-style ledger note | `docs/M7-EXECUTION-PLAN.md`, `docs/GUIDELINES.md` | docs review |
| T2 | Token record | `src/world/fixtureStyles.js` (pure) | `tests/unit/fixtureStyles.test.js` |
| T3 | Fixture extras + material restyle | `src/world/fixtures.js`, `src/world/architecture.js` (material handles exposed) | `tests/unit/fixtures.test.js` (merged counts, no OBSTACLES overlap, disposal) |
| T4 | Tag restyle | `src/world/shelfTags.js` | `tests/unit/shelfTags.test.js` extensions |
| T5 | Store flag + lighting + wiring | `src/world/theme.js`, `src/engine/store.js`, `src/main.js`, `src/ui/debugHud.js` | unit: default traditional; style swap event |
| T6 | Goldens + docs sync | `tests/golden/fixtureStyles.spec.js`, TASKS/README/RETAIL-DESIGN | vision review vs AC below |

## 6. Test plan

**Unit:** tokens cover all 3 styles, colors distinct per style, `isStyleName` rejects
unknown; extras AABBs don't intersect any OBSTACLES box; fixture scene-graph shows ≤ 1
merged mesh per extra kind; disposal removes all fixture meshes; tag restyle flips atlas
tokens; store default is `traditional`; unknown `?style=` falls back to default.

**Golden (`fixtureStyles.spec.js`):**
1. Same camera pose (Overview), three styles via `?style=`: screenshot each; assert
   draw calls ≤ 88 in every style and fixture mesh presence per style (LED absent in
   traditional; end-cap/grid absent until supermart).
2. Style swap at runtime (store flag) rebuilds fixtures without console errors.
3. Commerce untouched: hover → inspector still opens on a faced row in supermart style.

## 7. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Mid-floor supermart furniture is walk-through | Prop-class precedent (street props already are); documented in D3; nav rebuild deferred |
| Style light fight with dusk mood | Overlay applies on both mood set and style set; dusk × style tested in golden 1 (Dusk preset in supermart) |
| Material swap leaks shader programs | Restyle mutates existing materials (color/roughness/emissive), never creates materials per swap |
| Goldens get style-dependent | `?style` param absent → default traditional; all 21 existing goldens unchanged |

## 8. Acceptance criteria (supersedes the M7 summary in TASKS.md)

1. `FIXTURE_STYLES` covers all 3 styles with distinct material/tag/light tokens; pure and
   deterministic. ✅ unit
2. Style swap is one store flag; commerce/catalog/planogram files untouched by the switch
   path; fixtures rebuild event-driven (no per-frame work). ✅ unit
3. Every style ≤ 88 draw calls at DPR-1 (measured golden assert per style). ✅ golden
4. Extras never intersect `OBSTACLES`; collision/nav data unchanged by M7. ✅ unit
5. Tag rails + light temperature re-skin per style; dusk still works. ✅ golden
6. **Golden:** three same-pose screenshots, vision-reviewed side by side. ✅

## 9. As-built record (T6 close)

**Measured (Overview pose, DPR-1, debug probe):** traditional **83**, modern **84**,
supermart **88** — budget ≤ 88 holds in every style with **zero headroom** in supermart.
The D6 prediction (supermart 87) was wrong by one assumption: each extra mesh was built
with `castShadow: true` (the `addMergedMesh` default), so the 5 supermart extras cost
10 calls (main pass + shadow pass each), measuring 93 on first run. Fix shipped:
`applyFixtureStyle` builds every extra with `castShadow: false` — LED strips are
emissive, the grid is overhead, and end-cap/chatti/baskets are thin prop-class geometry
that still `receiveShadow` — cutting the shadow-pass calls entirely (unit-pinned in
`tests/unit/fixtures.test.js`). Disposal verified: runtime swap traditional → supermart
leaves zero leaked meshes and no console errors (swap golden).

**Deferred (out of M7 scope, unchanged):** double-sided center-aisle gondolas — collision
(`OBSTACLES` boxes) and the nav grid are built once at boot from `layout.js`; live rebuild
machinery is a prerequisite, tracked for M8+ if a supermart layout needs it.
