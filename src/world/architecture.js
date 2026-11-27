import * as THREE from 'three';
import { OBSTACLES } from './layout.js';
import { makeArt, makeTexture, makeBump, drawZinc, drawZincBump, drawAnkhiJhyal, drawPasalBoard } from './art.js';

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
  boardY: 2.5,
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

/** @param {THREE.Object3D} parent @param {THREE.BufferGeometry} geometry @param {THREE.Material} material @returns {THREE.Mesh} */
function addMesh(parent, geometry, material) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

/**
 * One straight roof/awning segment: slope runs in the (slopeAxis, y) plane,
 * extruded along the cross axis from crossStart to crossEnd.
 * @param {THREE.Material} material
 * @param {{ s: number, y: number }} slopeStart
 * @param {{ s: number, y: number }} slopeEnd
 * @param {number} crossStart
 * @param {number} crossEnd
 * @param {'x' | 'z'} slopeAxis
 * @param {number} thickness
 * @returns {THREE.Mesh}
 */
function slopedSegment(material, slopeStart, slopeEnd, crossStart, crossEnd, slopeAxis, thickness) {
  const drop = slopeEnd.y - slopeStart.y;
  const run = slopeEnd.s - slopeStart.s;
  const length = Math.hypot(run, drop);
  const crossLength = crossEnd - crossStart;
  const geometry =
    slopeAxis === 'x'
      ? new THREE.BoxGeometry(length, thickness, crossLength)
      : new THREE.BoxGeometry(crossLength, thickness, length);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  const angle = Math.atan2(drop, run);
  if (slopeAxis === 'x') {
    mesh.rotation.z = angle;
  } else {
    mesh.rotation.x = -angle;
  }
  mesh.position.set(
    slopeAxis === 'x' ? (slopeStart.s + slopeEnd.s) / 2 : (crossStart + crossEnd) / 2,
    (slopeStart.y + slopeEnd.y) / 2,
    slopeAxis === 'x' ? (crossStart + crossEnd) / 2 : (slopeStart.s + slopeEnd.s) / 2,
  );
  return mesh;
}

/**
 * Corrugated zinc panel with a mid-span sag, built from two segments.
 * @param {THREE.Scene} scene
 * @param {THREE.Material} material
 * @param {{ s: number, y: number }} slopeStart
 * @param {{ s: number, y: number }} slopeEnd
 * @param {number} crossStart
 * @param {number} crossEnd
 * @param {'x' | 'z'} slopeAxis
 */
function addSagPanel(scene, material, slopeStart, slopeEnd, crossStart, crossEnd, slopeAxis) {
  const midS = (slopeStart.s + slopeEnd.s) / 2;
  const midY = (slopeStart.y + slopeEnd.y) / 2 - ARCHITECTURE.awningSagMid;
  const mid = { s: midS, y: midY };
  scene.add(
    slopedSegment(material, slopeStart, mid, crossStart, crossEnd, slopeAxis, ARCHITECTURE.awningThickness),
    slopedSegment(material, mid, slopeEnd, crossStart, crossEnd, slopeAxis, ARCHITECTURE.awningThickness),
  );
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

  addSagPanel(
    scene,
    zincMaterial,
    { s: eastInnerX, y: ARCHITECTURE.awningAttachY },
    { s: eastOuterX, y: ARCHITECTURE.awningOuterY },
    zStart,
    zEnd,
    'x',
  );
  addSagPanel(
    scene,
    zincMaterial,
    { s: southInnerZ, y: ARCHITECTURE.awningAttachY },
    { s: southOuterZ, y: ARCHITECTURE.awningOuterY },
    xStart,
    xEnd,
    'z',
  );
}

/**
 * @param {THREE.Scene} scene
 * @param {THREE.MeshStandardMaterial} timberMaterial
 * @param {{ back: Box, left: Box }} walls
 */
