# Retail Design Brief — Shelves, Product Dressing, Aim Dot, Mobile (M6–M9 Plan Input)

Authored 2026-11-28 after the M5.5 release candidate, from web research and codebase audit.
This document answers the maintainer's open questions and is the design input for the M6–M9
milestones in `docs/TASKS.md`. Research sources are listed at the end.

---

## 1. "How we can mask our products — how the shelf where products are kept?"

Retail calls this **merchandising the shelf**. Three concepts, all missing from the current
build (products are 17 vertex-colored shapes floating at `PRODUCT_SPOTS` on bare rack tiers):

### 1.1 Facing & fronting
- **Facing** = number of units of one SKU visible face-forward. **Fronting** = pulling units
  to the shelf's front edge with labels turned outward (Shopify, 2026).
- Current build shows exactly one unit per SKU. Real shelves read as *rows*: 3–5 facings of
  the same pouch side by side, a second depth row behind.
- **Plan for M6:** `world/shelfPlanogram.js` — a pure planogram function
  `facingPlan()` mapping each SKU → `{ facings, rows, depthFill }` from `CATALOG` stock
  (fast movers like Wai Wai 5-pack get more facings). Facings render as `InstancedMesh`
  per shape class (one instance per unit), keeping draw calls near zero while the shelf
  looks stocked. Front row sits flush to the shelf lip; a plain-colored **back-row filler**
  block (cardboard-case look) hides emptiness behind the facings — the standard trick that
  makes shallow product sets read full.

### 1.2 Shelf furniture (where the product sits)
A retail **gondola** = base deck + uprights + adjustable shelf tiers + a **shelf-edge rail**.
The current back rack is a bare 3-tier frame.
- **Plan for M6:** shelf boards get a visible thickness + front lip; the **shelf-edge strip**
  (price-tag rail) runs along every tier front. Price tags are one shared canvas **atlas
  texture** (one row per SKU: Devanagari name + `formatRupees` price, drawn once at boot,
  redrawn on stock/price change) applied to a single merged strip mesh per rack — 1–2 draw
  calls total, live-updating like the hover tooltip.
- Stock alignment: when `stockMap` hits 0, the facings for that SKU **empty out** (instanced
  count → 0) and the tag greys out — shelf state stays truthful to inventory, which is the
  core product focus per `AGENTS.md` rule 6.

### 1.3 The mask (making merged/instanced shapes read as products)
"Masking" options ranked by value per draw call:
1. **Front-label decals** (chosen, M9): each facing's front face gets a UV region from one
   2048² **label atlas** — procedurally drawn brand-lookalike packaging art (see §5).
   Vertex-colored bodies stay; only the front plane carries the atlas. ~1 extra draw call
   per zone, huge realism gain.
2. Alpha-cutout silhouettes for hanging items (noodle bunches, soap strips on the pedi) —
   a sprite per unit reads better than extruded geometry from the front.
3. Normal/roughness hints baked into the atlas (glossy pouch vs matte sack) — free with
   the same texture.

---

## 2. Enhancing the pasal look — Traditional / Modern / Mini Super-Mart

The shell (Newari brick, ankhi jhyal, thaam, jasta pali, pedi) stays — it is the identity.
The *interior retail furniture* becomes switchable. `world/theme.js` already owns the mood
state (sky/fog/exposure/IBL); M7 adds a **fixture style** axis beside it:

| Style | Fixtures | Light | Read |
|---|---|---|---|
| **Traditional** (current) | wooden 3-tier rack, spice tins, jute sacks, glass jars | tungsten diyo + golden hour | corner kirana pasal, Mangal Bazar |
| **Modern** | white-laminate gondola, glass counter, LED strip under shelf lips, digital price rails | neutral 5000 K interior fill | urban Kathmandu modern pasal |
| **Mini Super-Mart** | double-sided gondola aisles, **end caps**, dump bin (bargain chatti), basket stack at entrance, ceiling fixture grid | cool bright uniform | Bhatbhateni-mini read |

Implementation rules:
- All fixture geometry via `world/merge.js` (`mergedParts`) — each style target ≤ 6 draw
  calls of fixtures; styles swap at one store flag, never hand-built per scene.
