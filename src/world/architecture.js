import * as THREE from 'three';
import { GONDOLA, OBSTACLES, RACK_TIERS } from './layout.js';
import { makeArt, makeTexture, makeBump, drawZinc, drawZincBump, drawZincRoughness, drawAnkhiJhyal, drawPasalBoard, loadDevanagariFont } from './art.js';
import { placedGeometry, mergedParts, addMergedMesh } from './merge.js';

export const ARCHITECTURE = {
  awningDepth: 1.35,
  awningAttachY: 2.75,
  awningOuterY: 2.35,
  awningSagMid: 0.05,
  awningThickness: 0.06,
  awningOverhang: 0.2,
  shutterRadius: 0.17,
  shutterY: 2.95,
  pediHeight: 0.18,
  pediDepth: 0.55,
  thaamSize: 0.22,
  thaamInset: 0.28,
  boardWidth: 2.6,
  boardHeight: 0.85,
  boardY: 2.24,
  windowWidth: 1.1,
  windowHeight: 1.3,
  windowY: 2.1,
  lintelY: 2.72,
  ridgeY: 3.95,
  eaveY: 3.35,
  roofOverhang: 0.25,
};

export const ARCHITECTURE_COLORS = {
  timber: 0x452719,
  shutterTeal: 0x0f766e,
  stone: 0x8a8578,
  rimLight: 0x9fc4e8,
  counterTop: 0x3a2417,
};

export const MOLDINGS = {
  plinthGrow: 0.12,
  plinthHeight: 0.1,
  capitalGrow: 0.1,
  capitalHeight: 0.09,
  counterSlabGrowX: 0.12,
  counterSlabGrowZ: 0.14,
  counterSlabHeight: 0.07,
  fasciaHeight: 0.16,
  fasciaThickness: 0.05,
};

const WALL_NAMES = { back: 'Back Brick Wall', left: 'Left Brick Wall' };

/** @typedef {{ name: string, minX: number, maxX: number, minZ: number, maxZ: number }} Box */

/** @returns {{ back: Box, left: Box }} */
function wallBoxes() {
  const back = OBSTACLES.find((box) => box.name === WALL_NAMES.back);
  const left = OBSTACLES.find((box) => box.name === WALL_NAMES.left);
  if (!back || !left) throw new Error('layout.js must define both brick walls');
  return { back, left };
}

/**
 * One straight roof/awning segment baked into geometry: slope runs in the
 * (slopeAxis, y) plane, extruded along the cross axis from crossStart to crossEnd.
 * @param {{ s: number, y: number }} slopeStart
 * @param {{ s: number, y: number }} slopeEnd
 * @param {number} crossStart
 * @param {number} crossEnd
 * @param {'x' | 'z'} slopeAxis
 * @param {number} thickness
 * @returns {THREE.BufferGeometry}
 */
function slopedGeometry(slopeStart, slopeEnd, crossStart, crossEnd, slopeAxis, thickness) {
  const drop = slopeEnd.y - slopeStart.y;
  const run = slopeEnd.s - slopeStart.s;
  const length = Math.hypot(run, drop);
  const crossLength = crossEnd - crossStart;
  const angle = Math.atan2(drop, run);
  const rotation = /** @type {[number, number, number]} */ (slopeAxis === 'x' ? [0, 0, angle] : [-angle, 0, 0]);
  const position = /** @type {[number, number, number]} */ (
    slopeAxis === 'x'
      ? [(slopeStart.s + slopeEnd.s) / 2, (slopeStart.y + slopeEnd.y) / 2, (crossStart + crossEnd) / 2]
      : [(crossStart + crossEnd) / 2, (slopeStart.y + slopeEnd.y) / 2, (slopeStart.s + slopeEnd.s) / 2]
  );
  const geometry =
    slopeAxis === 'x'
      ? new THREE.BoxGeometry(length, thickness, crossLength)
      : new THREE.BoxGeometry(crossLength, thickness, length);
  return placedGeometry(geometry, { position, rotation });
}

/**
 * Corrugated zinc panel with a mid-span sag, built from two segments.
 * @param {{ s: number, y: number }} slopeStart
 * @param {{ s: number, y: number }} slopeEnd
 * @param {number} crossStart
 * @param {number} crossEnd
 * @param {'x' | 'z'} slopeAxis
 * @returns {THREE.BufferGeometry[]}
 */
