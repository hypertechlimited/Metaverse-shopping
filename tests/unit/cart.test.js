import { describe, it, expect } from 'vitest';
import { initialStockMap } from '../../src/commerce/catalog.js';
import {
  addToCart,
  setCartQty,
  removeFromCart,
  cartCount,
  cartSubtotal,
  checkoutCart,
  restoreCart,
  committedQtyFor,
  pricedCartLines,
} from '../../src/commerce/cart.js';

const STOCK = () => initialStockMap();

describe('addToCart', () => {
  it('adds a new line and merges identical sku+variant lines', () => {
    const stock = STOCK();
    const first = addToCart([], stock, 'waiwai-5pack', 0);
    expect(first.ok).toBe(true);
    const second = addToCart(first.lines, stock, 'waiwai-5pack', 0);
    expect(second.ok).toBe(true);
    expect(second.lines).toEqual([{ id: 'waiwai-5pack', vIdx: 0, qty: 2 }]);
  });

  it('keeps different variants as separate lines', () => {
    const stock = STOCK();
    const result = addToCart(addToCart([], stock, 'ilam-tea-250g', 0).lines, stock, 'ilam-tea-250g', 1);
    expect(result.ok).toBe(true);
    expect(result.lines).toHaveLength(2);
  });

  it('rejects the add that would exceed stock, leaving lines untouched', () => {
    const stock = STOCK();
    stock['gungdi-ghee'] = 2;
    const lines = [{ id: 'gungdi-ghee', vIdx: 0, qty: 2 }];
    const result = addToCart(lines, stock, 'gungdi-ghee', 1);
    expect(result).toEqual({ ok: false, reason: 'oversell', lines });
  });

  it('rejects at the exact-stock boundary (adding one over)', () => {
    const stock = STOCK();
    stock['nun-1kg'] = 3;
    const lines = [{ id: 'nun-1kg', vIdx: 0, qty: 3 }];
    expect(addToCart(lines, stock, 'nun-1kg', 0).ok).toBe(false);
    const two = [{ id: 'nun-1kg', vIdx: 0, qty: 2 }];
    expect(addToCart(two, stock, 'nun-1kg', 0).ok).toBe(true);
  });

  it('sums committed quantity across variants for the oversell guard', () => {
    const stock = STOCK();
    stock['marsyangdi-rice-5kg'] = 3;
    const lines = [
      { id: 'marsyangdi-rice-5kg', vIdx: 0, qty: 2 },
      { id: 'marsyangdi-rice-5kg', vIdx: 1, qty: 1 },
    ];
    expect(addToCart(lines, stock, 'marsyangdi-rice-5kg', 0).ok).toBe(false);
  });

  it('treats missing stock as zero and throws on unknown sku/variant', () => {
    expect(addToCart([], {}, 'nun-1kg', 0).ok).toBe(false);
    expect(() => addToCart([], STOCK(), 'momo', 0)).toThrow();
    expect(() => addToCart([], STOCK(), 'nun-1kg', 5)).toThrow();
  });
});

describe('setCartQty / removeFromCart', () => {
  it('sets quantity and removes at zero', () => {
    const stock = STOCK();
    const lines = addToCart([], stock, 'chiura-1kg', 0, 2).lines;
    const one = setCartQty(lines, stock, 'chiura-1kg', 0, 1);
    expect(one.lines).toEqual([{ id: 'chiura-1kg', vIdx: 0, qty: 1 }]);
    const zero = setCartQty(lines, stock, 'chiura-1kg', 0, 0);
    expect(zero.lines).toEqual([]);
  });

  it('rejects a quantity above stock, accounting for other lines', () => {
    const stock = STOCK();
    stock['sakkhar-1kg'] = 5;
    const lines = [
      { id: 'sakkhar-1kg', vIdx: 0, qty: 2 },
      { id: 'nun-1kg', vIdx: 0, qty: 1 },
    ];
    expect(setCartQty(lines, stock, 'sakkhar-1kg', 0, 6).ok).toBe(false);
    expect(setCartQty(lines, stock, 'sakkhar-1kg', 0, 5).ok).toBe(true);
  });

  it('removes only the matching sku+variant line', () => {
    const lines = [
      { id: 'ilam-tea-250g', vIdx: 0, qty: 1 },
      { id: 'ilam-tea-250g', vIdx: 1, qty: 1 },
    ];
    expect(removeFromCart(lines, 'ilam-tea-250g', 0)).toEqual([{ id: 'ilam-tea-250g', vIdx: 1, qty: 1 }]);
  });
});

