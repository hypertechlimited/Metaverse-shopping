/**
 * Click-vs-drag guard: pointer travel beyond maxTravelPx cancels selection.
 * @param {HTMLElement} element
 * @param {{ maxTravelPx?: number }} [options]
 * @returns {{ wasClick: (event: PointerEvent) => boolean, dispose: () => void }}
 */
export function createPointerGuard(element, { maxTravelPx = 6 } = {}) {
  /** @type {{ x: number, y: number } | null} */
  let downPos = null;

  /** @param {PointerEvent} event */
  function onDown(event) {
    downPos = { x: event.clientX, y: event.clientY };
  }

  /** @param {PointerEvent} event @returns {boolean} true when the gesture counts as a click */
  function wasClick(event) {
    if (!downPos) return false;
    const travel = Math.hypot(event.clientX - downPos.x, event.clientY - downPos.y);
    downPos = null;
    return travel <= maxTravelPx;
  }

  element.addEventListener('pointerdown', onDown);
  return {
    wasClick,
    dispose() {
      element.removeEventListener('pointerdown', onDown);
      downPos = null;
    },
  };
}

/**
 * Drag stream: reports incremental pointer deltas while the pointer is down.
 * @param {HTMLElement} element
 * @param {{ onDrag: (dx: number, dy: number) => void }} handlers
 * @returns {{ dispose: () => void }}
 */
export function createDragStream(element, { onDrag }) {
  /** @type {{ x: number, y: number } | null} */
  let last = null;

  /** @param {PointerEvent} event */
  function onDown(event) {
    last = { x: event.clientX, y: event.clientY };
  }

  /** @param {PointerEvent} event */
  function onMove(event) {
    if (!last) return;
    onDrag(event.clientX - last.x, event.clientY - last.y);
    last = { x: event.clientX, y: event.clientY };
  }

  function onUp() {
    last = null;
  }

  element.addEventListener('pointerdown', onDown);
  element.addEventListener('pointermove', onMove);
  element.addEventListener('pointerup', onUp);
  element.addEventListener('pointercancel', onUp);
  return {
    dispose() {
      element.removeEventListener('pointerdown', onDown);
      element.removeEventListener('pointermove', onMove);
      element.removeEventListener('pointerup', onUp);
      element.removeEventListener('pointercancel', onUp);
      last = null;
    },
  };
}

export const MOVE_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

/**
 * WASD + arrow movement axes for explore mode: `forward`/`strafe` in [-1, 1],
 * `turn` for the left/right arrows. Reports on every change; clears on blur.
 * @param {{ addEventListener: typeof window.addEventListener, removeEventListener: typeof window.removeEventListener }} target
 * @param {{ onChange: (axes: { forward: number, strafe: number, turn: number }) => void }} handlers
 * @returns {{ axes: () => { forward: number, strafe: number, turn: number }, dispose: () => void }}
 */
export function createKeyAxis(target, { onChange }) {
  /** @type {Set<string>} */
  const pressed = new Set();

  const axes = () => ({
    forward: (pressed.has('KeyW') || pressed.has('ArrowUp') ? 1 : 0) - (pressed.has('KeyS') || pressed.has('ArrowDown') ? 1 : 0),
    strafe: (pressed.has('KeyD') ? 1 : 0) - (pressed.has('KeyA') ? 1 : 0),
    turn: (pressed.has('ArrowRight') ? 1 : 0) - (pressed.has('ArrowLeft') ? 1 : 0),
  });

  const report = () => onChange(axes());

  const onKeyDown = (/** @type {KeyboardEvent} */ event) => {
    if (!MOVE_KEYS.has(event.code) || event.repeat) return;
    pressed.add(event.code);
    report();
  };
  const onKeyUp = (/** @type {KeyboardEvent} */ event) => {
    if (!MOVE_KEYS.has(event.code)) return;
    pressed.delete(event.code);
    report();
  };
  const onBlur = () => {
    if (pressed.size === 0) return;
    pressed.clear();
    report();
  };

  target.addEventListener('keydown', /** @type {EventListener} */ (onKeyDown));
  target.addEventListener('keyup', /** @type {EventListener} */ (onKeyUp));
  target.addEventListener('blur', onBlur);
  return {
    axes,
    dispose() {
      target.removeEventListener('keydown', /** @type {EventListener} */ (onKeyDown));
      target.removeEventListener('keyup', /** @type {EventListener} */ (onKeyUp));
      target.removeEventListener('blur', onBlur);
      pressed.clear();
    },
  };
}

/**
 * @param {HTMLElement} element
 * @param {(entry: { width: number, height: number }) => void} onResize
 * @returns {() => void} disconnect function
 */
export function observeResize(element, onResize) {
  const observer = new ResizeObserver((entries) => {
    const rect = entries[0]?.contentRect;
    if (rect) onResize({ width: rect.width, height: rect.height });
  });
  observer.observe(element);
  return () => observer.disconnect();
}
