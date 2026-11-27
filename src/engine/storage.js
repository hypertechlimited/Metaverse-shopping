const STORAGE_KEY = 'sagarmatha_metaverse_v3';

/** @returns {{ visitorName: string, stockMap: Record<string, number>, cartArr: Array<{id: string, vIdx: number, qty: number}> }} */
function defaults() {
  return { visitorName: '', stockMap: {}, cartArr: [] };
}

/** @param {unknown} raw @returns {boolean} */
function isValidShape(raw) {
  if (raw === null || typeof raw !== 'object') return false;
  const state = /** @type {Record<string, unknown>} */ (raw);
  return typeof state.visitorName === 'string'
    && typeof state.stockMap === 'object' && state.stockMap !== null
    && Array.isArray(state.cartArr);
}

/**
 * @param {Storage | null} [backend] injectable storage backend for tests
 * @returns {{ load: () => object, save: (state: object) => boolean, clear: () => void }}
 */
export function createStorage(backend = null) {
  const store = backend ?? (typeof localStorage !== 'undefined' ? localStorage : null);

  function load() {
    if (!store) return defaults();
    try {
      const raw = store.getItem(STORAGE_KEY);
      if (!raw) return defaults();
      const parsed = JSON.parse(raw);
      if (!isValidShape(parsed)) return defaults();
      return { ...defaults(), ...parsed };
    } catch {
      return defaults();
    }
  }

  /** @param {object} state @returns {boolean} false when persistence failed */
  function save(state) {
    if (!store) return false;
    try {
      store.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch {
      return false;
    }
  }

  function clear() {
    if (!store) return;
    try {
      store.removeItem(STORAGE_KEY);
    } catch {
      /* persistence unavailable */
    }
  }

  return { load, save, clear };
}
