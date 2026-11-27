/** @typedef {'left' | 'right' | 'up' | 'down'} Direction */

export const DPAD = {
  stepAngle: 0.14,
  stepZoom: 0.5,
  minRadius: 6.2,
  maxRadius: 12.5,
  repeatIntervalMs: 140,
  buttonSizePx: 56,
};

/** @type {Direction[]} */
export const DIRECTIONS = ['left', 'right', 'up', 'down'];

const DIRECTION_VECTORS = {
  left: { x: -1, z: 0 },
  right: { x: 1, z: 0 },
  up: { x: 0, z: -1 },
  down: { x: 0, z: 1 },
};

/** @param {Direction} direction @returns {{ x: number, z: number }} */
export function directionVector(direction) {
  const vector = DIRECTION_VECTORS[direction];
  if (!vector) throw new Error(`unknown d-pad direction: ${direction}`);
  return { ...vector };
}

export const DRAG = { anglePerPixel: 0.006, radiusPerPixel: 0.014 };

/** @param {number} radius @returns {number} */
export function clampOrbitRadius(radius) {
  if (Number.isNaN(radius)) return DPAD.minRadius;
  return Math.min(DPAD.maxRadius, Math.max(DPAD.minRadius, radius));
}

/**
 * Pointer-drag orbit mapping: horizontal drag rotates, vertical drag zooms.
 * @param {{ angle: number, radius: number }} orbit @param {number} dx @param {number} dy @returns {{ angle: number, radius: number }}
 */
export function dragOrbit(orbit, dx, dy) {
  return {
    angle: orbit.angle - dx * DRAG.anglePerPixel,
    radius: clampOrbitRadius(orbit.radius + dy * DRAG.radiusPerPixel),
  };
}

/** @param {KeyboardEvent} event @returns {Direction | null} */
export function keyToDirection(event) {
  switch (event.key) {
    case 'ArrowLeft':
      return 'left';
    case 'ArrowRight':
      return 'right';
    case 'ArrowUp':
      return 'up';
    case 'ArrowDown':
      return 'down';
    default:
      return null;
  }
}

const CHEVRONS = {
  left: 'M 15 6 L 7 14 L 15 22',
  right: 'M 9 6 L 17 14 L 9 22',
  up: 'M 6 15 L 14 7 L 22 15',
  down: 'M 6 9 L 14 17 L 22 9',
};

const ARIA_LABELS = {
  left: 'Rotate camera left',
  right: 'Rotate camera right',
  up: 'Zoom camera in',
  down: 'Zoom camera out',
};

/**
 * @param {HTMLElement} host
 * @param {{ onDirection: (direction: Direction) => void }} handlers
 * @returns {{ dispose: () => void }}
 */
export function createDpad(host, handlers) {
  const pad = document.createElement('div');
  pad.className = 'dpad';
  pad.setAttribute('role', 'group');
  pad.setAttribute('aria-label', 'Camera controls');
  host.appendChild(pad);

  /** @type {Array<() => void>} */
  const cleanups = [];

  for (const direction of DIRECTIONS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `dpad-btn dpad-${direction}`;
    button.setAttribute('aria-label', ARIA_LABELS[direction]);
    button.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${CHEVRONS[direction]}" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    pad.appendChild(button);

    /** @type {number | undefined} */
    let repeatTimer;
    const stopRepeat = () => {
      if (repeatTimer !== undefined) {
        window.clearInterval(repeatTimer);
        repeatTimer = undefined;
      }
    };
    const press = (/** @type {PointerEvent} */ event) => {
      event.preventDefault();
      handlers.onDirection(direction);
      stopRepeat();
      repeatTimer = window.setInterval(() => handlers.onDirection(direction), DPAD.repeatIntervalMs);
    };
    button.addEventListener('pointerdown', press);
    button.addEventListener('pointerup', stopRepeat);
    button.addEventListener('pointerleave', stopRepeat);
    button.addEventListener('pointercancel', stopRepeat);
    cleanups.push(() => {
      stopRepeat();
      button.removeEventListener('pointerdown', press);
      button.removeEventListener('pointerup', stopRepeat);
      button.removeEventListener('pointerleave', stopRepeat);
      button.removeEventListener('pointercancel', stopRepeat);
      button.remove();
    });
  }

  return {
    dispose() {
      for (const cleanup of cleanups) cleanup();
      pad.remove();
    },
  };
}

/**
 * @param {{ addEventListener: typeof window.addEventListener, removeEventListener: typeof window.removeEventListener }} target
 * @param {{ onDirection: (direction: Direction) => void }} handlers
 * @returns {{ dispose: () => void }}
 */
export function createKeyboardControl(target, handlers) {
  const onKeyDown = (/** @type {KeyboardEvent} */ event) => {
    const direction = keyToDirection(event);
    if (direction) handlers.onDirection(direction);
  };
  target.addEventListener('keydown', /** @type {EventListener} */ (onKeyDown));
  return {
    dispose() {
      target.removeEventListener('keydown', /** @type {EventListener} */ (onKeyDown));
    },
  };
}