function buildThaam(scene, timberMaterial, walls) {
  const postGeometry = new THREE.BoxGeometry(ARCHITECTURE.thaamSize, ARCHITECTURE.awningAttachY, ARCHITECTURE.thaamSize);
  const capGeometry = new THREE.BoxGeometry(ARCHITECTURE.thaamSize * 1.5, 0.14, ARCHITECTURE.thaamSize * 1.5);
  const baseGeometry = new THREE.BoxGeometry(ARCHITECTURE.thaamSize * 1.7, 0.16, ARCHITECTURE.thaamSize * 1.7);
  const posts = [
    { x: walls.back.maxX - ARCHITECTURE.thaamInset, z: walls.back.maxZ - 0.15 },
    { x: walls.left.minX + ARCHITECTURE.thaamInset, z: walls.left.maxZ - 0.15 },
  ];
  for (const post of posts) {
    const column = addMesh(scene, postGeometry, timberMaterial);
    column.position.set(post.x, ARCHITECTURE.awningAttachY / 2, post.z);
    const cap = addMesh(scene, capGeometry, timberMaterial);
    cap.position.set(post.x, ARCHITECTURE.awningAttachY - 0.07, post.z);
    const base = addMesh(scene, baseGeometry, timberMaterial);
    base.position.set(post.x, 0.08, post.z);
  }
}

/**
 * @param {THREE.Scene} scene
 * @param {THREE.MeshStandardMaterial} shutterMaterial
 * @param {{ back: Box, left: Box }} walls
 */
function buildShutterHousings(scene, shutterMaterial, walls) {
  const openingLength = walls.back.maxX - walls.back.minZ;
  const housingGeometry = new THREE.CylinderGeometry(
    ARCHITECTURE.shutterRadius,
    ARCHITECTURE.shutterRadius,
    openingLength + 0.4,
    12,
  );
  const eastHousing = addMesh(scene, housingGeometry, shutterMaterial);
  eastHousing.rotation.x = Math.PI / 2;
  eastHousing.position.set(
    walls.back.maxX - 0.12,
    ARCHITECTURE.shutterY,
    (walls.back.minZ + walls.left.maxZ) / 2,
  );
  const southHousing = addMesh(scene, housingGeometry, shutterMaterial);
  southHousing.rotation.z = Math.PI / 2;
  southHousing.position.set(
    (walls.left.minX + walls.back.maxX) / 2,
    ARCHITECTURE.shutterY,
    walls.left.maxZ - 0.12,
  );
}

/**
 * @param {THREE.Scene} scene
 * @param {THREE.MeshStandardMaterial} stoneMaterial
 * @param {{ back: Box, left: Box }} walls
 */
function buildPedi(scene, stoneMaterial, walls) {
  const eastLength = walls.left.maxZ + ARCHITECTURE.pediDepth - walls.back.minZ;
  const eastPedi = addMesh(
    scene,
    new THREE.BoxGeometry(ARCHITECTURE.pediDepth + 0.02, ARCHITECTURE.pediHeight, eastLength),
    stoneMaterial,
  );
  eastPedi.position.set(
    walls.back.maxX + ARCHITECTURE.pediDepth / 2,
    ARCHITECTURE.pediHeight / 2,
    (walls.back.minZ + walls.left.maxZ + ARCHITECTURE.pediDepth) / 2,
  );
  const southLength = walls.back.maxX + ARCHITECTURE.pediDepth - walls.left.minX;
  const southPedi = addMesh(
    scene,
    new THREE.BoxGeometry(southLength, ARCHITECTURE.pediHeight, ARCHITECTURE.pediDepth),
    stoneMaterial,
  );
  southPedi.position.set(
    (walls.left.minX + walls.back.maxX + ARCHITECTURE.pediDepth) / 2,
    ARCHITECTURE.pediHeight / 2,
    walls.left.maxZ + ARCHITECTURE.pediDepth / 2,
  );
}

/**
 * @param {THREE.Scene} scene
 * @param {THREE.MeshStandardMaterial} windowMaterial
 * @param {{ back: Box, left: Box }} walls
 */
function buildAnkhiJhyal(scene, windowMaterial, walls) {
  const geometry = new THREE.PlaneGeometry(ARCHITECTURE.windowWidth, ARCHITECTURE.windowHeight);
  const spots = [
    { x: walls.back.minX + 1.9, z: walls.back.minZ - 0.011, rotationY: Math.PI },
    { x: walls.back.minX + 4.6, z: walls.back.minZ - 0.011, rotationY: Math.PI },
    { x: walls.left.minX - 0.011, z: walls.left.minZ + 3.2, rotationY: -Math.PI / 2 },
  ];
  for (const spot of spots) {
    const window = new THREE.Mesh(geometry, windowMaterial);
    window.position.set(spot.x, ARCHITECTURE.windowY, spot.z);
    window.rotation.y = spot.rotationY;
    scene.add(window);
  }
}

