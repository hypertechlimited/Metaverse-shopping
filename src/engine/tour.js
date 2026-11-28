export const TOUR = {
  dwellSeconds: 2.2,
};

/**
 * Guided auto-tour state machine: walks the camera presets in order, dwelling
 * at each. Pure — the caller drives the camera and feeds `settled` back in.
 * Any user input calls `stop()` and the tour forgets its progress.
 *
 * @param {string[]} presetNames ordered preset names
 * @returns {{
 *   start: () => void,
 *   stop: () => void,
 *   isActive: () => boolean,
 *   currentIndex: () => number,
 *   update: (fixedDelta: number, settled: boolean) => string | null,
 * }}
 */
export function createTour(presetNames) {
  if (!Array.isArray(presetNames) || presetNames.length === 0) {
    throw new Error('tour requires a non-empty preset name list');
  }
  let active = false;
  let index = -1;
  let dwell = 0;

  return {
    start() {
      active = true;
      index = -1;
      dwell = TOUR.dwellSeconds;
    },
    stop() {
      active = false;
      index = -1;
      dwell = 0;
    },
    isActive() {
      return active;
    },
    currentIndex() {
      return index;
    },
    /**
     * @param {number} fixedDelta seconds
     * @param {boolean} settled true when the camera is resting on a preset
     * @returns {string | null} next preset name to fly to, or null
     */
    update(fixedDelta, settled) {
      if (!active || !settled) return null;
      dwell += fixedDelta;
      if (dwell < TOUR.dwellSeconds) return null;
      dwell = 0;
      index = (index + 1) % presetNames.length;
      return presetNames[index];
    },
  };
}
