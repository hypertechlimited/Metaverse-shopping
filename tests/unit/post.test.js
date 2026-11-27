import { describe, it, expect } from 'vitest';
import { POST, postTier } from '../../src/engine/post.js';

describe('post-chain quality tiers', () => {
  it('gives bloom to pixel-hungry viewports, skips it on constrained ones', () => {
    expect(postTier(1920, 1)).toBe('high');
    expect(postTier(1280, 2)).toBe('high');
    expect(postTier(1280, 1)).toBe('low');
    expect(postTier(375, 2)).toBe('low');
  });

  it('keeps bloom subtle: glow is seasoning, never the dish', () => {
    expect(POST.bloom.strength).toBeLessThanOrEqual(0.5);
    expect(POST.bloom.threshold).toBeGreaterThanOrEqual(0.8);
    expect(POST.bloom.radius).toBeLessThanOrEqual(0.75);
  });

  it('binds tier decisions to named thresholds, not magic numbers', () => {
    expect(POST.highTierEffectiveWidth).toBeGreaterThan(1280);
    expect(POST.highTierEffectiveWidth).toBeLessThan(2560);
  });
});