function sagPanelGeometries(slopeStart, slopeEnd, crossStart, crossEnd, slopeAxis) {
  const midS = (slopeStart.s + slopeEnd.s) / 2;
  const midY = (slopeStart.y + slopeEnd.y) / 2 - ARCHITECTURE.awningSagMid;
  const mid = { s: midS, y: midY };
  return [
    slopedGeometry(slopeStart, mid, crossStart, crossEnd, slopeAxis, ARCHITECTURE.awningThickness),
    slopedGeometry(mid, slopeEnd, crossStart, crossEnd, slopeAxis, ARCHITECTURE.awningThickness),
  ];
}

/**
 * @param {THREE.Scene} scene
 * @param {THREE.MeshStandardMaterial} zincMaterial
 * @param {{ back: Box, left: Box }} walls
 */
function buildAwning(scene, zincMaterial, walls) {
  const innerOffset = 0.08;
  const eastInnerX = walls.back.maxX - innerOffset;
  const eastOuterX = eastInnerX + ARCHITECTURE.awningDepth;
  const zStart = walls.back.minZ - ARCHITECTURE.awningOverhang;
  const zEnd = walls.left.maxZ + ARCHITECTURE.awningOverhang;
  const southInnerZ = walls.left.maxZ - innerOffset;
  const southOuterZ = southInnerZ + ARCHITECTURE.awningDepth;
  const xStart = walls.left.minX - ARCHITECTURE.awningOverhang;
  const xEnd = walls.back.maxX + ARCHITECTURE.awningOverhang;

  const parts = [
    ...sagPanelGeometries(
      { s: eastInnerX, y: ARCHITECTURE.awningAttachY },
      { s: eastOuterX, y: ARCHITECTURE.awningOuterY },
      zStart,
      zEnd,
      'x',
    ),
    ...sagPanelGeometries(
      { s: southInnerZ, y: ARCHITECTURE.awningAttachY },
      { s: southOuterZ, y: ARCHITECTURE.awningOuterY },
      xStart,
      xEnd,
      'z',
    ),
  ];
  addMergedMesh(scene, mergedParts(parts), zincMaterial, { name: 'awning' });
}

/**
 * @param {THREE.Scene} scene
 * @param {THREE.MeshStandardMaterial} timberMaterial
 * @param {{ back: Box, left: Box }} walls
 */
function buildThaam(scene, timberMaterial, walls) {
  const posts = [
    { x: walls.back.maxX - ARCHITECTURE.thaamInset, z: walls.back.maxZ - 0.15 },
    { x: walls.left.minX + ARCHITECTURE.thaamInset, z: walls.left.maxZ - 0.15 },
  ];
  const parts = [];
  for (const post of posts) {
    parts.push(
      placedGeometry(new THREE.BoxGeometry(ARCHITECTURE.thaamSize, ARCHITECTURE.awningAttachY, ARCHITECTURE.thaamSize), {
        position: [post.x, ARCHITECTURE.awningAttachY / 2, post.z],
      }),
      placedGeometry(new THREE.BoxGeometry(ARCHITECTURE.thaamSize * 1.5, 0.14, ARCHITECTURE.thaamSize * 1.5), {
        position: [post.x, ARCHITECTURE.awningAttachY - 0.07, post.z],
      }),
      placedGeometry(new THREE.BoxGeometry(ARCHITECTURE.thaamSize * 1.7, 0.16, ARCHITECTURE.thaamSize * 1.7), {
        position: [post.x, 0.08, post.z],
      }),
    );
  }
  addMergedMesh(scene, mergedParts(parts), timberMaterial, { name: 'thaam', castShadow: false });
}

/**
 * @param {THREE.Scene} scene
 * @param {THREE.MeshStandardMaterial} shutterMaterial
 * @param {{ back: Box, left: Box }} walls
 */
function buildShutterHousings(scene, shutterMaterial, walls) {
  const openingLength = walls.back.maxX - walls.back.minZ;
  const housing = () => new THREE.CylinderGeometry(
    ARCHITECTURE.shutterRadius,
    ARCHITECTURE.shutterRadius,
    openingLength + 0.4,
    12,
  );
  const parts = [
    placedGeometry(housing(), {
      position: [walls.back.maxX - 0.12, ARCHITECTURE.shutterY, (walls.back.minZ + walls.left.maxZ) / 2],
      rotation: [Math.PI / 2, 0, 0],
    }),
    placedGeometry(housing(), {
      position: [(walls.left.minX + walls.back.maxX) / 2, ARCHITECTURE.shutterY, walls.left.maxZ - 0.12],
      rotation: [0, 0, Math.PI / 2],
    }),
  ];
  addMergedMesh(scene, mergedParts(parts), shutterMaterial, { name: 'shutter-housings', castShadow: false });
}

