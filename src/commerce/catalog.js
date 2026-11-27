/**
 * Catalog truth — the 17-SKU table from docs/CATALOG.md. Pure data + lookups:
 * no DOM, no Three.js. Prices are integer rupees; the default variant (vIdx 0)
 * of each pinned SKU carries the landing-chip anchor price.
 */

/** @typedef {{ label: string, price: number }} SkuVariant */

/** @typedef {{ id: string, nameNp: string, nameEn: string, art: string, zone: string, stock: number, variants: SkuVariant[] }} Sku */

/** @type {Sku[]} */
export const CATALOG = [
  { id: 'waiwai-5pack', nameNp: 'वाइ वाइ चाउचाउ', nameEn: 'Wai Wai noodles', art: 'noodles', zone: 'Front Pedi', stock: 48, variants: [{ label: '5-pack', price: 95 }, { label: '12-pack', price: 220 }] },
  { id: 'ilam-tea-250g', nameNp: 'इलाम चिया', nameEn: 'Ilam tea', art: 'tea', zone: 'Counter', stock: 20, variants: [{ label: '250g', price: 180 }, { label: '500g', price: 340 }] },
  { id: 'gungdi-ghee', nameNp: 'गुँदी घिउ', nameEn: 'Gungdi ghee', art: 'ghee', zone: 'Back Rack', stock: 9, variants: [{ label: '500g', price: 420 }, { label: '1kg', price: 820 }] },
  { id: 'marsyangdi-rice-5kg', nameNp: 'मर्स्याङ्दी चामल', nameEn: 'Marsyangdi rice', art: 'rice', zone: 'Corner', stock: 24, variants: [{ label: '5kg', price: 310 }, { label: '25kg', price: 1450 }] },
  { id: 'nun-1kg', nameNp: 'आयोडिनयुक्त नुन', nameEn: 'Iodized salt', art: 'salt', zone: 'Back Rack', stock: 40, variants: [{ label: '1kg', price: 25 }] },
  { id: 'sakkhar-1kg', nameNp: 'सक्खर', nameEn: 'Sugar', art: 'sugar', zone: 'Back Rack', stock: 30, variants: [{ label: '1kg', price: 95 }] },
  { id: 'musuro-dal-1kg', nameNp: 'मुसुरो दाल', nameEn: 'Red lentils', art: 'dal', zone: 'Back Rack', stock: 25, variants: [{ label: '1kg', price: 190 }, { label: '2kg', price: 370 }] },
  { id: 'besaar-200g', nameNp: 'बेसार', nameEn: 'Turmeric powder', art: 'turmeric', zone: 'Back Rack', stock: 35, variants: [{ label: '200g', price: 60 }] },
  { id: 'khorsani-100g', nameNp: 'सुकुटे खोर्सानी', nameEn: 'Dried chili', art: 'chili', zone: 'Back Rack', stock: 30, variants: [{ label: '100g', price: 75 }] },
  { id: 'masyaura-250g', nameNp: 'मस्यौरा', nameEn: 'Masyaura', art: 'masyaura', zone: 'Back Rack', stock: 22, variants: [{ label: '250g', price: 130 }] },
  { id: 'gundruk-250g', nameNp: 'गुन्द्रुक', nameEn: 'Gundruk', art: 'gundruk', zone: 'Front Pedi', stock: 18, variants: [{ label: '250g', price: 90 }, { label: '500g', price: 170 }] },
  { id: 'sukuti-250g', nameNp: 'सुकुटी', nameEn: 'Sukuti', art: 'sukuti', zone: 'Front Pedi', stock: 12, variants: [{ label: '250g', price: 320 }] },
  { id: 'toriko-tel-1l', nameNp: 'तोरीको तेल', nameEn: 'Mustard oil', art: 'oil', zone: 'Corner', stock: 26, variants: [{ label: '1L', price: 280 }, { label: '2L', price: 540 }] },
  { id: 'chiura-1kg', nameNp: 'चिउरा', nameEn: 'Beaten rice', art: 'chiura', zone: 'Corner', stock: 28, variants: [{ label: '1kg', price: 120 }] },
  { id: 'sabun-nahaune', nameNp: 'नुहाउने साबुन', nameEn: 'Bathing soap', art: 'soap', zone: 'Front Pedi', stock: 36, variants: [{ label: 'bar', price: 60 }] },
  { id: 'mombatti-4pack', nameNp: 'मोमबत्ती', nameEn: 'Candles', art: 'candle', zone: 'Counter', stock: 24, variants: [{ label: '4-pack', price: 50 }] },
  { id: 'salai-10pack', nameNp: 'सलाई', nameEn: 'Matches', art: 'matches', zone: 'Counter', stock: 50, variants: [{ label: '10-pack', price: 25 }] },
];

/** @param {string} id @returns {Sku} */
export function getSku(id) {
  const sku = CATALOG.find((entry) => entry.id === id);
  if (!sku) throw new Error(`unknown sku id: ${id}`);
  return sku;
}

/** @param {string} id @param {number} vIdx @returns {SkuVariant} */
export function getVariant(id, vIdx) {
  const sku = getSku(id);
  const variant = sku.variants[vIdx];
  if (!variant) throw new Error(`unknown variant ${vIdx} for sku: ${id}`);
  return variant;
}

/** @param {string} id @param {number} vIdx @returns {number} */
export function variantPrice(id, vIdx) {
  return getVariant(id, vIdx).price;
}

/** @returns {Record<string, number>} fresh initial stockMap per docs/CATALOG.md */
export function initialStockMap() {
  /** @type {Record<string, number>} */
  const map = {};
  for (const sku of CATALOG) map[sku.id] = sku.stock;
  return map;
}
