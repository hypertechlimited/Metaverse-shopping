import { moveWithCollision } from './collision.js';
import { PLAYER_RADIUS } from '../world/layout.js';

export const PLAYER = {
  eyeHeight: 1.6,
  moveSpeed: 2.4,
  turnSpeed: 2.2,
  stepDistance: 0.4,
  stepTurn: 0.3,
  eyeRate: 3.0,
  lookAhead: 6,
  dragYawPerPixel: 0.005,
};

/**
 * First-person walker over the collision world. Pure state — the camera is
 * applied via a duck-typed `apply` exactly like `cameraRig`, so the module
 * stays unit-testable in node. Movement runs only inside the fixed step.
 *
 * @param {object} options
 * @param {[number, number, number]} options.position initial camera position (explore hand-off)
 * @param {number} options.yaw initial facing, atan2(x, z) convention
 * @param {number} [options.eye] initial eye height (defaults to position[1])
 * @param {Array<{ minX: number, maxX: number, minZ: number, maxZ: number }>} options.boxes
 * @param {{ minX: number, maxX: number, minZ: number, maxZ: number }} options.street
 * @param {boolean} [options.reducedMotion]
 * @returns {{
 *   getX: () => number,
 *   getZ: () => number,
 *   getYaw: () => number,
 *   getEye: () => number,
 *   setMoveInput: (forward: number, strafe: number) => void,
 *   setTurnInput: (turn: number) => void,
 *   stepForward: (distance: number) => void,
 *   stepTurn: (angle: number) => void,
 *   syncFrom: (position: [number, number, number], yaw: number) => void,
 *   isVisitorEye: () => boolean,
 *   update: (fixedDelta: number) => void,
 *   apply: (camera: { position: { set: (x: number, y: number, z: number) => void }, lookAt: (x: number, y: number, z: number) => void }) => void,
 *   lookAtPoint: () => [number, number, number],
 * }}
 */
export function createPlayer(options) {
  const { boxes, street } = options;
  if (!Array.isArray(options.position) || options.position.length !== 3) {
    throw new Error('player requires a 3-element position');
  }
  if (!Array.isArray(boxes) || boxes.length === 0) {
    throw new Error('player requires the obstacle box list');
  }
  const reducedMotion = options.reducedMotion ?? false;
  let x = options.position[0];
  let z = options.position[2];
  let eye = options.eye ?? options.position[1];
  let yaw = options.yaw;
  let moveForward = 0;
  let moveStrafe = 0;
  let turn = 0;
  let visitorEye = false;

  const approachEye = (/** @type {number} */ fixedDelta) => {
    if (reducedMotion) return PLAYER.eyeHeight;
    const blended = eye + (PLAYER.eyeHeight - eye) * Math.min(1, fixedDelta * PLAYER.eyeRate);
    return Math.abs(PLAYER.eyeHeight - blended) < 0.005 ? PLAYER.eyeHeight : blended;
  };

  return {
    getX() {
      return x;
    },
    getZ() {
      return z;
    },
    getYaw() {
      return yaw;
    },
    getEye() {
      return eye;
    },
    isVisitorEye() {
      return visitorEye;
    },
    setMoveInput(forward, strafe) {
      moveForward = Number.isFinite(forward) ? Math.min(1, Math.max(-1, forward)) : 0;
      moveStrafe = Number.isFinite(strafe) ? Math.min(1, Math.max(-1, strafe)) : 0;
    },
    setTurnInput(value) {
      turn = Number.isFinite(value) ? Math.min(1, Math.max(-1, value)) : 0;
    },
    stepForward(distance) {
      visitorEye = false;
      const resolved = moveWithCollision(x, z, Math.sin(yaw) * distance, Math.cos(yaw) * distance, PLAYER_RADIUS, boxes, street);
      x = resolved.x;
      z = resolved.z;
    },
    stepTurn(angle) {
      yaw += angle;
      visitorEye = false;
    },
    syncFrom(position, nextYaw) {
      x = position[0];
      z = position[2];
      eye = position[1];
      yaw = nextYaw;
      visitorEye = Math.abs(eye - PLAYER.eyeHeight) >= 0.005;
    },
    update(fixedDelta) {
      if (!Number.isFinite(fixedDelta) || fixedDelta <= 0) return;
      if (turn !== 0) {
        yaw += turn * PLAYER.turnSpeed * fixedDelta;
        visitorEye = false;
      }
      const length = Math.hypot(moveForward, moveStrafe);
      if (length > 0) {
        visitorEye = false;
        const scale = (PLAYER.moveSpeed * fixedDelta) / Math.max(1, length);
        const dx = (Math.sin(yaw) * moveForward - Math.cos(yaw) * moveStrafe) * scale;
        const dz = (Math.cos(yaw) * moveForward + Math.sin(yaw) * moveStrafe) * scale;
        const resolved = moveWithCollision(x, z, dx, dz, PLAYER_RADIUS, boxes, street);
        x = resolved.x;
        z = resolved.z;
      }
      if (!visitorEye) eye = approachEye(fixedDelta);
    },
    apply: applyToCamera,
    lookAtPoint,
  };

  /** @returns {[number, number, number]} */
  function lookAtPoint() {
    const reach = PLAYER.lookAhead;
    return [x + Math.sin(yaw) * reach, eye - 0.15, z + Math.cos(yaw) * reach];
  }

  /** @param {{ position: { set: (x: number, y: number, z: number) => void }, lookAt: (x: number, y: number, z: number) => void }} camera */
  function applyToCamera(camera) {
    camera.position.set(x, eye, z);
    const [lx, ly, lz] = lookAtPoint();
    camera.lookAt(lx, ly, lz);
  }
}

/**
 * @param {[number, number, number]} position @param {[number, number, number]} lookAt
 * @returns {number} yaw facing from position toward lookAt
 */
export function yawToward(position, lookAt) {
  return Math.atan2(lookAt[0] - position[0], lookAt[2] - position[2]);
}
