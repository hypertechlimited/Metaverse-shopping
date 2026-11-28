export const JOYSTICK = {
  padSizePx: 128,
  knobSizePx: 56,
  deadZone: 0.15,
};

/**
 * Analog thumbstick for touch locomotion. Pure mapping exposed for tests;
 * the DOM half is a thin pointer-event pad that feeds the walker's existing
 * `setMoveInput` vector.
 *
 * @param {number} dx @param {number} dy @param {number} maxRadiusPx
 * @returns {{ forward: number, strafe: number } | null} normalized axes, or null inside the dead zone
 */
export function joystickVector(dx, dy, maxRadiusPx) {
  if (!(maxRadiusPx > 0)) throw new Error('joystickVector requires a positive radius');
  const length = Math.hypot(dx, dy);
  if (length === 0) return null;
  const clamped = Math.min(1, length / maxRadiusPx);
  if (clamped < JOYSTICK.deadZone) return null;
  const forward = (-dy / length) * clamped;
  const strafe = (dx / length) * clamped;
  return {
    forward: Math.max(-1, Math.min(1, forward)),
    strafe: Math.max(-1, Math.min(1, strafe)),
  };
}

/**
 * @param {HTMLElement} host
 * @param {{ onChange: (forward: number, strafe: number) => void }} handlers
 * @returns {{ dispose: () => void }}
 */
export function createJoystick(host, { onChange }) {
  const pad = document.createElement('div');
  pad.className = 'joystick';
  pad.setAttribute('role', 'group');
  pad.setAttribute('aria-label', 'उभिने नियन्त्रण · Move stick');
  const knob = document.createElement('div');
  knob.className = 'joystick-knob';
  pad.appendChild(knob);
  host.appendChild(pad);

  const maxRadius = (JOYSTICK.padSizePx - JOYSTICK.knobSizePx) / 2;
  /** @type {number | null} */
  let startX = null;
  /** @type {number | null} */
  let startY = null;

  const setKnob = (/** @type {number} */ dx, /** @type {number} */ dy) => {
    const scale = maxRadius > 0 ? Math.min(1, Math.hypot(dx, dy) / maxRadius) : 0;
    const norm = scale > 0 ? scale / Math.hypot(dx, dy) : 0;
    knob.style.transform = `translate(calc(-50% + ${dx * norm}px), calc(-50% + ${dy * norm}px))`;
  };

  /** @param {PointerEvent} event */
  function onDown(event) {
    startX = event.clientX;
    startY = event.clientY;
    pad.setPointerCapture(event.pointerId);
  }

  /** @param {PointerEvent} event */
  function onMove(event) {
    if (startX === null || startY === null) return;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    setKnob(dx, dy);
    const axes = joystickVector(dx, dy, maxRadius);
    if (axes) onChange(axes.forward, axes.strafe);
    else onChange(0, 0);
  }

  /** @param {PointerEvent} event */
  function onUp(event) {
    if (startX === null) return;
    startX = null;
    startY = null;
    if (pad.hasPointerCapture(event.pointerId)) pad.releasePointerCapture(event.pointerId);
    knob.style.transform = 'translate(-50%, -50%)';
    onChange(0, 0);
  }

  pad.addEventListener('pointerdown', onDown);
  pad.addEventListener('pointermove', onMove);
  pad.addEventListener('pointerup', onUp);
  pad.addEventListener('pointercancel', onUp);

  return {
    dispose() {
      pad.removeEventListener('pointerdown', onDown);
      pad.removeEventListener('pointermove', onMove);
      pad.removeEventListener('pointerup', onUp);
      pad.removeEventListener('pointercancel', onUp);
      pad.remove();
    },
  };
}
