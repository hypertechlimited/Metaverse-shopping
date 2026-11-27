import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { OBSTACLES } from './layout.js';
import { makeArt, makeTexture, drawBurlap, drawQrPattern } from './art.js';

export const PROPS = {
  counterTopHeight: 1.07,
  jar: { radii: [0.13, 0.16, 0.14, 0.09, 0.11, 0.09], heights: [0.01, 0.08, 0.18, 0.26, 0.3, 0.33], scales: [1.0, 0.78, 0.62] },
  scale: { baseRadius: 0.09, baseHeight: 0.022, rodHeight: 0.36, beamLength: 0.36, panRadius: 0.05, panHeight: 0.012, hangDrop: 0.07 },
  sack: { radii: [0.01, 0.22, 0.26, 0.24, 0.13, 0.07, 0.075], heights: [0, 0.02, 0.12, 0.26, 0.34, 0.4, 0.44], tilt: 0.18 },
  glass: { radius: 0.035, height: 0.095, teaHeight: 0.055 },
  qr: { width: 0.13, height: 0.19, thickness: 0.016, tilt: -0.32 },
  colors: {
    brass: 0xb08d3e,
    glaze: 0x8a3b22,
    glass: 0xd8e4e0,
    tea: 0xc07a2a,
    card: 0xf5f2ea,
  },
};

const PROP_NAMES = ['jar-large', 'jar-medium', 'jar-small', 'balance-scale', 'chiya-glass', 'qr-stand'];

/**
 * Pure prop layout derived from layout.js OBSTACLES — every prop sits on a named base box.
 * @returns {Array<{ name: string, position: [number, number, number], base: string }>}
 */
export function propPlacements() {
  const counter = OBSTACLES.find((box) => box.name === 'Wooden Counter');
  if (!counter) throw new Error('layout.js must define the wooden counter');
  const top = PROPS.counterTopHeight;
  const midZ = (counter.minZ + counter.maxZ) / 2;
  return [
    { name: 'jar-large', position: [counter.minX + 0.55, top, counter.minZ + 0.62], base: 'Wooden Counter' },
    { name: 'jar-medium', position: [counter.minX + 1.1, top, counter.maxZ - 0.42], base: 'Wooden Counter' },
    { name: 'jar-small', position: [counter.maxX - 0.92, top, midZ], base: 'Wooden Counter' },
    { name: 'balance-scale', position: [counter.maxX - 0.42, top, counter.maxZ - 0.38], base: 'Wooden Counter' },
    { name: 'chiya-glass', position: [counter.minX + 1.85, top, midZ + 0.08], base: 'Wooden Counter' },
    { name: 'qr-stand', position: [counter.maxX - 0.22, top, counter.minZ + 0.3], base: 'Wooden Counter' },
  ];
}

/**
 * Sack line on the east pedi, derived from the Back Brick Wall box + pedi depth.
 * @returns {Array<{ name: string, position: [number, number, number], scale: number, lean: number }>}
 */
export function sackPlacements() {
  const back = OBSTACLES.find((box) => box.name === 'Back Brick Wall');
  if (!back) throw new Error('layout.js must define the back wall');
  const x = back.maxX + 0.28;
  return [
    { name: 'sack-a', position: [x, 0.18, 1.42], scale: 1.0, lean: PROPS.sack.tilt },
    { name: 'sack-b', position: [x, 0.18, 0.86], scale: 0.88, lean: -PROPS.sack.tilt * 0.7 },
    { name: 'sack-c', position: [x - 0.05, 0.18 + 0.3, 1.14], scale: 0.62, lean: PROPS.sack.tilt * 1.4 },
  ];
}

/** @param {Array<[number, number]>} radiiHeights @param {number} scale @param {number} leanZ @param {[number, number, number]} position @returns {THREE.BufferGeometry} */
function placedLathe(radiiHeights, scale, leanZ, position) {
  const geometry = new THREE.LatheGeometry(
    radiiHeights.map(([radius, height]) => new THREE.Vector2(radius, height)),
    14,
  );
  geometry.rotateZ(leanZ);
  geometry.scale(scale, scale, scale);
  geometry.translate(position[0], position[1], position[2]);
  return geometry;
}

/** @param {THREE.BufferGeometry[]} parts @returns {THREE.BufferGeometry} */
function mergedOrThrow(parts) {
  const merged = mergeGeometries(parts);
  if (!merged) throw new Error('prop geometry merge failed');
  return merged;
}

/** @returns {THREE.BufferGeometry} */
function balanceScaleGeometry() {
  const spec = PROPS.scale;
  const parts = [
    new THREE.CylinderGeometry(spec.baseRadius, spec.baseRadius * 1.15, spec.baseHeight, 12).translate(0, spec.baseHeight / 2, 0),
    new THREE.CylinderGeometry(0.008, 0.008, spec.rodHeight, 8).translate(0, spec.rodHeight / 2, 0),
    new THREE.BoxGeometry(spec.beamLength, 0.012, 0.012).translate(0, spec.rodHeight, 0),
  ];
  for (const side of [-1, 1]) {
    parts.push(
      new THREE.CylinderGeometry(0.0025, 0.0025, spec.hangDrop, 6).translate(side * spec.beamLength / 2, spec.rodHeight - spec.hangDrop / 2, 0),
    );
    parts.push(
      new THREE.CylinderGeometry(spec.panRadius, spec.panRadius * 0.7, spec.panHeight, 12).translate(
        side * spec.beamLength / 2,
        spec.rodHeight - spec.hangDrop - spec.panHeight / 2,
        0,
      ),
    );
  }
  return mergedOrThrow(parts);
}

