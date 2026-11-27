# Research Gaps — Closed 2026-11-27

Findings from a second research pass. Each item: what we missed, what the evidence says, and the binding decision.

## 1. WebGPU vs WebGL2

**Missed:** We pinned WebGL2 without evaluating its successor.
**Evidence:** WebGPU now ships in all major browsers (Chrome 113+ 2023, Firefox 141+ 2025, Safari 26 2025) but MDN still classifies it **"Limited availability," not Baseline** — no Firefox on Linux/Intel Macs/Android, Safari requires macOS 26+. Three.js ships `WebGPURenderer` as an opt-in path alongside `WebGLRenderer`.
**Decision:** **WebGL2 remains the baseline and the only supported renderer** for Phases 0–S. WebGPU is a Phase A+ optimization (compute shaders for crowd/particle effects), never a hard dependency. Feature-detect at boot; the capability-check fallback in `GUIDELINES.md` already covers both.

## 2. Storage: `localStorage` ceiling

**Missed:** localStorage is synchronous, string-only, ~5 MB, and blocks the main thread — fine for our schema v3, but cart *history* and bill archives will outgrow it.
**Decision:** Keep `localStorage` for the prototype (schema is tiny). `engine/storage.js` is already the single persistence boundary; Phase S moves truth to Postgres. If we ever need client-side history before Phase S, swap the implementation to IndexedDB behind the same interface — documented now so nobody "temporarily" reads storage elsewhere.

## 3. Core Web Vitals: INP, not FPS alone

**Missed:** Our budget counts FPS but not interaction latency. INP (Interaction to Next Paint) replaced FID as the Core Web Vitals stability metric; a 60 FPS scene with a 400 ms tap-to-modal response still feels cheap.
**Decision:** Add to the performance budget: **INP < 200 ms** for all HUD interactions (catalog open, add-to-cart, preset switch). Measured in the M5 performance smoke via Playwright tracing.

## 4. Supply-chain security & SRI

**Missed:** We load `three` via import map from a CDN with no integrity guarantee. Research context: a Dec 2025 analysis of 470 real PRs found AI-generated code carries **1.7× more defects and 2.74× more security vulnerabilities** than human code; CHI 2025 showed AI assistants systematically generate inaccessible markup. We are an AI-built project — we inherit this risk profile by default.
**Decision:**
- Vendor `three.module.js` into the repo (checked in, pinned, hash-verifiable) instead of trusting a CDN at runtime — zero-runtime-deps rule now means *zero network art AND zero network code*.
- No copy-pasted crypto/payment code in Phase P; use gateway SDKs with webhook signature verification, never hand-rolled HMAC.
- Every PR keeps the diff small and reviewable — the primary defense against confident-but-wrong generated code.

## 5. Devanagari shaping & i18n

**Missed:** Nepali text on canvas textures needs proper shaping (conjuncts, matras) and a real Devanagari font — system `fillText` without `lang` metadata or with a subsetted-Latin font silently breaks rendering.
**Decision:** Load a Devanagari webfont (subset via `unicode-range`), set `lang="ne"` on relevant DOM, and make the golden test for M1 assert the board string `सगरमाथा कर्नर पसल` renders with correct conjuncts (vision-reviewed, not pixel-diffed against a broken reference).

## 6. Accessibility beyond WCAG-2D

**Missed:** Canvas-first 3D apps dodge normal DOM accessibility; WCAG alone doesn't cover spatial interfaces.
**Decision:** Follow the W3C **XAUR** (XR Accessibility User Requirements) directionally: every 3D interaction has a 2D DOM equivalent (catalog drawer = full commerce path without raycasting), full keyboard traversal, `prefers-reduced-motion` honored, and contrast checked with APCA on all HUD text over the 3D scrim. The catalog drawer being a complete alternative interface is a hard requirement, not a convenience.

## 7. Color management

**Missed:** Our palette hexes are sRGB display values, but lighting math happens in linear space; without explicit `SRGBColorSpace` on canvas textures and correct `outputColorSpace`, colors shift unpredictably across devices.
**Decision:** Already specified in `AGENTS.md` (sRGB canvas textures, ACES tone mapping); golden tests verify the brick hue `#8f3b26` survives the pipeline visually.

## 8. Offline & installability (Nepali 4G reality)

**Missed:** A PWA with a service worker would let returning customers enter the pasal on flaky connectivity.
**Decision:** Phase 0 keeps everything in one HTML payload (already offline-friendly once cached). PWA manifest + service worker caching = M5 stretch goal; required before any real deployment.

## 9. Observability

**Missed:** "Production grade" without error telemetry is a claim, not a property.
**Decision:** M5 adds a minimal error hook (`window.onerror` + unhandled rejection) writing to a queue; Phase S forwards it to a hosted sink. No third-party script in the prototype (zero-network rule).

## 10. Skills & knowledge map — what was missing from the earlier answer

| Gap | Add to learning sequence |
|---|---|
| **Rendering APIs** | WebGL2 deeply; WGSL/WebGPU literacy for Phase A |
| **Text & fonts** | Font subsetting, shaping engines, canvas typography |
| **Security** | SRI, supply-chain audits, threat modeling for payments (Phase P prerequisite) |
| **Performance measurement** | Playwright tracing, INP, long tasks API — not just FPS |
| **Spatial UX** | Locomotion comfort, signposting in 3D, XAUR accessibility |
| **Agent-era engineering** | Reviewing generated code defensively (see `SWARM-EXECUTION.md`) — the new core skill |

## Sources

- WebGPU support status: [Wikipedia/WebGPU](https://en.wikipedia.org/wiki/WebGPU), [web.dev](https://web.dev/blog/webgpu-supported-major-browsers), caniuse (~88.6% global, partial Safari/Firefox)
- AI-code defect rates: Dec 2025 470-PR analysis; CHI 2025 accessibility study
- XAUR: W3C XR Accessibility User Requirements
