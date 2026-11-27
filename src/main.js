import * as THREE from 'three';
import { createTimestep } from './engine/loop.js';
import { createPointerGuard, observeResize } from './engine/input.js';
import { createStorage } from './engine/storage.js';
import { OBSTACLES, LANDING_ORBIT } from './world/layout.js';
import { makeArt, makeTexture, makeBump, drawBrick, drawBrickBump, drawCobble, drawCobbleBump } from './world/art.js';
import { buildArchitecture } from './world/architecture.js';
import { buildCulture } from './world/culture.js';

const state = {
  mode: 'landing',
  orbitAngle: 0.9,
  paused: false,
};

function supportsWebGL2() {
  const probe = document.createElement('canvas');
  return Boolean(probe.getContext('webgl2'));
}

function showFallback() {
  const fallback = document.getElementById('webgl-fallback');
  if (fallback) fallback.hidden = false;
}

/** @param {THREE.Scene} scene @param {THREE.WebGLRenderer} renderer */
function buildShell(scene, renderer) {
  const brickMap = makeTexture(makeArt(256, 256, drawBrick), renderer);
  const brickBump = makeBump(makeArt(256, 256, drawBrickBump));
  const brickMaterial = new THREE.MeshStandardMaterial({
    map: brickMap,
    bumpMap: brickBump,
    bumpScale: 0.6,
    roughness: 0.92,
    metalness: 0,
  });

  const cobbleMap = makeTexture(makeArt(512, 512, drawCobble), renderer);
  const cobbleBump = makeBump(makeArt(512, 512, drawCobbleBump));
  const cobbleMaterial = new THREE.MeshStandardMaterial({
    map: cobbleMap,
    bumpMap: cobbleBump,
    bumpScale: 0.5,
    roughness: 0.95,
    metalness: 0,
  });

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), cobbleMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const woodMaterial = new THREE.MeshStandardMaterial({ color: 0x5b4028, roughness: 0.85 });
  const stoneMaterial = new THREE.MeshStandardMaterial({ color: 0x8a8578, roughness: 0.9 });

  for (const box of OBSTACLES) {
    const width = box.maxX - box.minX;
    const depth = box.maxZ - box.minZ;
    const isWall = box.name.includes('Wall');
    const height = isWall ? 3.2 : 1.0;
    const centerX = (box.minX + box.maxX) / 2;
    const centerZ = (box.minZ + box.maxZ) / 2;
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(width, height, depth),
      isWall ? brickMaterial : box.name === 'Corner Pillar' ? woodMaterial : woodMaterial,
    );
    mesh.position.set(centerX, height / 2, centerZ);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    if (box.name === 'Corner Pillar') mesh.material = stoneMaterial;
    scene.add(mesh);
  }

  cobbleMap.repeat.set(8, 8);
}

/** @param {THREE.Scene} scene */
function buildLighting(scene) {
  const hemisphere = new THREE.HemisphereLight(0xcfe8ff, 0x8f3b26, 0.55);
  scene.add(hemisphere);

  const sun = new THREE.DirectionalLight(0xffd9a0, 2.2);
  sun.position.set(8, 10, 6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -12;
  sun.shadow.camera.right = 12;
  sun.shadow.camera.top = 12;
  sun.shadow.camera.bottom = -12;
  scene.add(sun);
}

function boot() {
  const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById('scene'));
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    state.paused = true;
  });
  canvas.addEventListener('webglcontextrestored', () => {
    state.paused = false;
  });

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x9fb8c8);
  scene.fog = new THREE.FogExp2(0x9fb8c8, 0.028);

  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);

  buildLighting(scene);
  buildShell(scene, renderer);
  buildArchitecture(scene, renderer);
  const culture = buildCulture(scene, renderer);

  createStorage().load();

  const guard = createPointerGuard(canvas);
  void guard;

  const disconnectResize = observeResize(canvas, ({ width, height }) => {
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  });

  /** @param {number} fixedDelta */
  function update(fixedDelta) {
    if (state.paused) return;
    if (state.mode === 'landing') {
      state.orbitAngle += fixedDelta * 0.12;
    }
  }

  /** @param {number} timeMs */
  function render(timeMs) {
    culture.update(timeMs / 1000);
    if (state.mode === 'landing') {
      camera.position.set(
        LANDING_ORBIT.target[0] + Math.cos(state.orbitAngle) * LANDING_ORBIT.radius,
        LANDING_ORBIT.height,
        LANDING_ORBIT.target[2] + Math.sin(state.orbitAngle) * LANDING_ORBIT.radius,
      );
      camera.lookAt(LANDING_ORBIT.target[0], LANDING_ORBIT.target[1], LANDING_ORBIT.target[2]);
    }
    renderer.render(scene, camera);
  }

  renderer.setAnimationLoop(createTimestep({ update, render }));
}

if (supportsWebGL2()) {
  boot();
} else {
  showFallback();
}
