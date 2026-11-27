import * as THREE from 'three';
import { createTimestep } from './engine/loop.js';
import { createPointerGuard, observeResize } from './engine/input.js';
import { createStorage } from './engine/storage.js';
import { createStore } from './engine/store.js';
import { createCameraRig } from './engine/cameraRig.js';
import { createBell } from './engine/audio.js';
import { OBSTACLES, LANDING_ORBIT, ENTER_POSITION, CAMERA_PRESETS } from './world/layout.js';
import { makeArt, makeTexture, makeBump, drawBrick, drawBrickBump, drawCobble, drawCobbleBump } from './world/art.js';
import { buildArchitecture } from './world/architecture.js';
import { buildCulture } from './world/culture.js';
import { buildAripana } from './world/mandala.js';
import { buildAtmosphere } from './world/atmosphere.js';
import { createDpad, createKeyboardControl, clampOrbitRadius, DPAD, directionVector } from './ui/dpad.js';
import { createLandingOverlay } from './ui/landing.js';
import { createToast } from './ui/toast.js';

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
      isWall ? brickMaterial : box.name === 'Corner Pillar' ? stoneMaterial : woodMaterial,
    );
    mesh.position.set(centerX, height / 2, centerZ);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
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

/**
 * @param {string} name
 * @returns {string}
 */
function greetingFor(name) {
  return name ? `नमस्ते, ${name}! पसलमा स्वागत छ।` : 'नमस्ते! पसलमा स्वागत छ।';
}

function boot() {
  const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById('scene'));
  const body = document.body;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  /** @type {{ current: ((timeMs: number) => void) | null }} */
  const frameRef = { current: null };
  canvas.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    renderer.setAnimationLoop(null);
  });
  canvas.addEventListener('webglcontextrestored', () => {
    if (frameRef.current) renderer.setAnimationLoop(frameRef.current);
  });

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x9fb8c8);
  scene.fog = new THREE.FogExp2(0x9fb8c8, 0.028);

  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);

  buildLighting(scene);
  buildShell(scene, renderer);
  buildArchitecture(scene, renderer);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const culture = buildCulture(scene, renderer, { reducedMotion });
  buildAripana(scene, renderer);
  const atmosphere = buildAtmosphere(scene, renderer, { reducedMotion });

  const storage = createStorage();
  const persisted = /** @type {{ visitorName: string, stockMap: Record<string, number>, cartArr: Array<{ id: string, vIdx: number, qty: number }> }} */ (storage.load());
  const store = createStore({
    mode: 'landing',
    visitorName: typeof persisted.visitorName === 'string' ? persisted.visitorName : '',
  });
  store.subscribe((current) => {
    body.dataset.mode = current.mode;
  });
  body.dataset.mode = store.get().mode;
  body.dataset.audio = 'idle';

  const bell = createBell();
  const rig = createCameraRig({
    camera,
    landingOrbit: LANDING_ORBIT,
    enterPosition: ENTER_POSITION,
    reducedMotion,
  });

  const guard = createPointerGuard(canvas);
  canvas.addEventListener('click', (event) => {
    if (!guard.wasClick(/** @type {PointerEvent} */ (event))) return;
    if (store.get().mode !== 'explore') return;
  });

  const applyDirection = (/** @type {import('./ui/dpad.js').Direction} */ direction) => {
    if (rig.getMode() !== 'orbit') return;
    const vector = directionVector(direction);
    const orbit = rig.getOrbit();
    rig.setOrbit({
      angle: orbit.angle + vector.x * DPAD.stepAngle,
      radius: clampOrbitRadius(orbit.radius + vector.z * DPAD.stepZoom),
    });
  };
  const dpad = createDpad(body, { onDirection: applyDirection });
  const keyboard = createKeyboardControl(window, { onDirection: applyDirection });

  /**
   * @param {string} name
   * @param {string | null} preset
   */
  function enterPasal(name, preset) {
    if (store.get().mode !== 'landing') return;
    const presetEntry = preset
      ? CAMERA_PRESETS.find((entry) => entry.name === preset)
      : undefined;
    const target = presetEntry?.position ?? ENTER_POSITION;
    store.set({ mode: 'transition', visitorName: name });
    storage.save({
      visitorName: name,
      stockMap: persisted.stockMap,
      cartArr: persisted.cartArr,
    });
    dpad.dispose();
    keyboard.dispose();
    rig.beginTransition(/** @type {[number, number, number]} */ (target), presetEntry?.lookAt);
    void bell.play().then((audioState) => {
      body.dataset.audio = audioState;
    });
    createToast(body, greetingFor(name));
  }

  const landing = createLandingOverlay(body, {
    initialName: store.get().visitorName,
    onEnter: ({ name, preset }) => enterPasal(name, preset),
  });

  const releaseControls = () => {
    dpad.dispose();
    keyboard.dispose();
    guard.dispose();
    landing.dispose();
    bell.dispose();
  };
  window.addEventListener('pagehide', releaseControls, { once: true });

  const disconnectResize = observeResize(canvas, ({ width, height }) => {
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  });

  let lastCamX = Number.NaN;
  let lastCamY = Number.NaN;
  let lastCamZ = Number.NaN;
  function publishCamera() {
    const { x, y, z } = camera.position;
    if (x === lastCamX && y === lastCamY && z === lastCamZ) return;
    lastCamX = x;
    lastCamY = y;
    lastCamZ = z;
    body.dataset.camX = x.toFixed(3);
    body.dataset.camY = y.toFixed(3);
    body.dataset.camZ = z.toFixed(3);
  }

  /** @param {number} fixedDelta */
  function update(fixedDelta) {
    if (!Number.isFinite(fixedDelta)) return;
    rig.update(fixedDelta);
    if (store.get().mode === 'transition' && rig.getMode() === 'settled') {
      store.set({ mode: 'explore' });
    }
  }

  /** @param {number} timeMs */
  function render(timeMs) {
    culture.update(timeMs / 1000);
    atmosphere.update(timeMs / 1000);
    rig.render();
    if (rig.getMode() !== 'orbit') publishCamera();
    renderer.render(scene, camera);
  }

  const frame = createTimestep({ update, render });
  frameRef.current = frame;
  renderer.setAnimationLoop(frame);
}

if (supportsWebGL2()) {
  boot();
} else {
  showFallback();
}
