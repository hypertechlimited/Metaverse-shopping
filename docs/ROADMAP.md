# Roadmap — Challenged, Revised, Verified 2026-11-27

## What Changed After Research (vs. original spec)

| Original assumption | Finding | Decision |
|---|---|---|
| Phase 2 multiplayer = Node.js + Socket.io/Colyseus | Supabase Realtime (Broadcast + Presence, median ~6 ms latency) covers presence and ephemeral movement without a server to run; authoritative stock belongs in Postgres anyway | **Phase S (Supabase) replaces Phases 2+3 as the next backend step**; Colyseus stays an option only if we later need server-authoritative simulation at scale |
| Headless commerce = Next.js/Medusa + PostgreSQL | Two backends for one prototype is premature | Supabase provides Postgres + Auth + RLS + Realtime in one; a Medusa-style layer only if tax/invoicing complexity arrives |
| Payments Phase 4 (eSewa/Khalti/Fonepay) | Unchanged — client-side QR stays mock until server-issued dynamic QR + webhook signature verification exist | Kept as Phase P, gated on Phase S |
| Blender/GLTF assets Phase 1 | Correct, but pipeline must be designed-in now | `makeArt()` stays the prototype renderer; every product factory returns `{group, userData}` so GLB swaps are drop-in |
| TS 7 for types | TS 7.0.2 is `latest` but weeks old (just left RC) | Prototype: vanilla JS + JSDoc, checked with `tsc --noEmit --checkJs`. Migrate to TS in Phase S when the backend layer justifies a build step |

## Device Matrix (Phase 0 targets — "Devices Only")

No native apps, no headset requirement. The metaverse ships in the browser.

| Device class | Baseline | Support level | Notes |
|---|---|---|---|
| Desktop Chrome/Edge/Firefox (Win/mac/Linux) | WebGL2, dGPU/iGPU | **Tier 1** — full 60 FPS | Primary dev target |
| Android mid-range (Chrome, 4G) | WebGL2, 6 GB RAM | **Tier 1** — ≥ 30 FPS | The real Nepali user; drives every budget |
| Android low-end (2–3 GB RAM) | WebGL2 (software fallback risk) | Tier 2 — functional | DPR cap 1, shadows optional |
| iPhone/iPad Safari (iOS ≥ 15) | WebGL2 | **Tier 1** — full | Audio must be gesture-gated; watch canvas memory limits |
| WebXR headsets | OpenXR via WebXR API | Phase X — **out of scope now** | Camera rig abstracted so a WebXR path can attach later |
| `file://` / no-JS / no-WebGL2 | — | Graceful fallback | Static info screen with catalog + bill-by-form |

## Phase Plan

- **Phase 0 — Production-Grade Prototype (M0–M5, current).** Everything above; zero backend; localStorage persistence. Done = all golden tests green in CI.
- **Phase S — Supabase.** `@supabase/supabase-js ^2.119.2`.
  - Schema: `products`, `variants`, `stock_movements` (ledger, not mutable counters), `orders`, `order_items`.
  - Oversell guard moves server-side: Postgres RPC `checkout(cart jsonb)` in a transaction with `SELECT ... FOR UPDATE` — client never writes stock directly; RLS denies it.
  - Auth: anonymous sign-in on entry (name stays cosmetic); optional upgrade to phone auth.
  - Realtime: **Presence** for live neighbor avatars (replaces sine-wave NPCs — the NPC update signature already accepts external positions), **Broadcast** for move/emote events, **Postgres Changes** for stock badges.
  - The storage interface (`engine/storage.js`) gains a Supabase adapter behind the same contract — UI code unchanged.
- **Phase A — High-fidelity assets.** Blender → glTF + Draco, < 5 MB total; drop-in per the factory contract above.
- **Phase P — Nepal payments.** Server-generated Fonepay/eSewa dynamic QR, webhook signature verification, idempotent order confirmation; only after Phase S (needs a server to sign).
- **Phase X — WebXR / voice.** `THREE.PositionalAudio`, Nepali TTS/LLM for Pasale Dai; only after the prototype is stable on Tier 1 devices.

## Sequencing Rule

No phase starts until the previous phase's golden suite is green in CI. Prototype quality is the gate — not enthusiasm.
