import { describe, it, expect } from 'vitest';
import { LANDING_DEALS, LANDING } from '../../src/ui/landing.js';
import { TOAST } from '../../src/ui/toast.js';
import { CAMERA_PRESETS } from '../../src/world/layout.js';
import { variantPrice } from '../../src/commerce/catalog.js';
import { formatRupees } from '../../src/commerce/pricing.js';

describe('landing deals', () => {
  it('offers exactly four deals with unique ids', () => {
    expect(LANDING_DEALS).toHaveLength(4);
    const ids = LANDING_DEALS.map((deal) => deal.id);
    expect(new Set(ids).size).toBe(4);
  });

  it('maps every deal to a real camera preset from layout.js', () => {
    const presetNames = CAMERA_PRESETS.map((preset) => preset.name);
    for (const deal of LANDING_DEALS) {
      expect(presetNames).toContain(deal.preset);
    }
  });

  it('formats every price in rupees', () => {
    for (const deal of LANDING_DEALS) {
      expect(deal.price.startsWith('रू ')).toBe(true);
    }
  });

  it('reads every price from the catalog as the single source of truth', () => {
    for (const deal of LANDING_DEALS) {
      expect(deal.price).toBe(formatRupees(variantPrice(deal.id, 0)));
    }
  });
});

describe('landing motion budget', () => {
  it('overlay fade stays within the 650 ms motion cap', () => {
    expect(LANDING.fadeOutMs).toBeLessThanOrEqual(650);
  });

  it('toast outlives the 900 ms camera tween', () => {
    expect(TOAST.durationMs).toBeGreaterThan(900);
  });
});