- Style tokens (colors, laminate vs wood, rail hue) live in one `FIXTURE_STYLES` record in
  `layout.js`-adjacent config, so a future "Real Pasal Network" per-shop skin (ROADMAP long
  vision #1) is a data change.
- **Mix mode allowed:** traditional shell + super-mart interior is the most authentic
  Kathmandu read — recommend default.

Draw-call honesty: current ledger 74/80. The M7 upgrade path (aisle gondolas + end caps)
will not fit in 6 spare calls, so M7 raises the budget to ≤ 96 **doc-first**: update
`docs/GUIDELINES.md` + `tests/golden/perf.spec.js` assertion together, re-measure on
device matrix, and re-verify DPR-2 tier.

---

## 3. Aim dot over products + item details on hover

Current state: `ui/hoverTip.js` follows the pointer; raycast runs from pointer position.
That is right for mouse, wrong for first-person look controls and touch.

**M8 adds a center-screen reticle (aim dot):**
- A small DOM dot (`#reticle`, ~6 px, ring appears on interactive hit) shown only in
  explore mode; hidden on landing/overview, hidden when pointer-hover mode is active
  (desktop mouse), respecting `prefers-reduced-motion` (no pulse animation).
- Raycast switches source by mode: **pointer ray** (mouse over canvas) vs **camera-center
  ray** (look-driven / touch). One preallocated `Raycaster`, zero per-frame allocation —
  same pattern as `main.js` today.
- On a product hit: reticle ring expands, the **hover tooltip re-anchors to the reticle**
  (fixed offset above the dot instead of following the pointer — steadier to read while
  looking around), and the gold `BoxHelper` highlight fires exactly as today.
- On touch, the reticle shows where the next tap will inspect; tap = inspect. This pairs
  with the M4.5 nav-grid **click-to-move**: tap a shelf = walk there + open inspector on
  arrival; that single gesture is the mobile money path.

---

## 4. Mobile touch friendliness

Already shipped: analog joystick (M4.5), d-pads, INP monitoring, DPR governor, PWA offline
shell (M5.5). M8 closes the remaining gaps:
- **Tap-to-inspect** (§3) replaces hover for touch; hover tooltip becomes a **bottom sheet**
  on coarse pointers (thumb-reachable, ≥ 56 px close target) instead of a pointer-follower.
- **Pinch-zoom** in the Overview/landing orbit (two-pointer distance → orbit radius clamp),
  matching the existing d-pad zoom semantics.
- **Haptic tick** on add-to-jhola and checkout (`navigator.vibrate(10)`, fail-soft, behind
  capability check) — cheap perceived quality on Android.
- Touch target audit against the 56 px rule across preset bar, chips, drawer rows.
- Golden tests: touch-emulated tap-inspect spec + pinch spec added to the suite.

---

## 5. Original product design — mocking real products

**Constraint:** we draw *inspired-by* packaging with our own `makeArt()` canvas pipeline —
authentic color language and Devanagari lettering, but **no trademark logos, no exact brand
artwork** (a public demo shipping real brands' packaging unlicensed is a legal and ethical
no). The catalog already uses real brand names as *text* (Wai Wai, Marsyangdi) — acceptable
nominative use; the packaging art must stay our own.

**M9 — label atlas pipeline:**
- `world/labels.js`: per-SKU canvas label painter keyed off `THUMBS` art
  (`noodles` → red/yellow sachet face with stylized Devanagari display text; `tea` →
  green Ilam hills card; `ghee` → clay-pot cream label…). 2048² atlas, `SRGBColorSpace`,
  anisotropy ≤ 8 — same rules as every canvas texture in the repo.
- Applied as front-face UV decals (§1.3 option 1). Thumbnail (drawer/inspector) reuses the
  same painter at 96² for perfect 3D↔UI parity.
- Pouch/bar/box shapes gain a subtle bevel + gloss band so printed faces catch light.

**Data research (this crawl, 2026-11-28):**
- Real Nepali FMCG landscape confirmed: Wai Wai (CG Foods, since 1984) is the anchor noodle
  brand with chicken/veg/chatpate variants plus Wai Wai bhujia; Rumpum is the other
  household noodle; staples brands include Hulas, Gyan, RTC, Dhara, Dabur Nepal; chiura
  specialists like Rato Bhale (red taichin chiura) and Mana pure cow ghee exist as premium
  ethnic SKUs — the catalog's fermented/dried identity shelf (gundruk, sukuti, masyaura)
  matches what diaspora grocers actually stock.
- Live price sources for the next catalog revision (`docs/CATALOG.md` v2 candidates):
  merokirana.com (Kamalpokhari, reg. 166928/073/074), aafnaipasal.com (wholesale; Wai Wai
  chicken bhujia, Kent soup noodles ≈ Rs 85–115 band), nubrimart.com daily Kathmandu
  grocery list (rice/dal/oil/LPG in NPR, updated each morning). Rule stays: prices are
  plausible and anchored, not scraped live — no runtime network fetches per `AGENTS.md`.

---

## 6. Milestone mapping

| Milestone | Scope (full AC in TASKS.md) |
|---|---|
| **M6** | Shelf & merchandising: planogram facings, shelf-edge price-tag rails, depth fill, stock-truthful emptying |
| **M7** | Fixture style variants: Traditional / Modern / Mini Super-Mart (+ budget raise, doc-first) |
| **M8** | Aim-dot reticle + re-anchored tooltip + mobile tap/pinch/haptics/bottom sheet |
| **M9** | Label atlas: inspired-by packaging art + catalog v2 price refresh from researched sources |

Sequencing follows `AGENTS.md` rule 6: M6 (shelf truth + inventory alignment) first, M8's
reticle rides the M6 facings (more facings = the reticle needs precise SKU disambiguation),
M7/M9 are visual layers that don't move commerce code.

---

## Sources (retrieved 2026-11-28)

- Shopify — *Facing in Retail: Meaning and Practice* (facing vs fronting, label-outward, eye-level) — shopify.com/blog/facing
- FieldPie — *Retail Shelf Strategy Guide 2026* (planogram compliance 60–85%, facings per SKU) — fieldpie.com/blog/retail-shelf-strategy-guide
- PlanoHero — *Best Retail Facing Tips 2026* (FIFO fronting, shelf-edge infrastructure) — planohero.com/en/blog/best-retail-facing-tips
- RMASA — *Supermarket planogram* (facings, eye-level/end-cap key locations, shelf stoppers) — rmasa.com/en/news/supermarket-planogram
- Expand A Stands — *How to Display Products in Supermarket* (staples at back, end caps/dump bins, cross-merchandising) — expandastands.com
- Rework — *In-Store Merchandising and Planograms (FMCG general trade)* (shelf strips, facing resets at every call) — resources.rework.com
- waiwai.com.np / dhakatopi.store — brand landscape (Wai Wai CG Foods since 1984, Rumpum, Rato Bhale chiura, Mana ghee)
- merokirana.com · aafnaipasal.com · nubrimart.com — Nepali grocery price references (catalog v2 input, not runtime data)
