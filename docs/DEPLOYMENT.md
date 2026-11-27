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

## Local preview

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

This mirrors the Pages environment (static file server, ES modules, import map) closely enough that if it works locally it works on Pages.