/**
 * @param {{ back: Box, left: Box }} walls
 * @returns {THREE.BufferGeometry[]}
 */
function pediGeometries(walls) {
  const eastLength = walls.left.maxZ + ARCHITECTURE.pediDepth - walls.back.minZ;
  const eastPedi = placedGeometry(
    new THREE.BoxGeometry(ARCHITECTURE.pediDepth + 0.02, ARCHITECTURE.pediHeight, eastLength),
    {
      position: [
        walls.back.maxX + ARCHITECTURE.pediDepth / 2,
        ARCHITECTURE.pediHeight / 2,
        (walls.back.minZ + walls.left.maxZ + ARCHITECTURE.pediDepth) / 2,
      ],
    },
  );
  const southLength = walls.back.maxX + ARCHITECTURE.pediDepth - walls.left.minX;
  const southPedi = placedGeometry(
    new THREE.BoxGeometry(southLength, ARCHITECTURE.pediHeight, ARCHITECTURE.pediDepth),
    {
      position: [
        (walls.left.minX + walls.back.maxX + ARCHITECTURE.pediDepth) / 2,
        ARCHITECTURE.pediHeight / 2,
        walls.left.maxZ + ARCHITECTURE.pediDepth / 2,
      ],
    },
  );
  return [eastPedi, southPedi];
}

/**
 * @param {THREE.Scene} scene
 * @param {THREE.MeshStandardMaterial} windowMaterial
 * @param {{ back: Box, left: Box }} walls
 */
function buildAnkhiJhyal(scene, windowMaterial, walls) {
  const spots = [
    { x: walls.back.minX + 1.9, z: walls.back.minZ - 0.011, rotationY: Math.PI },
    { x: walls.back.minX + 4.6, z: walls.back.minZ - 0.011, rotationY: Math.PI },
    { x: walls.left.minX - 0.011, z: walls.left.minZ + 3.2, rotationY: -Math.PI / 2 },
  ];
  const parts = spots.map((spot) =>
    placedGeometry(new THREE.PlaneGeometry(ARCHITECTURE.windowWidth, ARCHITECTURE.windowHeight), {
      position: [spot.x, ARCHITECTURE.windowY, spot.z],
      rotation: [0, spot.rotationY, 0],
    }),
  );
  addMergedMesh(scene, mergedParts(parts), windowMaterial, {
    name: 'ankhi-jhyal',
    castShadow: false,
    receiveShadow: false,
  });
}

/**
 * @param {THREE.Scene} scene
 * @param {{ back: Box, left: Box }} walls
 * @param {THREE.WebGLRenderer} renderer
 */
function buildPasalBoard(scene, walls, renderer) {
  const boardCanvas = makeArt(1024, 340, drawPasalBoard);
  const boardTexture = makeTexture(boardCanvas, renderer);
  const boardMaterial = new THREE.MeshStandardMaterial({ map: boardTexture, roughness: 0.7 });
  addMergedMesh(
    scene,
    mergedParts([
      placedGeometry(new THREE.PlaneGeometry(ARCHITECTURE.boardWidth, ARCHITECTURE.boardHeight), {
        position: [(walls.left.minX + walls.back.maxX) / 2 - 0.4, ARCHITECTURE.boardY, walls.left.maxZ + 0.011],
      }),
      placedGeometry(new THREE.PlaneGeometry(ARCHITECTURE.boardWidth, ARCHITECTURE.boardHeight), {
        position: [walls.back.maxX + 0.011, ARCHITECTURE.boardY, (walls.back.minZ + walls.left.maxZ) / 2 + 0.6],
        rotation: [0, Math.PI / 2, 0],
      }),
    ]),
    boardMaterial,
    { name: 'pasal-board', castShadow: false, receiveShadow: true },
  );

  loadDevanagariFont().then((loaded) => {
    if (!loaded) return;
    const ctx = /** @type {CanvasRenderingContext2D} */ (boardCanvas.getContext('2d'));
    drawPasalBoard(ctx, boardCanvas.width, boardCanvas.height);
    boardTexture.needsUpdate = true;
  });
}

