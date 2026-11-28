import { describe, it, expect } from 'vitest';
import { CATALOG } from '../../src/commerce/catalog.js';
import { THUMBS } from '../../src/world/thumbs.js';
import { PRODUCT_SPOTS, RACK_TIERS, SKU_TIERS } from '../../src/world/layout.js';
import {
  PLANOGRAM,
  SHAPE_HEIGHTS,
  SHAPE_RADIUS,
  planFor,
  liveUnits,
  facingSlots,
  proxyExtent,
  frontZ,
} from '../../src/world/shelfPlanogram.js';

describe('planogram shapes', () => {
  it('defines positive metrics for every shape the catalog uses', () => {
    const shapes = new Set(CATALOG.map((sku) => (THUMBS[sku.art] ?? THUMBS.sugar).shape));
    for (const shape of shapes) {
      expect(SHAPE_HEIGHTS[shape]).toBeGreaterThan(0);
      expect(SHAPE_RADIUS[shape]).toBeGreaterThan(0);
    }
  });
});

/** @param {string} art @returns {import('../../src/world/thumbs.js').ThumbShape} */
function shapeOfArt(art) {
  return (THUMBS[art] ?? THUMBS.sugar).shape;
}

describe('facingPlan', () => {
  const plans = planFor(CATALOG);

  it('covers every catalog SKU exactly', () => {
    expect([...plans.keys()].sort()).toEqual(CATALOG.map((sku) => sku.id).sort());
  });

  it('gives high-velocity rack SKUs two across facings and a depth row', () => {
    expect(plans.get('nun-1kg')).toEqual({ across: 2, depthRows: 2, capacity: 4 });
    expect(plans.get('sakkhar-1kg')).toEqual({ across: 2, depthRows: 2, capacity: 4 });
    expect(plans.get('besaar-200g')).toEqual({ across: 2, depthRows: 2, capacity: 4 });
    expect(plans.get('khorsani-100g')).toEqual({ across: 2, depthRows: 2, capacity: 4 });
  });

  it('keeps mid-velocity rack SKUs at two across, single depth', () => {
    expect(plans.get('musuro-dal-1kg')).toEqual({ across: 2, depthRows: 1, capacity: 2 });
    expect(plans.get('masyaura-250g')).toEqual({ across: 1, depthRows: 1, capacity: 1 });
  });

  it('keeps the low-stock clay pot and all non-rack zones at a single facing', () => {
    expect(plans.get('gungdi-ghee')).toEqual({ across: 1, depthRows: 1, capacity: 1 });
    for (const sku of CATALOG) {
      if (sku.zone === 'Back Rack') continue;
      expect(plans.get(sku.id)).toEqual({ across: 1, depthRows: 1, capacity: 1 });
    }
  });

  it('is deterministic across calls', () => {
    expect(planFor(CATALOG)).toEqual(plans);
  });
});

describe('liveUnits', () => {
  const plan = { across: 2, depthRows: 2, capacity: 4 };

  it('empties the shelf at zero or missing stock', () => {
    expect(liveUnits(plan, 0)).toBe(0);
    expect(liveUnits(plan, -1)).toBe(0);
  });

  it('never exceeds capacity and depletes monotonically', () => {
    expect(liveUnits(plan, 1)).toBe(1);
    expect(liveUnits(plan, 3)).toBe(3);
    expect(liveUnits(plan, 99)).toBe(4);
    let previous = Infinity;
    for (let stock = 99; stock >= 0; stock -= 1) {
      const units = liveUnits(plan, stock);
      expect(units).toBeLessThanOrEqual(previous);
      previous = units;
    }
  });

  it('floors fractional stock instead of rounding up', () => {
    expect(liveUnits(plan, 2.5)).toBe(2);
  });
});

