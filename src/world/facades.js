import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makeArt, makeTexture, drawZinc } from './art.js';

/** @typedef {'north' | 'south' | 'east' | 'west'} FacadeFacing */

/** @type {{ blocks: Array<{ name: string, x: number, z: number, width: number, depth: number, height: number, facing: FacadeFacing }>, window: { width: number, height: number, depth: number, cols: number, rows: number, baseY: number, rowStep: number, margin: number }, grounding: number, roof: { overhang: number, thickness: number, textureSize: number, textureRepeat: number }, colors: { plaster: number, plasterAlt: number, window: number, roofTint: number } }} */
export const FACADES = {
  blocks: [
    { name: 'North A', x: -10.5, z: -16.8, width: 5.4, depth: 4.2, height: 5.6, facing: 'south' },
    { name: 'North B', x: -4.6, z: -17.4, width: 4.6, depth: 3.6, height: 4.3, facing: 'south' },
    { name: 'North C', x: 1.2, z: -16.6, width: 5.0, depth: 4.0, height: 6.2, facing: 'south' },
    { name: 'North D', x: 7.4, z: -17.8, width: 4.4, depth: 3.8, height: 4.9, facing: 'south' },
    { name: 'West A', x: -16.9, z: -9.6, width: 4.2, depth: 4.6, height: 5.1, facing: 'east' },
    { name: 'West B', x: -17.6, z: -3.4, width: 4.6, depth: 4.4, height: 4.0, facing: 'east' },
    { name: 'West C', x: -16.8, z: 2.6, width: 4.0, depth: 4.2, height: 5.8, facing: 'east' },
    { name: 'East Far', x: 18.6, z: 8.2, width: 4.8, depth: 4.4, height: 4.6, facing: 'west' },
  ],
  window: { width: 0.7, height: 0.9, depth: 0.06, cols: 3, rows: 2, baseY: 1.4, rowStep: 1.35, margin: 0.55 },
  grounding: 0.7,
  roof: { overhang: 0.35, thickness: 0.14, textureSize: 256, textureRepeat: 2 },
  colors: { plaster: 0xc4ad92, plasterAlt: 0xb59a7d, window: 0x241409, roofTint: 0xffffff },
};

/**
 * Hand-authored neighbor masses ringing the street, fog-faded at 14–20 units.
 * Facing is the side windows open toward the pasal street.
 * @returns {Array<{ name: string, x: number, z: number, width: number, depth: number, height: number, facing: 'north' | 'south' | 'east' | 'west' }>}
 */
export function facadesLayout() {
  return FACADES.blocks.map((block) => ({ ...block }));
}

/**
 * Window grid on the street-facing side of one mass, proud of the wall by 0.02.
 * @param {{ x: number, z: number, width: number, depth: number, height: number, facing: 'north' | 'south' | 'east' | 'west' }} block
 * @returns {THREE.BufferGeometry[]}
 */
function windowBoxes(block) {
  const spec = FACADES.window;
  const parts = [];
  const spanSize = block.facing === 'south' || block.facing === 'north' ? block.width : block.depth;
  const usable = spanSize - spec.margin * 2;
  const step = usable / spec.cols;
  const alongCenter = block.facing === 'south' || block.facing === 'north' ? block.x : block.z;
  const wall = block.facing === 'south'
    ? block.z + block.depth / 2
    : block.facing === 'north'
      ? block.z - block.depth / 2
      : block.facing === 'east'
        ? block.x + block.width / 2
        : block.x - block.width / 2;
  const normal = block.facing === 'south' || block.facing === 'east' ? 1 : -1;
  for (let row = 0; row < spec.rows; row++) {
    for (let col = 0; col < spec.cols; col++) {
      const part = new THREE.BoxGeometry(
        block.facing === 'south' || block.facing === 'north' ? spec.width : spec.depth,
        spec.height,
        block.facing === 'south' || block.facing === 'north' ? spec.depth : spec.width,
      );
      const along = alongCenter - usable / 2 + step * (col + 0.5);
      const y = spec.baseY + row * spec.rowStep + spec.height / 2;
      if (block.facing === 'south' || block.facing === 'north') {
        part.translate(along, y, wall + normal * 0.02);
      } else {
        part.translate(wall + normal * 0.02, y, along);
      }
      parts.push(part);
    }
  }
  return parts;
}

/** @param {THREE.BufferGeometry[]} parts @returns {THREE.BufferGeometry} */
function mergedOrThrow(parts) {
  const merged = mergeGeometries(parts);
  if (!merged) throw new Error('facade geometry merge failed');
  return merged;
}

/**
 * Galli depth stage: neighbor masses, recessed windows, zinc roofs.
 * Bodies merged (vertex-color tones), windows merged, roofs merged — 3 draw calls.
 * @param {THREE.Scene} scene @param {THREE.WebGLRenderer} renderer @returns {{ drawCallBudget: number }}
 */
export function buildFacades(scene, renderer) {
  const layout = facadesLayout();
  const toneA = new THREE.Color(FACADES.colors.plaster);
  const toneB = new THREE.Color(FACADES.colors.plasterAlt);

  const bodyParts = [];
  const windowParts = [];
  const roofParts = [];
  for (const block of layout) {
    const body = new THREE.BoxGeometry(block.width, block.height, block.depth);
    body.translate(block.x, block.height / 2, block.z);
    const tone = bodyParts.length % 2 === 0 ? toneA : toneB;
    const positions = body.attributes.position;
    const colors = new Float32Array(positions.count * 3);
    for (let i = 0; i < positions.count; i++) {
      const lift = FACADES.grounding + (1 - FACADES.grounding) * Math.min(1, positions.getY(i) / block.height);
      colors[i * 3] = tone.r * lift;
      colors[i * 3 + 1] = tone.g * lift;
      colors[i * 3 + 2] = tone.b * lift;
    }
    body.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    bodyParts.push(body);
    windowParts.push(...windowBoxes(block));
    const roof = new THREE.BoxGeometry(
      block.width + FACADES.roof.overhang * 2,
      FACADES.roof.thickness,
      block.depth + FACADES.roof.overhang * 2,
    );
    roof.translate(block.x, block.height + FACADES.roof.thickness / 2, block.z);
    roofParts.push(roof);
  }

  const bodyMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 });
  const windowMaterial = new THREE.MeshStandardMaterial({ color: FACADES.colors.window, roughness: 0.6 });
  const zincTexture = makeTexture(makeArt(FACADES.roof.textureSize, FACADES.roof.textureSize, drawZinc), renderer);
  zincTexture.repeat.set(FACADES.roof.textureRepeat, FACADES.roof.textureRepeat);
  const roofMaterial = new THREE.MeshStandardMaterial({
    map: zincTexture,
    color: FACADES.colors.roofTint,
    metalness: 0.25,
    roughness: 0.55,
  });

  const bodies = new THREE.Mesh(mergedOrThrow(bodyParts), bodyMaterial);
  const windows = new THREE.Mesh(mergedOrThrow(windowParts), windowMaterial);
  const roofs = new THREE.Mesh(mergedOrThrow(roofParts), roofMaterial);
  scene.add(bodies, windows, roofs);

  return { drawCallBudget: 3 };
}
