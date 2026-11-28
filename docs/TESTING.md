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
- **INP (`engine/inp.js`, M5.5):** worst-interaction latency from Event Timing entries, degradation to worst-event latency without `interactionId` support, malformed-duration handling (counted, never measured), `INP_BUDGET_MS 200` / `INP_CI_STALL_GUARD_MS 500` budget pins.
- **telemetry (`engine/telemetry.js`, M5.5):** bounded 50-entry error/rejection queue, install/uninstall idempotence, `drain()` empties, no network writes.
- **PWA (`engine/pwa.js` + `sw.js` + `manifest.webmanifest`, M5.5):** registration fail-soft paths (no SW API, insecure context, rejection), controllerchange announced exactly once, and cross-file sync of manifest ↔ index.html links ↔ SW shell list.

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

## Layer 4 — Performance Smoke (M5, measured protocol)

- **Draw-call budget ≤ 80, asserted at DPR-1 low-tier steady state** — the mid-range Android target from the device matrix. Measured via `?debug=1`: `renderer.info.autoReset = false` with `probe.beginFrame()` at the top of each frame, so `stats()` reads exact last-frame totals across the multi-pass post chain (a casual `renderer.info` read sees only the output pass). Current ledger: **74** at DPR-1; DPR-2 high tier with bloom measures 87 and is captured, not asserted — those extra calls are post-chain quad passes, not scene growth.
- **Payload ≤ 5 MB**, asserted two ways: browser resource entries (`decodedBodySize`, golden) and a Node wire-model gate (`tests/unit/payload.test.js`) that gzips `index.html` + `src/**` + `vendor/three/**` with zlib and models transfer at 6 Mbps. Wire model: **518 KB → 0.71 s**.
- **Throttled 4G cold load is evidence-only** (`PERF-4G-COLD-LOAD-MS` logged, never asserted): the local test server is HTTP/1.0 without gzip or keep-alive, so a throttled wall clock overstates the deployed Pages URL (HTTP/2 + gzip). The wire model above is the honest instrument.
- **FPS is captured, never asserted, in CI.** The CI rasterizer is SwiftShader (software), so FPS numbers there prove nothing about devices; device FPS belongs to the manual Android smoke below.
- **Context-loss golden:** `WEBGL_lose_context` → lose → 800 ms → restore → 2.5 s → `stats()` positive + mode `explore` + zero page errors.
- **Vision review gate** covers the new artifacts: `golden-perf-overview.png`, `golden-perf-dpr2.png`, `golden-context-restore.png`, `golden-preset-dusk.png`.

### Android smoke checklist (manual, `?debug=1`)

1. Load `?debug=1` → HUD bottom-left shows FPS / CALLS / TRIS / DPR / INP / ERR.
2. Enter, walk the full shop loop with the joystick → HUD stays ≤ 80 calls, INP < 200 ms; note steady FPS.
3. Cycle all 7 presets including Dusk → calls stay at 74; mood flips day → dusk → day.
4. Background then foreground the tab (context loss) → scene restores, HUD recovers.
5. Add to jhola → checkout → bill renders and prints correctly.
6. Install to home screen (browser install prompt) → launches standalone with theme color + icon.
7. Airplane-mode reload of the installed app → shell boots from cache; ERR row stays 0.
8. After a redeploy, relaunch → update toast appears once; reload lands the new version.

## CI Workflow (M5)

On every PR: `tsc --noEmit` → `vitest run` → `playwright test` (chromium, DPR 1). Green required before merge. Screenshots attached to the run as artifacts for review. Since M5.5 the unit gate also covers the PWA/INP/telemetry contracts above; SW behavior on real devices is verified by the manual smoke checklist (Chromium's SW semantics in SwiftShader CI are not representative).