describe('count and subtotal', () => {
  it('counts total quantity across lines', () => {
    const lines = [
      { id: 'waiwai-5pack', vIdx: 0, qty: 2 },
      { id: 'nun-1kg', vIdx: 0, qty: 3 },
    ];
    expect(cartCount(lines)).toBe(5);
  });

  it('subtotals per variant price', () => {
    const lines = [
      { id: 'waiwai-5pack', vIdx: 0, qty: 2 },
      { id: 'marsyangdi-rice-5kg', vIdx: 1, qty: 1 },
    ];
    expect(cartSubtotal(lines)).toBe(95 * 2 + 1450);
    expect(cartSubtotal([])).toBe(0);
  });

  it('prices cart lines with line totals', () => {
    expect(pricedCartLines([{ id: 'waiwai-5pack', vIdx: 1, qty: 2 }])).toEqual([
      { id: 'waiwai-5pack', vIdx: 1, qty: 2, unitPrice: 220, lineTotal: 440 },
    ]);
  });
});

describe('checkoutCart', () => {
  it('fully applies: empties lines and deducts every sku atomically', () => {
    const stock = STOCK();
    const lines = [
      { id: 'waiwai-5pack', vIdx: 0, qty: 2 },
      { id: 'gungdi-ghee', vIdx: 1, qty: 1 },
      { id: 'gungdi-ghee', vIdx: 0, qty: 1 },
    ];
    const result = checkoutCart(lines, stock, { qrUsed: true, promos: ['NAMASTE5'] });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('checkout should apply');
    expect(result.lines).toEqual([]);
    expect(result.stockDelta).toEqual({ 'waiwai-5pack': -2, 'gungdi-ghee': -2 });
    const subtotal = 95 * 2 + 820 + 420;
    expect(result.summary.subtotal).toBe(subtotal);
    expect(result.summary.qrDiscount).toBe(Math.round(subtotal * 0.02));
    expect(result.summary.namasteDiscount).toBe(Math.round(subtotal * 0.05));
  });

  it('fully rejects on any overselling line — no partial deduction emitted', () => {
    const stock = STOCK();
    stock['gungdi-ghee'] = 1;
    const lines = [
      { id: 'waiwai-5pack', vIdx: 0, qty: 1 },
      { id: 'gungdi-ghee', vIdx: 0, qty: 2 },
    ];
    const result = checkoutCart(lines, stock);
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('checkout should reject');
    expect(result.reason).toBe('oversell');
    expect(result.lines).toEqual(lines);
  });

  it('rejects an empty jhola', () => {
    const result = checkoutCart([], STOCK());
    expect(result).toEqual({ ok: false, reason: 'empty', lines: [] });
  });

  it('rejects when the whole checkout is over stock even if no single line is', () => {
    const stock = STOCK();
    stock['nun-1kg'] = 4;
    const lines = [
      { id: 'nun-1kg', vIdx: 0, qty: 2 },
      { id: 'nun-1kg', vIdx: 0, qty: 2 },
      { id: 'nun-1kg', vIdx: 0, qty: 1 },
    ];
    expect(checkoutCart(lines, stock).ok).toBe(false);
    expect(committedQtyFor(lines, 'nun-1kg')).toBe(5);
  });
});

describe('restoreCart', () => {
  it('restores a valid snapshot', () => {
    const stock = STOCK();
    const snapshot = [
      { id: 'waiwai-5pack', vIdx: 0, qty: 2 },
      { id: 'chiura-1kg', vIdx: 0, qty: 1 },
    ];
    expect(restoreCart(snapshot, stock)).toEqual(snapshot);
  });

  it('drops unknown ids, bad variants, and malformed entries', () => {
    const stock = STOCK();
    const snapshot = [
      { id: 'momo', vIdx: 0, qty: 1 },
      { id: 'nun-1kg', vIdx: 9, qty: 1 },
      { id: 'nun-1kg', vIdx: 0, qty: 0 },
      null,
      { id: 'nun-1kg', vIdx: 0, qty: 2 },
    ];
    expect(restoreCart(snapshot, stock)).toEqual([{ id: 'nun-1kg', vIdx: 0, qty: 2 }]);
  });

  it('clamps restored quantity to remaining stock and drops when sold out', () => {
    const stock = STOCK();
    stock['nun-1kg'] = 1;
    expect(restoreCart([{ id: 'nun-1kg', vIdx: 0, qty: 5 }], stock)).toEqual([{ id: 'nun-1kg', vIdx: 0, qty: 1 }]);
    stock['nun-1kg'] = 0;
    expect(restoreCart([{ id: 'nun-1kg', vIdx: 0, qty: 5 }], stock)).toEqual([]);
  });

  it('returns empty for non-array input', () => {
    expect(restoreCart(null, STOCK())).toEqual([]);
    expect(restoreCart('nope', STOCK())).toEqual([]);
  });
});
