import { describe, it, expect, vi } from 'vitest';
import { createBell, BELL } from '../../src/engine/audio.js';

function fakeContext({ state = 'running', resumeRejects = false } = {}) {
  /** @type {any[]} */
  const nodes = [];
  const context = {
    nodes,
    state,
    currentTime: 0,
    destination: {},
    resume: vi.fn(() => {
      if (resumeRejects) return Promise.reject(new Error('blocked'));
      state = 'running';
      return Promise.resolve();
    }),
    close: vi.fn(() => Promise.resolve()),
    createGain() {
      const node = {
        gain: {
          setValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
        },
        connect: vi.fn(),
      };
      nodes.push(node);
      return node;
    },
    createOscillator() {
      const node = {
        type: '',
        frequency: { value: 0 },
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      };
      nodes.push(node);
      return node;
    },
  };
  return context;
}

/** @param {any} context @returns {new () => any} */
function fakeContextCtor(context) {
  return /** @type {new () => any} */ (/** @type {unknown} */ (function () {
    return context;
  }));
}

describe('createBell', () => {
  it('starts idle and plays once with a running context', async () => {
    const context = fakeContext();
    const bell = createBell({ contextFactory: () => fakeContextCtor(context) });
    expect(bell.getState()).toBe('idle');
    const result = await bell.play();
    expect(result).toBe('started');
    expect(bell.getState()).toBe('started');
    const oscillators = context.nodes.filter((node) => 'frequency' in node);
    expect(oscillators).toHaveLength(BELL.frequenciesHz.length);
    expect(oscillators.map((node) => node.frequency.value)).toEqual(BELL.frequenciesHz);
  });

  it('reports unsupported when no AudioContext exists', async () => {
    const bell = createBell({ contextFactory: () => null });
    expect(await bell.play()).toBe('unsupported');
  });

  it('reports unsupported when the constructor throws', async () => {
    const bell = createBell({
      contextFactory: () => /** @type {new () => any} */ (/** @type {unknown} */ (function () {
        throw new Error('no audio hardware');
      })),
    });
    expect(await bell.play()).toBe('unsupported');
  });

  it('recovers a suspended context via resume', async () => {
    const context = fakeContext({ state: 'suspended' });
    const bell = createBell({ contextFactory: () => fakeContextCtor(context) });
    expect(await bell.play()).toBe('started');
    expect(context.resume).toHaveBeenCalled();
  });

  it('fails soft to blocked when resume rejects', async () => {
    const context = fakeContext({ state: 'suspended', resumeRejects: true });
    const bell = createBell({ contextFactory: () => fakeContextCtor(context) });
    expect(await bell.play()).toBe('blocked');
    expect(bell.getState()).toBe('blocked');
  });

  it('ignores repeated play calls', async () => {
    const context = fakeContext();
    const bell = createBell({ contextFactory: () => fakeContextCtor(context) });
    await bell.play();
    const second = await bell.play();
    expect(second).toBe('started');
    const oscillators = context.nodes.filter((node) => 'frequency' in node);
    expect(oscillators).toHaveLength(BELL.frequenciesHz.length);
  });

  it('dispose closes the context and freezes state', async () => {
    const context = fakeContext();
    const bell = createBell({ contextFactory: () => fakeContextCtor(context) });
    await bell.play();
    bell.dispose();
    expect(context.close).toHaveBeenCalled();
    expect(bell.getState()).toBe('disposed');
    expect(await bell.play()).toBe('disposed');
  });

  it('dispose is safe without a context', () => {
    const bell = createBell({ contextFactory: () => null });
    expect(() => bell.dispose()).not.toThrow();
  });
});
