export const DEBUG_QUERY_FLAG = 'debug';

/** @typedef {{ autoReset: boolean, reset: () => void, render: { calls: number, triangles: number }, memory: { geometries: number, textures: number }, programs: Array<unknown> | null }} InfoLike */
/** @typedef {{ drawCalls: number, triangles: number, programs: number, geometries: number, textures: number }} RenderStats */

/** @param {string} search @returns {boolean} */
export function debugEnabled(search) {
  try {
    return new URLSearchParams(search).has(DEBUG_QUERY_FLAG);
  } catch {
    return false;
  }
}

/**
 * Opt-in diagnostics probe: with `?debug` in the URL it takes over renderer.info
 * (autoReset off, manual per-frame reset) and exposes a read-only console handle
 * at `window.__sagarmatha` so golden tests and device smoke runs can read exact
 * per-frame draw-call counts. Absent the flag the renderer is untouched.
 * @param {{ renderer: { info: InfoLike }, scene: unknown, camera: unknown, search: string }} spec
 * @returns {{ beginFrame: () => void, stats: () => RenderStats, dispose: () => void } | null}
 */
export function createDebugProbe({ renderer, scene, camera, search }) {
  if (!debugEnabled(search)) return null;
  if (typeof window === 'undefined') return null;
  renderer.info.autoReset = false;
  /** @returns {RenderStats} */
  const stats = () => ({
    drawCalls: renderer.info.render.calls,
    triangles: renderer.info.render.triangles,
    programs: renderer.info.programs ? renderer.info.programs.length : 0,
    geometries: renderer.info.memory.geometries,
    textures: renderer.info.memory.textures,
  });
  const host = /** @type {Record<string, unknown>} */ (/** @type {unknown} */ (window));
  host.__sagarmatha = { renderer, scene, camera, stats };
  return {
    beginFrame() {
      renderer.info.reset();
    },
    stats,
    dispose() {
      renderer.info.autoReset = true;
      delete host.__sagarmatha;
    },
  };
}