/**
 * @param {THREE.Scene} scene
 * @param {THREE.MeshStandardMaterial} zincMaterial
 * @param {{ back: Box, left: Box }} walls
 */
function buildRoof(scene, zincMaterial, walls) {
  const ridgeZ = (walls.back.minZ + walls.left.maxZ) / 2;
  const span = ridgeZ - walls.back.minZ + ARCHITECTURE.roofOverhang;
  const length = walls.back.maxX - walls.back.minX + ARCHITECTURE.roofOverhang * 2;
  const drop = ARCHITECTURE.ridgeY - ARCHITECTURE.eaveY;
  const slope = Math.atan2(drop, span);
  const panelLength = Math.hypot(span, drop);
  const centerX = (walls.back.minX + walls.back.maxX) / 2;
  const fasciaLength = walls.back.maxX - walls.back.minX + ARCHITECTURE.roofOverhang * 2;
  const parts = [
    placedGeometry(new THREE.BoxGeometry(length, 0.08, panelLength), {
      position: [centerX, (ARCHITECTURE.ridgeY + ARCHITECTURE.eaveY) / 2, ridgeZ - span / 2],
      rotation: [-slope, 0, 0],
    }),
    placedGeometry(new THREE.BoxGeometry(length, 0.08, panelLength), {
      position: [centerX, (ARCHITECTURE.ridgeY + ARCHITECTURE.eaveY) / 2, ridgeZ + span / 2],
      rotation: [slope, 0, 0],
    }),
    placedGeometry(new THREE.BoxGeometry(length + 0.2, 0.1, 0.34), {
      position: [centerX, ARCHITECTURE.ridgeY + 0.03, ridgeZ],
    }),
  ];
  for (const side of [-1, 1]) {
    parts.push(
      placedGeometry(new THREE.BoxGeometry(fasciaLength, MOLDINGS.fasciaHeight, MOLDINGS.fasciaThickness), {
        position: [centerX, ARCHITECTURE.eaveY, ridgeZ + side * span],
      }),
    );
  }
  addMergedMesh(scene, mergedParts(parts), zincMaterial, { name: 'roof' });
}

/** @returns {THREE.BufferGeometry[]} stone pillar dressing: plinth + capital as molded stone */
function pillarGeometries() {
  const pillar = OBSTACLES.find((box) => box.name === 'Corner Pillar');
  if (!pillar) throw new Error('layout.js must define the corner pillar');
  const width = pillar.maxX - pillar.minX;
  const depth = pillar.maxZ - pillar.minZ;
  const height = 1.0;
  const cx = (pillar.minX + pillar.maxX) / 2;
  const cz = (pillar.minZ + pillar.maxZ) / 2;
  return [
    placedGeometry(
      new THREE.BoxGeometry(width + MOLDINGS.plinthGrow, MOLDINGS.plinthHeight, depth + MOLDINGS.plinthGrow),
      { position: [cx, MOLDINGS.plinthHeight / 2, cz] },
    ),
    placedGeometry(
      new THREE.BoxGeometry(width + MOLDINGS.capitalGrow, MOLDINGS.capitalHeight, depth + MOLDINGS.capitalGrow),
      { position: [cx, height - MOLDINGS.capitalHeight / 2, cz] },
    ),
  ];
}

/** @returns {THREE.BufferGeometry} timber counter slab with a front overhang, resting on the OBSTACLES counter box */
function counterTopGeometry() {
  const counter = OBSTACLES.find((box) => box.name === 'Wooden Counter');
  if (!counter) throw new Error('layout.js must define the wooden counter');
  const width = counter.maxX - counter.minX;
  const depth = counter.maxZ - counter.minZ;
  return placedGeometry(
    new THREE.BoxGeometry(
      width + MOLDINGS.counterSlabGrowX,
      MOLDINGS.counterSlabHeight,
      depth + MOLDINGS.counterSlabGrowZ,
    ),
    {
      position: [
        (counter.minX + counter.maxX) / 2,
        1.0 + MOLDINGS.counterSlabHeight / 2,
        (counter.minZ + counter.maxZ) / 2,
      ],
    },
  );
}

/** @param {THREE.Scene} scene @param {THREE.WebGLRenderer} renderer */
/**
 * Three-tier gondola under the Back Rack: boards (top surface = tier Y),
 * front lips, and end uprights — one merged mesh, one draw call.
 * @param {THREE.Scene} scene
 * @param {THREE.MeshStandardMaterial} timberMaterial
 */
