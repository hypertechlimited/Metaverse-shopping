import * as THREE from 'three';
import { OBSTACLES } from './layout.js';
import { ARCHITECTURE } from './architecture.js';
import { makeArt, makeTexture, drawSky, drawContactAO, DUSK_SKY_COLORS } from './art.js';
import { placedGeometry, mergedParts } from './merge.js';

export const THEME = {
  exposure: 1.08,
  fogColor: 0xd9b183,
  fogDensity: 0.02,
  environmentIntensity: 0.62,
  skyWidth: 1024,
  skyHeight: 512,
  hemisphere: { sky: 0xe8cfa8, ground: 0x6b3a24, intensity: 0.7 },
  sun: {
    color: 0xffd7a3,
    intensity: 2.6,
    position: /** @type {[number, number, number]} */ ([8, 10, 6]),
    shadowExtent: 7,
    shadowMapSize: 2048,
    shadowRadius: 3,
    shadowBias: -0.0001,
    shadowNormalBias: 0.02,
    shadowNear: 2,
    shadowFar: 32,
  },
  contact: { size: 256, opacity: 0.55, y: 0.004, renderOrder: 2, margin: 0.28, stripWidth: 0.56 },
};

/**
 * @typedef {Object} MoodConfig
 * @property {number} exposure
 * @property {number} fogColor
 * @property {number} fogDensity
 * @property {number} environmentIntensity
 * @property {{ sky: number, ground: number, intensity: number }} hemisphere
 * @property {{ color: number, intensity: number, position: [number, number, number] }} sun
 */

/** @type {Record<'day' | 'dusk', MoodConfig>} */
export const MOODS = {
  day: {
    exposure: THEME.exposure,
    fogColor: THEME.fogColor,
    fogDensity: THEME.fogDensity,
    environmentIntensity: THEME.environmentIntensity,
    hemisphere: THEME.hemisphere,
    sun: { color: THEME.sun.color, intensity: THEME.sun.intensity, position: THEME.sun.position },
  },
  dusk: {
    exposure: 1.0,
    fogColor: 0x51385e,
    fogDensity: 0.026,
    environmentIntensity: 0.5,
    hemisphere: { sky: 0x9a6fa0, ground: 0x40263c, intensity: 0.62 },
    sun: { color: 0xff9e66, intensity: 1.5, position: [9, 3.2, 10] },
  },
};

/** Shadow-extent guard: the directional frustum must cover the whole shop footprint. @param {number} extent @returns {boolean} */
export function shadowCoversShop(extent) {
  for (const box of OBSTACLES) {
    if (Math.abs(box.minX) > extent || Math.abs(box.maxX) > extent) return false;
    if (Math.abs(box.minZ) > extent || Math.abs(box.maxZ) > extent) return false;
  }
  return true;
}

/**
 * Pure decal layout: soft contact-occlusion patches derived from layout.js geometry.
 * @returns {Array<{ name: string, x: number, z: number, width: number, depth: number }>}
 */
export function contactDecals() {
  const margin = THEME.contact.margin * 2;
  const decals = [];
  for (const box of OBSTACLES) {
    if (box.name.includes('Wall')) continue;
    decals.push({
      name: box.name,
      x: (box.minX + box.maxX) / 2,
      z: (box.minZ + box.maxZ) / 2,
      width: box.maxX - box.minX + margin,
      depth: box.maxZ - box.minZ + margin,
    });
  }
  const back = OBSTACLES.find((box) => box.name === 'Back Brick Wall');
  const left = OBSTACLES.find((box) => box.name === 'Left Brick Wall');
  if (back && left) {
    const strip = THEME.contact.stripWidth;
    const depth = ARCHITECTURE.pediDepth;
    const eastZ = (back.minZ + left.maxZ + depth) / 2;
    const eastLength = left.maxZ + depth - back.minZ + margin;
    decals.push({ name: 'East Pedi', x: back.maxX + depth + strip / 2, z: eastZ, width: strip, depth: eastLength });
    const southX = (left.minX + back.maxX + depth) / 2;
    const southLength = back.maxX + depth - left.minX + margin;
    decals.push({ name: 'South Pedi', x: southX, z: left.maxZ + depth + strip / 2, width: southLength, depth: strip });
  }
  return decals;
}

/** @typedef {keyof typeof MOODS} MoodName */

