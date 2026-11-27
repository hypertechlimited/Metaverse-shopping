/** @typedef {(fixedDelta: number) => void} UpdateFn */
/** @typedef {(timeMs: number) => void} RenderFn */

/**
 * @param {object} options
 * @param {UpdateFn} options.update fixed-step simulation callback
 * @param {RenderFn} options.render per-frame draw callback
 * @param {number} [options.fixedStep] simulation step in seconds
 * @param {number} [options.maxDelta] clamp for single-frame deltas in seconds
 * @returns {(timeMs: number) => void} frame handler for renderer.setAnimationLoop
 */
export function createTimestep({ update, render, fixedStep = 1 / 60, maxDelta = 0.1 }) {
  /** @type {number | null} */
  let lastTime = null;
  let accumulator = 0;
  const epsilon = 1e-9;

  return function frame(timeMs) {
    if (lastTime === null) {
      lastTime = timeMs;
      render(timeMs);
      return;
    }
    let delta = (timeMs - lastTime) / 1000;
    lastTime = timeMs;
    if (delta > maxDelta) {
      delta = maxDelta;
    }
    accumulator += delta;
    while (accumulator >= fixedStep - epsilon) {
      update(fixedStep);
      accumulator -= fixedStep;
    }
    render(timeMs);
  };
}
