/**
 * Single mutable state tree with pub/sub, per docs/ARCHITECTURE.md principle 3.
 * Only actions (module functions) mutate; subscribers read and re-render.
 *
 * @template T
 * @param {T} initial
 * @returns {{
 *   get: () => T,
 *   set: (patch: Partial<T>) => T,
 *   subscribe: (listener: (state: T) => void) => () => void,
 *   dispose: () => void,
 * }}
 */
export function createStore(initial) {
  if (initial === null || typeof initial !== 'object') {
    throw new Error('store requires an object state tree');
  }
  /** @type {T} */
  let state = initial;
  /** @type {Set<(state: T) => void>} */
  const listeners = new Set();

  return {
    get() {
      return state;
    },
    set(patch) {
      if (patch === null || typeof patch !== 'object') {
        throw new Error('store.set requires a patch object');
      }
      state = { ...state, ...patch };
      for (const listener of listeners) listener(state);
      return state;
    },
    subscribe(listener) {
      if (typeof listener !== 'function') {
        throw new Error('store.subscribe requires a function');
      }
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    dispose() {
      listeners.clear();
    },
  };
}
