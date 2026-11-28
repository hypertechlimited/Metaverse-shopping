import * as THREE from 'three';
import { makeArt, makeTexture, drawAripana } from './art.js';
import { placedGeometry, mergedParts } from './merge.js';

export const MANDALA = {
  size: 1.8,
  petalCount: 8,
  dotRingCount: 28,
  ySouth: 0.006,
  yEast: 0.009,
  southPosition: [-1.4, 0, 2.45],
  eastPosition: [2.45, 0, -1.4],
};

export const MANDALA_RINGS = {
  outerRing: 0.94,
  innerRing: 0.86,
  dotRing: 0.76,
  petalCenter: 0.44,
  petalInnerRing: 0.2,
  oilCenter: 0.11,
};

/** @param {number} petalCount @returns {number[]} */
export function petalAngles(petalCount) {
  return Array.from({ length: petalCount }, (_, p) => (p / petalCount) * Math.PI * 2);
}

/** @returns {number[]} ascending ring radii, all within the unit disc */
export function ringRadii() {
  const values = Object.values(MANDALA_RINGS);
  for (let i = 1; i < values.length; i++) {
    if (values[i] >= values[i - 1]) throw new Error('aripana rings must strictly ascend');
  }
  return values;
}

/** @param {THREE.Scene} scene @param {THREE.WebGLRenderer} renderer */
export function buildAripana(scene, renderer) {
  const texture = makeTexture(makeArt(512, 512, (ctx, w, h) => drawAripana(ctx, w, h, MANDALA.petalCount)), renderer);
  const material = new THREE.MeshStandardMaterial({
    map: texture,
    transparent: true,
    roughness: 0.95,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
    depthWrite: false,
  });
  const parts = [
    placedGeometry(new THREE.PlaneGeometry(MANDALA.size, MANDALA.size), {
      position: [MANDALA.southPosition[0], MANDALA.ySouth, MANDALA.southPosition[2]],
      rotation: [-Math.PI / 2, 0, Math.PI / 8],
    }),
    placedGeometry(new THREE.PlaneGeometry(MANDALA.size, MANDALA.size), {
      position: [MANDALA.eastPosition[0], MANDALA.yEast, MANDALA.eastPosition[2]],
      rotation: [-Math.PI / 2, 0, -Math.PI / 8],
    }),
  ];
  const aripana = new THREE.Mesh(mergedParts(parts), material);
  aripana.receiveShadow = true;
  scene.add(aripana);
}
