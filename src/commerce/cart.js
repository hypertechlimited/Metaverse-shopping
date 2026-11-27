/**
 * The jhola (cart) — pure functions over `(lines, stockMap)`. No DOM, no
 * Three.js, no instances: main.js keeps `cartLines` in the store and every
 * action here returns the next lines. Stock is per-SKU across all of its
 * variants (schema-pinned in docs/ARCHITECTURE.md), so oversell checks sum
 * quantity across every line of the same id.
 */

import { getSku, getVariant, variantPrice } from './catalog.js';
import { pricingTotal } from './pricing.js';

/** @typedef {{ id: string, vIdx: number, qty: number }} CartLine */

/** @typedef {{ price: number, qty: number }} PricedLine */

/** @typedef {{ id: string, vIdx: number, qty: number, unitPrice: number, lineTotal: number }} PricedCartLine */

/** @typedef {{ ok: true, lines: CartLine[] } | { ok: false, reason: 'oversell' | 'empty', lines: CartLine[] }} CartResult */

/** @typedef {{ ok: true, lines: CartLine[], stockDelta: Record<string, number>, pricedLines: PricedCartLine[], summary: import('./pricing.js').PricingSummary } | { ok: false, reason: 'oversell' | 'empty', lines: CartLine[] }} CheckoutResult */

/**
 * @param {CartLine[]} lines
 * @param {string} id
 * @returns {number}
 */
export function committedQtyFor(lines, id) {
  let total = 0;
  for (const line of lines) {
    if (line.id === id) total += line.qty;
  }
  return total;
}

/**
 * @param {CartLine[]} lines
 * @param {Record<string, number>} stockMap
 * @param {string} id
 * @param {number} vIdx
 * @param {number} [qty]
 * @returns {CartResult}
 */
export function addToCart(lines, stockMap, id, vIdx, qty = 1) {
  const sku = getSku(id);
  getVariant(id, vIdx);
  if (!Number.isInteger(qty) || qty < 1) throw new Error('cart add requires a positive integer qty');
  const stock = stockMap[id] ?? 0;
  if (committedQtyFor(lines, id) + qty > stock) {
    return { ok: false, reason: 'oversell', lines };
  }
  const existing = lines.find((line) => line.id === id && line.vIdx === vIdx);
  const next = existing
    ? lines.map((line) => (line === existing ? { ...line, qty: line.qty + qty } : line))
    : [...lines, { id, vIdx, qty }];
  return { ok: true, lines: next };
}

/**
 * @param {CartLine[]} lines
 * @param {Record<string, number>} stockMap
 * @param {string} id
 * @param {number} vIdx
 * @param {number} qty
 * @returns {CartResult} qty 0 removes the line
 */
export function setCartQty(lines, stockMap, id, vIdx, qty) {
  getSku(id);
  getVariant(id, vIdx);
  if (!Number.isInteger(qty) || qty < 0) throw new Error('cart qty must be a non-negative integer');
  if (qty === 0) return { ok: true, lines: removeFromCart(lines, id, vIdx) };
  const stock = stockMap[id] ?? 0;
  const others = committedQtyFor(lines.filter((line) => !(line.id === id && line.vIdx === vIdx)), id);
  if (others + qty > stock) {
    return { ok: false, reason: 'oversell', lines };
  }
  const next = lines.map((line) => (line.id === id && line.vIdx === vIdx ? { ...line, qty } : line));
  return { ok: true, lines: next };
}

/** @param {CartLine[]} lines @param {string} id @param {number} vIdx @returns {CartLine[]} */
export function removeFromCart(lines, id, vIdx) {
  return lines.filter((line) => !(line.id === id && line.vIdx === vIdx));
}

/** @param {CartLine[]} lines @returns {number} */
export function cartCount(lines) {
  let total = 0;
  for (const line of lines) total += line.qty;
  return total;
}

/** @param {CartLine[]} lines @returns {number} */
export function cartSubtotal(lines) {
  let total = 0;
  for (const line of lines) total += variantPrice(line.id, line.vIdx) * line.qty;
  return total;
}

/**
 * @param {CartLine[]} lines
 * @returns {PricedCartLine[]}
 */
export function pricedCartLines(lines) {
  return lines.map((line) => {
    const unitPrice = variantPrice(line.id, line.vIdx);
    return { id: line.id, vIdx: line.vIdx, qty: line.qty, unitPrice, lineTotal: unitPrice * line.qty };
  });
}

/**
 * Atomic checkout: every line is validated against current stock before any
 * result is produced — the caller applies the returned `stockDelta` in a
 * single store write, so a rejection can never leave a partial deduction.
 *
 * @param {CartLine[]} lines
 * @param {Record<string, number>} stockMap
 * @param {{ qrUsed?: boolean, promos?: string[] }} [options]
 * @returns {CheckoutResult}
 */
export function checkoutCart(lines, stockMap, options = {}) {
  if (lines.length === 0) {
    return { ok: false, reason: 'empty', lines };
  }
  for (const line of lines) {
    getSku(line.id);
    getVariant(line.id, line.vIdx);
    if (committedQtyFor(lines, line.id) > (stockMap[line.id] ?? 0)) {
      return { ok: false, reason: 'oversell', lines };
    }
  }
  const priced = pricedCartLines(lines);
  const pricedAsLines = /** @type {PricedLine[]} */ (priced.map((line) => ({ price: line.unitPrice, qty: line.qty })));
  const summary = pricingTotal(pricedAsLines, options);
  /** @type {Record<string, number>} */
  const stockDelta = {};
  for (const line of lines) {
    stockDelta[line.id] = (stockDelta[line.id] ?? 0) - line.qty;
  }
  return { ok: true, lines: [], stockDelta, pricedLines: priced, summary };
}

/**
 * Restore from a persisted snapshot: drop unknown ids/variants, drop lines
 * that no longer fit current stock (clamped, never silently oversold).
 *
 * @param {unknown} raw
 * @param {Record<string, number>} stockMap
 * @returns {CartLine[]}
 */
export function restoreCart(raw, stockMap) {
  if (!Array.isArray(raw)) return [];
  /** @type {CartLine[]} */
  const restored = [];
  for (const entry of raw) {
    if (entry === null || typeof entry !== 'object') continue;
    const line = /** @type {Record<string, unknown>} */ (entry);
    const id = typeof line.id === 'string' ? line.id : '';
    const vIdx = typeof line.vIdx === 'number' ? line.vIdx : -1;
    const qty = typeof line.qty === 'number' ? line.qty : 0;
    try {
      getSku(id);
      getVariant(id, vIdx);
    } catch {
      continue;
    }
    if (!Number.isInteger(qty) || qty < 1) continue;
    const committed = committedQtyFor(restored, id);
    const fits = Math.max(0, (stockMap[id] ?? 0) - committed);
    if (fits < 1) continue;
    restored.push({ id, vIdx, qty: Math.min(qty, fits) });
  }
  return restored;
}
