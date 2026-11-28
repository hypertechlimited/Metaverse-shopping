export const TELEMETRY = { capacity: 50 };

/** @typedef {{ kind: 'error' | 'rejection', message: string, source: string, line: number, column: number, at: number }} TelemetryEntry */

/**
 * Bounded client error queue: window.onerror + unhandledrejection, no network.
 * Phase S swaps the drain target for a hosted sink; the capture contract stays.
 * @param {{ addEventListener?: (type: string, handler: (event: any) => void) => void, removeEventListener?: (type: string, handler: (event: any) => void) => void, performance?: { now: () => number } }} target
 * @returns {{ install: () => void, uninstall: () => void, entries: () => TelemetryEntry[], drain: () => TelemetryEntry[], size: () => number }}
 */
export function createTelemetry(target) {
  /** @type {TelemetryEntry[]} */
  const queue = [];
  const now = () => (typeof target.performance?.now === 'function' ? target.performance.now() : 0);

  /** @param {TelemetryEntry} entry */
  function record(entry) {
    queue.push(entry);
    if (queue.length > TELEMETRY.capacity) queue.shift();
  }

  /** @param {any} event */
  const onError = (event) => {
    record({
      kind: 'error',
      message: typeof event?.message === 'string' ? event.message : 'unknown error',
      source: typeof event?.filename === 'string' ? event.filename : '',
      line: typeof event?.lineno === 'number' ? event.lineno : 0,
      column: typeof event?.colno === 'number' ? event.colno : 0,
      at: now(),
    });
  };

  /** @param {any} event */
  const onRejection = (event) => {
    const reason = event?.reason;
    record({
      kind: 'rejection',
      message: reason instanceof Error ? reason.message : String(reason ?? 'unknown rejection'),
      source: '',
      line: 0,
      column: 0,
      at: now(),
    });
  };

  let installed = false;

  return {
    install() {
      if (installed || typeof target.addEventListener !== 'function') return;
      target.addEventListener('error', onError);
      target.addEventListener('unhandledrejection', onRejection);
      installed = true;
    },
    uninstall() {
      if (!installed) return;
      if (typeof target.removeEventListener === 'function') {
        target.removeEventListener('error', onError);
        target.removeEventListener('unhandledrejection', onRejection);
      }
      installed = false;
    },
    /** @returns {TelemetryEntry[]} */
    entries() {
      return [...queue];
    },
    /** @returns {TelemetryEntry[]} */
    drain() {
      return queue.splice(0, queue.length);
    },
    /** @returns {number} */
    size() {
      return queue.length;
    },
  };
}
