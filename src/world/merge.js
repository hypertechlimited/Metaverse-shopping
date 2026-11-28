import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** @typedef {{ position?: [number, number, number], rotation?: [number, number, number] }} PartTransform */

/**
 * Bakes a mesh-style transform (T·R with three's default XYZ euler order) into a
 * geometry so same-material parts can be merged into one draw call.
 * @param {THREE.BufferGeometry} geometry
 * @param {PartTransform} [transform]
 * @returns {THREE.BufferGeometry} the same geometry, transformed in place
 */
export function placedGeometry(geometry, transform = {}) {
  const position = transform.position ?? [0, 0, 0];
  const rotation = transform.rotation ?? [0, 0, 0];
  const matrix = new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rotation[0], rotation[1], rotation[2]));
  matrix.setPosition(position[0], position[1], position[2]);
  geometry.applyMatrix4(matrix);
  return geometry;
}

/** @param {THREE.BufferGeometry[]} parts @returns {THREE.BufferGeometry} */
export function mergedParts(parts) {
  if (parts.length === 0) throw new Error('mergedParts requires at least one geometry');
  const merged = mergeGeometries(parts);
  if (!merged) throw new Error('geometry merge failed: incompatible part attributes');
  for (const part of parts) part.dispose();
  return merged;
}

/**
 * @param {THREE.Object3D} parent
 * @param {THREE.BufferGeometry} geometry
 * @param {THREE.Material} material
 * @param {{ name?: string, castShadow?: boolean, receiveShadow?: boolean }} [options]
 * @returns {THREE.Mesh}
 */
export function addMergedMesh(parent, geometry, material, options = {}) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = options.castShadow ?? true;
  mesh.receiveShadow = options.receiveShadow ?? true;
  if (options.name) mesh.name = options.name;
  parent.add(mesh);
  return mesh;
}
