import * as THREE from 'three';
import { makeArt, makeTexture, drawShaft } from './art.js';

export const ATMOSPHERE = {
  dustCountPerShaft: 150,
  dustDriftAmplitude: 0.14,
  dustSpeed: 0.4,
  shaftWidth: 4.2,
  shaftHeight: 2.55,
  tungstenColor: 0xffc36b,
  tungstenIntensity: 9,
  tungstenDistance: 9,
  tungstenPosition: /** @type {[number, number, number]} */ ([-0.8, 2.3, -1.2]),
  southShaft: { x: [-3.6, 0.4], y: [0.15, 2.4], z: [1.5, 1.9] },
  eastShaft: { x: [1.5, 1.9], y: [0.15, 2.4], z: [-3.6, 0.4] },
};

export const SHAFT_POSITIONS = {
  south: { position: [-1.6, ATMOSPHERE.shaftHeight / 2, 1.68], rotationY: 0 },
  east: { position: [1.68, ATMOSPHERE.shaftHeight / 2, -1.6], rotationY: Math.PI / 2 },
};

/** @param {number} count @param {number} seed @param {{ x: number[], y: number[], z: number[] }} volume @returns {Float32Array} */
export function dustSeedPositions(count, seed, volume) {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const nx = Math.abs(Math.sin(i * 12.9898 + seed) * 43758.5453) % 1;
    const ny = Math.abs(Math.sin(i * 78.233 + seed) * 43758.5453) % 1;
    const nz = Math.abs(Math.sin(i * 37.719 + seed) * 43758.5453) % 1;
    positions[i * 3] = volume.x[0] + nx * (volume.x[1] - volume.x[0]);
    positions[i * 3 + 1] = volume.y[0] + ny * (volume.y[1] - volume.y[0]);
    positions[i * 3 + 2] = volume.z[0] + nz * (volume.z[1] - volume.z[0]);
  }
  return positions;
}

/** @param {THREE.Scene} scene @param {THREE.WebGLRenderer} renderer @param {{ reducedMotion?: boolean }} [options] */
export function buildAtmosphere(scene, renderer, options = {}) {
  const reducedMotion = options.reducedMotion === true;

  const shaftTexture = makeTexture(makeArt(128, 256, drawShaft), renderer);
  const shaftMaterial = new THREE.MeshBasicMaterial({
    map: shaftTexture,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const shaftGeometry = new THREE.PlaneGeometry(ATMOSPHERE.shaftWidth, ATMOSPHERE.shaftHeight);
  for (const shaft of Object.values(SHAFT_POSITIONS)) {
    const plane = new THREE.Mesh(shaftGeometry, shaftMaterial);
    plane.position.set(shaft.position[0], shaft.position[1], shaft.position[2]);
    plane.rotation.y = shaft.rotationY;
    scene.add(plane);
  }

  const tungsten = new THREE.PointLight(
    ATMOSPHERE.tungstenColor,
    ATMOSPHERE.tungstenIntensity,
    ATMOSPHERE.tungstenDistance,
    2,
  );
  tungsten.position.set(...ATMOSPHERE.tungstenPosition);
  scene.add(tungsten);

  const southDust = dustSeedPositions(ATMOSPHERE.dustCountPerShaft, 5.2, ATMOSPHERE.southShaft);
  const eastDust = dustSeedPositions(ATMOSPHERE.dustCountPerShaft, 9.7, ATMOSPHERE.eastShaft);
  const dustGeometry = new THREE.BufferGeometry();
  const dustPositions = new Float32Array(southDust.length + eastDust.length);
  dustPositions.set(southDust, 0);
  dustPositions.set(eastDust, southDust.length);
  dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
  const dust = new THREE.Points(
    dustGeometry,
    new THREE.PointsMaterial({
      color: 0xffe2a8,
      size: 0.02,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    }),
  );
  scene.add(dust);

  /** @param {number} t seconds */
  function update(t) {
    if (reducedMotion) return;
    const positions = dust.geometry.getAttribute('position');
    for (let i = 0; i < positions.count; i++) {
      const phase = i * 0.61;
      positions.array[i * 3] += Math.sin(t * ATMOSPHERE.dustSpeed + phase) * 0.0006;
      positions.array[i * 3 + 1] += Math.cos(t * ATMOSPHERE.dustSpeed * 0.7 + phase) * 0.0004;
      positions.array[i * 3 + 2] += Math.cos(t * ATMOSPHERE.dustSpeed * 0.9 + phase * 1.3) * 0.0006;
    }
    positions.needsUpdate = true;
  }

  return { update };
}
