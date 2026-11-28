import { describe, it, expect } from 'vitest';
import { CATALOG } from '../../src/commerce/catalog.js';
import { TAG_RAILS } from '../../src/world/layout.js';
import { TAG_ATLAS, railSegments, tagCellRect, drawTagCell } from '../../src/world/shelfTags.js';

describe('tag atlas cells', () => {
  it('partitions the atlas into 17 non-overlapping cells', () => {
    const rects = CATALOG.map((_, index) => tagCellRect(index, CATALOG.length));
    expect(rects).toHaveLength(17);
    for (let i = 0; i < rects.length; i++) {
      expect(rects[i].w).toBeCloseTo(TAG_ATLAS.width / CATALOG.length, 5);
      for (let j = i + 1; j < rects.length; j++) {
        const overlap = Math.min(rects[i].x + rects[i].w, rects[j].x + rects[j].w) - Math.max(rects[i].x, rects[j].x);
        expect(overlap).toBeLessThanOrEqual(0.001);
      }
    }
    expect(tagCellRect(CATALOG.length - 1, CATALOG.length).x + tagCellRect(CATALOG.length - 1, CATALOG.length).w)
      .toBeCloseTo(TAG_ATLAS.width, 5);
  });

  it('rejects out-of-range indices', () => {
    expect(() => tagCellRect(-1, 17)).toThrow();
    expect(() => tagCellRect(17, 17)).toThrow();
  });
});

describe('railSegments', () => {
  const segments = railSegments(CATALOG);

  it('tags every surfaced SKU exactly once, skipping street-corner sacks', () => {
    const surfaced = CATALOG.filter((sku) => TAG_RAILS.zones.includes(sku.zone));
    expect(segments).toHaveLength(surfaced.length);
    expect(segments.map((segment) => segment.skuId).sort()).toEqual(surfaced.map((sku) => sku.id).sort());
  });

  it('carries a unique atlas cell per segment', () => {
    const cells = segments.map((segment) => segment.cell);
    expect(new Set(cells).size).toBe(cells.length);
    for (const cell of cells) {
      expect(cell).toBeGreaterThanOrEqual(0);
      expect(cell).toBeLessThan(CATALOG.length);
    }
  });

  it('never overlaps segments on the same rail', () => {
    for (const face of ['+z', '+x']) {
      for (const tierGroup of [segments.filter((s) => s.face === face)]) {
        const sorted = [...tierGroup].sort((a, b) => (face === '+z' ? a.center[0] - b.center[0] : a.center[2] - b.center[2]));
        for (let i = 0; i + 1 < sorted.length; i++) {
          const a = sorted[i];
          const b = sorted[i + 1];
          const aCenter = face === '+z' ? a.center[0] : a.center[2];
          const bCenter = face === '+z' ? b.center[0] : b.center[2];
          if (Math.abs(a.center[1] - b.center[1]) > 0.001) continue;
          const gap = Math.abs(aCenter - bCenter) - a.length / 2 - b.length / 2;
          expect(gap, `${a.skuId} vs ${b.skuId} on ${face} rail`).toBeGreaterThanOrEqual(-0.001);
        }
      }
    }
  });

  it('stays deterministic', () => {
    expect(railSegments(CATALOG)).toEqual(segments);
  });
});

describe('drawTagCell contract', () => {
  /** @returns {{ ops: Array<{ op: string, args: any[] }>, ctx: any }} stub context recording calls */
  function stubCtx() {
    /** @type {Array<{ op: string, args: any[] }>} */
    const ops = [];
    const ctx = /** @type {any} */ ({});
    for (const name of ['save', 'beginPath', 'rect', 'clip', 'fillRect', 'moveTo', 'lineTo', 'stroke', 'fillText', 'restore']) {
      ctx[name] = (/** @type {...any} */ ...args) => {
        ops.push({ op: name, args });
      };
    }
    return { ops, ctx };
  }

  const rect = { x: 0, y: 0, w: 100, h: 128 };
  const sku = CATALOG.find((entry) => entry.id === 'nun-1kg');
  if (!sku) throw new Error('catalog must contain nun-1kg');

  it('paints the Devanagari name and the formatted price', () => {
    const { ops, ctx } = stubCtx();
    drawTagCell(ctx, rect, sku, 'रू 25', false);
    const texts = ops.filter((entry) => entry.op === 'fillText').map((entry) => entry.args[0]);
    expect(texts).toContain(sku.nameNp);
    expect(texts).toContain('रू 25');
    expect(texts).not.toContain('सकियो');
  });

  it('stamps sold-out cells instead of the price', () => {
    const { ops, ctx } = stubCtx();
    drawTagCell(ctx, rect, sku, 'रू 25', true);
    const texts = ops.filter((entry) => entry.op === 'fillText').map((entry) => entry.args[0]);
    expect(texts).toContain('सकियो');
    expect(texts).not.toContain('रू 25');
  });
});
