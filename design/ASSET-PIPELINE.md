# Asset Pipeline — Photoreal Mockups & Cinematic In-Engine Realism

Two tracks. Both exist to make the *engine render* more realistic — the photoreal images never ship in the app (zero-network rule at runtime).

```
Track R (Reference)                 Track E (Engine)
AI photoreal mockups                Three.js r187 scene realism
Black Forest API, design-time only  procedural, in-app, budget-bound
      │                                   │
      ├── binding palette/material        ├── makeArt() textures read the
      │   decisions downstream            │   reference palette + values
      ├── character sheet for NPC         ├── 3-point cinematic light rig
      │   proportions & clothing          ├── procedural bump/roughness maps
      └── mood/lighting target for        ├── atmosphere: fog, dust, light
          golden screenshot A/B review    │   shaft, ACES grade
                                      └── golden test: render vs. reference
```

## Track R — AI Photoreal References (design-time) ✅ **ALL 4 GENERATED & VISION-GATED (M2.5, 2026-11-27)**

Generated with the Black Forest API; exact prompts live in [`REFERENCE-PROMPTS.md`](REFERENCE-PROMPTS.md). Four mockups define the look:

| Reference | Role in the build |
|---|---|
| `01-pasal-exterior-golden-hour` | Architecture master: brick hue variance, timber/ zinc/ shutter colors, corner composition, marigold toran, prayer-flag line. M1 golden screenshots are A/B'd against it. |
| `02-pasale-dai-character` | Character sheet for the NPC: Dhaka topi pattern language, kurta, counter props (scale, jars, QR stand, chiya), diyo placement. Drives M4 NPC geometry and clothing colors. |
| `03-interior-merchandising` | Merchandising truth: sack display on the pedi, 3-tier rack contents, hanging noodle bunches, light shaft from the open front. Grounds the four-zone blueprint. |
| `04-galli-dusk-lighting-mood` | Cinematic lighting target: warm/cool contrast, wet-cobble reflection, diyo as the emotional light source. Defines the optional "dusk mode" lighting preset. |

Rules for Track R:
- References are **design-time artifacts committed to the repo** (`design/references/`), never fetched at runtime.
- Every prompt is versioned; regenerating must go through the prompt file (provenance + reproducibility).
- Review gate (same as golden tests): Devanagari text artifacts, hand/face artifacts, and palette drift are checked before a reference becomes binding.

## Track E — In-Engine Cinematic Realism (Three.js r187, zero dependencies)

### Lighting rig (the biggest realism lever)
1. **Key:** one directional "sun" (~3500 K warm, `#ffd9a0`), 2048² `PCFShadowMap`, low angle for long shadows across the cobblestones — matches reference 01.
2. **Fill:** hemisphere light (warm ground bounce `#8f3b26`-tinted below, cool sky above) — kills dead-black shadows without flattening.
3. **Emotion light:** the *diyo* — a flickering `PointLight` (warm ~2200 K, `decay 2` physical falloff) whose intensity follows layered sine noise, paired with an emissive flame sprite. This is the shop's soul; the flicker must be irregular (two sines + random walk), never a mechanical pulse.
4. **Rim/edge:** a dim cool directional from the street entrance so silhouettes of the *thaam* and sacks read against the dark interior — reference 04's warm/cool split.
5. **Grade:** `ACESFilmicToneMapping`, exposure tuned once against reference 01, then locked in `theme.js` (no per-scene tweaking drift).

### Materials & texture realism (all procedural via `makeArt`)
- **Brick:** per-course value variance + mortar lines, with a derived **bump map** (same canvas, grayscale) — light raking across it is what makes it read as masonry, not wallpaper.
- **Zinc awning:** corrugation via a repeating stripe canvas + anisotropic-ish roughness streaks; slight sag in geometry, not just texture.
- **Cobblestone galli:** individually drawn stones with per-stone hue/value jitter and a bump map; "wet dusk" variant darkens values and boosts specular (reference 04).
- **Fabric (toran, flags, awning):** canvas-drawn weave noise + vertex-level wind animation in the shader-independent update loop.

### Atmosphere
- Warm `FogExp2` tuned so the *galli* depth layers visually (near shop crisp, alley ends hazy).
- Dust motes: a small `Points` cloud in the light shaft from the open entrance (reference 03) — under 500 points, additive, cheap.
- Light shaft: a single additive semi-transparent cone/plane pair at the entrance; never a real volumetric (budget).

### People (realism through craft, not polycount)
- M0–M5 NPCs stay procedural: shaded capsule-limbs + tuned proportions from reference 02, Dhaka topi as real geometry (cylinder + brim), cloth-colored materials with subtle roughness variation. Realism comes from **lighting, silhouette, idle motion** (weight shift, counter-wiping animation), and the name-tag sprite treatment.
- Phase A replaces them with Draco-compressed glTF humanoids — the `userData.isNpc` contract and update signature already allow a drop-in swap.

### Performance guardrails (unchanged)
All of the above must hold ≤ 80 draw calls, ≤ 5 MB, ≥ 30 FPS mid-range Android. Dust motes and light shaft are the first things cut on the low-end profile.

### Track E status after M2.5 (Render & Presence Overhaul)
- **Sky + IBL:** procedural equirect golden-hour sky (`drawSky`) drives both `scene.background` and a `PMREMGenerator.fromEquirectangular` environment map (`world/theme.js`) — image-based ambient replaces the flat hemisphere-only look.
- **Grade:** ACES exposure locked at 1.05 in `THEME`; bloom (UnrealBloomPass, threshold 0.82, strength 0.32) behind a pixel-budget tier (`engine/post.js`) plus a zero-draw-call CSS vignette + grain overlay (`#film`).
- **Materials:** brick/cobble/zinc gained roughness maps (mortar rough vs fired brick, joint rough vs worn stone, ridge-polished vs rusty valley); cobble got per-stone hue families + large-scale dirt/dust blotches; lungta cloth got weave noise.
- **Contact:** baked radial-gradient AO decals under counter, pillar, thaam bases and along both pedi fronts (`contactDecals()` — pure, layout-derived).
- **Props:** counter jars, brass balance scale, chiya glass, QR stand, burlap sack line — merged same-material geometry, ≤ 7 draw calls (`world/props.js`, placements pure from `layout.js`).
- **Deferred:** dusk lighting preset (reference 04) stays behind the FPS budget until M5.

## Verification

- M1/M4 golden screenshots are compared **side-by-side against references 01/03** (Vision Reviewer role, per `docs/SWARM-EXECUTION.md`).
- Color budget check: rendered brick/timber/zinc hues sampled from the screenshot must fall within tolerance of the reference values.
- The dusk lighting preset (reference 04) is a camera/lighting preset only if the golden FPS budget still passes; otherwise it ships as a marketing still, not a runtime mode.
