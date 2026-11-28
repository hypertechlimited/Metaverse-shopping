# Deployment — GitHub Pages

## How it works

- **Trigger:** every merge to `main` (PR squash-merge, per the release workflow) runs `.github/workflows/deploy.yml` and publishes the repository root as the live site. `workflow_dispatch` allows manual redeploys.
- **URL:** https://hypertechlimited.github.io/Metaverse-shopping/
- **Site = repository root:** `index.html` + `src/` + `vendor/` are served statically. There is no build step — that is deliberate (zero build, zero runtime network dependencies).

## Rules that keep Pages working

1. **All runtime paths stay relative** (`./vendor/...`, `./src/...`). Project Pages serves under the `/Metaverse-shopping/` subpath; any absolute path would 404. Do not introduce bundler-absolute or root-absolute references.
2. **No new runtime assets fetched from the network** — art is procedural (`makeArt`); the only vendor file is `vendor/three/`. A merge that violates this breaks the offline guarantee and 4G loads.
3. **The site deploys only from `main`** — never from milestone branches. Branches are verified by the `CI` workflow first (typecheck → unit → golden), then squash-merged by the maintainer, then deployed automatically.
4. **Payload budget applies to the deploy artifact** (≤ 5 MB total). The vendored Three.js files (~2.1 MB raw) are included in that budget.

## Offline & PWA (M5.5)

The site is an installable, offline-capable PWA. Three root files own this:

- **`manifest.webmanifest`** — standalone display, `lang: ne`, `start_url`/`scope` `./` (relative, so the Pages subpath keeps working), theme `#8f3b26`, icon `icon.svg` (`sizes: any`, SVG only).
- **`sw.js`** — cache `sagarmatha-v1`. Install precaches the shell (`./`, `index.html`, `styles.css`, manifest, icon). Navigations are **network-first** with the cached shell as offline fallback; every other same-origin GET is **stale-while-revalidate**. Cross-origin and non-GET requests pass through untouched.
- **`engine/pwa.js`** — registers the worker at scope `./` and fails soft (no SW API, insecure context, rejected registration → the app simply runs online). A same-session `controllerchange` fires a one-shot update toast telling the visitor to reload.

**Cache-version rule:** any change to the shell file set, or any breaking change to cached asset contents, must bump the `CACHE` constant (`sagarmatha-v1` → `-v2`, …) in `sw.js`. The activate handler deletes old caches, so a bump is the whole migration. The unit suite (`tests/unit/pwa.test.js`) cross-checks manifest, `index.html` links, and the SW shell list so they cannot drift apart.

**Telemetry on devices (no backend):** `engine/inp.js` tracks worst interaction latency (budget `INP_BUDGET_MS 200`) and `engine/telemetry.js` keeps a bounded client error queue — both readable via `?debug=1` (HUD `INP`/`ERR` rows) and on the `window.__sagarmatha` handle. Phase S will give these a hosted drain target; the capture contract stays as-is.

## Local preview

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

This mirrors the Pages environment (static file server, ES modules, import map) closely enough that if it works locally it works on Pages.
