import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { CATALOG } from '../commerce/catalog.js';
import { PRODUCT_SPOTS, ZONES } from './layout.js';
import { THUMBS } from './thumbs.js';

export const PRODUCTS = {
  material: { roughness: 0.85, metalness: 0.02 },
  proxyMargin: 0.02,
  proxyHeightPad: 0.25,
  zoneOrder: ['Counter', 'Back Rack', 'Front Pedi', 'Corner'],
};

export const PRODUCT_DRAW_CALL_BUDGET = PRODUCTS.zoneOrder.length;

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

/** @param {THREE.BufferGeometry} geometry @param {number | string} hex @returns {THREE.BufferGeometry} */
function colorize(geometry, hex) {
  const color = new THREE.Color(hex);
  const count = geometry.attributes.position.count;
  const array = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    array[i * 3] = color.r;
    array[i * 3 + 1] = color.g;
    array[i * 3 + 2] = color.b;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(array, 3));
  return geometry;
}

/**
 * @param {import('./thumbs.js').ThumbShape} shape
 * @param {string} bodyHex
 * @param {string} accentHex
 * @returns {THREE.BufferGeometry[]} parts positioned with y = 0 at the base
 */
function buildShapeParts(shape, bodyHex, accentHex) {
  const parts = [];
  if (shape === 'pouch') {
    parts.push(colorize(new THREE.BoxGeometry(0.3, 0.36, 0.14).translate(0, 0.18, 0), bodyHex));
    parts.push(colorize(new THREE.BoxGeometry(0.31, 0.06, 0.15).translate(0, 0.39, 0), accentHex));
  } else if (shape === 'sack') {
    parts.push(colorize(new THREE.CylinderGeometry(0.13, 0.18, 0.34, 10).translate(0, 0.17, 0), bodyHex));
    parts.push(colorize(new THREE.CylinderGeometry(0.185, 0.185, 0.05, 10).translate(0, 0.15, 0), accentHex));
  } else if (shape === 'pot') {
    parts.push(colorize(new THREE.CylinderGeometry(0.15, 0.17, 0.22, 12).translate(0, 0.11, 0), bodyHex));
    parts.push(colorize(new THREE.CylinderGeometry(0.165, 0.165, 0.03, 12).translate(0, 0.235, 0), accentHex));
  } else if (shape === 'bottle') {
    parts.push(colorize(new THREE.CylinderGeometry(0.09, 0.09, 0.32, 10).translate(0, 0.16, 0), bodyHex));
    parts.push(colorize(new THREE.CylinderGeometry(0.045, 0.05, 0.12, 8).translate(0, 0.38, 0), accentHex));
  } else if (shape === 'bar') {
    parts.push(colorize(new THREE.BoxGeometry(0.24, 0.08, 0.16).translate(0, 0.04, 0), bodyHex));
    parts.push(colorize(new THREE.BoxGeometry(0.245, 0.03, 0.165).translate(0, 0.04, 0), accentHex));
  } else if (shape === 'bundle') {
    parts.push(colorize(new THREE.CylinderGeometry(0.1, 0.1, 0.3, 8).translate(0, 0.15, 0), bodyHex));
    parts.push(colorize(new THREE.CylinderGeometry(0.105, 0.105, 0.04, 8).translate(0, 0.22, 0), accentHex));
  } else {
    parts.push(colorize(new THREE.BoxGeometry(0.26, 0.18, 0.12).translate(0, 0.09, 0), bodyHex));
    parts.push(colorize(new THREE.BoxGeometry(0.264, 0.07, 0.124).translate(0, 0.09, 0), accentHex));
  }
  return parts;
}

/** @returns {Array<{ id: string, zone: string, shape: import('./thumbs.js').ThumbShape, body: string, accent: string, position: [number, number, number] }>} */
export function productPlacements() {
  return CATALOG.map((sku) => {
    const spot = PRODUCT_SPOTS[sku.id];
    if (!spot) throw new Error(`layout.js must define a product spot for: ${sku.id}`);
    const spec = THUMBS[sku.art] ?? THUMBS.sugar;
    return { id: sku.id, zone: sku.zone, shape: spec.shape, body: spec.body, accent: spec.accent, position: spot };
  });
}

/**
 * Builds all 17 SKU meshes: one vertex-colored merged mesh per zone (4 draw
 * calls) plus invisible raycast proxy boxes carrying `userData.product`.
 * @param {THREE.Scene} scene
 * @returns {{ zoneMeshes: THREE.Mesh[], proxies: THREE.Mesh[], dispose: () => void }}
 */
export function buildProducts(scene) {
  const placements = productPlacements();
  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: PRODUCTS.material.roughness,
    metalness: PRODUCTS.material.metalness,
  });
  const proxyMaterial = new THREE.MeshBasicMaterial({ visible: false });
  /** @type {Map<string, THREE.BufferGeometry[]>} */
  const zoneParts = new Map(PRODUCTS.zoneOrder.map((zone) => [zone, []]));
  /** @type {THREE.Mesh[]} */
  const zoneMeshes = [];
  /** @type {THREE.Mesh[]} */
  const proxies = [];
  const proxyGeometry = new THREE.BoxGeometry(1, 1, 1);

  for (const placement of placements) {
    const parts = buildShapeParts(placement.shape, placement.body, placement.accent);
    const [x, baseY, z] = placement.position;
    for (const part of parts) part.translate(x, baseY, z);
    const bucket = zoneParts.get(placement.zone);
    if (!bucket) throw new Error(`layout.js zone order is missing: ${placement.zone}`);
    bucket.push(...parts);

    const height = SHAPE_HEIGHTS[placement.shape] + PRODUCTS.proxyHeightPad;
    const radius = SHAPE_RADIUS[placement.shape] + PRODUCTS.proxyMargin;
    const proxy = new THREE.Mesh(proxyGeometry, proxyMaterial);
    proxy.scale.set(radius * 2, height, radius * 2);
    proxy.position.set(x, baseY + height / 2 - PRODUCTS.proxyMargin, z);
    proxy.userData.product = placement.id;
    proxies.push(proxy);
  }

  for (const [zone, parts] of zoneParts) {
    const merged = mergeGeometries(parts);
    for (const part of parts) part.dispose();
    const mesh = new THREE.Mesh(merged, material);
    mesh.name = `products-${zone}`;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    zoneMeshes.push(mesh);
  }

  const proxyGroup = new THREE.Group();
  proxyGroup.name = 'product-proxies';
  for (const proxy of proxies) proxyGroup.add(proxy);
  scene.add(proxyGroup);

  return {
    zoneMeshes,
    proxies,
    dispose() {
      for (const mesh of zoneMeshes) {
        scene.remove(mesh);
        mesh.geometry.dispose();
      }
      material.dispose();
      proxyGroup.remove(...proxies);
      proxyGeometry.dispose();
      proxyMaterial.dispose();
      scene.remove(proxyGroup);
    },
  };
}

/** @param {string} skuId @returns {string} zone label for the SKU */
export function zoneOfSku(skuId) {
  const placement = productPlacements().find((entry) => entry.id === skuId);
  if (!placement) throw new Error(`no placement for sku: ${skuId}`);
  return ZONES[placement.zone].label;
}
