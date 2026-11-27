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
