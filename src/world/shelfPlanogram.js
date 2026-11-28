import { CATALOG } from '../commerce/catalog.js';
import { RACK_FRONT_Z } from './layout.js';
import { THUMBS } from './thumbs.js';

export const SHAPE_HEIGHTS = /** @type {Record<import('./thumbs.js').ThumbShape, number>} */ ({
  pouch: 0.42,
  sack: 0.36,
  pot: 0.26,
  bottle: 0.44,
  bar: 0.1,
  bundle: 0.32,
  box: 0.2,
});

export const SHAPE_RADIUS = /** @type {Record<import('./thumbs.js').ThumbShape, number>} */ ({
  pouch: 0.17,
  sack: 0.19,
  pot: 0.18,
  bottle: 0.12,
  bar: 0.15,
  bundle: 0.13,
  box: 0.16,
});

export const PLANOGRAM = {
  acrossStockThreshold: 25,
  depthStockThreshold: 30,
  edgeMargin: 0.02,
  depthGapZ: 0.37,
  rackZones: ['Back Rack'],
};

/** @typedef {{ across: number, depthRows: number, capacity: number }} FacingPlan */

/**
 * Static block plan per SKU from the catalog's initial stock (velocity proxy):
 * more stock → more facings. Live depletion shrinks the visible set via
 * `liveUnits`; the plan itself never changes at runtime.
 * @param {typeof CATALOG} catalog
 * @returns {Map<string, FacingPlan>}
 */
export function planFor(catalog) {
  /** @type {Map<string, FacingPlan>} */
  const plans = new Map();
  for (const sku of catalog) {
    const onRack = PLANOGRAM.rackZones.includes(sku.zone);
    const across = onRack && sku.stock >= PLANOGRAM.acrossStockThreshold ? 2 : 1;
    const depthRows = onRack && sku.stock >= PLANOGRAM.depthStockThreshold ? 2 : 1;
    plans.set(sku.id, { across, depthRows, capacity: across * depthRows });
  }
  return plans;
}

/**
 * Visible units for a live stock level: full capacity, then depletes, then
 * empties entirely at zero — the shelf stays truthful to inventory.
 * @param {FacingPlan} plan @param {number} stock @returns {number}
 */
export function liveUnits(plan, stock) {
  if (!(stock > 0)) return 0;
  return Math.min(plan.capacity, Math.floor(stock));
}

/**
 * Unit offsets relative to the SKU spot, hero slot first. Front row fills
 * left→right, then the depth row behind (toward the wall). Spot z for rack
 * zones is `RACK_FRONT_Z`; slots always step toward -z.
 * @param {import('./thumbs.js').ThumbShape} shape @param {FacingPlan} plan
 * @returns {Array<[number, number]>}
 */
export function facingSlots(shape, plan) {
  const half = SHAPE_RADIUS[shape] + PLANOGRAM.edgeMargin;
  /** @type {Array<[number, number]>} */
  const slots = [];
  for (let depth = 0; depth < plan.depthRows; depth += 1) {
    for (let col = 0; col < plan.across; col += 1) {
      const dx = plan.across === 2 ? (col === 0 ? -half : half) : 0;
      slots.push([dx, -depth * PLANOGRAM.depthGapZ]);
    }
  }
  return slots;
}

/**
 * Pick-proxy extent for the SKU's visible facing block: x/y centered as the
 * original single spot, z center shifted toward the depth rows.
 * @param {import('./thumbs.js').ThumbShape} shape @param {FacingPlan} plan @param {number} stock
 * @returns {{ cz: number, hx: number, hz: number }}
 */
export function proxyExtent(shape, plan, stock) {
  const radius = SHAPE_RADIUS[shape];
  const units = liveUnits(plan, stock);
  const half = radius + PLANOGRAM.edgeMargin;
  const depthRows = plan.depthRows > 1 && units > plan.across ? 2 : 1;
  const hx = plan.across === 2 ? half + radius : half;
  const hz = (depthRows - 1) * PLANOGRAM.depthGapZ / 2 + radius;
  return { cz: -((depthRows - 1) * PLANOGRAM.depthGapZ) / 2, hx, hz };
}

/**
 * Rack front z for a SKU spot: zoned rack SKUs face the customer from
 * `RACK_FRONT_Z`; other zones keep their authored spot z.
 * @param {string} zone @param {number} spotZ @returns {number}
 */
export function frontZ(zone, spotZ) {
  return PLANOGRAM.rackZones.includes(zone) ? RACK_FRONT_Z : spotZ;
}
