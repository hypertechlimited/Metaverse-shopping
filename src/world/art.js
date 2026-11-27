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

export const PASAL_BOARD_TEXT = 'सगरमाथा कर्नर पसल';
export const PASAL_BOARD_SUBTITLE = 'SAGARMATHA CORNER STORE';
export const DEVANAGARI_FONT_STACK = "'Noto Sans Devanagari', 'Mangal', 'Nirmala UI', sans-serif";

export const BOARD_COLORS = {
  crimson: '#991b1b',
  crimsonShade: '#7f1616',
  gold: '#fbbf24',
  goldShade: '#b3801a',
  parchment: '#f5e9d4',
  timber: '#452719',
};

export const ZINC_COLORS = {
  base: '#9aa3ab',
  valley: '#79828b',
  ridge: '#c2c9cf',
  rust: '#8a5a42',
};

export const ANKHI_JHYAL_COLORS = {
  timber: '#452719',
  timberDark: '#301a10',
  glow: '#fbbf24',
  glowDeep: '#8a4a12',
};

/** @param {CanvasRenderingContext2D} ctx @param {number} w @param {number} h */
export function drawPasalBoard(ctx, w, h) {
  ctx.fillStyle = BOARD_COLORS.crimson;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = BOARD_COLORS.crimsonShade;
  const n = Math.abs(Math.sin(7.13) * 43758.5453) % 1;
  for (let i = 0; i < 40; i++) {
    const px = (Math.abs(Math.sin(i * 91.7 + 5.2) * 43758.5453) % 1) * w;
    const py = (Math.abs(Math.sin(i * 47.29 + n) * 43758.5453) % 1) * h;
    ctx.globalAlpha = 0.08;
    ctx.fillRect(px, py, 14, 5);
    ctx.globalAlpha = 1;
  }
  ctx.strokeStyle = BOARD_COLORS.gold;
  ctx.lineWidth = Math.max(6, Math.round(h * 0.06));
  ctx.strokeRect(ctx.lineWidth, ctx.lineWidth, w - ctx.lineWidth * 2, h - ctx.lineWidth * 2);
  ctx.fillStyle = BOARD_COLORS.parchment;
  ctx.fillRect(w * 0.06, h * 0.16, w * 0.88, h * 0.68);
  ctx.strokeStyle = BOARD_COLORS.goldShade;
  ctx.lineWidth = Math.max(3, Math.round(h * 0.025));
  ctx.strokeRect(w * 0.06, h * 0.16, w * 0.88, h * 0.68);
  ctx.fillStyle = BOARD_COLORS.crimson;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 ${Math.round(h * 0.30)}px ${DEVANAGARI_FONT_STACK}`;
  ctx.fillText(PASAL_BOARD_TEXT, w / 2, h * 0.42);
  ctx.fillStyle = BOARD_COLORS.timber;
  ctx.font = `600 ${Math.round(h * 0.11)}px 'Trebuchet MS', 'DejaVu Sans', sans-serif`;
  ctx.fillText(PASAL_BOARD_SUBTITLE, w / 2, h * 0.72);
}

/** @param {CanvasRenderingContext2D} ctx @param {number} w @param {number} h */
export function drawZinc(ctx, w, h) {
  ctx.fillStyle = ZINC_COLORS.base;
  ctx.fillRect(0, 0, w, h);
  const ridges = 16;
  const stripeW = w / ridges;
  for (let col = 0; col < ridges; col++) {
    const grad = ctx.createLinearGradient(col * stripeW, 0, (col + 1) * stripeW, 0);
    grad.addColorStop(0, ZINC_COLORS.valley);
    grad.addColorStop(0.5, ZINC_COLORS.ridge);
    grad.addColorStop(1, ZINC_COLORS.valley);
    ctx.fillStyle = grad;
    ctx.fillRect(col * stripeW, 0, stripeW, h);
  }
  for (let i = 0; i < 26; i++) {
    const px = (Math.abs(Math.sin(i * 12.9898 + 4.2) * 43758.5453) % 1) * w;
    const streakH = 20 + ((Math.abs(Math.sin(i * 78.233) * 43758.5453) % 1) * h) / 3;
    ctx.globalAlpha = 0.10;
    ctx.fillStyle = ZINC_COLORS.rust;
    ctx.fillRect(px, h - streakH, 3 + (i % 3), streakH);
    ctx.globalAlpha = 1;
  }
}

/** @param {CanvasRenderingContext2D} ctx @param {number} w @param {number} h */
export function drawZincBump(ctx, w, h) {
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, w, h);
  const ridges = 16;
  const stripeW = w / ridges;
  for (let col = 0; col < ridges; col++) {
    const grad = ctx.createLinearGradient(col * stripeW, 0, (col + 1) * stripeW, 0);
    grad.addColorStop(0, '#404040');
    grad.addColorStop(0.5, '#d0d0d0');
    grad.addColorStop(1, '#404040');
    ctx.fillStyle = grad;
    ctx.fillRect(col * stripeW, 0, stripeW, h);
  }
}

/** @param {CanvasRenderingContext2D} ctx @param {number} w @param {number} h */
export function drawAnkhiJhyal(ctx, w, h) {
  ctx.fillStyle = ANKHI_JHYAL_COLORS.glowDeep;
  ctx.fillRect(0, 0, w, h);
  const grad = ctx.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w * 0.6);
  grad.addColorStop(0, ANKHI_JHYAL_COLORS.glow);
  grad.addColorStop(1, ANKHI_JHYAL_COLORS.glowDeep);
  ctx.fillStyle = grad;
  ctx.fillRect(w * 0.08, h * 0.08, w * 0.84, h * 0.84);
  ctx.fillStyle = ANKHI_JHYAL_COLORS.timber;
  ctx.fillRect(0, 0, w, h * 0.07);
  ctx.fillRect(0, h * 0.93, w, h * 0.07);
  ctx.fillRect(0, 0, w * 0.07, h);
  ctx.fillRect(w * 0.93, 0, w * 0.07, h);
  const bars = 6;
  const cellW = (w * 0.86) / bars;
  const cellH = (h * 0.86) / bars;
  ctx.fillStyle = ANKHI_JHYAL_COLORS.timber;
  for (let col = 0; col <= bars; col++) {
    ctx.fillRect(w * 0.07 + col * cellW - 3, h * 0.07, 6, h * 0.86);
  }
  for (let row = 0; row <= bars; row++) {
    ctx.fillRect(w * 0.07, h * 0.07 + row * cellH - 3, w * 0.86, 6);
  }
  ctx.fillStyle = ANKHI_JHYAL_COLORS.timberDark;
  for (let col = 0; col < bars; col++) {
    for (let row = 0; row < bars; row++) {
      const cx = w * 0.07 + col * cellW + cellW / 2;
      const cy = h * 0.07 + row * cellH + cellH / 2;
      if ((col + row) % 2 === 0) {
        ctx.beginPath();
        ctx.arc(cx, cy, cellW * 0.18, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(cx - cellW * 0.22, cy - cellW * 0.22, cellW * 0.44, cellW * 0.44);
      }
    }
  }
}

/** @param {CanvasRenderingContext2D} ctx @param {number} w @param {number} h */
export function drawFlame(ctx, w, h) {
  const grad = ctx.createRadialGradient(w / 2, h * 0.62, 2, w / 2, h * 0.62, w * 0.48);
  grad.addColorStop(0, 'rgba(255, 244, 200, 1)');
  grad.addColorStop(0.25, 'rgba(251, 191, 36, 0.9)');
  grad.addColorStop(0.6, 'rgba(234, 88, 12, 0.45)');
  grad.addColorStop(1, 'rgba(234, 88, 12, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(255, 250, 225, 0.95)';
  ctx.beginPath();
  ctx.ellipse(w / 2, h * 0.6, w * 0.08, h * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** @param {CanvasRenderingContext2D} ctx @param {number} w @param {number} h */
export function drawNepaliFlag(ctx, w, h) {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#991b1b';
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(12, 6);
  ctx.lineTo(w - 14, h * 0.34);
  ctx.lineTo(12, h * 0.5);
  ctx.lineTo(w - 8, h * 0.86);
  ctx.lineTo(12, h - 4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#f5f5f4';
  ctx.beginPath();
  ctx.arc(w * 0.3, h * 0.28, w * 0.055, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(w * 0.36, h * 0.68, w * 0.06, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#f5f5f4';
  ctx.lineWidth = 2;
  for (let ray = 0; ray < 8; ray++) {
    const angle = (ray / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(w * 0.36 + Math.cos(angle) * w * 0.075, h * 0.68 + Math.sin(angle) * w * 0.075);
    ctx.lineTo(w * 0.36 + Math.cos(angle) * w * 0.1, h * 0.68 + Math.sin(angle) * w * 0.1);
    ctx.stroke();
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
