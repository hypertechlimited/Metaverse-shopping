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

export const SKY_COLORS = {
  zenith: '#31506e',
  upper: '#8fa0ab',
  horizon: '#f0c48c',
  glow: '#ffe4b0',
  ground: '#8a5c40',
};

export const SKY = { width: 1024, height: 512, glowX: 0.66, glowY: 0.52, glowRadius: 0.2, cloudCount: 9 };

/** @param {CanvasRenderingContext2D} ctx @param {number} w @param {number} h */
export function drawSky(ctx, w, h) {
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, SKY_COLORS.zenith);
  grad.addColorStop(0.36, SKY_COLORS.upper);
  grad.addColorStop(0.5, SKY_COLORS.horizon);
  grad.addColorStop(0.56, SKY_COLORS.glow);
  grad.addColorStop(0.64, SKY_COLORS.ground);
  grad.addColorStop(1, SKY_COLORS.ground);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  const glow = ctx.createRadialGradient(w * SKY.glowX, h * SKY.glowY, 4, w * SKY.glowX, h * SKY.glowY, w * SKY.glowRadius);
  glow.addColorStop(0, 'rgba(255, 236, 190, 0.6)');
  glow.addColorStop(1, 'rgba(255, 214, 150, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(255, 244, 226, 0.08)';
  for (let i = 0; i < SKY.cloudCount; i++) {
    const cy = h * (0.18 + (Math.abs(Math.sin(i * 91.7 + 3.3) * 43758.5453) % 1) * 0.24);
    const cx = (Math.abs(Math.sin(i * 47.29 + 8.1) * 43758.5453) % 1) * w;
    const cw = w * (0.1 + (Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1) * 0.14);
    ctx.fillRect(cx, cy, cw, 4 + (i % 3) * 3);
  }
}

export const CONTACT_AO = { size: 256, inner: 'rgba(16, 10, 6, 0.55)', outer: 'rgba(16, 10, 6, 0)' };