/**
 * @param {THREE.Scene} scene
 * @param {THREE.MeshStandardMaterial} boardMaterial
 * @param {{ back: Box, left: Box }} walls
 */
function buildPasalBoard(scene, boardMaterial, walls) {
  const geometry = new THREE.PlaneGeometry(ARCHITECTURE.boardWidth, ARCHITECTURE.boardHeight);
  const south = new THREE.Mesh(geometry, boardMaterial);
  south.position.set((walls.left.minX + walls.back.maxX) / 2 - 0.4, ARCHITECTURE.boardY, walls.left.maxZ + 0.011);
  scene.add(south);
  const east = new THREE.Mesh(geometry, boardMaterial);
  east.position.set(walls.back.maxX + 0.011, ARCHITECTURE.boardY, (walls.back.minZ + walls.left.maxZ) / 2 + 0.6);
  east.rotation.y = Math.PI / 2;
  scene.add(east);
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
  const northPanel = addMesh(scene, new THREE.BoxGeometry(length, 0.08, panelLength), zincMaterial);
  northPanel.position.set(centerX, (ARCHITECTURE.ridgeY + ARCHITECTURE.eaveY) / 2, ridgeZ - span / 2);
  northPanel.rotation.x = -slope;
  const southPanel = addMesh(scene, new THREE.BoxGeometry(length, 0.08, panelLength), zincMaterial);
  southPanel.position.set(centerX, (ARCHITECTURE.ridgeY + ARCHITECTURE.eaveY) / 2, ridgeZ + span / 2);
  southPanel.rotation.x = slope;
  const ridgeCap = addMesh(scene, new THREE.BoxGeometry(length + 0.2, 0.1, 0.34), zincMaterial);
  ridgeCap.position.set(centerX, ARCHITECTURE.ridgeY + 0.03, ridgeZ);
}

/** @param {THREE.Scene} scene @param {THREE.WebGLRenderer} renderer */
export function buildArchitecture(scene, renderer) {
  const walls = wallBoxes();

  const zincMap = makeTexture(makeArt(256, 256, drawZinc), renderer);
  const zincBump = makeBump(makeArt(256, 256, drawZincBump));
  const zincMaterial = new THREE.MeshStandardMaterial({
    map: zincMap,
    bumpMap: zincBump,
    bumpScale: 0.35,
    roughness: 0.55,
    metalness: 0.45,
    side: THREE.DoubleSide,
  });
  zincMap.repeat.set(3, 1);

  const timberMaterial = new THREE.MeshStandardMaterial({ color: ARCHITECTURE_COLORS.timber, roughness: 0.82 });
  const stoneMaterial = new THREE.MeshStandardMaterial({ color: ARCHITECTURE_COLORS.stone, roughness: 0.92 });
  const shutterMaterial = new THREE.MeshStandardMaterial({ color: ARCHITECTURE_COLORS.shutterTeal, roughness: 0.5, metalness: 0.35 });
  const windowMaterial = new THREE.MeshStandardMaterial({
    map: makeTexture(makeArt(128, 128, drawAnkhiJhyal), renderer),
    roughness: 0.85,
  });
  const boardMaterial = new THREE.MeshStandardMaterial({
    map: makeTexture(makeArt(1024, 340, drawPasalBoard), renderer),
    roughness: 0.7,
  });

  buildAwning(scene, zincMaterial, walls);
  buildThaam(scene, timberMaterial, walls);
  buildShutterHousings(scene, shutterMaterial, walls);
  buildPedi(scene, stoneMaterial, walls);
  buildAnkhiJhyal(scene, windowMaterial, walls);
  buildPasalBoard(scene, boardMaterial, walls);
  buildRoof(scene, zincMaterial, walls);

  const rim = new THREE.DirectionalLight(ARCHITECTURE_COLORS.rimLight, 0.5);
  rim.position.set(11, 2.4, 11);
  rim.target.position.set(-1.7, 1.2, -1.7);
  scene.add(rim, rim.target);
}