describe('facingSlots', () => {
  it('orders slots hero-first: front row, then depth', () => {
    const slots = facingSlots('pouch', { across: 2, depthRows: 2, capacity: 4 });
    const half = SHAPE_RADIUS.pouch + PLANOGRAM.edgeMargin;
    expect(slots).toHaveLength(4);
    expect(slots[0][1]).toBeCloseTo(0, 10);
    expect(slots[0][0]).toBeCloseTo(-half, 10);
    expect(slots[1][0]).toBeCloseTo(half, 10);
    expect(slots[1][1]).toBeCloseTo(0, 10);
    expect(slots[2][0]).toBeCloseTo(-half, 10);
    expect(slots[2][1]).toBeCloseTo(-PLANOGRAM.depthGapZ, 10);
    expect(slots[3][0]).toBeCloseTo(half, 10);
    expect(slots[3][1]).toBeCloseTo(-PLANOGRAM.depthGapZ, 10);
  });

  it('keeps single-facing SKUs exactly on their spot', () => {
    const slots = facingSlots('pot', { across: 1, depthRows: 1, capacity: 1 });
    expect(slots).toHaveLength(1);
    expect(slots[0][0]).toBeCloseTo(0, 10);
    expect(slots[0][1]).toBeCloseTo(0, 10);
  });
});

describe('facing blocks', () => {
  it('never overlap between rack SKUs sharing a tier', () => {
    const plans = planFor(CATALOG);
    const rackSkus = CATALOG.filter((sku) => sku.zone === 'Back Rack');
    for (let i = 0; i < rackSkus.length; i++) {
      for (let j = i + 1; j < rackSkus.length; j++) {
        const a = rackSkus[i];
        const b = rackSkus[j];
        if (SKU_TIERS[a.id] !== SKU_TIERS[b.id]) continue;
        const shapeA = shapeOfArt(a.art);
        const shapeB = shapeOfArt(b.art);
        const planA = plans.get(a.id);
        const planB = plans.get(b.id);
        if (!planA || !planB) throw new Error('planogram must cover rack SKUs');
        const extentA = proxyExtent(shapeA, planA, planA.capacity);
        const extentB = proxyExtent(shapeB, planB, planB.capacity);
        const centerA = PRODUCT_SPOTS[a.id][0];
        const centerB = PRODUCT_SPOTS[b.id][0];
        const gap = Math.abs(centerA - centerB) - extentA.hx - extentB.hx;
        expect(gap, `${a.id} vs ${b.id} on tier ${SKU_TIERS[a.id]}`).toBeGreaterThanOrEqual(-0.001);
      }
    }
  });

  it('keeps every facing inside the rack box and behind the front lip', () => {
    const plans = planFor(CATALOG);
    const rack = { minZ: -4.45, maxZ: -3.55, minX: -4.4, maxX: 1.1 };
    for (const sku of CATALOG) {
      if (sku.zone !== 'Back Rack') continue;
      const shape = shapeOfArt(sku.art);
      const plan = plans.get(sku.id);
      if (!plan) throw new Error('planogram must cover rack SKUs');
      const extent = proxyExtent(shape, plan, plan.capacity);
      const spot = PRODUCT_SPOTS[sku.id];
      const front = frontZ(sku.zone, spot[2]);
      expect(front).toBeGreaterThan(rack.minZ);
      expect(front).toBeLessThan(rack.maxZ);
      expect(spot[0] - extent.hx).toBeGreaterThanOrEqual(rack.minX);
      expect(spot[0] + extent.hx).toBeLessThanOrEqual(rack.maxX);
      expect(front - extent.hz - SHAPE_RADIUS[shape]).toBeGreaterThanOrEqual(rack.minZ);
    }
  });

  it('stands rack SKUs on their assigned tier board', () => {
    const tiers = RACK_TIERS['Back Rack'];
    for (const sku of CATALOG) {
      if (sku.zone !== 'Back Rack') continue;
      const tierName = SKU_TIERS[sku.id];
      expect(tiers[tierName], `${sku.id} tier ${tierName}`).toBeDefined();
      expect(PRODUCT_SPOTS[sku.id][1]).toBe(tiers[tierName]);
    }
  });

  it('staples sit at eye level, heavy items at the bottom', () => {
    expect(SKU_TIERS['musuro-dal-1kg']).toBe('eye');
    expect(SKU_TIERS['gungdi-ghee']).toBe('bottom');
  });
});
