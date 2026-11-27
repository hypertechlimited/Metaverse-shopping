# Agent & Contributor Rules — Sagarmatha Metaverse

Read this file before writing any code. These rules override personal preference.

## Hard Rules

1. **One source of truth for geometry.** All mesh positions and the `OBSTACLES` AABB list derive from `src/world/layout.js`. Never hand-copy coordinates into collision data or UI code.
2. **No runtime dependencies.** Only `three` (via import map). Dev/test tooling (`vite`, `vitest`, `playwright`) lives in `devDependencies` and must never be imported by `src/`.
3. **No code comments.** If code needs a comment to be understood, rename or restructure instead. Exception: JSDoc type annotations and public API contracts.
4. **State flows one way.** UI and 3D scenes subscribe to `store`; only actions mutate `store`. Never read `localStorage` outside `src/engine/storage.js`, never mutate Three.js materials for highlighting (use the reusable `BoxHelper`).
5. **Fail soft everywhere.** `localStorage` in `try/catch`, audio behind a user gesture, rendering behind a WebGL2 capability check with a visible fallback.
6. **Every milestone closes with a Golden Test** (see `docs/TESTING.md`) before commit.
7. **Stay in scope.** No drive-by refactors, no dependency additions, no config churn in feature commits.

## Coding Rules

- ES modules, no CommonJS, no globals.
- JSDoc types on all exported functions and all objects crossing a module boundary.
- No allocation inside the render loop (`update`/`animate`): reuse `Vector3`/`Color`/temp objects.
- Pure functions in `src/commerce/pricing.js` and `catalog.js` — no DOM, no Three.js, fully unit-testable.
- Events: use `addEventListener`; every listener added in a subsystem is removed by that subsystem on `dispose()`.

## Three.js r187 Specifics

- `renderer.setAnimationLoop` + clamped delta (`Math.min(dt, 0.1)`). No `THREE.Clock`.
- `THREE.PCFShadowMap` (not `PCFSoftShadowMap` — deprecated r186).
- `renderer.toneMapping = THREE.ACESFilmicToneMapping`.
- Canvas textures: `THREE.SRGBColorSpace`, anisotropy `Math.min(8, maxAniso)`.
- Cap `renderer.setPixelRatio(Math.min(devicePixelRatio, 2))`.

## Verification Before Any Commit

```bash
npx tsc --noEmit            # type check
npx vitest run              # unit tests (commerce, collision, storage)
npx playwright test         # golden tests (only for the milestone's scope)
```

All three must pass. Golden-test screenshots are reviewed visually against the milestone acceptance criteria in `docs/TASKS.md` — code passing is not enough; the render must be correct.

## AI-Generated Code Discipline

This project is AI-built; published analyses find AI-generated code carries ~1.7× more defects and ~2.74× more security vulnerabilities than human code. Therefore:

- **No network-fetched runtime code.** Three.js is vendored into the repo, pinned, and hash-verified — no CDN import maps without integrity.
- **No hand-rolled cryptography or HMAC** — payment webhooks (Phase P) use the gateway SDK's verification only.
- **Small reviewable diffs.** The single most effective defense against confident-but-wrong generated code.
- Multi-agent execution follows `docs/SWARM-EXECUTION.md`: parallelize reading, serialize writing, verify independently — verification agents never see the implementer's reasoning.

## Release Workflow (binding — user-mandated 2026-11-27)

These rules override any default workflow habit. They are permanent.

1. **Ask before every push.** No `git push`, no PR creation, no PR update without explicit user approval in the current conversation turn. Local commits are allowed; remote writes are not.
2. **One branch per milestone**, branched from `main`: `milestone/m0-engine-core`, `milestone/m1-architecture-culture`, … Never commit to `main` directly.
3. **One commit per milestone.** Interim commits on the milestone branch are fine, but the PR merges as a **single squash commit** — `main` history reads as exactly one commit per milestone, named after the milestone.
4. **CI gates every PR.** Every PR runs the GitHub Actions workflow (type check → unit tests → Playwright golden tests for the web pages). A PR is mergeable only when **every check is green**.
5. **Fix until green, then ask.** If any check fails, fix the root cause and re-run — iterating entirely inside the sandbox — until green. Only then ask the user for push/merge approval. Never merge red.
6. **Product focus order:** inventory management and checkout correctness are the core; product items UI/UX is the second priority; 3D asset quality serves both. Feature work is sequenced by that order.

## Git Discipline

- Branch and merge rules in **Release Workflow** above govern everything in this section.
- Small focused commits locally; no `git add -A` when unrelated files are dirty.
- Never commit secrets, generated screenshots of real users, or large binaries (budget: no file over 1 MB in git).
