import * as THREE from 'three';
import { CATALOG } from '../commerce/catalog.js';
import { formatRupees } from '../commerce/pricing.js';
import { GONDOLA, OBSTACLES, PRODUCT_SPOTS, RACK_TIERS, SKU_TIERS, TAG_RAILS, ZONES } from './layout.js';
import { THUMBS } from './thumbs.js';
import { DEVANAGARI_FONT_STACK, loadDevanagariFont, makeArt, makeTexture } from './art.js';
import { placedGeometry, mergedParts, addMergedMesh } from './merge.js';
import { planFor, proxyExtent, frontZ } from './shelfPlanogram.js';
import { ARCHITECTURE } from './architecture.js';

export const TAG_ATLAS = {
  width: 2048,
  height: 128,
  background: '#f5f2ea',
  soldOutBackground: '#b8b2a4',
  ink: '#1c1814',
  price: '#991b1b',
  soldOutInk: '#5c564a',
  hairline: 'rgba(28, 24, 20, 0.28)',
  nameSize: 30,
  priceSize: 36,
};

const SLAB_FRONT_GROW = 0.07;
const RAIL_DROP = 0.01;

/** @typedef {{ skuId: string, cell: number, face: '+z' | '+x', center: [number, number, number], length: number }} RailSegment */

/**
 * Pure rail layout: one price-tag segment per surfaced SKU, positioned on the
 * shelf front its facings sit against, sized to the SKU's facing block.
 * Corner (street) SKUs get no rail — sacks carry no tags.
 * @param {typeof CATALOG} catalog
 * @returns {RailSegment[]}
 */
export function railSegments(catalog) {
  const plans = planFor(catalog);
  const rack = OBSTACLES.find((box) => box.name === 'Back Shelf Rack');
  const counter = OBSTACLES.find((box) => box.name === 'Wooden Counter');
  const wall = OBSTACLES.find((box) => box.name === 'Back Brick Wall');
  if (!rack || !counter || !wall) throw new Error('layout.js must define rack, counter and wall boxes');
  /** @type {RailSegment[]} */
  const segments = [];
  for (const [index, sku] of catalog.entries()) {
    if (!TAG_RAILS.zones.includes(sku.zone)) continue;
    const spot = PRODUCT_SPOTS[sku.id];
    if (!spot) throw new Error(`layout.js must define a product spot for: ${sku.id}`);
    const plan = plans.get(sku.id);
    if (!plan) throw new Error(`planogram must cover: ${sku.id}`);
    const shape = (THUMBS[sku.art] ?? THUMBS.sugar).shape;
    const extent = proxyExtent(shape, plan, plan.capacity);
    const length = extent.hx * 2;
    if (sku.zone === 'Back Rack') {
      const tierY = RACK_TIERS['Back Rack'][SKU_TIERS[sku.id]];
      if (tierY === undefined) throw new Error(`layout.js must define a tier for: ${sku.id}`);
      segments.push({
        skuId: sku.id,
        cell: index,
        face: '+z',
        center: [spot[0], tierY - GONDOLA.boardThickness - TAG_RAILS.railHeight / 2, rack.maxZ - 0.07 + TAG_RAILS.proudOfLip],
        length,
      });
    } else if (sku.zone === 'Counter') {
      segments.push({
        skuId: sku.id,
        cell: index,
        face: '+z',
        center: [spot[0], ZONES.Counter.topY - TAG_RAILS.railHeight / 2 - RAIL_DROP, counter.maxZ + SLAB_FRONT_GROW + TAG_RAILS.proudOfLip],
        length,
      });
    } else {
      segments.push({
        skuId: sku.id,
        cell: index,
        face: '+x',
        center: [wall.maxX + ARCHITECTURE.pediDepth + TAG_RAILS.proudOfLip, ZONES['Front Pedi'].topY - TAG_RAILS.railHeight / 2 - RAIL_DROP, frontZ(sku.zone, spot[2])],
        length,
      });
    }
  }
  return segments;
}

/**
 * Pure cell geometry in atlas pixels.
 * @param {number} index @param {number} total @param {number} [width] @param {number} [height]
 * @returns {{ x: number, y: number, w: number, h: number }}
 */
export function tagCellRect(index, total, width = TAG_ATLAS.width, height = TAG_ATLAS.height) {
  if (index < 0 || index >= total) throw new Error(`tag cell index out of range: ${index}`);
  return { x: (index * width) / total, y: 0, w: width / total, h: height };
}

/**
 * Pure drawing contract over a 2D context — golden-tested via stub contexts,
 * rendered for real by `buildShelfTags`.
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ x: number, y: number, w: number, h: number }} rect
 * @param {{ nameNp: string }} sku
 * @param {string} priceLabel
 * @param {boolean} soldOut
 */
