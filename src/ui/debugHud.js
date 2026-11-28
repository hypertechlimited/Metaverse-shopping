export const DEBUG_HUD = { refreshMs: 500 };

/**
 * @param {HTMLElement} host
 * @param {{ initialDpr: number, getStats: () => { drawCalls: number, triangles: number }, getInp?: () => number, getErrorCount?: () => number }} options
 * @param {Document} [doc]
 * @returns {{ update: (timeMs: number) => void, dispose: () => void }}
 */
export function createDebugHud(host, { initialDpr, getStats, getInp, getErrorCount }, doc = globalThis.document) {
  if (!doc) throw new Error('debugHud requires a document');
  const panel = doc.createElement('div');
  panel.className = 'debug-hud';
  panel.setAttribute('aria-hidden', 'true');

  const fpsEl = doc.createElement('div');
  fpsEl.className = 'debug-hud-row';
  panel.appendChild(fpsEl);

  const callsEl = doc.createElement('div');
  callsEl.className = 'debug-hud-row';
  panel.appendChild(callsEl);

  const dprEl = doc.createElement('div');
  dprEl.className = 'debug-hud-row';
  panel.appendChild(dprEl);

  const inpEl = doc.createElement('div');
  inpEl.className = 'debug-hud-row';
  panel.appendChild(inpEl);

  const errEl = doc.createElement('div');
  errEl.className = 'debug-hud-row';
  panel.appendChild(errEl);

  host.appendChild(panel);

  let frames = 0;
  let windowStartMs = -1;

  return {
    /** @param {number} timeMs */
    update(timeMs) {
      frames += 1;
      if (windowStartMs < 0) windowStartMs = timeMs;
      const span = timeMs - windowStartMs;
      if (span < DEBUG_HUD.refreshMs) return;
      const stats = getStats();
      const fps = ((frames - 1) * 1000) / span;
      fpsEl.textContent = 'FPS ' + fps.toFixed(1);
      callsEl.textContent = 'CALLS ' + stats.drawCalls + ' TRIS ' + stats.triangles;
      dprEl.textContent = 'DPR ' + initialDpr.toFixed(2);
      inpEl.textContent = 'INP ' + (getInp ? getInp().toFixed(0) : '0') + 'ms';
      errEl.textContent = 'ERR ' + (getErrorCount ? getErrorCount() : 0);
      frames = 0;
      windowStartMs = timeMs;
    },
    dispose() {
      panel.remove();
    },
  };
}
