import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { NPC_PATHS, PASALE_DAI_POSITION } from './layout.js';
import { makeArt, makeTexture, loadDevanagariFont } from './art.js';

export const NPCS = {
  bobFrequency: 6,
  bobAmplitude: 0.04,
  proxy: { width: 0.7, height: 1.9 },
  nametag: { width: 0.9, height: 0.225, y: 1.85, canvasW: 256, canvasH: 64 },
  colors: {
    skin: 0xa9683f,
    timber: 0x452719,
    gold: 0xfbbf24,
  },
};

export const NPC_ROSTER = [
  { id: 'pasale-dai', nameNp: 'पसले दाइ', body: 0x0f766e, cap: 0x991b1b },
  { id: 'neighbor-didi', nameNp: 'छिमेकी दिदी', body: 0x991b1b, cap: 0x452719 },
  { id: 'sathi-bhai', nameNp: 'साथी दाइ', body: 0x8f3b26, cap: 0x452719 },
];

/** @param {string} id @returns {{ nameNp: string }} */
export function npcName(id) {
  const entry = NPC_ROSTER.find((npc) => npc.id === id);
  if (!entry) throw new Error(`unknown npc id: ${id}`);
  return { nameNp: entry.nameNp };
}

/**
 * Pure path mapping — Phase S can replace the path source without touching
 * rendering (docs/ARCHITECTURE.md §NPC & presence).
 * @param {number} t seconds @param {{ from: [number, number], to: [number, number], period: number, phase: number }} path
 * @returns {{ x: number, z: number, bob: number }}
 */
export function npcPose(t, path) {
  const cycle = (((t / path.period + path.phase) % 1) + 1) % 1;
  const pingpong = cycle < 0.5 ? cycle * 2 : 2 - cycle * 2;
  const smooth = pingpong * pingpong * (3 - 2 * pingpong);
  return {
    x: path.from[0] + (path.to[0] - path.from[0]) * smooth,
    z: path.from[1] + (path.to[1] - path.from[1]) * smooth,
    bob: Math.abs(Math.sin(t * NPCS.bobFrequency)) * NPCS.bobAmplitude,
  };
}

/**
 * @param {CanvasRenderingContext2D} ctx @param {number} w @param {number} h @param {string} nameNp
 */
function drawNametag(ctx, w, h, nameNp) {
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(20, 12, 8, 0.72)';
  const radius = 14;
  ctx.beginPath();
  ctx.moveTo(radius, 2);
  ctx.arcTo(w - 2, 2, w - 2, h - 2, radius);
  ctx.arcTo(w - 2, h - 2, 2, h - 2, radius);
  ctx.arcTo(2, h - 2, 2, 2, radius);
  ctx.arcTo(2, 2, w - 2, 2, radius);
  ctx.fill();
  ctx.fillStyle = '#f5efe6';
  ctx.font = `700 30px 'Noto Sans Devanagari', 'Mangal', 'Nirmala UI', sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(nameNp, w / 2, h / 2 + 2);
}

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
 * Merged vertex-colored body: legs, torso, head, cap — one draw call per NPC.
 * @param {{ body: number, cap: number }} look
 * @returns {THREE.BufferGeometry}
 */
function buildBodyGeometry(look) {
  const parts = [
    colorize(new THREE.CylinderGeometry(0.16, 0.2, 0.72, 8).translate(0, 0.36, 0), NPCS.colors.timber),
    colorize(new THREE.CylinderGeometry(0.22, 0.24, 0.62, 8).translate(0, 1.03, 0), look.body),
    colorize(new THREE.SphereGeometry(0.15, 10, 8).translate(0, 1.5, 0), NPCS.colors.skin),
    colorize(new THREE.CylinderGeometry(0.16, 0.17, 0.08, 8).translate(0, 1.63, 0), look.cap),
  ];
  const merged = mergeGeometries(parts);
  for (const part of parts) part.dispose();
  return merged;
}

/**
 * @param {THREE.Scene} scene @param {THREE.WebGLRenderer} renderer
 * @returns {{ update: (timeSec: number) => void, npcs: Array<{ id: string, root: THREE.Object3D, proxy: THREE.Mesh }>, dispose: () => void }}
 */
export function buildNpcs(scene, renderer) {
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 });
  const proxyMaterial = new THREE.MeshBasicMaterial({ visible: false });
  const proxyGeometry = new THREE.BoxGeometry(NPCS.proxy.width, NPCS.proxy.height, NPCS.proxy.width);
  /** @type {Array<{ id: string, root: THREE.Group, proxy: THREE.Mesh }>} */
  const npcs = [];
  /** @type {Array<{ texture: THREE.CanvasTexture, canvas: HTMLCanvasElement, nameNp: string }>} */
  const nametags = [];
  const root = new THREE.Group();
  root.name = 'npcs';

  for (const roster of NPC_ROSTER) {
    const group = new THREE.Group();
    group.userData.isNpc = true;
    group.userData.npcId = roster.id;

    const body = new THREE.Mesh(buildBodyGeometry(roster), material);
    body.castShadow = true;
    group.add(body);

    const nametagCanvas = makeArt(NPCS.nametag.canvasW, NPCS.nametag.canvasH, (ctx, w, h) => drawNametag(ctx, w, h, roster.nameNp));
    const nametagTexture = makeTexture(nametagCanvas, renderer);
    const nametag = new THREE.Sprite(new THREE.SpriteMaterial({ map: nametagTexture, transparent: true, depthWrite: false }));
    nametag.scale.set(NPCS.nametag.width, NPCS.nametag.height, 1);
    nametag.position.y = NPCS.nametag.y;
    group.add(nametag);
    nametags.push({ texture: nametagTexture, canvas: nametagCanvas, nameNp: roster.nameNp });

    const proxy = new THREE.Mesh(proxyGeometry, proxyMaterial);
    proxy.position.y = NPCS.proxy.height / 2;
    proxy.userData.isNpc = true;
    proxy.userData.npcId = roster.id;
    group.add(proxy);

    root.add(group);
    npcs.push({ id: roster.id, root: group, proxy });
  }

  const dai = /** @type {{ root: THREE.Group }} */ (npcs.find((npc) => npc.id === 'pasale-dai'));
  dai.root.position.set(PASALE_DAI_POSITION[0], 0, PASALE_DAI_POSITION[2]);
  scene.add(root);

  loadDevanagariFont().then((loaded) => {
    if (!loaded) return;
    for (const tag of nametags) {
      const ctx = /** @type {CanvasRenderingContext2D} */ (tag.canvas.getContext('2d'));
      drawNametag(ctx, tag.canvas.width, tag.canvas.height, tag.nameNp);
      tag.texture.needsUpdate = true;
    }
  });

  return {
    npcs,
    /** @param {number} timeSec */
    update(timeSec) {
      for (const roster of NPC_ROSTER) {
        const path = /** @type {{ from: [number, number], to: [number, number], period: number, phase: number }} */ (NPC_PATHS[roster.id]);
        if (!path) continue;
        const npc = /** @type {{ root: THREE.Group }} */ (npcs.find((entry) => entry.id === roster.id));
        const pose = npcPose(timeSec, path);
        npc.root.position.set(pose.x, pose.bob, pose.z);
      }
    },
    dispose() {
      scene.remove(root);
      material.dispose();
      proxyGeometry.dispose();
      proxyMaterial.dispose();
      for (const npc of npcs) {
        for (const child of npc.root.children) {
          if (child instanceof THREE.Mesh) child.geometry.dispose();
          if (child instanceof THREE.Sprite) {
            child.material.map?.dispose();
            child.material.dispose();
          }
        }
      }
    },
  };
}
