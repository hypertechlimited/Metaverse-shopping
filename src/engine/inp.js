export const INP_BUDGET_MS = 200;
export const INP_CI_STALL_GUARD_MS = 500;

/** @typedef {{ duration: number, interactionId?: number, name?: string }} InpEntry */

/**
 * Worst interaction latency from event-timing entries. Entries with a positive
 * interactionId are real INP interactions; entries without one count only when
 * the browser never exposes interactionId, so the metric degrades to worst
 * event latency instead of vanishing.
 * @param {InpEntry[]} entries
 * @returns {{ worstMs: number, interactions: number }}
 */
export function inpFromEntries(entries) {
  let sawInteraction = false;
  let interactions = 0;
  for (const entry of entries) {
    const id = entry.interactionId;
    if (typeof id === 'number' && id > 0) {
      sawInteraction = true;
      interactions += 1;
    }
  }
  if (!sawInteraction) interactions = entries.length;
  let worst = 0;
  for (const entry of entries) {
    if (typeof entry.duration !== 'number' || !Number.isFinite(entry.duration) || entry.duration < 0) continue;
    const id = entry.interactionId;
    if (typeof id === 'number' && id > 0) {
      if (entry.duration > worst) worst = entry.duration;
    } else if ((typeof id === 'number' && id === 0) || id === undefined || id === null) {
      if (sawInteraction) continue;
      if (entry.duration > worst) worst = entry.duration;
    }
  }
  return { worstMs: worst, interactions };
}

/**
 * Live worst-interaction tracker fed by PerformanceObserver('event').
 * @param {{ PerformanceObserver?: any }} env
 * @returns {{ install: () => void, uninstall: () => void, worstMs: () => number, interactions: () => number, observeEntry: (entry: InpEntry) => void }}
 */
export function createInpMonitor(env = {}) {
  let worst = 0;
  let count = 0;
  let sawInteraction = false;
  /** @type {any} */
  let observer = null;

  /** @param {InpEntry} entry */
  function take(entry) {
    if (typeof entry.duration !== 'number' || !Number.isFinite(entry.duration) || entry.duration < 0) return;
    const id = entry.interactionId;
    const isInteraction = typeof id === 'number' && id > 0;
    const hasIdSupport = typeof id === 'number' || sawInteraction;
    if (isInteraction) sawInteraction = true;
    if (hasIdSupport && !isInteraction) return;
    if (entry.duration > worst) worst = entry.duration;
    count += 1;
  }

  return {
    install() {
      const Observer = env.PerformanceObserver;
      if (!Observer || typeof Observer.supportedEntryTypes?.includes !== 'function') return;
      if (!Observer.supportedEntryTypes.includes('event')) return;
      observer = new Observer((/** @type {{ getEntries: () => InpEntry[] }} */ list) => {
        for (const entry of list.getEntries()) take(entry);
      });
      try {
        observer.observe({ type: 'event', buffered: true, durationThreshold: 16 });
      } catch {
        observer.disconnect?.();
        observer = null;
      }
    },
    uninstall() {
      if (!observer) return;
      observer.disconnect();
      observer = null;
    },
    /** @returns {number} */
    worstMs() {
      return worst;
    },
    /** @returns {number} */
    interactions() {
      return count;
    },
    /** @param {InpEntry} entry */
    observeEntry(entry) {
      take(entry);
    },
  };
}
