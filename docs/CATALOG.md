# Catalog Spec — 17 SKUs (M3 Binding Truth)

This file **is** the "17-SKU spec table" referenced by the M3 acceptance criteria in `docs/TASKS.md` and `docs/TESTING.md`. It did not exist in the repo before M3 (it predates the repository, in the original conversation spec); it was authored 2026-11-27 and anchored to the four prices already pinned by the M2 landing deal chips (`src/ui/landing.js` `LANDING_DEALS`). Unit tests in `tests/unit/catalog.test.js` hardcode the prices below — a catalog typo fails parity, this document is the target.

Status: **APPROVED 2026-11-27 — binding for M3 (maintainer approved execution).**

---

## Assortment rules (why these 17)

A real Mangal Bazar corner pasal (reference 03, merchandising truth):

- **Staples first** (rule 6 of `AGENTS.md`): rice, dal, salt, sugar, oil, chiura — the daily basket.
- **Fermented/dried Nepali shelf** (the shop's identity, not generic): gundruk, sukuti, masyaura, gungdi ghee.
- **Spice jars** sold loose from tins on the back rack: besaar, khorsani, timur-style quantities.
- **Counter impulse row**: tea, candles, matches — what a customer grabs while paying.
- No imported-luxury filler, no phone-recharge coupons, no cold-chain items — the pasal has no fridge (visible in the architecture).

## Zone placement (feeds the M4 shelf build; zone names = `CAMERA_PRESETS` names in `world/layout.js`)

| Zone | SKUs | Display |
|---|---|---|
| Counter | ilam-tea-250g, mombatti-4pack, salai-10pack | countertop impulse row |
| Back Rack | nun-1kg, sakkhar-1kg, musuro-dal-1kg, besaar-200g, khorsani-100g, masyaura-250g, gungdi-ghee | 3-tier rack + spice tins (reference 03) |
| Front Pedi | waiwai-5pack, gundruk-250g, sukuti-250g, sabun | hanging noodle bunches + outdoor display |
| Corner | marsyangdi-rice-5kg, toriko-tel-1l, chiura-1kg | sack stack (joins the M2.5 burlap sack line) |

## The 17-SKU table

Prices in Nepalese rupees (₨). `vIdx 0` is the default variant. **Anchors (pinned, may not change):** waiwai-5pack v0 ₨95 · ilam-tea-250g v0 ₨180 · gungdi-ghee v0 ₨420 · marsyangdi-rice-5kg v0 ₨310.

| # | id | Name (Nepali · English) | Variants (label → ₨) | Stock | Zone | Art key |
|---|---|---|---|---|---|---|
| 1 | `waiwai-5pack` | वाइ वाइ चाउचाउ · Wai Wai noodles | 5-pack → **95**, 12-pack → 220 | 48 | Front Pedi | `noodles` |
| 2 | `ilam-tea-250g` | इलाम चिया · Ilam tea | 250g → **180**, 500g → 340 | 20 | Counter | `tea` |
| 3 | `gungdi-ghee` | गुँदी घिउ · Gungdi ghee (clay pot) | 500g → **420**, 1kg → 820 | 9 | Back Rack | `ghee` |
| 4 | `marsyangdi-rice-5kg` | मर्स्याङ्दी चामल · Marsyangdi rice | 5kg → **310**, 25kg → 1,450 | 24 | Corner | `rice` |
| 5 | `nun-1kg` | आयोडिनयुक्त नुन · Iodized salt | 1kg → 25 | 40 | Back Rack | `salt` |
| 6 | `sakkhar-1kg` | सक्खर · Sugar | 1kg → 95 | 30 | Back Rack | `sugar` |
| 7 | `musuro-dal-1kg` | मुसुरो दाल · Red lentils | 1kg → 190, 2kg → 370 | 25 | Back Rack | `dal` |
| 8 | `besaar-200g` | बेसार · Turmeric powder | 200g → 60 | 35 | Back Rack | `turmeric` |
| 9 | `khorsani-100g` | सुकुटे खोर्सानी · Dried chili | 100g → 75 | 30 | Back Rack | `chili` |
| 10 | `masyaura-250g` | मस्यौरा · Masyaura (urad fritters) | 250g → 130 | 22 | Back Rack | `masyaura` |
| 11 | `gundruk-250g` | गुन्द्रुक · Gundruk (fermented greens) | 250g → 90, 500g → 170 | 18 | Front Pedi | `gundruk` |
| 12 | `sukuti-250g` | सुकुटी · Sukuti (dried meat) | 250g → 320 | 12 | Front Pedi | `sukuti` |
| 13 | `toriko-tel-1l` | तोरीको तेल · Mustard oil | 1L → 280, 2L → 540 | 26 | Corner | `oil` |
| 14 | `chiura-1kg` | चिउरा · Beaten rice | 1kg → 120 | 28 | Corner | `chiura` |
| 15 | `sabun-nahaune` | नुहाउने साबुन · Bathing soap | bar → 60 | 36 | Front Pedi | `soap` |
| 16 | `mombatti-4pack` | मोमबत्ती · Candles | 4-pack → 50 | 24 | Counter | `candle` |
| 17 | `salai-10pack` | सलाई · Matches | 10-pack → 25 | 50 | Counter | `matches` |

Stock values are **initial** defaults seeded into `storage` on first boot; they thereafter live in the persisted `stockMap` (per-SKU, per the `sagarmatha_metaverse_v3` schema in `docs/ARCHITECTURE.md`). `marsyangdi-rice-5kg: 24` and `gungdi-ghee: 9` intentionally match the schema example (`{ rice: 24, ghee: 9 }`).

Variant labels carry units; the label + price pair is what the catalog drawer, inspector, bill, and M4 hover tooltips all render — they read from here, never re-typed.

---

## Pricing rules (binding semantics — the spec never spelled these out; decided here)

All money math is integer rupees. Every percentage rounds with `Math.round`. Named constants in `commerce/pricing.js` (`QR_RATE`, `NAMASTE_RATE`, `PATAN_THRESHOLD`, `PATAN_DISCOUNT`, `DELIVERY_FEE`, `DELIVERY_FREE_AT`) — no magic numbers per `GUIDELINES.md` rule 3.

```
subtotal      = Σ (variant price × qty)            [per cart line]
qrDiscount    = Math.round(subtotal × 0.02)        [when QR used — the M2.5 QR stand]
namaste       = Math.round(subtotal × 0.05)        [promo NAMASTE5]
patan         = 100  iff subtotal ≥ 1000, else rejected  [promo PATAN100]
discountTotal = qrDiscount + namaste + patan       [all stack — see below]
deliveryFee   = 0  iff subtotal ≥ 1000, else 50    [threshold on SUBTOTAL, pre-discount]
total         = Math.max(0, subtotal − discountTotal + deliveryFee)
```

Decisions:

- **Combinability:** QR discount and both promo codes **stack** ("mutually combinable per spec"). Both percentages always compute from the **pre-discount subtotal** — order-independent, so the combined case has one deterministic answer.
- **PATAN100 gate** evaluates on the same pre-discount subtotal: 999 → rejected, 1000 → applied (this is the tested boundary in `docs/TESTING.md`).
- **Delivery free-at** uses the same subtotal ≥ 1000 threshold — one boundary, two consequences.
- **Total floor** clamps at ₨ 0 (a pathological all-discount cart can never go negative).
- **Empty jhola totals ₨ 0** — no delivery fee is charged when nothing was bought.
- **NAMASTE5** read as 5% (the "5" in the code); **PATAN100** as ₨100 flat (the "100"). If the original spec meant something else, this section is the one place to amend.

## Integration notes (M3 wiring decisions made here, doc-first)

- **Schema stays `sagarmatha_metaverse_v3`.** The bill's order id is timestamp-derived (`SM-<epochBase36>`), so no schema field is added; a schema bump is a doc-change-first decision for Phase S.
- **Stock is per-SKU across all of a SKU's variants** (schema-pinned: `stockMap` keys are ids, cart lines carry `vIdx`). The oversell guard sums quantity across every line of the same id; checkout deducts per-SKU sums atomically in one store write.
- **Rupee rendering:** documents use the ₨ glyph; runtime code renders prices as `रू <n>` (Devanagari, Indian-region grouping) to match the M2 landing convention — `formatRupees()` in `commerce/pricing.js` is the only formatter.
- **Thumbnails:** the `art key` column names a draw function; `main.js` (which may import `world/`) maps key → `makeArt(...).toDataURL()` and passes an `imageFor(skuId)` accessor into `ui/catalogDrawer.js` — `commerce/` stays pure and `ui/` never imports `world/` (ARCHITECTURE import rules hold).
- **Landing chips** refactor to read prices from `catalog.js` in M3 (single source of truth; a unit test asserts chip price ≡ catalog price).
- **Inspector in M3 is DOM-only** (opened from the catalog drawer). The raycast → inspector wiring is M4, per `TASKS.md` scope split.

## Verification hooks (M3 tests generated from this file)

- `tests/unit/catalog.test.js` — 17 ids exist, ids are kebab-case, every variant price matches this table literally, unknown-id rejection, stock bounds 0–99.
- `tests/unit/pricing.test.js` — QR rounding, NAMASTE5, PATAN100 at 999/1000, delivery at 999/1000, empty cart, all-stack combination, total-floor clamp.
- `tests/unit/cart.test.js` — oversell at exact-stock boundary, atomic checkout, snapshot restore.
- Golden `commerce` + `bill` specs per `docs/TESTING.md` items 4–5.
