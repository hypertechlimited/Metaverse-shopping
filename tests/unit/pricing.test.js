import { describe, it, expect } from 'vitest';
import {
  QR_RATE,
  NAMASTE_RATE,
  PATAN_DISCOUNT,
  PATAN_THRESHOLD,
  DELIVERY_FEE,
  DELIVERY_FREE_AT,
  subtotalOf,
  qrDiscount,
  namasteDiscount,
  patanDiscount,
  deliveryFee,
  formatRupees,
  pricingTotal,
} from '../../src/commerce/pricing.js';

describe('pricing constants', () => {
  it('matches the spec rates and thresholds', () => {
    expect(QR_RATE).toBe(0.02);
    expect(NAMASTE_RATE).toBe(0.05);
    expect(PATAN_DISCOUNT).toBe(100);
    expect(PATAN_THRESHOLD).toBe(1000);
    expect(DELIVERY_FEE).toBe(50);
    expect(DELIVERY_FREE_AT).toBe(1000);
  });
});

describe('subtotal', () => {
  it('sums price × qty across lines', () => {
    expect(subtotalOf([{ price: 95, qty: 2 }, { price: 180, qty: 1 }])).toBe(370);
  });

  it('is 0 for an empty cart', () => {
    expect(subtotalOf([])).toBe(0);
  });

  it('rejects malformed lines', () => {
    expect(() => subtotalOf([{ price: 95, qty: 1.5 }])).toThrow();
    expect(() => subtotalOf([{ price: 95, qty: -1 }])).toThrow();
    expect(() => subtotalOf([{ price: Number.NaN, qty: 1 }])).toThrow();
  });
});

describe('discount primitives', () => {
  it('rounds the QR discount with Math.round', () => {
    expect(qrDiscount(100)).toBe(2);
    expect(qrDiscount(99)).toBe(2);
    expect(qrDiscount(101)).toBe(2);
    expect(qrDiscount(0)).toBe(0);
  });

  it('rounds NAMASTE5 with Math.round', () => {
    expect(namasteDiscount(100)).toBe(5);
    expect(namasteDiscount(99)).toBe(5);
    expect(namasteDiscount(91)).toBe(5);
    expect(namasteDiscount(89)).toBe(4);
  });

  it('gates PATAN100 exactly at the 999/1000 boundary', () => {
    expect(patanDiscount(999)).toBe(0);
    expect(patanDiscount(1000)).toBe(100);
  });

  it('gates free delivery exactly at the 999/1000 boundary', () => {
    expect(deliveryFee(999)).toBe(50);
    expect(deliveryFee(1000)).toBe(0);
  });
});

describe('formatRupees', () => {
  it('formats with the Devanagari rupee prefix and Indian grouping', () => {
    expect(formatRupees(95)).toBe('रू 95');
    expect(formatRupees(1450)).toBe('रू 1,450');
    expect(formatRupees(0)).toBe('रू 0');
  });
});

describe('pricingTotal', () => {
  it('handles an empty cart', () => {
    const summary = pricingTotal([]);
    expect(summary.subtotal).toBe(0);
    expect(summary.total).toBe(0);
  });

  it('applies no discounts by default and charges delivery under 1000', () => {
    const summary = pricingTotal([{ price: 95, qty: 2 }]);
    expect(summary.subtotal).toBe(190);
    expect(summary.discountTotal).toBe(0);
    expect(summary.deliveryFee).toBe(50);
    expect(summary.total).toBe(240);
  });

  it('waives delivery at 1000 subtotal with no discounts', () => {
    const summary = pricingTotal([{ price: 420, qty: 2 }, { price: 180, qty: 1 }]);
    expect(summary.subtotal).toBe(1020);
    expect(summary.deliveryFee).toBe(0);
    expect(summary.total).toBe(1020);
  });

  it('applies the QR discount alone', () => {
    const summary = pricingTotal([{ price: 310, qty: 1 }], { qrUsed: true });
    expect(summary.qrDiscount).toBe(6);
    expect(summary.total).toBe(310 - 6 + 50);
  });

  it('stacks QR + both promos from the pre-discount subtotal', () => {
    const lines = [{ price: 1450, qty: 1 }];
    const summary = pricingTotal(lines, { qrUsed: true, promos: ['NAMASTE5', 'PATAN100'] });
    expect(summary.subtotal).toBe(1450);
    expect(summary.qrDiscount).toBe(29);
    expect(summary.namasteDiscount).toBe(73);
    expect(summary.patanDiscount).toBe(100);
    expect(summary.discountTotal).toBe(202);
    expect(summary.deliveryFee).toBe(0);
    expect(summary.total).toBe(1450 - 202);
  });

  it('is order-independent for the combined case', () => {
    const lines = [{ price: 1450, qty: 1 }];
    const a = pricingTotal(lines, { qrUsed: true, promos: ['NAMASTE5', 'PATAN100'] });
    const b = pricingTotal(lines, { promos: ['PATAN100', 'NAMASTE5'], qrUsed: true });
    expect(a.total).toBe(b.total);
    expect(a.discountTotal).toBe(b.discountTotal);
  });

  it('rejects PATAN100 under the threshold but still applies companions', () => {
    const summary = pricingTotal([{ price: 420, qty: 2 }], { promos: ['NAMASTE5', 'PATAN100'] });
    expect(summary.patanDiscount).toBe(0);
    expect(summary.rejectedPromos).toEqual(['PATAN100']);
    expect(summary.appliedPromos).toEqual(['NAMASTE5']);
    expect(summary.total).toBe(840 - 42 + 50);
  });

  it('ignores unknown promo codes and reports them', () => {
    const summary = pricingTotal([{ price: 95, qty: 1 }], { promos: ['MOMO50'] });
    expect(summary.discountTotal).toBe(0);
    expect(summary.rejectedPromos).toEqual(['MOMO50']);
  });
});
