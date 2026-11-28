import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { CATALOG } from '../commerce/catalog.js';
import { PRODUCT_SPOTS, ZONES } from './layout.js';
import { THUMBS } from './thumbs.js';
import {
  SHAPE_HEIGHTS,
  SHAPE_RADIUS,
  planFor,
  liveUnits,
  facingSlots,
  proxyExtent,
  frontZ,
} from './shelfPlanogram.js';

export { SHAPE_HEIGHTS, SHAPE_RADIUS };

export const PRODUCTS = {
  material: { roughness: 0.85, metalness: 0.02 },
  proxyMargin: 0.02,
  proxyHeightPad: 0.25,
  zoneOrder: ['Counter', 'Back Rack', 'Front Pedi', 'Corner'],
};

export const PRODUCT_DRAW_CALL_BUDGET = PRODUCTS.zoneOrder.length;

const WHITE = 0xffffff;

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
 * @returns {THREE.BufferGeometry[]} uncolored parts positioned with y = 0 at the base
 */
function rawShapeParts(shape) {
  if (shape === 'pouch') {
    return [
      new THREE.BoxGeometry(0.3, 0.36, 0.14).translate(0, 0.18, 0),
      new THREE.BoxGeometry(0.31, 0.06, 0.15).translate(0, 0.39, 0),
    ];
  }
  if (shape === 'sack') {
    return [
      new THREE.CylinderGeometry(0.13, 0.18, 0.34, 10).translate(0, 0.17, 0),
      new THREE.CylinderGeometry(0.185, 0.185, 0.05, 10).translate(0, 0.15, 0),
    ];
  }
  if (shape === 'pot') {
    return [
      new THREE.CylinderGeometry(0.15, 0.17, 0.22, 12).translate(0, 0.11, 0),
      new THREE.CylinderGeometry(0.165, 0.165, 0.03, 12).translate(0, 0.235, 0),
    ];
  }
  if (shape === 'bottle') {
    return [
      new THREE.CylinderGeometry(0.09, 0.09, 0.32, 10).translate(0, 0.16, 0),
      new THREE.CylinderGeometry(0.045, 0.05, 0.12, 8).translate(0, 0.38, 0),
    ];
  }
  if (shape === 'bar') {
    return [
      new THREE.BoxGeometry(0.24, 0.08, 0.16).translate(0, 0.04, 0),
      new THREE.BoxGeometry(0.245, 0.03, 0.165).translate(0, 0.04, 0),
    ];
  }
  if (shape === 'bundle') {
    return [
      new THREE.CylinderGeometry(0.1, 0.1, 0.3, 8).translate(0, 0.15, 0),
      new THREE.CylinderGeometry(0.105, 0.105, 0.04, 8).translate(0, 0.22, 0),
    ];
  }
  return [
    new THREE.BoxGeometry(0.26, 0.18, 0.12).translate(0, 0.09, 0),
    new THREE.BoxGeometry(0.264, 0.07, 0.124).translate(0, 0.09, 0),
  ];
}

/**
 * @param {import('./thumbs.js').ThumbShape} shape
 * @param {string} bodyHex
 * @param {string} accentHex
 * @returns {THREE.BufferGeometry[]} parts positioned with y = 0 at the base
 */
function buildShapeParts(shape, bodyHex, accentHex) {
  return rawShapeParts(shape).map((part, index) => colorize(part, index === 0 ? bodyHex : accentHex));
}

