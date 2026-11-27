import { describe, it, expect } from 'vitest';
import { CATALOG, getSku, getVariant, variantPrice, initialStockMap } from '../../src/commerce/catalog.js';

const SPEC_TABLE = {
  'waiwai-5pack': [{ label: '5-pack', price: 95 }, { label: '12-pack', price: 220 }],
  'ilam-tea-250g': [{ label: '250g', price: 180 }, { label: '500g', price: 340 }],
  'gungdi-ghee': [{ label: '500g', price: 420 }, { label: '1kg', price: 820 }],
  'marsyangdi-rice-5kg': [{ label: '5kg', price: 310 }, { label: '25kg', price: 1450 }],
  'nun-1kg': [{ label: '1kg', price: 25 }],
  'sakkhar-1kg': [{ label: '1kg', price: 95 }],
  'musuro-dal-1kg': [{ label: '1kg', price: 190 }, { label: '2kg', price: 370 }],
  'besaar-200g': [{ label: '200g', price: 60 }],
  'khorsani-100g': [{ label: '100g', price: 75 }],
  'masyaura-250g': [{ label: '250g', price: 130 }],
  'gundruk-250g': [{ label: '250g', price: 90 }, { label: '500g', price: 170 }],
  'sukuti-250g': [{ label: '250g', price: 320 }],
  'toriko-tel-1l': [{ label: '1L', price: 280 }, { label: '2L', price: 540 }],
  'chiura-1kg': [{ label: '1kg', price: 120 }],
  'sabun-nahaune': [{ label: 'bar', price: 60 }],
  'mombatti-4pack': [{ label: '4-pack', price: 50 }],
  'salai-10pack': [{ label: '10-pack', price: 25 }],
};

const SPEC_ZONES = {
  'waiwai-5pack': 'Front Pedi',
  'ilam-tea-250g': 'Counter',
  'gungdi-ghee': 'Back Rack',
  'marsyangdi-rice-5kg': 'Corner',
  'nun-1kg': 'Back Rack',
  'sakkhar-1kg': 'Back Rack',
  'musuro-dal-1kg': 'Back Rack',
  'besaar-200g': 'Back Rack',
  'khorsani-100g': 'Back Rack',
  'masyaura-250g': 'Back Rack',
  'gundruk-250g': 'Front Pedi',
  'sukuti-250g': 'Front Pedi',
  'toriko-tel-1l': 'Corner',
  'chiura-1kg': 'Corner',
  'sabun-nahaune': 'Front Pedi',
  'mombatti-4pack': 'Counter',
  'salai-10pack': 'Counter',
};

const SPEC_STOCK = {
  'waiwai-5pack': 48,
  'ilam-tea-250g': 20,
  'gungdi-ghee': 9,
  'marsyangdi-rice-5kg': 24,
  'nun-1kg': 40,
  'sakkhar-1kg': 30,
  'musuro-dal-1kg': 25,
  'besaar-200g': 35,
  'khorsani-100g': 30,
  'masyaura-250g': 22,
  'gundruk-250g': 18,
  'sukuti-250g': 12,
  'toriko-tel-1l': 26,
  'chiura-1kg': 28,
  'sabun-nahaune': 36,
  'mombatti-4pack': 24,
  'salai-10pack': 50,
};

describe('catalog', () => {
  it('holds exactly 17 SKUs', () => {
    expect(CATALOG).toHaveLength(17);
  });

  it('uses unique kebab-case ids', () => {
    const ids = CATALOG.map((sku) => sku.id);
    expect(new Set(ids).size).toBe(17);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it('matches every variant price and label in the spec table exactly', () => {
    expect(Object.keys(SPEC_TABLE)).toHaveLength(17);
    expect(new Set(CATALOG.map((sku) => sku.id))).toEqual(new Set(Object.keys(SPEC_TABLE)));
    for (const [id, spec] of Object.entries(SPEC_TABLE)) {
      expect(getSku(id).variants, id).toEqual(spec);
    }
  });

  it('places every SKU in its spec zone', () => {
    for (const [id, zone] of Object.entries(SPEC_ZONES)) {
      expect(getSku(id).zone, id).toBe(zone);
    }
  });

  it('carries the four landing-chip anchor prices as the default variant', () => {
    expect(variantPrice('waiwai-5pack', 0)).toBe(95);
    expect(variantPrice('ilam-tea-250g', 0)).toBe(180);
    expect(variantPrice('gungdi-ghee', 0)).toBe(420);
    expect(variantPrice('marsyangdi-rice-5kg', 0)).toBe(310);
  });

  it('matches the spec initial stock exactly', () => {
    expect(initialStockMap()).toEqual(SPEC_STOCK);
  });

  it('rejects unknown ids and out-of-range variants', () => {
    expect(() => getSku('momo')).toThrow();
    expect(() => getVariant('nun-1kg', 1)).toThrow();
    expect(() => getVariant('nun-1kg', -1)).toThrow();
    expect(() => variantPrice('nope', 0)).toThrow();
  });

  it('keeps stock within the 0–99 bound', () => {
    for (const sku of CATALOG) {
      expect(sku.stock).toBeGreaterThanOrEqual(0);
      expect(sku.stock).toBeLessThanOrEqual(99);
    }
  });
});