/** @param {THREE.Scene} scene @param {THREE.WebGLRenderer} renderer @returns {{ setMood: (mood: MoodName) => boolean, setStyleLighting: (light: import('./fixtureStyles.js').FixtureTokens['light']) => boolean, dispose: () => void }} */
export function buildTheme(scene, renderer) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  /** @type {Record<MoodName, { texture: THREE.Texture, envMap: THREE.Texture }>} */
  const skies = {
    day: skyState(makeArt(THEME.skyWidth, THEME.skyHeight, drawSky)),
    dusk: skyState(makeArt(THEME.skyWidth, THEME.skyHeight, (ctx, w, h) => drawSky(ctx, w, h, DUSK_SKY_COLORS))),
  };
  pmrem.dispose();
  scene.fog = new THREE.FogExp2(MOODS.day.fogColor, MOODS.day.fogDensity);

  /** @param {HTMLCanvasElement} canvas @returns {{ texture: THREE.Texture, envMap: THREE.Texture }} */
  function skyState(canvas) {
    const texture = makeTexture(canvas, renderer);
    texture.mapping = THREE.EquirectangularReflectionMapping;
    return { texture, envMap: pmrem.fromEquirectangular(texture).texture };
  }

  const hemisphere = new THREE.HemisphereLight(MOODS.day.hemisphere.sky, MOODS.day.hemisphere.ground, MOODS.day.hemisphere.intensity);
  scene.add(hemisphere);

  const sun = new THREE.DirectionalLight(MOODS.day.sun.color, MOODS.day.sun.intensity);
  sun.position.set(...MOODS.day.sun.position);
  sun.castShadow = true;
  sun.shadow.mapSize.set(THEME.sun.shadowMapSize, THEME.sun.shadowMapSize);
  sun.shadow.camera.left = -THEME.sun.shadowExtent;
  sun.shadow.camera.right = THEME.sun.shadowExtent;
  sun.shadow.camera.top = THEME.sun.shadowExtent;
  sun.shadow.camera.bottom = -THEME.sun.shadowExtent;
  sun.shadow.camera.near = THEME.sun.shadowNear;
  sun.shadow.camera.far = THEME.sun.shadowFar;
  sun.shadow.radius = THEME.sun.shadowRadius;
  sun.shadow.bias = THEME.sun.shadowBias;
  sun.shadow.normalBias = THEME.sun.shadowNormalBias;
  scene.add(sun, sun.target);

  const aoTexture = makeTexture(makeArt(THEME.contact.size, THEME.contact.size, drawContactAO), renderer);
  const aoMaterial = new THREE.MeshBasicMaterial({
    map: aoTexture,
    transparent: true,
    opacity: THEME.contact.opacity,
    depthWrite: false,
  });
  const decalParts = contactDecals().map((decal) =>
    placedGeometry(new THREE.PlaneGeometry(decal.width, decal.depth), {
      position: [decal.x, THEME.contact.y, decal.z],
      rotation: [-Math.PI / 2, 0, 0],
    }),
  );
  const decalMesh = new THREE.Mesh(mergedParts(decalParts), aoMaterial);
  decalMesh.renderOrder = THEME.contact.renderOrder;
  scene.add(decalMesh);

  /** @type {MoodName} */
  let currentMood = 'day';
  /** @type {import('./fixtureStyles.js').FixtureTokens['light'] | null} */
  let styleOverlay = null;

  /** @param {import('./fixtureStyles.js').FixtureTokens['light']} light @returns {boolean} */
  function setStyleLighting(light) {
    styleOverlay = light;
    const config = MOODS[currentMood];
    if (!config) return false;
    return applyMood(config);
  }

  /** @param {MoodConfig} config @returns {boolean} */
  function applyMood(config) {
    renderer.toneMappingExposure = config.exposure + (styleOverlay?.exposureBoost ?? 0);
    scene.background = skies[currentMood].texture;
    scene.environment = skies[currentMood].envMap;
    scene.environmentIntensity = config.environmentIntensity;
    const fog = /** @type {THREE.FogExp2} */ (scene.fog);
    fog.color.set(config.fogColor);
    fog.density = config.fogDensity;
    hemisphere.color.set(styleOverlay?.hemisphereSky ?? config.hemisphere.sky);
    hemisphere.groundColor.set(config.hemisphere.ground);
    hemisphere.intensity = config.hemisphere.intensity;
    sun.color.set(styleOverlay?.sunColor ?? config.sun.color);
    sun.intensity = config.sun.intensity + (styleOverlay?.sunIntensityBoost ?? 0);
    sun.position.set(...config.sun.position);
    return true;
  }

  /** @param {MoodName} mood @returns {boolean} */
  function setMood(mood) {
    const config = MOODS[mood];
    if (!config) return false;
    currentMood = mood;
    return applyMood(config);
  }

  setMood('day');

  return {
    setMood,
    setStyleLighting,
    dispose() {
      decalMesh.geometry.dispose();
      scene.remove(decalMesh);
      aoMaterial.dispose();
      aoTexture.dispose();
      scene.remove(hemisphere, sun, sun.target);
      scene.environment = null;
      scene.background = null;
      scene.fog = null;
      for (const state of Object.values(skies)) {
        state.envMap.dispose();
        state.texture.dispose();
      }
    },
  };
}
