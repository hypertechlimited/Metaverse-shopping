/**
 * Procedural catalog thumbnails — the 2D twin of the M4 product meshes.
 * `drawThumb` is pure canvas (makeArt-compatible); main.js caches its
 * dataURLs and hands them to the catalog drawer / inspector / bill, keeping
 * `commerce/` DOM-free and `ui/` free of `world/` imports.
 */

/** @typedef {'sack' | 'pouch' | 'bottle' | 'pot' | 'bar' | 'bundle' | 'box'} ThumbShape */

/** @typedef {{ shape: ThumbShape, body: string, accent: string }} ThumbSpec */

/** @type {Record<string, ThumbSpec>} */
export const THUMBS = {
  noodles: { shape: 'pouch', body: '#d94f2b', accent: '#f5efe6' },
  tea: { shape: 'pouch', body: '#4a5d3a', accent: '#e5d9c9' },
  ghee: { shape: 'pot', body: '#b06a35', accent: '#452719' },
  rice: { shape: 'sack', body: '#c9a86a', accent: '#452719' },
  salt: { shape: 'pouch', body: '#e9e4da', accent: '#0369a1' },
  sugar: { shape: 'pouch', body: '#efe6d2', accent: '#c9a86a' },
  dal: { shape: 'pouch', body: '#b3543f', accent: '#e5d9c9' },
  turmeric: { shape: 'box', body: '#d99a2b', accent: '#452719' },
  chili: { shape: 'bundle', body: '#991b1b', accent: '#452719' },
  masyaura: { shape: 'pouch', body: '#c9b28a', accent: '#8f3b26' },
  gundruk: { shape: 'pouch', body: '#3f4a2a', accent: '#c9a86a' },
  sukuti: { shape: 'box', body: '#6b3226', accent: '#c9a86a' },
  oil: { shape: 'bottle', body: '#c98a1f', accent: '#452719' },
  chiura: { shape: 'sack', body: '#d8c9a3', accent: '#8f3b26' },
  soap: { shape: 'bar', body: '#7ba7c9', accent: '#f5efe6' },
  candle: { shape: 'box', body: '#991b1b', accent: '#f5efe6' },
  matches: { shape: 'box', body: '#8f3b26', accent: '#e5d9c9' },
};

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} w
 * @param {number} h
 * @param {string} key
 */
export function drawThumb(ctx, w, h, key) {
  const spec = THUMBS[key] ?? THUMBS.sugar;
  const cx = w / 2;
  const baseY = h * 0.88;
  ctx.save();

  const shadow = ctx.createRadialGradient(cx, baseY, 2, cx, baseY, w * 0.34);
  shadow.addColorStop(0, 'rgba(30, 20, 12, 0.34)');
  shadow.addColorStop(1, 'rgba(30, 20, 12, 0)');
  ctx.fillStyle = shadow;
  ctx.fillRect(0, h * 0.7, w, h * 0.3);

  ctx.fillStyle = spec.body;
  ctx.strokeStyle = 'rgba(30, 20, 12, 0.4)';
  ctx.lineWidth = Math.max(2, w * 0.02);

  if (spec.shape === 'sack') {
    const top = h * 0.2;
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.1, top);
    ctx.quadraticCurveTo(cx - w * 0.42, h * 0.45, cx - w * 0.34, baseY);
    ctx.lineTo(cx + w * 0.34, baseY);
    ctx.quadraticCurveTo(cx + w * 0.42, h * 0.45, cx + w * 0.1, top);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = spec.accent;
    ctx.lineWidth = Math.max(3, w * 0.045);
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.13, top - h * 0.01);
    ctx.lineTo(cx + w * 0.13, top - h * 0.01);
    ctx.stroke();
  } else if (spec.shape === 'pouch') {
    const top = h * 0.14;
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.12, top);
    ctx.lineTo(cx - w * 0.3, h * 0.34);
    ctx.lineTo(cx - w * 0.3, baseY);
    ctx.lineTo(cx + w * 0.3, baseY);
    ctx.lineTo(cx + w * 0.3, h * 0.34);
    ctx.lineTo(cx + w * 0.12, top);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = spec.accent;
    ctx.fillRect(cx - w * 0.3, h * 0.5, w * 0.6, h * 0.14);
  } else if (spec.shape === 'bottle') {
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.09, h * 0.1);
    ctx.lineTo(cx - w * 0.09, h * 0.32);
    ctx.quadraticCurveTo(cx - w * 0.3, h * 0.44, cx - w * 0.28, baseY);
    ctx.lineTo(cx + w * 0.28, baseY);
    ctx.quadraticCurveTo(cx + w * 0.3, h * 0.44, cx + w * 0.09, h * 0.32);
    ctx.lineTo(cx + w * 0.09, h * 0.1);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = spec.accent;
    ctx.fillRect(cx - w * 0.12, h * 0.06, w * 0.24, h * 0.08);
  } else if (spec.shape === 'pot') {
    ctx.beginPath();
    ctx.ellipse(cx, h * 0.62, w * 0.32, h * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = spec.accent;
    ctx.beginPath();
    ctx.ellipse(cx, h * 0.36, w * 0.22, h * 0.06, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (spec.shape === 'bar') {
    roundRect(ctx, cx - w * 0.34, h * 0.4, w * 0.68, h * 0.42, w * 0.08);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = spec.accent;
    ctx.lineWidth = Math.max(2, w * 0.03);
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.22, h * 0.56);
    ctx.lineTo(cx + w * 0.22, h * 0.56);
    ctx.stroke();
  } else if (spec.shape === 'bundle') {
    ctx.beginPath();
    ctx.ellipse(cx, h * 0.62, w * 0.3, h * 0.26, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = spec.accent;
    ctx.lineWidth = Math.max(3, w * 0.04);
    ctx.beginPath();
    ctx.moveTo(cx - w * 0.16, h * 0.44);
    ctx.lineTo(cx + w * 0.02, h * 0.32);
    ctx.stroke();
  } else {
    roundRect(ctx, cx - w * 0.32, h * 0.28, w * 0.64, h * 0.58, w * 0.05);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = spec.accent;
    ctx.fillRect(cx - w * 0.32, h * 0.46, w * 0.64, h * 0.12);
  }

  ctx.restore();
}

/** @param {CanvasRenderingContext2D} ctx @param {number} x @param {number} y @param {number} w @param {number} h @param {number} r */
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
