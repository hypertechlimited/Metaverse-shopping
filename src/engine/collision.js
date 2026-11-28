import { OBSTACLES, PLAYER_RADIUS, STREET } from '../world/layout.js';

export const COLLISION = {
  epsilon: 1e-6,
  passes: 2,
};

/**
 * @param {number} x @param {number} z @param {{ minX: number, maxX: number, minZ: number, maxZ: number }} box @param {number} radius
 * @returns {{ hit: boolean, x: number, z: number }} position pushed outside the box expanded by the radius
 */
function resolveBox(x, z, box, radius) {
  const nearestX = Math.min(box.maxX, Math.max(box.minX, x));
  const nearestZ = Math.min(box.maxZ, Math.max(box.minZ, z));
  const dx = x - nearestX;
  const dz = z - nearestZ;
  const distanceSq = dx * dx + dz * dz;
  if (distanceSq > radius * radius) return { hit: false, x, z };
  if (distanceSq > COLLISION.epsilon) {
    const distance = Math.sqrt(distanceSq);
    const push = radius - distance;
    return { hit: true, x: x + (dx / distance) * push, z: z + (dz / distance) * push };
  }
  const left = x - (box.minX - radius);
  const right = box.maxX + radius - x;
  const back = z - (box.minZ - radius);
  const front = box.maxZ + radius - z;
  const min = Math.min(left, right, back, front);
  if (min === left) return { hit: true, x: box.minX - radius, z };
  if (min === right) return { hit: true, x: box.maxX + radius, z };
  if (min === back) return { hit: true, x, z: box.minZ - radius };
  return { hit: true, x, z: box.maxZ + radius };
}

/**
 * Pushes a circle of `radius` out of every box, two passes so wall corners
 * resolve on both axes. Position is unchanged when nothing is hit.
 * @param {number} x @param {number} z @param {number} radius
 * @param {Array<{ minX: number, maxX: number, minZ: number, maxZ: number }>} boxes
 * @returns {{ x: number, z: number, hit: boolean }}
 */
export function resolveCircle(x, z, radius, boxes) {
  let px = x;
  let pz = z;
  let hit = false;
  for (let pass = 0; pass < COLLISION.passes; pass++) {
    let movedThisPass = false;
    for (const box of boxes) {
      const result = resolveBox(px, pz, box, radius);
      if (result.hit) {
        px = result.x;
        pz = result.z;
        hit = true;
        movedThisPass = true;
      }
    }
    if (!movedThisPass) break;
  }
  return { x: px, z: pz, hit };
}

/**
 * @param {number} x @param {number} z @param {{ minX: number, maxX: number, minZ: number, maxZ: number }} street
 * @returns {{ x: number, z: number }}
 */
export function clampToStreet(x, z, street = STREET) {
  return {
    x: Math.min(street.maxX, Math.max(street.minX, x)),
    z: Math.min(street.maxZ, Math.max(street.minZ, z)),
  };
}

/**
 * One fixed-step move: translate, resolve obstacles, clamp to the street.
 * Long moves sub-step so a single frame can never tunnel through a box.
 * @param {number} x @param {number} z @param {number} dx @param {number} dz
 * @param {number} radius
 * @param {Array<{ minX: number, maxX: number, minZ: number, maxZ: number }>} boxes
 * @param {{ minX: number, maxX: number, minZ: number, maxZ: number }} street
 * @returns {{ x: number, z: number }}
 */
export function moveWithCollision(x, z, dx, dz, radius, boxes, street) {
  const distance = Math.hypot(dx, dz);
  const steps = Math.max(1, Math.ceil(distance / (radius * 0.5)));
  let px = x;
  let pz = z;
  for (let i = 0; i < steps; i++) {
    const moved = resolveCircle(px + dx / steps, pz + dz / steps, radius, boxes);
    px = moved.x;
    pz = moved.z;
  }
  return clampToStreet(px, pz, street);
}

/** @returns {Array<{ minX: number, maxX: number, minZ: number, maxZ: number }>} live obstacle list */
export function obstacleBoxes() {
  return OBSTACLES;
}
