# Reference Prompt Library — Black Forest API (versioned)

Regeneration rule: run these prompts verbatim through the image generation tool; review against the gate checklist below before treating output as binding. Generated URLs are ephemeral (signed, ~1 h) — the durable artifact is this file.

## 01 — Pasal exterior, golden hour (architecture master)

```text
Photorealistic cinematic architectural photograph of a traditional Nepali corner kirana
pasal (small grocery shop) at the intersection of two narrow cobblestone alleys in Patan,
Lalitpur, Nepal. Warm terracotta red-orange Newari brick masonry facade with visible shade
variance between brick courses, dark carved timber windows on the upper story, dark wooden
corner pillar supporting two open perpendicular shopfronts, sloped corrugated zinc sheet
awning extending over both sidewalks, rolled-up teal painted steel shutter housing above
the openings, elevated stone plinth step at the corner, crimson and golden-yellow
hand-painted shop board with Devanagari lettering, orange marigold garland draped across
the entrance, string of colorful Tibetan prayer flags strung diagonally across the street
overhead. Golden hour sunlight raking across the brick, deep soft shadows, subtle
atmospheric haze in the alley, film grain, 35mm lens, shallow depth of field, National
Geographic style
```

## 02 — Pasale Dai character sheet

```text
Photorealistic cinematic portrait of a middle-aged Nepali shopkeeper (pasale) standing
behind a dark wooden shop counter in a small corner grocery store in Kathmandu Valley,
Nepal. He wears a traditional patterned Dhaka topi hat and a plain kurta, warm friendly
expression, hands resting on the counter. On the counter: a brass weighing scale, small
glass jars of candy, a paper QR code payment stand, a steaming glass cup of milk tea.
Behind him a wooden three-tier shelf stocked with rice sacks, lentil bags, cooking oil
tins, biscuit packets and tea boxes. Warm flickering light from a small clay oil lamp
(diyo) on the counter, soft window daylight from the open shopfront behind camera,
terracotta brick wall background, shallow depth of field, 50mm lens, cinematic color
grade, film grain
```

## 03 — Interior merchandising (four-zone truth)

```text
Photorealistic cinematic interior photograph of a Nepali corner grocery shop (kirana
pasal) merchandising, eye-level view across the shop floor. Front: open burlap jute sacks
of white rice, yellow lentils (dal), and white sugar displayed on a raised stone plinth
step with small metal scoops. Left: a wooden three-tier display rack against a terracotta
Newari brick wall holding tea boxes, flour bags, salt pouches, mustard oil tins, ghee
tins, spice boxes, instant noodle packets hanging in bunches, glass jars of tamarind
snacks. Warm tungsten shop lighting mixed with cool daylight spilling from the open
street entrance, dust motes in the light shaft, worn dark timber counter in the
foreground, cobblestone alley visible outside, cinematic color grade, 35mm lens, film
grain, National Geographic documentary style
```

## 04 — Galli dusk lighting mood (cinematic target)

```text
Photorealistic cinematic night photograph of a narrow cobblestone alley street corner in
Patan, Nepal, during blue hour after rain. Wet reflective cobblestones, a small corner
grocery shop glowing with warm interior tungsten light spilling onto the street, a
flickering clay oil lamp (diyo) burning on the stone step at the corner, orange marigold
garland over the doorway, colorful prayer flags strung overhead catching the last blue
light, distant temple roofline silhouette, deep blue dusk sky, warm-cool color contrast,
volumetric light in the moist air, reflections in puddles, film grain, 35mm anamorphic
feel, moody atmospheric cinematic grade
```

## Review gate (before a generation becomes binding)

- [ ] No Devanagari gibberish on signage (artifact check — if present, regenerate; signage text must be added via engine texture, never trusted to the model)
- [ ] No hand/face anatomy artifacts on the character sheet
- [ ] Palette within tolerance of `GUIDELINES.md` tokens (brick `#8f3b26`, timber `#452719`, zinc `#0369a1`, teal `#0f766e`, crimson `#991b1b`, gold `#fbbf24`)
- [ ] Cultural accuracy: two perpendicular open fronts, corner pillar, pedi step, toran above eye level
- [ ] Cinematic intent: single readable light direction, warm/cool separation, depth layering