function buildGondola(scene, timberMaterial) {
  const rack = OBSTACLES.find((box) => box.name === 'Back Shelf Rack');
  if (!rack) throw new Error('layout.js must define the Back Shelf Rack');
  const tiers = RACK_TIERS['Back Rack'];
  if (!tiers) throw new Error('layout.js must define Back Rack tiers');
  const boardZCenter = rack.minZ + 0.03 + GONDOLA.boardDepth / 2;
  const length = rack.maxX - rack.minX;
  /** @type {THREE.BufferGeometry[]} */
  const parts = [];
  for (const tierY of Object.values(tiers)) {
    parts.push(placedGeometry(
      new THREE.BoxGeometry(length, GONDOLA.boardThickness, GONDOLA.boardDepth),
      { position: [(rack.minX + rack.maxX) / 2, tierY - GONDOLA.boardThickness / 2, boardZCenter] },
    ));
    parts.push(placedGeometry(
      new THREE.BoxGeometry(length, GONDOLA.lipHeight, GONDOLA.lipThickness),
      { position: [(rack.minX + rack.maxX) / 2, tierY + GONDOLA.lipHeight / 2, rack.maxZ - 0.07] },
    ));
  }
  for (const x of [rack.minX + GONDOLA.uprightWidth / 2, rack.maxX - GONDOLA.uprightWidth / 2]) {
    parts.push(placedGeometry(
      new THREE.BoxGeometry(GONDOLA.uprightWidth, GONDOLA.topY + GONDOLA.lipHeight, GONDOLA.boardDepth),
      { position: [x, (GONDOLA.topY + GONDOLA.lipHeight) / 2, boardZCenter] },
    ));
  }
  addMergedMesh(scene, mergedParts(parts), timberMaterial, { name: 'gondola' });
}

/** @param {THREE.Scene} scene @param {THREE.WebGLRenderer} renderer */
export function buildArchitecture(scene, renderer) {
  const walls = wallBoxes();

  const zincMap = makeTexture(makeArt(256, 256, drawZinc), renderer);
  const zincBump = makeBump(makeArt(256, 256, drawZincBump));
  const zincRoughness = makeBump(makeArt(256, 256, drawZincRoughness));
  const zincMaterial = new THREE.MeshStandardMaterial({
    map: zincMap,
    bumpMap: zincBump,
    bumpScale: 0.35,
    roughnessMap: zincRoughness,
    roughness: 1.0,
    metalness: 0.45,
    side: THREE.DoubleSide,
  });
  zincMap.repeat.set(3, 1);

  const timberMaterial = new THREE.MeshStandardMaterial({ color: ARCHITECTURE_COLORS.timber, roughness: 0.82 });
  const slabMaterial = new THREE.MeshStandardMaterial({ color: ARCHITECTURE_COLORS.counterTop, roughness: 0.6 });
  const stoneMaterial = new THREE.MeshStandardMaterial({ color: ARCHITECTURE_COLORS.stone, roughness: 0.92 });
  const shutterMaterial = new THREE.MeshStandardMaterial({ color: ARCHITECTURE_COLORS.shutterTeal, roughness: 0.5, metalness: 0.35 });
  const windowMaterial = new THREE.MeshStandardMaterial({
    map: makeTexture(makeArt(128, 128, drawAnkhiJhyal), renderer),
    roughness: 0.85,
  });
  buildAwning(scene, zincMaterial, walls);
  buildThaam(scene, timberMaterial, walls);
  buildGondola(scene, timberMaterial);
  buildShutterHousings(scene, shutterMaterial, walls);
  addMergedMesh(scene, mergedParts([...pediGeometries(walls), ...pillarGeometries()]), stoneMaterial, {
    name: 'pedi-pillar-stone',
  });
  addMergedMesh(scene, counterTopGeometry(), slabMaterial, { name: 'counter-top', castShadow: false });
  buildAnkhiJhyal(scene, windowMaterial, walls);
  buildPasalBoard(scene, walls, renderer);
  buildRoof(scene, zincMaterial, walls);

  const rim = new THREE.DirectionalLight(ARCHITECTURE_COLORS.rimLight, 0.5);
  rim.position.set(11, 2.4, 11);
  rim.target.position.set(-1.7, 1.2, -1.7);
  scene.add(rim, rim.target);
}
