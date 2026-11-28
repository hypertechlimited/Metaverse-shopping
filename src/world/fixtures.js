import * as THREE from 'three';
import { GONDOLA, OBSTACLES, RACK_TIERS } from './layout.js';
import { placedGeometry, mergedParts, addMergedMesh } from './merge.js';

export const FIXTURE_EXTRAS = {
  endCap: { minX: 1.15, maxX: 1.7, minZ: -4.4, maxZ: -3.6 },
  dumpBin: { x: 1.42, z: -1.9, radius: 0.35, height: 0.55, segments: 10 },
  basketStack: { x: 0.9, z: 2.53, y: 0.18, size: 0.42, height: 0.14, count: 4 },
  ceilingGrid: { y: 2.9, barThickness: 0.05, spanX: 1.2, spanZ: 1.4 },
};

const EXTRA_COLORS = {
  chatti: 0x9a6b3f,
  basket: 0xb91c1c,
  grid: 0xf5f5f4,
};

/** @typedef {{ name: string, minX: number, maxX: number, minZ: number, maxZ: number }} Box */

/**
 * Pure AABB layout of every fixture extra kind — collision truth lives in
 * layout.js OBSTACLES; these extras are prop-class (walk-through) or overhead,
 * and the unit tests assert they never intersect an OBSTACLES box.
 * @param {import('./fixtureStyles.js').FixtureStyleName} style
 * @param {Record<import('./fixtureStyles.js').FixtureStyleName, import('./fixtureStyles.js').FixtureTokens>} styles
 * @returns {Array<{ kind: string, box: Box }>}
 */
export function fixtureExtraBoxes(style, styles) {
  const extras = styles[style].extras;
  /** @type {Array<{ kind: string, box: Box }>} */
  const out = [];
  if (extras.endCap) {
    const cap = FIXTURE_EXTRAS.endCap;
    out.push({ kind: 'endCap', box: { name: 'Fixture End Cap', ...cap } });
  }
  if (extras.dumpBin) {
    const bin = FIXTURE_EXTRAS.dumpBin;
    out.push({
      kind: 'dumpBin',
      box: { name: 'Fixture Dump Bin', minX: bin.x - bin.radius, maxX: bin.x + bin.radius, minZ: bin.z - bin.radius, maxZ: bin.z + bin.radius },
    });
  }
  if (extras.basketStack) {
    const stack = FIXTURE_EXTRAS.basketStack;
    const half = stack.size / 2;
    out.push({
      kind: 'basketStack',
      box: { name: 'Fixture Basket Stack', minX: stack.x - half, maxX: stack.x + half, minZ: stack.z - half, maxZ: stack.z + half },
    });
  }
  return out;
}

/** @param {import('./fixtureStyles.js').FixtureStyleName} style @param {Record<import('./fixtureStyles.js').FixtureStyleName, import('./fixtureStyles.js').FixtureTokens>} styles @returns {Array<{ kind: string, box: Box }>} */
export function obstructedExtraBoxes(style, styles) {
  return fixtureExtraBoxes(style, styles).filter((entry) =>
    OBSTACLES.some((box) => entry.box.minX < box.maxX && entry.box.maxX > box.minX && entry.box.minZ < box.maxZ && entry.box.maxZ > box.minZ),
  );
}

/**
 * @param {THREE.Scene} scene
 * @param {import('./fixtureStyles.js').FixtureTokens} tokens
 * @returns {{ dispose: () => void }}
 */
export function applyFixtureStyle(scene, tokens) {
  // Extras skip the shadow pass so the 88 draw-call budget holds with all
  // five supermart meshes live (83 base + 5 extras, one call each).
  const gondola = /** @type {THREE.Mesh | null} */ (scene.getObjectByName('gondola'));
  const counter = /** @type {THREE.Mesh | null} */ (scene.getObjectByName('counter-top'));
  if (gondola instanceof THREE.Mesh && gondola.material instanceof THREE.MeshStandardMaterial) {
    gondola.material.color.setHex(tokens.gondolaColor);
    gondola.material.roughness = tokens.gondolaRoughness;
  }
  if (counter instanceof THREE.Mesh && counter.material instanceof THREE.MeshStandardMaterial) {
    counter.material.color.setHex(tokens.counterTopColor);
    counter.material.roughness = tokens.counterTopRoughness;
  }

  /** @type {THREE.Mesh[]} */
  const extras = [];
  const build = (/** @type {string} */ name, /** @type {THREE.BufferGeometry} */ geometry, /** @type {THREE.Material} */ material) => {
    extras.push(addMergedMesh(scene, geometry, material, { name, castShadow: false }));
  };

  if (tokens.ledIntensity > 0) {
    const ledMaterial = new THREE.MeshStandardMaterial({
      color: 0x111418,
      emissive: tokens.ledColor,
      emissiveIntensity: tokens.ledIntensity,
    });
    build('fixture-led', mergedParts(ledStripParts()), ledMaterial);
  }
  if (tokens.extras.endCap) {
    const capMaterial = new THREE.MeshStandardMaterial({ color: tokens.gondolaColor, roughness: tokens.gondolaRoughness });
    build('fixture-endcap', mergedParts(endCapParts()), capMaterial);
  }
  if (tokens.extras.dumpBin) {
    const chattiMaterial = new THREE.MeshStandardMaterial({ color: EXTRA_COLORS.chatti, roughness: 0.85 });
    build('fixture-chatti', mergedParts(dumpBinParts()), chattiMaterial);
  }
  if (tokens.extras.basketStack) {
    const basketMaterial = new THREE.MeshStandardMaterial({ color: EXTRA_COLORS.basket, roughness: 0.55 });
    build('fixture-baskets', mergedParts(basketParts()), basketMaterial);
  }
  if (tokens.extras.ceilingGrid) {
    const gridMaterial = new THREE.MeshStandardMaterial({ color: EXTRA_COLORS.grid, roughness: 0.6, metalness: 0.2 });
    build('fixture-grid', mergedParts(ceilingGridParts()), gridMaterial);
  }

  return {
    dispose() {
      for (const mesh of extras) {
        scene.remove(mesh);
        mesh.geometry.dispose();
        const material = mesh.material;
        if (material instanceof THREE.Material) material.dispose();
      }
      extras.length = 0;
    },
  };
}

