import { describe, it, expect } from 'vitest';
import { initialStockMap } from '../../src/commerce/catalog.js';
import { checkoutCart } from '../../src/commerce/cart.js';
import { pricingTotal } from '../../src/commerce/pricing.js';
import { newBillId, buildBill, billTotals } from '../../src/commerce/bill.js';

describe('newBillId', () => {
  it('prefixes the shop code with a base36 epoch stamp', () => {
    expect(newBillId(1700000000000)).toMatch(/^SM-[A-Z0-9]+$/);
  });

  it('is strictly increasing with time', () => {
    const a = newBillId(1700000000000);
    const b = newBillId(1700000001000);
    expect(a).not.toBe(b);
  });
});

describe('buildBill', () => {
  it('carries line names, variant labels, and the pricing summary', () => {
    const stock = initialStockMap();
    const result = checkoutCart([{ id: 'waiwai-5pack', vIdx: 0, qty: 2 }], stock, { qrUsed: true });
    if (!result.ok) throw new Error('checkout should apply');
    const bill = buildBill(result.pricedLines, result.summary, {
      orderId: 'SM-TEST',
      dateIso: '2026-11-27T10:00:00.000Z',
      visitorName: 'Aarav',
    });
    expect(bill.orderId).toBe('SM-TEST');
    expect(bill.visitorName).toBe('Aarav');
    expect(bill.lines).toEqual([
      { id: 'waiwai-5pack', nameNp: 'वाइ वाइ चाउचाउ', nameEn: 'Wai Wai noodles', variantLabel: '5-pack', qty: 2, unitPrice: 95, lineTotal: 190 },
    ]);
    expect(bill.summary.qrDiscount).toBe(4);
    expect(bill.summary.total).toBe(190 - 4 + 50);
  });

  it('throws on an unknown sku line', () => {
    const line = { id: 'momo', vIdx: 0, qty: 1, unitPrice: 1, lineTotal: 1 };
    expect(() => buildBill([line], pricingTotal([]), { orderId: 'X', dateIso: '', visitorName: '' })).toThrow();
  });
});

describe('billTotals', () => {
  it('always lists subtotal, delivery, and grand total', () => {
    const summary = pricingTotal([{ price: 95, qty: 1 }]);
    const rows = billTotals(buildBill([{ id: 'waiwai-5pack', vIdx: 0, qty: 1, unitPrice: 95, lineTotal: 95 }], summary, { orderId: 'X', dateIso: '', visitorName: '' }));
    expect(rows[0].label).toContain('Subtotal');
    expect(rows.at(-1)?.label).toContain('Total');
    expect(rows.some((row) => row.label.includes('Delivery'))).toBe(true);
    expect(rows).toHaveLength(3);
  });

  it('lists each applied discount row', () => {
    const summary = pricingTotal([{ price: 1450, qty: 1 }], { qrUsed: true, promos: ['NAMASTE5', 'PATAN100'] });
    const rows = billTotals(buildBill([{ id: 'marsyangdi-rice-5kg', vIdx: 1, qty: 1, unitPrice: 1450, lineTotal: 1450 }], summary, { orderId: 'X', dateIso: '', visitorName: '' }));
    expect(rows.some((row) => row.label.includes('QR'))).toBe(true);
    expect(rows.some((row) => row.label.includes('NAMASTE5'))).toBe(true);
    expect(rows.some((row) => row.label.includes('PATAN100'))).toBe(true);
    expect(rows.find((row) => row.label.includes('Delivery'))?.value).toBe('नि:शुल्क · Free');
  });
});