/** @param {import('./thumbs.js').ThumbShape} shape @returns {THREE.BufferGeometry} white-tinted body silhouette for instanced facings */
function silhouetteGeometry(shape) {
  const parts = rawShapeParts(shape);
  for (const part of parts.slice(1)) part.dispose();
  return colorize(parts[0], WHITE);
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

/** @param {string} skuId @returns {string} zone label for the SKU */
export function zoneOfSku(skuId) {
  const placement = productPlacements().find((entry) => entry.id === skuId);
  if (!placement) throw new Error(`no placement for sku: ${skuId}`);
  return ZONES[placement.zone].label;
}

/**
 * Builds all 17 SKU meshes: one vertex-colored merged mesh per zone (hero
 * facing slot per SKU, 4 draw calls), one InstancedMesh per shape class for
 * the extra facings (planogram-driven), and invisible raycast proxy boxes
 * carrying `userData.product` that cover each SKU's full facing block.
 * @param {THREE.Scene} scene
 * @returns {{
 *   zoneMeshes: THREE.Mesh[],
 *   proxies: THREE.Mesh[],
 *   facingMeshes: THREE.InstancedMesh[],
 *   setStock: (stockMap: Record<string, number>) => void,
 *   dispose: () => void,
 * }}
 */
export function buildProducts(scene) {
  const placements = productPlacements();
  const plans = planFor(CATALOG);
  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: PRODUCTS.material.roughness,
    metalness: PRODUCTS.material.metalness,
  });
  const proxyMaterial = new THREE.MeshBasicMaterial({ visible: false });
  const proxyGeometry = new THREE.BoxGeometry(1, 1, 1);

  /** @type {Map<string, THREE.BufferGeometry[]>} */
  const zoneBuckets = new Map(PRODUCTS.zoneOrder.map((zone) => [zone, []]));
  /** @type {Map<string, { x: number, y: number, z: number, shape: import('./thumbs.js').ThumbShape, body: string, zone: string, plan: import('./shelfPlanogram.js').FacingPlan }>} */
  const skuStates = new Map();

  for (const placement of placements) {
    const plan = plans.get(placement.id);
    if (!plan) throw new Error(`planogram must cover: ${placement.id}`);
    const [x, baseY, z] = placement.position;
    const front = frontZ(placement.zone, z);
    const slots = facingSlots(placement.shape, plan);
    const hero = slots[0];
    const heroPos = { x: x + hero[0], y: baseY, z: front + hero[1] };
    skuStates.set(placement.id, { ...heroPos, shape: placement.shape, body: placement.body, zone: placement.zone, plan });
    const parts = buildShapeParts(placement.shape, placement.body, placement.accent);
    for (const part of parts) part.translate(heroPos.x, heroPos.y, heroPos.z);
    const bucket = zoneBuckets.get(placement.zone);
    if (!bucket) throw new Error(`layout.js zone order is missing: ${placement.zone}`);
    bucket.push(...parts);
  }

  /** @type {Map<string, { geometry: THREE.BufferGeometry, parts: THREE.BufferGeometry[] }>} */
  const zoneGeometries = new Map();
  for (const [zone, parts] of zoneBuckets) {
    zoneGeometries.set(zone, { geometry: mergeGeometries(parts), parts });
  }

  /** @type {THREE.Mesh[]} */
  const zoneMeshes = [];
  for (const [zone, entry] of zoneGeometries) {
    const mesh = new THREE.Mesh(entry.geometry, material);
    mesh.name = `products-${zone}`;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    zoneMeshes.push(mesh);
  }

  /** @type {Map<import('./thumbs.js').ThumbShape, number>} */
  const capacityByShape = new Map();
  for (const state of skuStates.values()) {
    if (state.plan.capacity <= 1) continue;
    capacityByShape.set(state.shape, (capacityByShape.get(state.shape) ?? 0) + state.plan.capacity - 1);
  }

  /** @type {Map<string, { mesh: THREE.InstancedMesh, used: number }>} */
  const shapeMeshes = new Map();
  /** @type {THREE.InstancedMesh[]} */
  const facingMeshes = [];
  for (const [shape, capacity] of capacityByShape) {
    const mesh = new THREE.InstancedMesh(silhouetteGeometry(shape), material, capacity);
    mesh.name = `facings-${shape}`;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.count = 0;
    mesh.frustumCulled = false;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(mesh);
    shapeMeshes.set(shape, { mesh, used: 0 });
    facingMeshes.push(mesh);
  }

  /** @type {THREE.Mesh[]} */
  const proxies = [];
  const proxyGroup = new THREE.Group();
  proxyGroup.name = 'product-proxies';
  const dummy = new THREE.Object3D();
  const tint = new THREE.Color();

  for (const placement of placements) {
    const state = skuStates.get(placement.id);
    if (!state) throw new Error(`missing sku state: ${placement.id}`);
    const extent = proxyExtent(state.shape, state.plan, state.plan.capacity);
    const proxy = new THREE.Mesh(proxyGeometry, proxyMaterial);
    const height = SHAPE_HEIGHTS[state.shape] + PRODUCTS.proxyHeightPad;
    proxy.scale.set(extent.hx * 2, height, extent.hz * 2);
    proxy.position.set(placement.position[0], state.y + height / 2 - PRODUCTS.proxyMargin, state.z + extent.cz);
    proxy.userData.product = placement.id;
    proxies.push(proxy);
    proxyGroup.add(proxy);
  }
  scene.add(proxyGroup);

  const wasEmpty = new Set();

  /** @param {string} zone */
  const rebuildZone = (zone) => {
    const bucketEntry = zoneGeometries.get(zone);
    const mesh = zoneMeshes.find((entry) => entry.name === `products-${zone}`);
    if (!bucketEntry || !mesh) throw new Error(`missing zone build: ${zone}`);
    for (const part of bucketEntry.parts) part.dispose();
    /** @type {THREE.BufferGeometry[]} */
    const parts = [];
    for (const placement of placements) {
      if (placement.zone !== zone) continue;
      if (wasEmpty.has(placement.id)) continue;
      const state = skuStates.get(placement.id);
      if (!state) throw new Error(`missing sku state: ${placement.id}`);
      const built = buildShapeParts(state.shape, state.body, placement.accent);
      for (const part of built) part.translate(state.x, state.y, state.z);
      parts.push(...built);
    }
    const merged = mergeGeometries(parts);
    for (const part of parts) part.dispose();
    mesh.geometry.dispose();
    mesh.geometry = merged;
    bucketEntry.geometry = merged;
    bucketEntry.parts = parts;
  };

  return {
    zoneMeshes,
    proxies,
    facingMeshes,
    /**
     * Depletes facings to match live stock, resizes pick proxies to the
     * visible facing block, and rebuilds a zone mesh when a SKU crosses
     * to (or back from) zero stock.
     * @param {Record<string, number>} stockMap
     */
    setStock(stockMap) {
      /** @type {Map<string, number>} */
      const usedByShape = new Map();
      /** @type {Set<string>} */
      const dirtyZones = new Set();
      for (const placement of placements) {
        const state = skuStates.get(placement.id);
        if (!state) throw new Error(`missing sku state: ${placement.id}`);
        const stock = stockMap[placement.id] ?? 0;
        const units = liveUnits(state.plan, stock);
        const slots = facingSlots(state.shape, state.plan);
        let used = usedByShape.get(state.shape) ?? 0;
        const shapeEntry = shapeMeshes.get(state.shape);
        for (let i = 1; i < units; i += 1) {
          const slot = slots[i];
          if (!slot) break;
          if (!shapeEntry) throw new Error(`missing facing mesh for shape: ${state.shape}`);
          dummy.position.set(state.x + slot[0], state.y, state.z + slot[1]);
          dummy.updateMatrix();
          shapeEntry.mesh.setMatrixAt(used, dummy.matrix);
          shapeEntry.mesh.setColorAt(used, tint.set(state.body));
          used += 1;
        }
        usedByShape.set(state.shape, used);
        const empty = units === 0;
        if (empty !== wasEmpty.has(placement.id)) {
          if (empty) wasEmpty.add(placement.id);
          else wasEmpty.delete(placement.id);
          dirtyZones.add(placement.zone);
        }
        const proxy = proxies.find((entry) => entry.userData.product === placement.id);
        if (!proxy) throw new Error(`missing proxy for: ${placement.id}`);
        const extent = proxyExtent(state.shape, state.plan, stock);
        const height = SHAPE_HEIGHTS[state.shape] + PRODUCTS.proxyHeightPad;
        proxy.scale.set(extent.hx * 2, height, extent.hz * 2);
        proxy.position.set(placement.position[0], state.y + height / 2 - PRODUCTS.proxyMargin, state.z + extent.cz);
      }
      for (const [shape, entry] of shapeMeshes) {
        const used = usedByShape.get(shape) ?? 0;
        entry.mesh.count = used;
        entry.mesh.instanceMatrix.needsUpdate = true;
        if (entry.mesh.instanceColor) entry.mesh.instanceColor.needsUpdate = true;
        entry.used = used;
      }
      for (const zone of dirtyZones) rebuildZone(zone);
    },
    dispose() {
      for (const mesh of zoneMeshes) {
        scene.remove(mesh);
        mesh.geometry.dispose();
      }
      for (const entry of shapeMeshes.values()) {
        scene.remove(entry.mesh);
        entry.mesh.geometry.dispose();
        entry.mesh.dispose();
      }
      material.dispose();
      proxyGroup.remove(...proxies);
      proxyGeometry.dispose();
      proxyMaterial.dispose();
      scene.remove(proxyGroup);
    },
  };
}
