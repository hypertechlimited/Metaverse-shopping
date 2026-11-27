# Sagarmatha Metaverse Corner Kirana Pasal

A Nepali corner retail shop (*Kirana Pasal*) as a zero-reload WebGL metaverse prototype.
Corner of a *galli* intersection, Mangal Bazar, Patan, Lalitpur.

**Live on GitHub Pages:** [https://hypertechlimited.github.io/Metaverse-shopping/](https://hypertechlimited.github.io/Metaverse-shopping/)
(automatic deploy on every merge to `main` — see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md))

## What This Is

A production-grade **prototype** — not a toy demo — of a spatial commerce experience:

- Live 3D hero landing → cinematic in-store transition, no page reloads
- Authentic Nepali corner-shop architecture (Newari brick, *ankhi jhyal*, *thaam*, *jasta pali*, *pedi*)
- Real commerce logic: 17-SKU catalog, multi-unit variants, promo codes, QR discount, delivery tiers, printable bill
- Persistent inventory with oversell guards (`localStorage`, sandbox-safe)
- Zero runtime dependencies beyond Three.js — all art is procedural HTML5 canvas (`makeArt()`)

## Stack (verified 2026-11-27)

| Layer | Choice | Version | Why |
|---|---|---|---|
| Rendering | Three.js | `0.187.0` | Latest stable; `PCFSoftShadowMap` deprecated since r186 — use `PCFShadowMap` |
| Runtime | Vanilla ES modules + import map | — | Zero build step; runs on any static host |
| Types | JSDoc annotations, checked by `tsc --noEmit --checkJs` | TS 7.x | Type safety without toolchain risk (TS 7 native compiler is weeks old) |
| Dev server | `vite` (dev/build only, not runtime-critical) | `8.4.0` | Or `python3 -m http.server` |
| Unit tests | `vitest` | `5.1.2` | Commerce math is pure functions |
| Golden tests | `@playwright/test` | `1.65.1` | Headless browser + screenshot + vision analysis |
| Future backend | Supabase (`@supabase/supabase-js`) | `2.119.2` | Phase S — see `docs/ROADMAP.md` |

## Quick Start

```bash
python3 -m http.server 8000      # or: npx serve .
# open http://localhost:8000
```

ES modules + import maps require HTTP — `file://` will not work.

## Documentation Map

| Document | Purpose |
|---|---|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System design, module boundaries, data flow |
| [docs/GUIDELINES.md](docs/GUIDELINES.md) | Coding rules, design rules, performance budgets |
| [docs/TASKS.md](docs/TASKS.md) | Milestone breakdown M0–M5 with acceptance criteria |
| [docs/TESTING.md](docs/TESTING.md) | Golden test protocol and verification gates |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | GitHub Pages deploy workflow, base-path and payload rules |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Challenged roadmap, device matrix, Supabase phase, long vision |
| [docs/RESEARCH-GAPS.md](docs/RESEARCH-GAPS.md) | Second-pass research: WebGPU, storage, INP, security, i18n, XAUR |
| [docs/SWARM-EXECUTION.md](docs/SWARM-EXECUTION.md) | Multi-agent (swarm) execution model and roles |
| [design/ASSET-PIPELINE.md](design/ASSET-PIPELINE.md) | Photoreal reference mockups + in-engine cinematic realism plan |
| [design/references/REFERENCE-PROMPTS.md](design/references/REFERENCE-PROMPTS.md) | Versioned image-generation prompt library |
| [AGENTS.md](AGENTS.md) | Rules for contributors and coding agents |
