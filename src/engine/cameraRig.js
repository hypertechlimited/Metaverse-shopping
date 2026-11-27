/**
 * Camera rig: landing orbit + cubic ease-out transition to an in-store position.
 * Pure math on a duck-typed camera (`position.set(x,y,z)` + `lookAt(x,y,z)`),
 * no Three.js import — unit-testable in node. All constants arrive via options
 * from `world/layout.js` (single geometry truth).
 */

export const RIG_DEFAULTS = {
  autoRotateSpeed: 0.12,
  tweenDurationMs: 900,
  initialAngle: 0.9,
};

export const RIG_MODES = /** @type {const} */ ({ ORBIT: 'orbit', TRANSITION: 'transition', SETTLED: 'settled' });

/**
 * Monotonic 0→1 ease-out cubic: no overshoot by construction.
 * @param {number} t
 * @returns {number}
 */
export function easeOutCubic(t) {
  if (!Number.isFinite(t)) return t >= 0 ? 1 : 0;
  const u = Math.min(1, Math.max(0, t));
  return 1 - (1 - u) ** 3;
}

/**
 * @typedef {[number, number, number]} Vec3
 */

/**
 * @param {Vec3} a
 * @param {Vec3} b
 * @param {number} u
 * @returns {Vec3}
 */
function lerp3(a, b, u) {
  return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u];
}

/**
 * @param {object} options
 * @param {{ position: { set: (x: number, y: number, z: number) => void }, lookAt: (x: number, y: number, z: number) => void }} options.camera
 * @param {{ radius: number, height: number, target: Vec3 }} options.landingOrbit
 * @param {Vec3} options.enterPosition
 * @param {Vec3} [options.enterLookAt]
 * @param {number} [options.autoRotateSpeed] radians per second
 * @param {number} [options.tweenDurationMs]
 * @param {number} [options.initialAngle]
 * @param {boolean} [options.reducedMotion]
 * @returns {{
 *   getMode: () => 'orbit' | 'transition' | 'settled',
 *   getOrbit: () => { angle: number, radius: number },
 *   setOrbit: (orbit: { angle: number, radius: number }) => void,
 *   beginTransition: (toPosition: Vec3, toLookAt?: Vec3, origin?: { position: Vec3, lookAt: Vec3 }) => boolean,
 *   update: (fixedDelta: number) => void,
 *   render: () => void,
 * }}
 */
export function createCameraRig(options) {
  const { camera, landingOrbit, enterPosition } = options;
  if (!camera || typeof camera.lookAt !== 'function' || typeof camera.position?.set !== 'function') {
    throw new Error('cameraRig requires a camera with position.set and lookAt');
  }
  if (!landingOrbit || !Array.isArray(landingOrbit.target) || landingOrbit.target.length !== 3) {
    throw new Error('cameraRig requires landingOrbit with a 3-element target');
  }
  if (!Array.isArray(enterPosition) || enterPosition.length !== 3) {
    throw new Error('cameraRig requires a 3-element enterPosition');
  }

  const autoRotateSpeed = options.autoRotateSpeed ?? RIG_DEFAULTS.autoRotateSpeed;
  const tweenDurationMs = options.tweenDurationMs ?? RIG_DEFAULTS.tweenDurationMs;
  const reducedMotion = options.reducedMotion ?? false;
  const orbitTarget = landingOrbit.target;

  /** @type {'orbit' | 'transition' | 'settled'} */
  let mode = RIG_MODES.ORBIT;
  let angle = options.initialAngle ?? RIG_DEFAULTS.initialAngle;
  let radius = landingOrbit.radius;
  let elapsedMs = 0;

  /** @type {Vec3} */
  let fromPosition = [0, 0, 0];
  /** @type {Vec3} */
  let fromLookAt = [0, 0, 0];
  /** @type {Vec3} */
  let toPosition = [...enterPosition];
  /** @type {Vec3} */
  let toLookAt = [...orbitTarget];

  /** @returns {Vec3} */
  function orbitPosition() {
    return [
      orbitTarget[0] + Math.cos(angle) * radius,
      landingOrbit.height,
      orbitTarget[2] + Math.sin(angle) * radius,
    ];
  }

  /**
   * @param {Vec3} position
   * @param {Vec3} [lookAt]
   * @param {{ position: Vec3, lookAt: Vec3 }} [origin] current camera pose when
   *        leaving settled mode (preset navigation); ignored from orbit
   * @returns {boolean} false when the rig is mid-transition
   */
  function beginTransition(position, lookAt = orbitTarget, origin) {
    if (mode === RIG_MODES.TRANSITION) return false;
    if (!Array.isArray(position) || position.length !== 3) {
      throw new Error('beginTransition requires a 3-element position');
    }
    toPosition = [...position];
    toLookAt = [...(lookAt ?? orbitTarget)];
    if (mode === RIG_MODES.ORBIT) {
      fromPosition = orbitPosition();
      fromLookAt = [...orbitTarget];
    } else if (origin) {
      fromPosition = [...origin.position];
      fromLookAt = [...origin.lookAt];
    } else {
      fromPosition = [...toPosition];
      fromLookAt = [...toLookAt];
    }
    if (reducedMotion) {
      mode = RIG_MODES.SETTLED;
      elapsedMs = tweenDurationMs;
    } else {
      mode = RIG_MODES.TRANSITION;
      elapsedMs = 0;
    }
    return true;
  }

  /** @param {number} fixedDelta seconds */
  function update(fixedDelta) {
    if (!Number.isFinite(fixedDelta)) return;
    if (mode === RIG_MODES.ORBIT) {
      angle += fixedDelta * autoRotateSpeed;
      return;
    }
    if (mode === RIG_MODES.TRANSITION) {
      elapsedMs += fixedDelta * 1000;
      if (elapsedMs >= tweenDurationMs) {
        elapsedMs = tweenDurationMs;
        mode = RIG_MODES.SETTLED;
      }
    }
  }

  function render() {
    if (mode === RIG_MODES.ORBIT) {
      const [x, y, z] = orbitPosition();
      camera.position.set(x, y, z);
      camera.lookAt(orbitTarget[0], orbitTarget[1], orbitTarget[2]);
      return;
    }
    const u = easeOutCubic(elapsedMs / tweenDurationMs);
    const [x, y, z] = lerp3(fromPosition, toPosition, u);
    const [lx, ly, lz] = lerp3(fromLookAt, toLookAt, u);
    camera.position.set(x, y, z);
    camera.lookAt(lx, ly, lz);
  }

  return {
    getMode() {
      return mode;
    },
    getOrbit() {
      return { angle, radius };
    },
    setOrbit(orbit) {
      if (mode !== RIG_MODES.ORBIT) return;
      if (Number.isFinite(orbit.angle)) angle = orbit.angle;
      if (Number.isFinite(orbit.radius)) radius = orbit.radius;
    },
    beginTransition,
    update,
    render,
  };
}