export function drawTagCell(ctx, rect, sku, priceLabel, soldOut) {
  const pad = rect.h * 0.08;
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.fillStyle = soldOut ? TAG_ATLAS.soldOutBackground : TAG_ATLAS.background;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  ctx.strokeStyle = soldOut ? TAG_ATLAS.soldOutInk : TAG_ATLAS.hairline;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(rect.x, rect.y + 1);
  ctx.lineTo(rect.x + rect.w, rect.y + 1);
  ctx.moveTo(rect.x, rect.y + rect.h - 1);
  ctx.lineTo(rect.x + rect.w, rect.y + rect.h - 1);
  ctx.stroke();
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillStyle = soldOut ? TAG_ATLAS.soldOutInk : TAG_ATLAS.ink;
  ctx.font = `${TAG_ATLAS.nameSize}px ${DEVANAGARI_FONT_STACK}`;
  ctx.fillText(sku.nameNp, rect.x + rect.w / 2, rect.y + rect.h * 0.32, rect.w - pad * 2);
  ctx.fillStyle = soldOut ? TAG_ATLAS.soldOutInk : TAG_ATLAS.price;
  ctx.font = `${TAG_ATLAS.priceSize}px ${DEVANAGARI_FONT_STACK}`;
  ctx.fillText(soldOut ? 'सकियो' : priceLabel, rect.x + rect.w / 2, rect.y + rect.h * 0.72, rect.w - pad * 2);
  ctx.restore();
}

/**
 * Shelf-edge price-tag rails: one canvas atlas (one cell per SKU), all rail
 * strips merged into one mesh with one material — a single draw call that
 * stays live with stock (cells grey out on sell-out) and re-renders once the
 * vendored Devanagari font loads.
 * @param {THREE.Scene} scene
 * @param {THREE.WebGLRenderer} renderer
 * @returns {{ setStock: (stockMap: Record<string, number>) => void, dispose: () => void }}
 */
export function buildShelfTags(scene, renderer) {
  const segments = railSegments(CATALOG);
  const cellOfSku = new Map(segments.map((segment) => [segment.skuId, segment.cell]));
  /** @type {Map<string, boolean>} */
  const soldOutState = new Map();

  const canvas = makeArt(TAG_ATLAS.width, TAG_ATLAS.height, (ctx) => {
    for (const segment of segments) {
      const sku = /** @type {typeof CATALOG[number]} */ (CATALOG.find((entry) => entry.id === segment.skuId));
      drawTagCell(ctx, tagCellRect(segment.cell, CATALOG.length), sku, formatRupees(sku.variants[0].price), false);
    }
  });
  const texture = makeTexture(canvas, renderer);
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  const material = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.6 });

  /** @type {THREE.BufferGeometry[]} */
  const quads = [];
  for (const segment of segments) {
    const rect = tagCellRect(segment.cell, CATALOG.length);
    const u0 = rect.x / TAG_ATLAS.width;
    const u1 = (rect.x + rect.w) / TAG_ATLAS.width;
    const quad = new THREE.PlaneGeometry(segment.length, TAG_RAILS.railHeight);
    const uv = /** @type {THREE.BufferAttribute} */ (quad.attributes.uv);
    for (let i = 0; i < uv.count; i += 1) {
      uv.setX(i, u0 + uv.getX(i) * (u1 - u0));
    }
    const rotation = /** @type {[number, number, number]} */ (segment.face === '+x' ? [0, Math.PI / 2, 0] : [0, 0, 0]);
    quads.push(placedGeometry(quad, { position: segment.center, rotation }));
  }
  const mesh = addMergedMesh(scene, mergedParts(quads), material, { name: 'shelf-tags', castShadow: false, receiveShadow: false });

  /** @param {(sku: typeof CATALOG[number]) => boolean} isSoldOut */
  const redrawWhere = (isSoldOut) => {
    const ctx = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'));
    for (const sku of CATALOG) {
      const cell = cellOfSku.get(sku.id);
      if (cell === undefined) continue;
      const soldOut = isSoldOut(sku);
      if (soldOutState.get(sku.id) === soldOut) continue;
      soldOutState.set(sku.id, soldOut);
      drawTagCell(ctx, tagCellRect(cell, CATALOG.length), sku, formatRupees(sku.variants[0].price), soldOut);
    }
    texture.needsUpdate = true;
  };

  loadDevanagariFont().then((loaded) => {
    if (!loaded) return;
    const ctx = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'));
    for (const segment of segments) {
      const sku = /** @type {typeof CATALOG[number]} */ (CATALOG.find((entry) => entry.id === segment.skuId));
      drawTagCell(ctx, tagCellRect(segment.cell, CATALOG.length), sku, formatRupees(sku.variants[0].price), soldOutState.get(sku.id) === true);
    }
    texture.needsUpdate = true;
  });

  return {
    /** @param {Record<string, number>} stockMap */
    setStock(stockMap) {
      redrawWhere((sku) => (stockMap[sku.id] ?? 0) <= 0);
    },
    dispose() {
      scene.remove(mesh);
      mesh.geometry.dispose();
      material.dispose();
      texture.dispose();
    },
  };
}