/** @param {CanvasRenderingContext2D} ctx @param {number} w @param {number} h */
export function drawContactAO(ctx, w, h) {
  const grad = ctx.createRadialGradient(w / 2, h / 2, w * 0.08, w / 2, h / 2, w * 0.5);
  grad.addColorStop(0, CONTACT_AO.inner);
  grad.addColorStop(0.55, 'rgba(16, 10, 6, 0.28)');
  grad.addColorStop(1, CONTACT_AO.outer);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

export const BRICK_COLORS = {
  mortar: '#3a2a20',
  terracotta: [150, 66, 42],
  fired: [110, 52, 40],
  washed: [172, 96, 64],
  bevelLight: 'rgba(255, 226, 178, 0.14)',
  bevelDark: 'rgba(20, 8, 4, 0.22)',
  wash: 'rgba(238, 226, 200, 0.07)',
};

/** @param {CanvasRenderingContext2D} ctx @param {number} w @param {number} h */
export function drawBrick(ctx, w, h) {
  ctx.fillStyle = BRICK_COLORS.mortar;
  ctx.fillRect(0, 0, w, h);
  const rows = 10;
  const rowH = h / rows;
  const brickW = w / 5;
  for (let row = 0; row < rows; row++) {
    const offset = row % 2 === 0 ? 0 : brickW / 2;
    const courseTone = 0.9 + (Math.abs(Math.sin(row * 23.17 + 1.4) * 43758.5453) % 1) * 0.18;
    for (let col = -1; col < 6; col++) {
      const pick = Math.abs(Math.sin(row * 12.9898 + col * 78.233) * 43758.5453) % 1;
      const family = pick > 0.82 ? BRICK_COLORS.washed : pick > 0.24 ? BRICK_COLORS.terracotta : BRICK_COLORS.fired;
      const tone = courseTone * (0.88 + (Math.abs(Math.sin(row * 7.31 + col * 19.7) * 43758.5453) % 1) * 0.24);
      const x = col * brickW + offset + 1.5;
      const y = row * rowH + 1.5;
      ctx.fillStyle = `rgb(${Math.round(family[0] * tone)}, ${Math.round(family[1] * tone)}, ${Math.round(family[2] * tone)})`;
      ctx.fillRect(x, y, brickW - 3, rowH - 3);
      ctx.fillStyle = BRICK_COLORS.bevelLight;
      ctx.fillRect(x, y, brickW - 3, 1.5);
      ctx.fillStyle = BRICK_COLORS.bevelDark;
      ctx.fillRect(x, y + rowH - 4.5, brickW - 3, 1.5);
    }
  }
  for (let i = 0; i < 5; i++) {
    const px = (Math.abs(Math.sin(i * 33.7 + 2.2) * 43758.5453) % 1) * w;
    const py = (Math.abs(Math.sin(i * 51.3 + 6.6) * 43758.5453) % 1) * h * 0.7;
    const wash = ctx.createRadialGradient(px, py, 2, px, py, w * 0.16);
    wash.addColorStop(0, BRICK_COLORS.wash);
    wash.addColorStop(1, 'rgba(238, 226, 200, 0)');
    ctx.fillStyle = wash;
    ctx.fillRect(px - w * 0.16, py - w * 0.16, w * 0.32, w * 0.32);
  }
}

/** @param {CanvasRenderingContext2D} ctx @param {number} w @param {number} h */
export function drawBrickRoughness(ctx, w, h) {
  ctx.fillStyle = '#e2e2e2';
  ctx.fillRect(0, 0, w, h);
  const rows = 10;
  const rowH = h / rows;
  const brickW = w / 5;
  for (let row = 0; row < rows; row++) {
    const offset = row % 2 === 0 ? 0 : brickW / 2;
    for (let col = -1; col < 6; col++) {
      const n = Math.abs(Math.sin(row * 12.9898 + col * 78.233) * 43758.5453) % 1;
      const v = Math.round(140 + n * 70);
      ctx.fillStyle = `rgb(${v}, ${v}, ${v})`;
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

export const COBBLE_COLORS = {
  joint: '#2e2b27',
  grey: [128, 124, 116],
  brown: [138, 116, 94],
  moss: [96, 104, 78],
  dirt: 'rgba(28, 22, 16, 0.16)',
  dust: 'rgba(226, 214, 188, 0.07)',
};

/** @param {CanvasRenderingContext2D} ctx @param {number} w @param {number} h */
export function drawCobble(ctx, w, h) {
  ctx.fillStyle = COBBLE_COLORS.joint;
  ctx.fillRect(0, 0, w, h);
  const cells = 8;
  const cellW = w / cells;
  const cellH = h / cells;
  for (let row = 0; row < cells; row++) {
    for (let col = 0; col < cells; col++) {
      const n = Math.abs(Math.sin(row * 91.7 + col * 47.29) * 43758.5453) % 1;
      const family = n > 0.86 ? COBBLE_COLORS.moss : n > 0.5 ? COBBLE_COLORS.brown : COBBLE_COLORS.grey;
      const tone = 0.82 + (Math.abs(Math.sin(row * 17.3 + col * 29.1) * 43758.5453) % 1) * 0.36;
      ctx.fillStyle = `rgb(${Math.round(family[0] * tone)}, ${Math.round(family[1] * tone)}, ${Math.round(family[2] * tone)})`;
      const pad = 3 + n * 2.5;
      const skewX = (n - 0.5) * 4;
      const x = col * cellW + pad + skewX;
      const y = row * cellH + pad;
      ctx.fillRect(x, y, cellW - pad * 2, cellH - pad * 2);
      ctx.fillStyle = 'rgba(255, 240, 210, 0.1)';
      ctx.fillRect(x, y, cellW - pad * 2, 2);
      ctx.fillStyle = 'rgba(12, 8, 5, 0.2)';
      ctx.fillRect(x, y + cellH - pad * 2 - 2, cellW - pad * 2, 2);
    }
  }
  for (let i = 0; i < 4; i++) {
    const px = (Math.abs(Math.sin(i * 71.3 + 4.9) * 43758.5453) % 1) * w;
    const py = (Math.abs(Math.sin(i * 23.9 + 1.1) * 43758.5453) % 1) * h;
    const blotch = ctx.createRadialGradient(px, py, 4, px, py, w * 0.22);
    blotch.addColorStop(0, COBBLE_COLORS.dirt);
    blotch.addColorStop(1, 'rgba(28, 22, 16, 0)');
    ctx.fillStyle = blotch;
    ctx.fillRect(px - w * 0.22, py - w * 0.22, w * 0.44, w * 0.44);
  }
  const dust = ctx.createRadialGradient(w * 0.3, h * 0.3, 8, w * 0.5, h * 0.5, w * 0.55);
  dust.addColorStop(0, COBBLE_COLORS.dust);
  dust.addColorStop(1, 'rgba(226, 214, 188, 0)');
  ctx.fillStyle = dust;
  ctx.fillRect(0, 0, w, h);
}

/** @param {CanvasRenderingContext2D} ctx @param {number} w @param {number} h */
export function drawCobbleRoughness(ctx, w, h) {
  ctx.fillStyle = '#e6e6e6';
  ctx.fillRect(0, 0, w, h);
  const cells = 8;
  const cellW = w / cells;
  const cellH = h / cells;
  for (let row = 0; row < cells; row++) {
    for (let col = 0; col < cells; col++) {
      const n = Math.abs(Math.sin(row * 91.7 + col * 47.29) * 43758.5453) % 1;
      const v = Math.round(118 + n * 76);
      ctx.fillStyle = `rgb(${v}, ${v}, ${v})`;
      const pad = 3 + n * 2.5;
      ctx.fillRect(col * cellW + pad, row * cellH + pad, cellW - pad * 2, cellH - pad * 2);
    }
  }
}

export const PASAL_BOARD_TEXT = 'सगरमाथा कर्नर पसल';
export const PASAL_BOARD_SUBTITLE = 'SAGARMATHA CORNER STORE';
export const DEVANAGARI_FONT_STACK = "'Noto Sans Devanagari', 'Mangal', 'Nirmala UI', sans-serif";
export const DEVANAGARI_FONT_FAMILY = 'Noto Sans Devanagari';
export const DEVANAGARI_FONT_URL_WOFF2 = 'vendor/fonts/noto-sans-devanagari-devanagari-700-normal.woff2';
export const DEVANAGARI_FONT_URL_WOFF = 'vendor/fonts/noto-sans-devanagari-devanagari-700-normal.woff';

/** Loads the vendored Devanagari font; resolves false when unavailable. @returns {Promise<boolean>} */
export async function loadDevanagariFont() {
  if (typeof document === 'undefined' || typeof FontFace === 'undefined') return false;
  const face = new FontFace(
    DEVANAGARI_FONT_FAMILY,
    `url(${DEVANAGARI_FONT_URL_WOFF2}) format('woff2'), url(${DEVANAGARI_FONT_URL_WOFF}) format('woff')`,
  );
  try {
    await face.load();
    document.fonts.add(face);
    return true;
  } catch {
    return false;
  }
}

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

export const ARIPANA_COLORS = {
  riceFlour: '#f2ead9',
  riceFlourSoft: 'rgba(242, 234, 217, 0.55)',
  mustardOil: 'rgba(179, 128, 26, 0.5)',
  sindoor: 'rgba(153, 27, 27, 0.4)',
};

export const LUNGTA_PRINT_COLORS = {
  ink: 'rgba(245, 243, 235, 0.92)',
  clothShade: 'rgba(0, 0, 0, 0.14)',
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

/** @param {CanvasRenderingContext2D} ctx @param {number} w @param {number} h @param {number} [petalCount] */
export function drawAripana(ctx, w, h, petalCount = 8) {
  const cx = w / 2;
  const cy = h / 2;
  const unit = Math.min(w, h) / 2;
  ctx.lineCap = 'round';
  ctx.strokeStyle = ARIPANA_COLORS.riceFlour;
  ctx.fillStyle = ARIPANA_COLORS.riceFlour;
  ctx.globalAlpha = 0.9;
  ctx.lineWidth = unit * 0.035;
  ctx.beginPath();
  ctx.arc(cx, cy, unit * 0.94, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, unit * 0.86, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < 28; i++) {
    const angle = (i / 28) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(angle) * unit * 0.76, cy + Math.sin(angle) * unit * 0.76, unit * 0.022, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let p = 0; p < petalCount; p++) {
    const angle = (p / petalCount) * Math.PI * 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.ellipse(0, -unit * 0.44, unit * 0.13, unit * 0.3, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(0, -unit * 0.44, unit * 0.05, unit * 0.16, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  ctx.beginPath();
  ctx.arc(cx, cy, unit * 0.2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = ARIPANA_COLORS.mustardOil;
  ctx.beginPath();
  ctx.arc(cx, cy, unit * 0.11, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = ARIPANA_COLORS.sindoor;
  for (const [sx, sy] of [[-0.94, 0], [0.94, 0], [0, -0.94], [0, 0.94]]) {
    ctx.beginPath();
    ctx.arc(cx + sx * unit, cy + sy * unit, unit * 0.05, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** @param {CanvasRenderingContext2D} ctx @param {number} w @param {number} h @param {string} clothColor */
export function drawWindhorseFlag(ctx, w, h, clothColor) {
  ctx.fillStyle = clothColor;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = LUNGTA_PRINT_COLORS.clothShade;
  for (let i = 0; i < 18; i++) {
    const px = (Math.abs(Math.sin(i * 12.9898 + 3.1) * 43758.5453) % 1) * w;
    const py = (Math.abs(Math.sin(i * 78.233 + 1.7) * 43758.5453) % 1) * h;
    ctx.fillRect(px, py, 8, 3);
  }
  ctx.strokeStyle = LUNGTA_PRINT_COLORS.ink;
  ctx.fillStyle = LUNGTA_PRINT_COLORS.ink;
  ctx.lineWidth = 3;
  ctx.strokeRect(4, 4, w - 8, h - 8);
  const cx = w / 2;
  const cy = h * 0.56;
  ctx.beginPath();
  ctx.ellipse(cx, cy, w * 0.22, h * 0.13, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx + w * 0.1, cy - h * 0.08);
  ctx.lineTo(cx + w * 0.26, cy - h * 0.3);
  ctx.lineTo(cx + w * 0.34, cy - h * 0.24);
  ctx.lineTo(cx + w * 0.16, cy - h * 0.02);
  ctx.closePath();
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  for (const [lx, ly] of [[-0.14, 0.1], [-0.05, 0.12], [0.06, 0.12], [0.15, 0.1]]) {
    ctx.beginPath();
    ctx.moveTo(cx + w * lx, cy + ly * h * 0.4);
    ctx.lineTo(cx + w * lx - w * 0.02, h * 0.88);
    ctx.stroke();
  }
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx - w * 0.22, cy - h * 0.04);
  ctx.quadraticCurveTo(cx - w * 0.36, cy - h * 0.18, cx - w * 0.3, cy - h * 0.34);
  ctx.stroke();
  for (const [mx, my] of [[-0.38, -0.36], [0.38, -0.36], [-0.38, 0.36], [0.38, 0.36]]) {
    ctx.beginPath();
    ctx.arc(cx + w * mx, cy + h * my, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < 4; i++) {
    ctx.fillRect(w * 0.16 + i * w * 0.06, h * 0.14, 2, h * 0.1);
  }
  ctx.globalAlpha = 0.05;
  ctx.fillStyle = '#000000';
  for (let y = 0; y < h; y += 3) ctx.fillRect(0, y, w, 1);
  ctx.fillStyle = '#ffffff';
  for (let x = 0; x < w; x += 3) ctx.fillRect(x, 0, 1, h);
  ctx.globalAlpha = 1;
}

/** @param {CanvasRenderingContext2D} ctx @param {number} w @param {number} h */
export function drawShaft(ctx, w, h) {
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, 'rgba(255, 226, 168, 0.5)');
  grad.addColorStop(0.55, 'rgba(255, 214, 150, 0.18)');
  grad.addColorStop(1, 'rgba(255, 210, 140, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  const sideFade = ctx.createLinearGradient(0, 0, w, 0);
  sideFade.addColorStop(0, 'rgba(0, 0, 0, 0.55)');
  sideFade.addColorStop(0.3, 'rgba(0, 0, 0, 0)');
  sideFade.addColorStop(0.7, 'rgba(0, 0, 0, 0)');
  sideFade.addColorStop(1, 'rgba(0, 0, 0, 0.55)');
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = sideFade;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'source-over';
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

export const BURLAP_COLORS = { base: '#a98a5c', weaveDark: 'rgba(40, 26, 12, 0.09)', weaveLight: 'rgba(255, 240, 200, 0.06)', edge: 'rgba(50, 32, 16, 0.4)', slub: 'rgba(70, 50, 26, 0.35)' };

/** @param {CanvasRenderingContext2D} ctx @param {number} w @param {number} h */
export function drawBurlap(ctx, w, h) {
  ctx.fillStyle = BURLAP_COLORS.base;
  ctx.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 3) {
    ctx.fillStyle = BURLAP_COLORS.weaveDark;
    ctx.fillRect(0, y, w, 1);
  }
  for (let x = 0; x < w; x += 3) {
    ctx.fillStyle = BURLAP_COLORS.weaveLight;
    ctx.fillRect(x, 0, 1, h);
  }
  for (let i = 0; i < 14; i++) {
    const py = (Math.abs(Math.sin(i * 41.3 + 2.7) * 43758.5453) % 1) * h;
    ctx.fillStyle = BURLAP_COLORS.slub;
    ctx.fillRect((Math.abs(Math.sin(i * 13.7) * 43758.5453) % 1) * w * 0.6, py, w * (0.1 + (i % 4) * 0.06), 1.5);
  }
  const shade = ctx.createRadialGradient(w / 2, h / 2, w * 0.15, w / 2, h / 2, w * 0.62);
  shade.addColorStop(0, 'rgba(0, 0, 0, 0)');
  shade.addColorStop(1, BURLAP_COLORS.edge);
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, w, h);
}

export const QR = { modules: 21, quiet: 2, bg: '#f5f2ea', ink: '#1c1814' };

/** @param {CanvasRenderingContext2D} ctx @param {number} w @param {number} h */
export function drawQrPattern(ctx, w, h) {
  ctx.fillStyle = QR.bg;
  ctx.fillRect(0, 0, w, h);
  const cell = w / (QR.modules + QR.quiet * 2);
  ctx.fillStyle = QR.ink;
  for (let row = 0; row < QR.modules; row++) {
    for (let col = 0; col < QR.modules; col++) {
      const inFinder = (row < 7 && col < 7) || (row < 7 && col >= QR.modules - 7) || (row >= QR.modules - 7 && col < 7);
      if (inFinder) continue;
      if (Math.abs(Math.sin(row * 12.9898 + col * 78.233 + 0.7) * 43758.5453) % 1 > 0.5) {
        ctx.fillRect((col + QR.quiet) * cell, (row + QR.quiet) * cell, cell + 0.5, cell + 0.5);
      }
    }
  }
  for (const [fr, fc] of [[0, 0], [0, QR.modules - 7], [QR.modules - 7, 0]]) {
    const x = (fc + QR.quiet) * cell;
    const y = (fr + QR.quiet) * cell;
    ctx.fillRect(x, y, cell * 7, cell * 7);
    ctx.fillStyle = QR.bg;
    ctx.fillRect(x + cell, y + cell, cell * 5, cell * 5);
    ctx.fillStyle = QR.ink;
    ctx.fillRect(x + cell * 2, y + cell * 2, cell * 3, cell * 3);
  }
}

export const ZINC_ROUGHNESS = { valley: '#dcdcdc', ridge: '#7e7e7e', rust: '#f2f2f2', base: '#b4b4b4' };

/** @param {CanvasRenderingContext2D} ctx @param {number} w @param {number} h */
export function drawZincRoughness(ctx, w, h) {
  ctx.fillStyle = ZINC_ROUGHNESS.base;
  ctx.fillRect(0, 0, w, h);
  const ridges = 16;
  const stripeW = w / ridges;
  for (let col = 0; col < ridges; col++) {
    const grad = ctx.createLinearGradient(col * stripeW, 0, (col + 1) * stripeW, 0);
    grad.addColorStop(0, ZINC_ROUGHNESS.valley);
    grad.addColorStop(0.5, ZINC_ROUGHNESS.ridge);
    grad.addColorStop(1, ZINC_ROUGHNESS.valley);
    ctx.fillStyle = grad;
    ctx.fillRect(col * stripeW, 0, stripeW, h);
  }
  ctx.fillStyle = ZINC_ROUGHNESS.rust;
  for (let i = 0; i < 26; i++) {
    const px = (Math.abs(Math.sin(i * 12.9898 + 4.2) * 43758.5453) % 1) * w;
    const streakH = 20 + ((Math.abs(Math.sin(i * 78.233) * 43758.5453) % 1) * h) / 3;
    ctx.globalAlpha = 0.5;
    ctx.fillRect(px, h - streakH, 3 + (i % 3), streakH);
    ctx.globalAlpha = 1;
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
