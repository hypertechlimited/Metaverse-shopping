import { describe, it, expect } from 'vitest';
import { DEBUG_QUERY_FLAG, debugEnabled, createDebugProbe } from '../../src/engine/debugProbe.js';

describe('debugEnabled', () => {
  it('detects the bare flag', () => {
    expect(debugEnabled('?debug')).toBe(true);
    expect(debugEnabled('?debug=1&other=x')).toBe(true);
  });

  it('rejects absent flag and malformed input', () => {
    expect(debugEnabled('?mode=explore')).toBe(false);
    expect(debugEnabled('')).toBe(false);
    expect(debugEnabled('http://bad??%zz')).toBe(false);
  });

  it('exposes the canonical query flag', () => {
    expect(DEBUG_QUERY_FLAG).toBe('debug');
  });
});

describe('createDebugProbe', () => {
  it('returns null without the flag, leaving the renderer untouched', () => {
    const renderer = { info: { autoReset: true, reset: () => {}, render: { calls: 0, triangles: 0 }, memory: { geometries: 0, textures: 0 }, programs: null } };
    const probe = createDebugProbe({ renderer, scene: {}, camera: {}, search: '' });
    expect(probe).toBeNull();
    expect(renderer.info.autoReset).toBe(true);
  });

  it('returns null in non-browser runtimes even with the flag', () => {
    const renderer = { info: { autoReset: true, reset: () => {}, render: { calls: 0, triangles: 0 }, memory: { geometries: 0, textures: 0 }, programs: null } };
    const probe = createDebugProbe({ renderer, scene: {}, camera: {}, search: '?debug' });
    expect(probe).toBeNull();
    expect(renderer.info.autoReset).toBe(true);
  });
});
