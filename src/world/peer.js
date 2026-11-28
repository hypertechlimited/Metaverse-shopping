import * as THREE from 'three';
import { makeArt, makeTexture, loadDevanagariFont } from './art.js';
import { NPCS, drawNametagCanvas, buildAvatarBody, createAvatarMaterial, disposeAvatarMaterial } from './npc.js';

export const PEER_AVATAR = {
  nametag: { name: 'साथी (रिमोट)', y: NPCS.nametag.y },
};

/**
 * One networked avatar: merged vertex-colored body + Devanagari nametag
 * sprite, positioned entirely by the presence interpolation layer.
 * Reuses the NPC body builder — a peer IS a neighbor, only its feed differs.
 *
 * @param {THREE.Scene} scene @param {THREE.WebGLRenderer} renderer
 * @returns {{ root: THREE.Group, apply: (pose: { x: number, z: number, yaw: number }) => void, setVisible: (visible: boolean) => void, dispose: () => void }}
 */
export function buildPeer(scene, renderer) {
  const root = new THREE.Group();
  root.name = 'peer-avatar';
  const material = createAvatarMaterial();
  const body = new THREE.Mesh(buildAvatarBody({ body: NPCS.colors.gold, cap: NPCS.colors.timber }), material);
  body.castShadow = true;
  root.add(body);

  const canvas = makeArt(NPCS.nametag.canvasW, NPCS.nametag.canvasH, (ctx, w, h) => drawNametagCanvas(ctx, w, h, PEER_AVATAR.nametag.name));
  const texture = makeTexture(canvas, renderer);
  const nametag = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
  nametag.scale.set(NPCS.nametag.width, NPCS.nametag.height, 1);
  nametag.position.y = PEER_AVATAR.nametag.y;
  root.add(nametag);

  loadDevanagariFont().then((loaded) => {
    if (!loaded) return;
    const ctx = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'));
    drawNametagCanvas(ctx, canvas.width, canvas.height, PEER_AVATAR.nametag.name);
    texture.needsUpdate = true;
  });

  root.visible = false;
  scene.add(root);
  return {
    root,
    /** @param {{ x: number, z: number, yaw: number }} pose */
    apply(pose) {
      root.visible = true;
      root.position.set(pose.x, 0, pose.z);
      root.rotation.y = pose.yaw;
    },
    setVisible(visible) {
      root.visible = visible;
    },
    dispose() {
      scene.remove(root);
      body.geometry.dispose();
      disposeAvatarMaterial(material);
      nametag.material.map?.dispose();
      nametag.material.dispose();
    },
  };
}
