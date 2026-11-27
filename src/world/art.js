import * as THREE from 'three';

/** @param {number} width @param {number} height @param {(ctx: CanvasRenderingContext2D, w: number, h: number) => void} drawFn @returns {HTMLCanvasElement} */
export function makeArt(width, height, drawFn) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'));
  drawFn(ctx, width, height);
  return canvas;
}

/** @param {HTMLCanvasElement} canvas @param {THREE.WebGLRenderer} renderer @returns {THREE.CanvasTexture} */
export function makeTexture(canvas, renderer) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return texture;
}

/** @param {HTMLCanvasElement} canvas @returns {THREE.CanvasTexture} */
export function makeBump(canvas) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

/** @param {CanvasRenderingContext2D} ctx @param {number} w @param {number} h */
export function drawBrick(ctx, w, h) {
  ctx.fillStyle = '#6e3a28';
  ctx.fillRect(0, 0, w, h);
  const rows = 10;
  const rowH = h / rows;
  const brickW = w / 5;
  for (let row = 0; row < rows; row++) {
    const offset = row % 2 === 0 ? 0 : brickW / 2;
    for (let col = -1; col < 6; col++) {
      const jitter = (Math.sin(row * 12.9898 + col * 78.233) * 43758.5453) % 1;
      const tone = 0.85 + Math.abs(jitter) * 0.3;
      ctx.fillStyle = `rgb(${Math.round(143 * tone)}, ${Math.round(59 * tone)}, ${Math.round(38 * tone)})`;
      ctx.fillRect(col * brickW + offset + 1.5, row * rowH + 1.5, brickW - 3, rowH - 3);
    }
  }
}

/** @param {CanvasRenderingContext2D} ctx @param {number} w @param {number} h */
export function drawBrickBump(ctx, w, h) {
  ctx.fillStyle = '#404040';
  ctx.fillRect(0, 0, w, h);
  const rows = 10;
  const rowH = h / rows;
  const brickW = w / 5;
  for (let row = 0; row < rows; row++) {
    const offset = row % 2 === 0 ? 0 : brickW / 2;
    for (let col = -1; col < 6; col++) {
      ctx.fillStyle = '#c0c0c0';
      ctx.fillRect(col * brickW + offset + 1.5, row * rowH + 1.5, brickW - 3, rowH - 3);
    }
  }
}

/** @param {CanvasRenderingContext2D} ctx @param {number} w @param {number} h */
export function drawCobble(ctx, w, h) {
  ctx.fillStyle = '#3d3a36';
  ctx.fillRect(0, 0, w, h);
  const cells = 8;
  const cellW = w / cells;
  const cellH = h / cells;
  for (let row = 0; row < cells; row++) {
    for (let col = 0; col < cells; col++) {
      const n = Math.abs(Math.sin(row * 91.7 + col * 47.29) * 43758.5453) % 1;
      const base = 88 + n * 42;
      ctx.fillStyle = `rgb(${Math.round(base)}, ${Math.round(base - 6)}, ${Math.round(base - 14)})`;
      const pad = 3 + n * 2;
      const skewX = (n - 0.5) * 4;
      ctx.fillRect(col * cellW + pad + skewX, row * cellH + pad, cellW - pad * 2, cellH - pad * 2);
    }
  }
}

/** @param {CanvasRenderingContext2D} ctx @param {number} w @param {number} h */
export function drawCobbleBump(ctx, w, h) {
  ctx.fillStyle = '#303030';
  ctx.fillRect(0, 0, w, h);
  const cells = 8;
  const cellW = w / cells;
  const cellH = h / cells;
  for (let row = 0; row < cells; row++) {
    for (let col = 0; col < cells; col++) {
      ctx.fillStyle = '#d0d0d0';
      const pad = 4;
      ctx.fillRect(col * cellW + pad, row * cellH + pad, cellW - pad * 2, cellH - pad * 2);
    }
  }
}
