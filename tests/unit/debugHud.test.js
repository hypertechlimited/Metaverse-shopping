import { describe, it, expect } from 'vitest';
import { DEBUG_HUD, createDebugHud } from '../../src/ui/debugHud.js';

function fakeElement() {
  return {
    className: '',
    textContent: '',
    children: /** @type {any[]} */ ([]),
    appended: /** @type {any[]} */ ([]),
    removed: false,
    /** @param {any} child */
    appendChild(child) {
      this.children.push(child);
      return child;
    },
    /** @param {any} _name @param {string} value */
    setAttribute(_name, value) {
      void value;
    },
    remove() {
      this.removed = true;
    },
  };
}

function fakeHost() {
  const host = fakeElement();
  return host;
}

function makeHud() {
  const host = fakeHost();
  let statsCalls = 0;
  const hud = createDebugHud(
    /** @type {any} */ (host),
    {
      initialDpr: 1.5,
      getStats: () => {
        statsCalls += 1;
        return { drawCalls: 74, triangles: 33082 };
      },
      getInp: () => 123.6,
      getErrorCount: () => 2,
    },
    /** @type {any} */ ({ createElement: () => fakeElement() }),
  );
  return { host, hud, statsCalls: () => statsCalls, panel: () => host.children[0], rows: () => host.children[0].children };
}

describe('createDebugHud', () => {
  it('mounts a five-row panel into the host', () => {
    const { panel, rows } = makeHud();
    expect(panel().className).toBe('debug-hud');
    expect(rows()).toHaveLength(5);
  });

  it('pulls stats only on refresh ticks, not every frame', () => {
    const { hud, statsCalls, rows } = makeHud();
    hud.update(0);
    hud.update(250);
    hud.update(300);
    expect(statsCalls()).toBe(0);
    hud.update(DEBUG_HUD.refreshMs + 1);
    expect(statsCalls()).toBe(1);
    expect(rows()[0].textContent).toBe('FPS 6.0');
    expect(rows()[1].textContent).toBe('CALLS 74 TRIS 33082');
    expect(rows()[2].textContent).toBe('DPR 1.50');
    expect(rows()[3].textContent).toBe('INP 124ms');
    expect(rows()[4].textContent).toBe('ERR 2');
  });

  it('measures fps over each refresh window and resets the frame counter', () => {
    const { hud, rows } = makeHud();
    hud.update(0);
    hud.update(250);
    hud.update(500);
    expect(rows()[0].textContent).toBe('FPS 4.0');
    hud.update(600);
    hud.update(1000);
    expect(rows()[0].textContent).toBe('FPS 2.0');
  });

  it('falls back to zeroed INP and ERR rows without getters', () => {
    const host = fakeHost();
    const hud = createDebugHud(
      /** @type {any} */ (host),
      { initialDpr: 1, getStats: () => ({ drawCalls: 1, triangles: 1 }) },
      /** @type {any} */ ({ createElement: () => fakeElement() }),
    );
    hud.update(0);
    hud.update(600);
    expect(host.children[0].children[3].textContent).toBe('INP 0ms');
    expect(host.children[0].children[4].textContent).toBe('ERR 0');
  });

  it('throws without a document (programmer error)', () => {
    expect(() => createDebugHud(/** @type {any} */ (fakeHost()), { initialDpr: 1, getStats: () => ({ drawCalls: 0, triangles: 0 }) }, undefined)).toThrow();
  });

  it('removes the panel on dispose', () => {
    const { hud, panel } = makeHud();
    hud.dispose();
    expect(panel().removed).toBe(true);
  });
});