/** @param {number} scale @returns {THREE.BufferGeometry} */
function jarGeometry(scale) {
  const { radii, heights } = PROPS.jar;
  const profile = /** @type {Array<[number, number]>} */ (radii.map((radius, index) => [radius, heights[index]]));
  profile.push([radii[radii.length - 1] * 1.15, heights[heights.length - 1] + 0.02]);
  return placedLathe(profile, scale, 0, [0, 0, 0]);
}

/** @param {number} scale @param {number} lean @param {[number, number, number]} position @returns {THREE.BufferGeometry} */
function sackGeometry(scale, lean, position) {
  const { radii, heights } = PROPS.sack;
  const profile = /** @type {Array<[number, number]>} */ (radii.map((radius, index) => [radius, heights[index]]));
  return placedLathe(profile, scale, lean, position);
}

/**
 * Counter and pedi props per references 02/03: jars, brass balance scale, chiya glass,
 * QR stand, burlap sacks. Same-material parts are merged into single draw calls.
 * @param {THREE.Scene} scene @param {THREE.WebGLRenderer} renderer @returns {{ drawCallBudget: number }}
 */
export function buildProps(scene, renderer) {
  const brassMaterial = new THREE.MeshStandardMaterial({ color: PROPS.colors.brass, metalness: 0.85, roughness: 0.35 });
  const glazeMaterial = new THREE.MeshStandardMaterial({ color: PROPS.colors.glaze, roughness: 0.32 });
  const glassMaterial = new THREE.MeshStandardMaterial({
    color: PROPS.colors.glass,
    roughness: 0.08,
    transparent: true,
    opacity: 0.35,
  });
  const teaMaterial = new THREE.MeshStandardMaterial({ color: PROPS.colors.tea, roughness: 0.2 });
  const cardMaterial = new THREE.MeshStandardMaterial({ color: PROPS.colors.card, roughness: 0.85 });
  const qrMaterial = new THREE.MeshStandardMaterial({ map: makeTexture(makeArt(128, 128, drawQrPattern), renderer), roughness: 0.8 });
  const burlapMaterial = new THREE.MeshStandardMaterial({ map: makeTexture(makeArt(256, 256, drawBurlap), renderer), roughness: 0.95 });

  const placements = propPlacements();
  const byName = new Map(placements.map((placement) => [placement.name, placement]));

  const jarGeometries = PROPS.jar.scales.map((scale) => jarGeometry(scale));
  const jars = new THREE.Mesh(mergedOrThrow(jarGeometries), glazeMaterial);
  jars.castShadow = true;
  scene.add(jars);

  const scalePlacement = /** @type {{ position: [number, number, number] }} */ (byName.get('balance-scale'));
  const balanceScale = new THREE.Mesh(balanceScaleGeometry(), brassMaterial);
  balanceScale.position.set(...scalePlacement.position);
  balanceScale.castShadow = true;
  scene.add(balanceScale);

  const glassPlacement = /** @type {{ position: [number, number, number] }} */ (byName.get('chiya-glass'));
  const glass = new THREE.Mesh(
    new THREE.CylinderGeometry(PROPS.glass.radius, PROPS.glass.radius * 0.92, PROPS.glass.height, 12),
    glassMaterial,
  );
  glass.position.set(glassPlacement.position[0], glassPlacement.position[1] + PROPS.glass.height / 2, glassPlacement.position[2]);
  const tea = new THREE.Mesh(
    new THREE.CylinderGeometry(PROPS.glass.radius * 0.85, PROPS.glass.radius * 0.8, PROPS.glass.teaHeight, 12),
    teaMaterial,
  );
  tea.position.set(glassPlacement.position[0], glassPlacement.position[1] + PROPS.glass.teaHeight / 2 + 0.012, glassPlacement.position[2]);
  scene.add(glass, tea);

  const qrPlacement = /** @type {{ position: [number, number, number] }} */ (byName.get('qr-stand'));
  const card = new THREE.Mesh(
    new THREE.BoxGeometry(PROPS.qr.thickness, PROPS.qr.height, PROPS.qr.width),
    cardMaterial,
  );
  card.position.set(...qrPlacement.position);
  card.rotation.z = PROPS.qr.tilt;
  card.castShadow = true;
  const qrFace = new THREE.Mesh(new THREE.PlaneGeometry(PROPS.qr.width * 0.82, PROPS.qr.width * 0.82), qrMaterial);
  qrFace.position.set(
    qrPlacement.position[0] + Math.sin(-PROPS.qr.tilt) * PROPS.qr.thickness,
    qrPlacement.position[1] + PROPS.qr.height / 2 + Math.cos(-PROPS.qr.tilt) * 0.02,
    qrPlacement.position[2],
  );
  qrFace.rotation.z = PROPS.qr.tilt;
  qrFace.rotation.y = Math.PI;
  scene.add(card, qrFace);

  const placements2 = sackPlacements();
  const sackGeometries = placements2.map((sack) => sackGeometry(sack.scale, sack.lean, sack.position));
  const sacks = new THREE.Mesh(mergedOrThrow(sackGeometries), burlapMaterial);
  sacks.castShadow = true;
  scene.add(sacks);

  return { drawCallBudget: 7 };
}

export { PROP_NAMES };
