# M6 Execution Plan — Shelf & Merchandising Truth

Authored 2026-11-28. Expands the M6 entry in `docs/TASKS.md`; design background in
`docs/RETAIL-DESIGN.md` §1. This is the binding execution doc for the milestone —
work is sequenced T1→T8 below, each with its file-level change and test gate.

---

## 1. Goal

Shelves that read as a *stocked, faced, priced* retail shelf and stay **truthful to
inventory**: facings deplete as stock sells, price tags grey out at sell-out, and every
SKU remains one pickable entity. After this milestone the Back Rack, Counter and Front Pedi
look like a merchandised pasal, not 17 floating shapes.

## 2. Research findings (2026-11-28)

**Merchandising practice** (Shopify, FieldPie, PlanoHero, RMASA, Rework):
- **Facing** = units of one SKU visible face-forward; best-sellers earn more facings.
  **Fronting** = pulled to the shelf lip, labels outward. Planogram compliance in real
  retail runs 60–85% — our engine can be at 100% by construction, which is the point of
  making the planogram *code*.
- **Eye-level = buy level**: the middle tier gets the fast movers (Wai Wai, dal, salt);
  top tier = light/impulse, bottom = bulk/heavy (rice, oil).
- **Shelf-edge price rails** are the single highest-credibility fixture detail — every
  real pasal/gondola has them.
- **Depth fill** (plain case blocks behind facings) is what makes shallow assortments read
  full; staples at the *back* of a store route traffic, irrelevant here (one-room shop).

**Three.js instancing economics** (mysimulator guide, paprika3d merge-vs-instance, IGC 60fps
patterns, serdarozden guide):
- One `InstancedMesh` per **shape class** = 1 draw call for *any* unit count; per-instance
  color via `setColorAt` (multiplies into vertex color).
- Raycasting InstancedMesh directly is CPU-bound and unnecessary here — the existing
  invisible pick proxies (one per SKU, `userData.product`) remain the pick surface; facings
  of a SKU belong to that SKU's proxy footprint (§4 D4).
- `BatchedMesh` stays **out** of scope — it is a new addon surface, and our rule is
  doc-change-first for any addon (`AGENTS.md`, ARCHITECTURE principle 1).

## 3. Current-state audit (code facts)

| Fact | Where |
|---|---|
| 17 SKUs rest at single spots; Back Rack zone = 7 SKUs in one line at `y=1.0, z=-4.0` | `src/world/layout.js` `PRODUCT_SPOTS` |
| Rack exists only as an OBSTACLES AABB (`minX -4.4..1.1, minZ -4.45..-3.55`); **no shelf boards, no tier levels, no price rails** | `src/world/layout.js` OBSTACLES; `src/world/architecture.js` (no rack geometry) |
| Products render as 4 per-zone vertex-colored merged meshes (4 draw calls) + invisible proxies per SKU | `src/world/products.js` `buildProducts()` |
| Shapes: `pouch, sack, pot, bottle, bar, bundle, box` with two-tone body+accent parts | `src/world/products.js` `buildShapeParts()`, `src/world/thumbs.js` `THUMBS` |
| Stock flows through the store; a subscriber already persists on every mutation | `src/main.js` `store.subscribe(...)` |
| Canvas-texture + Devanagari-font-load redraw pattern exists (pasal board) | `src/world/art.js` `makeArt`/`makeTexture`, font constants |
| Ledger 74/80 draw calls at DPR-1 steady state | M5 audit, `tests/golden/perf.spec.js` |

## 4. Design decisions

**D1 — Planogram as pure code.** New `src/world/shelfPlanogram.js`, no Three.js imports
(unit-testable like `commerce/`):
```
facingPlan(catalog, zoneTiers) -> Map<skuId, { facings, depthUnits, tier, columns }>
```
Rules: facings 2–4 by stock velocity (stock ≥ 30 → 4, ≥ 15 → 3, else 2); staples on the
eye-level middle tier (tier assignment table in `layout.js` `ZONE_TIERS` — geometry truth
stays in one file); zero stock → `facings: 0`. Deterministic, no randomness.

**D2 — Hero + instanced siblings (draw-call frugal).** The existing 4 zone merged meshes
stay — each SKU's spot unit is **facing #1** with full two-tone detail. Additional facings
are `InstancedMesh` per shape class (7 classes → 7 draw calls) with single-part silhouettes
and `setColorAt` body colors: background units read correctly at shelf distance without
accent caps. Rationale: 17 per-SKU instanced meshes would cost 17 draw calls; 7 shape
classes cost 7; a merged mesh cannot deplete per SKU.

**D3 — Stock-truthful depletion.** New subscriber: `products.setStock(stockMap)` +
`shelves.update(stockMap)`. Instanced extra-facings count for a SKU =
`stock === 0 ? 0 : plan.facings - 1` (never negative). When a SKU **crosses to 0**, the
zone merged mesh rebuilds without that SKU's parts (rebuild is O(SKUs), only on the
0-crossing event, not every sale). Price-tag cells grey out in the same pass.

**D4 — Pick proxies cover the facing row.** Proxy width per SKU grows to the facing row's
X-extent (center + columns); depth unchanged. Hover/inspector work identically — the
tooltip already reads live stock from the store.

**D5 — Price-tag rail = one atlas, one merged mesh.** Canvas atlas 2048×256, 17 cells
(Devanagari name + `formatRupees` price, per `pricing.js`), `SRGBColorSpace`, anisotropy
≤ 8, redrawn per-cell only when dirty (sell-out greys the cell) and re-drawn fully when
the vendored Devanagari font finishes loading — same pattern as the pasal board. All three
rail strips (Back Rack / Counter / Front Pedi) merge into **one** mesh with one material
→ 1 draw call. Rail geometry derives from the same `layout.js` constants as the rack.

