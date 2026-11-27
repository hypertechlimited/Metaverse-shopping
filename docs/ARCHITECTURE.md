# Architecture — Sagarmatha Metaverse Corner Pasal

## Design Principles

1. **Own engine on Three.js.** Three.js is the renderer only. The engine layer (`src/engine/`) provides loop, input, collision, audio, storage, camera rig — no external game engine. The `three/examples` addon surface is **sanctioned as a closed, vendored set only** (M2.5): `postprocessing/` (EffectComposer, RenderPass, UnrealBloomPass, OutputPass + Pass/ShaderPass/MaskPass dependency closure), `shaders/` (CopyShader, LuminosityHighPassShader, OutputShader), and `utils/BufferGeometryUtils.js` — copied into `vendor/three/addons/`, SHA-256 recorded in `TASKS.md`, served via the `three/addons/` import map. Adding any further addon file is a doc-change-first decision, never an import-time convenience.
2. **Single canvas, two modes.** The whole app is one WebGL canvas. `storeEntered` (a store flag, not a DOM state) switches landing orbit vs. first-person exploration. DOM overlays sit above the canvas and never reload the page.
3. **One store, many subscribers.** The 2D HUD, the catalog drawer, the 3D shelf meshes, and the hover tooltips all read from one state store. A purchase updates once; every subscriber refreshes from the same event.
4. **Geometry truth lives in `layout.js`.** Shop dimensions, rack positions, counter bounds, obstacle AABBs, camera presets — all exported from one module and consumed by world builders and collision alike.

## Module Graph (dependencies point downward only)

```
index.html
  └─ main.js ─────────────► engine/loop.js (owns requestAnimationFrame via setAnimationLoop)
       │
       ├─ ui/*        ──►  engine/input.js        (keyboard, pointer, touch d-pad)
       │   │          ──►  store (state)           (single mutable tree + pub/sub)
       │   │          ──►  commerce/*              (pure logic: catalog, cart, pricing, bill)
       │   └─► world/* ─►  world/layout.js         (single source of geometric truth)
       │                └─ engine/collision.js     (reads OBSTACLES from layout.js)
       └─ engine/audio.js   (WebAudio bus; bell chord 528/792/1056 Hz, gesture-gated)
       └─ engine/storage.js (try/catch localStorage, schema key: sagarmatha_metaverse_v3)
```

Prohibited: `ui/` importing `world/` internals; `world/` importing `ui/`; anything in `commerce/` importing DOM or Three.js.

## Data Flow: Purchase

```
click "Add to Jhola" (ui/catalogDrawer)
  → cart.addItem(skuId, variantIdx)        [commerce/cart.js — pure, validates stock]
  → store.cart mutates → "change" event
      ├─ HUD cart badge updates
      ├─ catalog stock badge updates
      └─ world/products.js updates hover tooltip + stock badge sprite
checkout (ui/hud)
  → pricing.total(cart, { promo, qrUsed }) [commerce/pricing.js — pure]
  → cart.checkout() → atomic deduction in store.stockMap
  → storage.save(state)                     [engine/storage.js — try/catch]
  → bill.render(state)                      [commerce/bill.js — printable DOM receipt]
```

Atomicity rule: validation and deduction happen in one `cart.checkout()` call that either fully applies or fully rejects — never a partial stock write.

## Key Subsystems

### engine/loop.js
`renderer.setAnimationLoop(time => …)`; delta clamped to 0.1 s; fixed-step update (60 Hz) for movement/collision, per-frame render. Tab-blur → loop auto-pauses (browser behavior), no time-jumps because of the clamp.

### world/layout.js
Exports: `SHOP` (dimensions), `ZONES` (four merchandising zones with top-surface heights), `PRODUCT_SPOTS` (all 17 SKU positions, parity-tested against the catalog), `NPC_PATHS` + `PASALE_DAI_POSITION`, `OBSTACLES` (5 AABBs), `CAMERA_PRESETS`, `STREET`, spawn point. Collision `radius = 0.45` is a constant here.

### Zero-mutation picking
`input.js` tracks `pointerDownPos`; pointer travel > 6 px cancels selection (click-vs-drag guard). Each SKU gets one invisible proxy box (`MeshBasicMaterial({ visible: false })` — the vendored raycaster tests `layers`, not `visible`, so proxies stay pickable) tagged `userData.product = skuId`; NPCs get `userData.isNpc`/`npcId` proxies. Proxies are picked before anything else, so each SKU is one entity regardless of how its merged geometry is packed. Highlight = one reusable `THREE.BoxHelper.setFromObject(proxy)` in the gold token — never material mutation.

### Player & tour
`engine/collision.js` is pure circle-vs-AABB push-out (2 passes for corners) with sub-stepped moves (step ≤ radius/2, no tunneling) and street clamps. `engine/player.js` holds first-person state (position, yaw, eye height) and applies to the camera via the same duck-typed `apply` contract as `cameraRig`; preset flights hand off through `syncFrom`, which keeps the preset's eye height until the visitor actually moves (the Overview aerial pose survives until you walk). `engine/tour.js` cycles preset names with a dwell, requires the rig settled before advancing, and any drag cancels it.

### Procedural art (`makeArt`)
`makeArt(w, h, drawFn)` returns a canvas; `makeTexture(canvas)` binds it as `THREE.CanvasTexture` (sRGB, anisotropy-clamped) for 3D, and `canvas.toDataURL()` feeds the identical image into catalog drawer, inspector modal, cart rows, and the printable bill. One draw function, two consumers, zero network art.

### NPC & presence
`world/npc.js`: Pasale Dai (static, greets by name from store) + two neighbors on sine-wave paths with sprite nametags and step bobbing `Math.abs(Math.sin(t*6)) * 0.04`. Their update function is a pure `(t, pathSpec) → position` mapping so Phase S can replace the path source with live WebSocket data without touching rendering.

## Persistence Schema (`sagarmatha_metaverse_v3`)

```json
{
  "visitorName": "Aarav",
  "stockMap":  { "rice": 24, "ghee": 9 },
  "cartArr":   [ { "id": "rice", "vIdx": 2, "qty": 1 } ]
}
```

Read path: `storage.load()` → validate keys/types → merge defaults → return state. Corrupt or missing data silently resets to defaults (never throws, never blocks boot).

## Rendering Budget (enforced, see GUIDELINES.md)

≤ 80 draw calls, ≤ 5 MB total payload, one 2048×2048 directional shadow map, DPR ≤ 2.
