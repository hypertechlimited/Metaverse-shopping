import * as THREE from 'three';
import { OBSTACLES } from './layout.js';
import { ARCHITECTURE } from './architecture.js';
import { makeArt, makeTexture, drawSky, drawContactAO } from './art.js';

export const THEME = {
  exposure: 1.05,
  fogColor: 0xd9b183,
  fogDensity: 0.022,
  environmentIntensity: 0.5,
  skyWidth: 1024,
  skyHeight: 512,
  hemisphere: { sky: 0xe8cfa8, ground: 0x6b3a24, intensity: 0.65 },
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

/** @param {THREE.Scene} scene @param {THREE.WebGLRenderer} renderer @returns {{ dispose: () => void }} */
export function buildTheme(scene, renderer) {
  renderer.toneMappingExposure = THEME.exposure;

  const skyTexture = makeTexture(makeArt(THEME.skyWidth, THEME.skyHeight, drawSky), renderer);
  skyTexture.mapping = THREE.EquirectangularReflectionMapping;
  scene.background = skyTexture;
  scene.fog = new THREE.FogExp2(THEME.fogColor, THEME.fogDensity);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envMap = pmrem.fromEquirectangular(skyTexture).texture;
  scene.environment = envMap;
  scene.environmentIntensity = THEME.environmentIntensity;
  pmrem.dispose();

  const hemisphere = new THREE.HemisphereLight(THEME.hemisphere.sky, THEME.hemisphere.ground, THEME.hemisphere.intensity);
  scene.add(hemisphere);

  const sun = new THREE.DirectionalLight(THEME.sun.color, THEME.sun.intensity);
  sun.position.set(...THEME.sun.position);
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
  /** @type {THREE.Mesh[]} */
  const decals = [];
  for (const decal of contactDecals()) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(decal.width, decal.depth), aoMaterial);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(decal.x, THEME.contact.y, decal.z);
    mesh.renderOrder = THEME.contact.renderOrder;
    scene.add(mesh);
    decals.push(mesh);
  }

  return {
    dispose() {
      for (const mesh of decals) {
        mesh.geometry.dispose();
        scene.remove(mesh);
      }
      aoMaterial.dispose();
      aoTexture.dispose();
      scene.remove(hemisphere, sun, sun.target);
      scene.environment = null;
      scene.background = null;
      scene.fog = null;
      envMap.dispose();
      skyTexture.dispose();
    },
  };
}
