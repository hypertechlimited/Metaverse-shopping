import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { buildProducts, productPlacements, zoneOfSku, PRODUCT_DRAW_CALL_BUDGET, SHAPE_HEIGHTS, SHAPE_RADIUS, PRODUCTS } from '../../src/world/products.js';
import { CATALOG } from '../../src/commerce/catalog.js';
import { PRODUCT_SPOTS, ZONES, OBSTACLES } from '../../src/world/layout.js';
import { ARCHITECTURE } from '../../src/world/architecture.js';
import { THUMBS } from '../../src/world/thumbs.js';

/** @param {number} x @param {number} z @param {{ minX: number, maxX: number, minZ: number, maxZ: number }} box @returns {boolean} */
function insideBox(x, z, box) {
  return x > box.minX && x < box.maxX && z > box.minZ && z < box.maxZ;
}

describe('product spots (layout truth)', () => {
  it('has exactly one spot per catalog SKU, no extras', () => {
    expect(Object.keys(PRODUCT_SPOTS).sort()).toEqual(CATALOG.map((sku) => sku.id).sort());
  });

  it('rests every product on its zone surface height', () => {
    for (const sku of CATALOG) {
      const spot = PRODUCT_SPOTS[sku.id];
      expect(spot[1]).toBe(ZONES[sku.zone].topY);
    }
  });

  it('keeps counter and rack SKUs inside their surface box', () => {
    const back = OBSTACLES.find((entry) => entry.name === 'Back Brick Wall');
    if (!back) throw new Error('layout.js must define the Back Brick Wall');
    for (const sku of CATALOG) {
      const zone = ZONES[sku.zone];
      const spot = PRODUCT_SPOTS[sku.id];
      if (zone.surface === 'East Pedi') {
        expect(spot[0]).toBeGreaterThanOrEqual(back.maxX);
        expect(spot[0]).toBeLessThanOrEqual(back.maxX + ARCHITECTURE.pediDepth);
        continue;
      }
      if (zone.surface === 'Street') continue;
      const box = /** @type {{ minX: number, maxX: number, minZ: number, maxZ: number }} */ (OBSTACLES.find((entry) => entry.name === zone.surface));
      expect(box, `${sku.id} zone surface ${zone.surface}`).toBeDefined();
      expect(spot[0]).toBeGreaterThanOrEqual(box.minX);
      expect(spot[0]).toBeLessThanOrEqual(box.maxX);
      expect(spot[2]).toBeGreaterThanOrEqual(box.minZ);
      expect(spot[2]).toBeLessThanOrEqual(box.maxZ);
    }
  });

  it('keeps corner (street) SKUs clear of every obstacle box', () => {
    for (const sku of CATALOG) {
      if (ZONES[sku.zone].surface !== 'Street') continue;
      const spot = PRODUCT_SPOTS[sku.id];
      for (const box of OBSTACLES) {
        expect(insideBox(spot[0], spot[2], box)).toBe(false);
      }
    }
  });

  it('keeps every SKU inside the street clamps', () => {
    for (const spot of Object.values(PRODUCT_SPOTS)) {
      expect(spot[0]).toBeGreaterThanOrEqual(-14);
      expect(spot[0]).toBeLessThanOrEqual(14);
      expect(spot[2]).toBeGreaterThanOrEqual(-14);
      expect(spot[2]).toBeLessThanOrEqual(14);
    }
  });
});

describe('product placements', () => {
  const placements = productPlacements();

  it('resolves all 17 SKUs with a valid thumb shape', () => {
    expect(placements).toHaveLength(17);
    for (const placement of placements) {
      expect(Object.values(THUMBS).some((spec) => spec.shape === placement.shape)).toBe(true);
      expect(SHAPE_HEIGHTS[placement.shape]).toBeGreaterThan(0);
      expect(SHAPE_RADIUS[placement.shape]).toBeGreaterThan(0);
    }
  });

  it('keeps proxy footprints from overlapping between SKUs', () => {
    for (let i = 0; i < placements.length; i++) {
      for (let j = i + 1; j < placements.length; j++) {
        const a = placements[i];
        const b = placements[j];
        const reach = SHAPE_RADIUS[a.shape] + SHAPE_RADIUS[b.shape] + PRODUCTS.proxyMargin * 2;
        const distance = Math.hypot(a.position[0] - b.position[0], a.position[2] - b.position[2]);
        if (a.zone !== b.zone) continue;
        expect(distance, `${a.id} vs ${b.id}`).toBeGreaterThanOrEqual(reach);
      }
    }
  });

  it('zoneOfSku maps catalog zones', () => {
    expect(zoneOfSku('musuro-dal-1kg')).toBe('Back Rack');
    expect(zoneOfSku('waiwai-5pack')).toBe('Front Pedi');
    expect(() => zoneOfSku('unknown')).toThrow();
  });
});

describe('buildProducts scene graph', () => {
  const scene = new THREE.Scene();
  const built = buildProducts(scene);

  it('merges to one mesh per zone — 4 draw calls', () => {
    expect(built.zoneMeshes).toHaveLength(PRODUCT_DRAW_CALL_BUDGET);
    expect(PRODUCT_DRAW_CALL_BUDGET).toBe(4);
    for (const mesh of built.zoneMeshes) {
      expect(mesh.geometry.index).not.toBeNull();
      expect(mesh.castShadow).toBe(true);
    }
  });

  it('gives every SKU an invisible raycast proxy tagged with userData.product', () => {
    expect(built.proxies).toHaveLength(17);
    const ids = built.proxies.map((proxy) => proxy.userData.product);
    expect(ids.sort()).toEqual(CATALOG.map((sku) => sku.id).sort());
    for (const proxy of built.proxies) {
      expect(proxy.visible).toBe(true);
      const material = /** @type {THREE.MeshBasicMaterial} */ (proxy.material);
      expect(material.visible).toBe(false);
    }
  });

  it('positions proxies on the spot with padded height for easy targeting', () => {
    for (const proxy of built.proxies) {
      const spot = PRODUCT_SPOTS[/** @type {string} */ (proxy.userData.product)];
      expect(proxy.position.x).toBeCloseTo(spot[0], 5);
      expect(proxy.position.z).toBeCloseTo(spot[2], 5);
      expect(proxy.position.y).toBeGreaterThan(spot[1]);
    }
  });

  it('disposes geometry and removes everything from the scene', () => {
    expect(scene.children.length).toBeGreaterThan(0);
    built.dispose();
    expect(scene.children.length).toBe(0);
  });
});