**D6 — Real gondola furniture.** Back Rack gains 3 tier boards (y ≈ 0.55 / 1.0 / 1.45)
with front lips + uprights via `world/merge.js` → 1 draw call. Back Rack SKUs re-tier:
eye level (1.0) = nun, musuro-dal, sakkhar; top (1.45) = besaar, khorsani, masyaura;
bottom (0.55) = gungdi-ghee (heavy). New spot Y values are **layout.js data**
(`ZONE_TIERS` + updated `PRODUCT_SPOTS`), consumed by products + planogram + collision;
OBSTACLES unchanged (same rack AABB). Spot/catalog parity tests update with it.

## 5. Draw-call ledger (doc-first budget raise)

| Item | Δ calls |
|---|---|
| Current steady state (M5.5) | 74 |
| InstancedMesh per shape class (pouch, sack, pot, bottle, bar, bundle, box) | +7 |
| Price-tag rail merged mesh (one atlas material) | +1 |
| Gondola tier boards + lips + uprights (merged) | +1 |
| **M6 steady state (measured gate)** | **≤ 83** |

Budget: 80 → **88** (headroom 5 for the transient BoxHelper already counted in M4).
Doc-first rule: `docs/GUIDELINES.md` budget line + `tests/golden/perf.spec.js` assertion
change in the same PR as the code. Payload delta: two canvas textures (atlas + none else)
— well under the 5 MB gate; no new runtime deps; no new addon files.

## 6. Execution steps

| # | Task | Files | Gate |
|---|---|---|---|
| T1 | Budget raise (doc-first) | `docs/GUIDELINES.md`, `tests/golden/perf.spec.js`, this doc's ledger | perf spec asserts ≤ 88 |
| T2 | Tier data in layout | `src/world/layout.js` (`ZONE_TIERS`, re-tiered `PRODUCT_SPOTS`) | `tests/unit/layout.test.js` parity |
| T3 | Planogram module | `src/world/shelfPlanogram.js` (pure) | new `tests/unit/shelfPlanogram.test.js` |
| T4 | Gondola furniture | `src/world/architecture.js` (mergedParts) | architecture golden parity |
| T5 | Instanced facings + depletion | `src/world/products.js` (`buildProducts` gains facing instancing, `setStock`) | `tests/unit/products.test.js` extensions |
| T6 | Price-tag rail atlas | `src/world/shelfTags.js`, font-load redraw wiring in `src/main.js` | new unit tests + Devanagari legibility golden |
| T7 | Store wiring + proxy extents | `src/main.js`, `src/world/products.js` proxies | hover golden still green |
| T8 | Goldens | `tests/golden/merchandising.spec.js` | vision review vs AC below |

## 7. Test plan

**Unit (new/extended):**
- `shelfPlanogram`: every SKU planned; facings monotone in stock; zero-stock → 0; no two
  plans overlap in X on the same tier (AABB check from layout constants); deterministic
  across calls.
- `products`: instanced counts equal `plan.facings - 1` per stock state; 0-crossing
  triggers zone rebuild; proxy AABB covers the full facing row; instanced unit count ≤ 1
  per shape class in the scene graph.
- `shelfTags`: 17 atlas cells, cell rects non-overlapping, `formatRupees` text present;
  grey-out redraw flips the cell's dirty flag exactly once per crossing.
- `layout`: re-tiered spots rest on their tier boards (`topY` parity with `ZONE_TIERS`).

**Golden (new `merchandising.spec.js` + updated perf):**
1. Back Rack preset screenshot: 3 tiers, multi-facing rows, legible price rail (vision-gated).
2. Sell-out scenario: drive a SKU to 0 through `localStorage` → facings gone + tag greyed
   (screenshot + instance-count assert).
3. Hover on a facing row still selects the SKU (proxy coverage).
4. Perf: ≤ 88 calls at DPR-1 steady state; payload ≤ 5 MB unchanged.

## 8. Risks & mitigations

| Risk | Mitigation |
|---|---|
| SwiftShader in CI renders instancing fine but slow | Perf governor + DPR-1 assertion tier unchanged; FPS never asserted on software raster (M5 precedent) |
| Devanagari font loads after atlas draw → blank tags | Reuse the pasal-board FontFace-redraw pattern (M1.5 precedent) |
| Zone rebuild on 0-crossing causes a hitch mid-interaction | Rebuild is O(17) geometry ops, fires once per sell-out, never per frame; render-loop allocation rules untouched |
| Re-tiered spots break hover/inspector goldens | Proxies derive from the same spots; T2 lands with parity-test updates in the same commit |
| Draw-call regression hides in the post chain | Measure with `?debug=1` `probe.beginFrame()` accounting (M5 instrument), assert exact steady state |

## 9. Acceptance criteria (supersedes the M6 summary in TASKS.md)

1. `facingPlan()` covers all 17 SKUs; facings ∝ stock velocity; zero stock → empty facing
   set; deterministic. ✅ unit
2. Scene graph shows ≤ 1 InstancedMesh per shape class; total steady state ≤ 88 draw calls
   at DPR-1 (doc-first budget raise committed together). ✅ unit + golden
3. Price-tag rail renders Devanagari names + prices, greys out on sell-out, redraws after
   font load. ✅ unit + golden
4. Gondola has 3 tiers with staples at eye level; spots re-tiered via `layout.js` only;
   OBSTACLES unchanged. ✅ unit
5. Hover/inspector/gold BoxHelper behavior unchanged on faced rows. ✅ golden
6. **Golden:** stocked-rack screenshot + sell-out screenshot, vision-reviewed. ✅
