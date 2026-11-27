import * as THREE from 'three';
import { createTimestep } from './engine/loop.js';
import { createPointerGuard, createDragStream, observeResize } from './engine/input.js';
import { createPostChain } from './engine/post.js';
import { createStorage } from './engine/storage.js';
import { createStore } from './engine/store.js';
import { createCameraRig } from './engine/cameraRig.js';
import { createBell } from './engine/audio.js';
import { OBSTACLES, SHELL, LANDING_ORBIT, ENTER_POSITION, CAMERA_PRESETS } from './world/layout.js';
import { makeArt, makeTexture, makeBump, drawBrick, drawBrickBump, drawBrickRoughness, drawCobble, drawCobbleBump, drawCobbleRoughness } from './world/art.js';
import { buildTheme } from './world/theme.js';
import { buildArchitecture } from './world/architecture.js';
import { buildCulture } from './world/culture.js';
import { buildAripana } from './world/mandala.js';
import { buildAtmosphere } from './world/atmosphere.js';
import { buildProps } from './world/props.js';
import { createDpad, createKeyboardControl, dragOrbit, clampOrbitRadius, DPAD, directionVector } from './ui/dpad.js';
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
  const brickRoughness = makeBump(makeArt(256, 256, drawBrickRoughness));
  const brickMaterial = new THREE.MeshStandardMaterial({
    map: brickMap,
    bumpMap: brickBump,
    bumpScale: 0.45,
    roughnessMap: brickRoughness,
    roughness: 1.0,
    metalness: 0,
  });

  const cobbleMap = makeTexture(makeArt(512, 512, drawCobble), renderer);
  const cobbleBump = makeBump(makeArt(512, 512, drawCobbleBump));
  const cobbleRoughness = makeBump(makeArt(512, 512, drawCobbleRoughness));
  const cobbleMaterial = new THREE.MeshStandardMaterial({
    map: cobbleMap,
    bumpMap: cobbleBump,
    bumpScale: 0.5,
    roughnessMap: cobbleRoughness,
    roughness: 1.0,
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
    const height = isWall ? SHELL.wallHeight : SHELL.propHeight;
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
    mountPost();
    if (frameRef.current) renderer.setAnimationLoop(frameRef.current);
  });

  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);

  const theme = buildTheme(scene, renderer);
  buildShell(scene, renderer);
  buildArchitecture(scene, renderer);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const culture = buildCulture(scene, renderer, { reducedMotion });
  buildAripana(scene, renderer);
  const atmosphere = buildAtmosphere(scene, renderer, { reducedMotion });
  buildProps(scene, renderer);

  /** @type {ReturnType<typeof createPostChain>} */
  let postChain = null;
  const mountPost = () => {
    if (postChain) postChain.dispose();
    postChain = createPostChain(renderer, scene, camera, {
      width: window.innerWidth,
      height: window.innerHeight,
    });
  };
  mountPost();

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
  const drag = createDragStream(canvas, {
    onDrag: (dx, dy) => {
      if (rig.getMode() !== 'orbit') return;
      rig.setOrbit(dragOrbit(rig.getOrbit(), dx, dy));
    },
  });

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
    drag.dispose();
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
    drag.dispose();
    guard.dispose();
    landing.dispose();
    bell.dispose();
    theme.dispose();
    if (postChain) postChain.dispose();
  };
  window.addEventListener('pagehide', releaseControls, { once: true });

  const disconnectResize = observeResize(canvas, ({ width, height }) => {
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    if (postChain) postChain.setSize(width, height);
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
    if (postChain) postChain.render();
    else renderer.render(scene, camera);
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
