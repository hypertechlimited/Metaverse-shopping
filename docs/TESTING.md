# Testing Protocol — Golden Tests & Verification Gates

## Test Pyramid for a 3D Commerce App

```
        ▲  Manual smoke (real Android device, M5 only)
       ╱ ╲  Golden tests (Playwright: boot, screenshot, vision review)
      ╱   ╲  Engine integration (collision, storage, input guard)
     ╱     ╲  Unit — pure commerce math (vitest, exhaustive)
```

## Layer 1 — Unit (`vitest`) — the fast majority

Everything in `src/commerce/` and `engine/collision.js` must be pure and 100% deterministically tested:

- **pricing:** QR 2% rounding, `NAMASTE5`, `PATAN100` threshold boundary (999 vs 1000), delivery boundary, empty cart, combined discounts.
- **catalog:** all 17 SKUs × variants: price parity with the spec table, stock bounds, unknown-id rejection.
- **cart:** add/increment/remove, oversell guard at exact-stock boundary, atomic checkout (full apply or full reject), restore from storage snapshot.
- **collision:** resolve vs. each of the 5 AABBs from all 4 approach directions, corner cases, world clamps.
- **storage:** corrupt JSON, missing keys, quota error → defaults, no throw.

Gate: `npx vitest run` green, no skipped tests.

## Layer 2 — Engine Integration

- Loop: delta clamp under simulated tab-blur.
- Storage round-trip with schema validation.
- Input: click-vs-drag 6 px guard (synthetic pointer events on canvas).

## Layer 3 — Golden Tests (`@playwright/test`)

Named, screenshot-based acceptance tests — one per milestone, catalogued in `docs/TASKS.md`:

1. `golden boot`: page loads, no console errors, canvas present, WebGL2 context created.
2. `golden landing`: landing overlay over live 3D street; status pill and deal chips visible.
3. `golden enter`: after Enter click, camera position ≈ `[6.8, 2.9, 7.6]` (tolerance 0.5), toast visible, bell audio state = started.
4. `golden commerce`: open catalog, add 2 items, cart badge = 2, subtotal correct on HUD.
5. `golden bill`: checkout → receipt DOM contains line items, totals, and print styles apply (`@media print` emulation).
6. `golden presets`: navigate all 6 camera presets; screenshot each.
7. `golden collision`: attempt to walk into each of the 5 obstacles; player position resolves outside the box.

**Vision review gate:** every golden screenshot is reviewed visually (by a human or a vision model) against the AC in `docs/TASKS.md`. A passing DOM assertion with a wrong-looking render is a **failure** — e.g., correct AABB values but the shelf visibly floating is a bug.

## Layer 4 — Performance Smoke (M5)

- Capture `renderer.info.render.calls` and `renderer.info.memory` at steady state → assert ≤ 80 draw calls.
- Measure cold load on throttled 4G profile → assert ≤ 5 s to interactive.
- FPS sample over 10 s at DPR 1 and DPR 2 → assert ≥ 60 / ≥ 30.

## CI Workflow (M5)

On every PR: `tsc --noEmit` → `vitest run` → `playwright test` (chromium, DPR 1). Green required before merge. Screenshots attached to the run as artifacts for review.
