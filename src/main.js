import * as THREE from 'three';
import { createTimestep } from './engine/loop.js';
import { createPointerGuard, createDragStream, observeResize } from './engine/input.js';
import { createPostChain } from './engine/post.js';
import { createStorage } from './engine/storage.js';
import { createStore } from './engine/store.js';
import { getSku, initialStockMap } from './commerce/catalog.js';
import { addToCart, setCartQty, cartCount, cartSubtotal, checkoutCart, restoreCart } from './commerce/cart.js';
import { newBillId, buildBill, renderBill } from './commerce/bill.js';
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
import { buildFacades } from './world/facades.js';
import { drawThumb } from './world/thumbs.js';
import { createDpad, createKeyboardControl, dragOrbit, clampOrbitRadius, DPAD, directionVector } from './ui/dpad.js';
import { createLandingOverlay } from './ui/landing.js';
import { createToast } from './ui/toast.js';
import { createHud } from './ui/hud.js';
import { createCatalogDrawer } from './ui/catalogDrawer.js';
import { createInspector } from './ui/inspector.js';

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

/** @param {unknown} raw @returns {Record<string, number>} persisted keys validated against the catalog */
function seedStockMap(raw) {
  const stockMap = initialStockMap();
  if (raw === null || typeof raw !== 'object') return stockMap;
  for (const [id, value] of Object.entries(raw)) {
    try {
      getSku(id);
    } catch {
      continue;
    }
    if (typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 99) {
      stockMap[id] = value;
    }
  }
  return stockMap;
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
  buildFacades(scene, renderer);
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
  const stockMap = seedStockMap(persisted.stockMap);
  const store = createStore({
    mode: 'landing',
    visitorName: typeof persisted.visitorName === 'string' ? persisted.visitorName : '',
    stockMap,
    cartLines: restoreCart(persisted.cartArr, stockMap),
  });
  store.subscribe((current) => {
    body.dataset.mode = current.mode;
  });
  store.subscribe((current) => {
    storage.save({
      visitorName: current.visitorName,
      stockMap: current.stockMap,
      cartArr: current.cartLines,
    });
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

  const thumbUrls = new Map();
  const imageFor = (/** @type {string} */ art) => {
    let url = thumbUrls.get(art);
    if (url === undefined) {
      url = makeArt(96, 96, (ctx, w, h) => drawThumb(ctx, w, h, art)).toDataURL();
      thumbUrls.set(art, url);
    }
    return url;
  };

  /** @type {ReturnType<typeof createInspector> | null} */
  let inspector = null;
  const closeInspector = () => {
    if (inspector) {
      inspector.dispose();
      inspector = null;
    }
  };
  const openInspector = (/** @type {import('./commerce/catalog.js').Sku} */ sku, /** @type {number} */ vIdx) => {
    closeInspector();
    inspector = createInspector(body, {
      sku,
      vIdx,
      stock: store.get().stockMap[sku.id] ?? 0,
      image: imageFor(sku.art),
      onClose: closeInspector,
      onAdd: (target, targetVIdx) => runAdd(target.id, targetVIdx, 1),
    });
  };

  const runAdd = (/** @type {string} */ id, /** @type {number} */ vIdx, /** @type {number} */ qty) => {
    const result = addToCart(store.get().cartLines, store.get().stockMap, id, vIdx, qty);
    if (!result.ok) {
      createToast(body, 'स्टक सकियो · Out of stock');
      return false;
    }
    store.set({ cartLines: result.lines });
    return true;
  };

  const runDecrement = (/** @type {string} */ id, /** @type {number} */ vIdx) => {
    const line = store.get().cartLines.find((entry) => entry.id === id && entry.vIdx === vIdx);
    if (!line) return;
    const result = setCartQty(store.get().cartLines, store.get().stockMap, id, vIdx, line.qty - 1);
    if (result.ok) store.set({ cartLines: result.lines });
  };

  /** @type {ReturnType<typeof renderBill> | null} */
  let bill = null;
  const runCheckout = (/** @type {boolean} */ qrUsed, /** @type {string} */ promoText) => {
    const state = store.get();
    const promos = promoText.split(/[\s,]+/).map((code) => code.trim().toUpperCase()).filter(Boolean);
    const result = checkoutCart(state.cartLines, state.stockMap, { qrUsed, promos });
    if (!result.ok) {
      createToast(body, result.reason === 'oversell' ? 'स्टक सकियो · Out of stock' : 'झोला खाली छ · Jhola is empty');
      return;
    }
    /** @type {Record<string, number>} */
    const nextStockMap = { ...state.stockMap };
    for (const [id, delta] of Object.entries(result.stockDelta)) {
      nextStockMap[id] = Math.max(0, (nextStockMap[id] ?? 0) + delta);
    }
    store.set({ cartLines: result.lines, stockMap: nextStockMap });
    if (bill) bill.dispose();
    bill = renderBill(body, buildBill(result.pricedLines, result.summary, {
      orderId: newBillId(),
      dateIso: new Date().toISOString(),
      visitorName: state.visitorName,
    }), {
      onClose: () => {
        if (bill) {
          bill.dispose();
          bill = null;
        }
      },
    });
  };

  const hudHost = document.getElementById('hud');
  const hud = createHud(/** @type {HTMLElement} */ (hudHost), { onCartClick: () => drawer.open() });
  const drawer = createCatalogDrawer(body, {
    getLines: () => store.get().cartLines,
    stockOf: (id) => store.get().stockMap[id] ?? 0,
    imageFor,
    onAdd: runAdd,
    onDecrement: runDecrement,
    onInspect: openInspector,
    onCheckout: runCheckout,
  });
  store.subscribe((current) => {
    hud.setCart(cartCount(current.cartLines), cartSubtotal(current.cartLines));
  });
  hud.setCart(cartCount(store.get().cartLines), cartSubtotal(store.get().cartLines));

  const releaseControls = () => {
    dpad.dispose();
    keyboard.dispose();
    drag.dispose();
    guard.dispose();
    landing.dispose();
    bell.dispose();
    theme.dispose();
    hud.dispose();
    drawer.dispose();
    closeInspector();
    if (bill) bill.dispose();
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
