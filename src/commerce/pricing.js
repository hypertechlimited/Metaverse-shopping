/**
 * Pure pricing math per docs/CATALOG.md "Pricing rules". All amounts are
 * integer rupees; every percentage rounds with Math.round; every percentage
 * and threshold computes from the pre-discount subtotal (order-independent).
 */

export const QR_RATE = 0.02;
export const NAMASTE_RATE = 0.05;
export const PATAN_DISCOUNT = 100;
export const PATAN_THRESHOLD = 1000;
export const DELIVERY_FEE = 50;
export const DELIVERY_FREE_AT = 1000;

export const PROMO_CODES = /** @type {const} */ ({ NAMASTE5: 'NAMASTE5', PATAN100: 'PATAN100' });

/** @typedef {{ price: number, qty: number }} PricedLine */

/** @typedef {{ subtotal: number, qrDiscount: number, namasteDiscount: number, patanDiscount: number, discountTotal: number, deliveryFee: number, total: number, appliedPromos: string[], rejectedPromos: string[] }} PricingSummary */

/**
 * @param {PricedLine[]} lines
 * @returns {number}
 */
export function subtotalOf(lines) {
  let sum = 0;
  for (const line of lines) {
    if (!Number.isFinite(line.price) || !Number.isInteger(line.qty) || line.qty < 0) {
      throw new Error('invalid priced line');
    }
    sum += line.price * line.qty;
  }
  return sum;
}

/** @param {number} subtotal @returns {number} */
export function qrDiscount(subtotal) {
  return Math.round(subtotal * QR_RATE);
}

/** @param {number} subtotal @returns {number} */
export function namasteDiscount(subtotal) {
  return Math.round(subtotal * NAMASTE_RATE);
}

/** @param {number} subtotal @returns {number} PATAN100 flat off, gated on the subtotal */
export function patanDiscount(subtotal) {
  return subtotal >= PATAN_THRESHOLD ? PATAN_DISCOUNT : 0;
}

/** @param {number} subtotal @returns {number} 0 at/above the free threshold, else the flat fee */
export function deliveryFee(subtotal) {
  return subtotal >= DELIVERY_FREE_AT ? 0 : DELIVERY_FEE;
}

/** @param {number} amount @returns {string} 'रू 95' with Indian-region grouping */
export function formatRupees(amount) {
  return `रू ${amount.toLocaleString('en-IN')}`;
}

/**
 * Unknown promo codes are ignored, not errors — they are user input and the
 * rejected codes are reported back in `rejectedPromos` (documented fail-soft).
 *
 * @param {PricedLine[]} lines
 * @param {{ qrUsed?: boolean, promos?: string[] }} [options]
 * @returns {PricingSummary}
 */
export function pricingTotal(lines, { qrUsed = false, promos = [] } = {}) {
  const subtotal = subtotalOf(lines);
  const qr = qrUsed ? qrDiscount(subtotal) : 0;
  let namaste = 0;
  let patan = 0;
  /** @type {string[]} */
  const appliedPromos = [];
  /** @type {string[]} */
  const rejectedPromos = [];
  for (const code of promos) {
    if (code === PROMO_CODES.NAMASTE5) {
      namaste = namasteDiscount(subtotal);
      appliedPromos.push(code);
    } else if (code === PROMO_CODES.PATAN100) {
      patan = patanDiscount(subtotal);
      if (patan > 0) appliedPromos.push(code);
      else rejectedPromos.push(code);
    } else {
      rejectedPromos.push(code);
    }
  }
  const discountTotal = qr + namaste + patan;
  const delivery = subtotal === 0 ? 0 : deliveryFee(subtotal);
  return {
    subtotal,
    qrDiscount: qr,
    namasteDiscount: namaste,
    patanDiscount: patan,
    discountTotal,
    deliveryFee: delivery,
    total: Math.max(0, subtotal - discountTotal + delivery),
    appliedPromos,
    rejectedPromos,
  };
}