/** @returns {THREE.BufferGeometry[]} */
function ledStripParts() {
  const rack = OBSTACLES.find((box) => box.name === 'Back Shelf Rack');
  const tiers = RACK_TIERS['Back Rack'];
  if (!rack || !tiers) throw new Error('layout.js must define the Back Shelf Rack and tiers');
  const boardFrontZ = rack.minZ + 0.03 + GONDOLA.boardDepth;
  /** @type {THREE.BufferGeometry[]} */
  const parts = [];
  for (const tierY of Object.values(tiers)) {
    parts.push(placedGeometry(
      new THREE.BoxGeometry(rack.maxX - rack.minX - GONDOLA.uprightWidth * 2, 0.015, 0.02),
      { position: [(rack.minX + rack.maxX) / 2, tierY - 0.002, boardFrontZ + 0.02] },
    ));
  }
  return parts;
}

/** @returns {THREE.BufferGeometry[]} */
function endCapParts() {
  const cap = FIXTURE_EXTRAS.endCap;
  const tiers = RACK_TIERS['Back Rack'];
  if (!tiers) throw new Error('layout.js must define Back Rack tiers');
  const width = cap.maxX - cap.minX;
  const centerX = (cap.minX + cap.maxX) / 2;
  /** @type {THREE.BufferGeometry[]} */
  const parts = [];
  for (const tierY of Object.values(tiers)) {
    parts.push(placedGeometry(
      new THREE.BoxGeometry(width, GONDOLA.boardThickness, GONDOLA.boardDepth),
      { position: [centerX, tierY - GONDOLA.boardThickness / 2, (cap.minZ + cap.maxZ) / 2] },
    ));
  }
  for (const z of [cap.minZ + GONDOLA.uprightWidth / 2, cap.maxZ - GONDOLA.uprightWidth / 2]) {
    parts.push(placedGeometry(
      new THREE.BoxGeometry(width, GONDOLA.topY + GONDOLA.lipHeight, GONDOLA.uprightWidth),
      { position: [centerX, (GONDOLA.topY + GONDOLA.lipHeight) / 2, z] },
    ));
  }
  return parts;
}

/** @returns {THREE.BufferGeometry[]} */
function dumpBinParts() {
  const bin = FIXTURE_EXTRAS.dumpBin;
  const wall = new THREE.CylinderGeometry(bin.radius, bin.radius * 0.92, bin.height, bin.segments, 1, true);
  const bottom = new THREE.CylinderGeometry(bin.radius * 0.92, bin.radius * 0.92, 0.04, bin.segments);
  return [
    placedGeometry(wall, { position: [bin.x, bin.height / 2, bin.z] }),
    placedGeometry(bottom, { position: [bin.x, 0.02, bin.z] }),
  ];
}

/** @returns {THREE.BufferGeometry[]} */
function basketParts() {
  const stack = FIXTURE_EXTRAS.basketStack;
  /** @type {THREE.BufferGeometry[]} */
  const parts = [];
  for (let i = 0; i < stack.count; i++) {
    const taper = 1 - i * 0.03;
    parts.push(placedGeometry(
      new THREE.BoxGeometry(stack.size * taper, stack.height, stack.size * taper),
      { position: [stack.x + (i % 2 === 0 ? 0 : 0.02), stack.y + stack.height / 2 + i * (stack.height + 0.015), stack.z + (i % 2 === 0 ? 0 : 0.015)] },
    ));
  }
  return parts;
}

/** @returns {THREE.BufferGeometry[]} */
function ceilingGridParts() {
  const grid = FIXTURE_EXTRAS.ceilingGrid;
  const interior = OBSTACLES.find((box) => box.name === 'Back Shelf Rack');
  const counter = OBSTACLES.find((box) => box.name === 'Wooden Counter');
  if (!interior || !counter) throw new Error('layout.js must define the rack and counter');
  const minX = interior.minX;
  const maxX = 1.7;
  const minZ = interior.minZ;
  const maxZ = counter.maxZ + 0.4;
  /** @type {THREE.BufferGeometry[]} */
  const parts = [];
  for (let x = minX; x <= maxX; x += grid.spanX) {
    parts.push(placedGeometry(
      new THREE.BoxGeometry(grid.barThickness, grid.barThickness, maxZ - minZ),
      { position: [x, grid.y, (minZ + maxZ) / 2] },
    ));
  }
  for (let z = minZ; z <= maxZ; z += grid.spanZ) {
    parts.push(placedGeometry(
      new THREE.BoxGeometry(maxX - minX, grid.barThickness, grid.barThickness),
      { position: [(minX + maxX) / 2, grid.y, z] },
    ));
  }
  return parts;
}
