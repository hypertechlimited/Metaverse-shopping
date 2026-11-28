import * as THREE from 'three';
import { createTimestep } from './engine/loop.js';
import { createPointerGuard, createDragStream, observeResize, createKeyAxis } from './engine/input.js';
import { createPostChain } from './engine/post.js';
import { createStorage } from './engine/storage.js';
import { createStore } from './engine/store.js';
import { createCameraRig } from './engine/cameraRig.js';
import { createPlayer, PLAYER } from './engine/player.js';
import { buildNavGrid, findPath } from './engine/nav.js';
import { createPerfGovernor } from './engine/perfGovernor.js';
import { createPeerFeed } from './engine/presenceFeed.js';
import { addSample, trimBuffer, sampleAt } from './engine/avatar.js';
import { buildPeer } from './world/peer.js';
import { createTour } from './engine/tour.js';
import { createBell } from './engine/audio.js';
import { getSku, getVariant, initialStockMap } from './commerce/catalog.js';
import { addToCart, setCartQty, cartCount, cartSubtotal, checkoutCart, restoreCart } from './commerce/cart.js';
import { formatRupees } from './commerce/pricing.js';
import { newBillId, buildBill, renderBill } from './commerce/bill.js';
import { OBSTACLES, SHELL, LANDING_ORBIT, ENTER_POSITION, CAMERA_PRESETS, STREET, PLAYER_RADIUS } from './world/layout.js';
import { makeArt, makeTexture, makeBump, drawBrick, drawBrickBump, drawBrickRoughness, drawCobble, drawCobbleBump, drawCobbleRoughness } from './world/art.js';
import { buildTheme } from './world/theme.js';
import { buildArchitecture } from './world/architecture.js';
import { buildCulture } from './world/culture.js';
import { buildAripana } from './world/mandala.js';
import { buildAtmosphere } from './world/atmosphere.js';
import { buildProps } from './world/props.js';
import { buildProducts } from './world/products.js';
import { buildNpcs, npcName } from './world/npc.js';
import { buildFacades } from './world/facades.js';
import { drawThumb } from './world/thumbs.js';
import { createDpad, createKeyboardControl, dragOrbit, clampOrbitRadius, DPAD, directionVector, MOVE_LABELS } from './ui/dpad.js';
import { createLandingOverlay } from './ui/landing.js';
import { createToast } from './ui/toast.js';
import { createHud } from './ui/hud.js';
import { createCatalogDrawer } from './ui/catalogDrawer.js';
import { createInspector } from './ui/inspector.js';
import { createHoverTip, tipLines } from './ui/hoverTip.js';
import { createPresetBar } from './ui/presetBar.js';
import { createJoystick } from './ui/joystick.js';

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
  const products = buildProducts(scene);
  const npcs = buildNpcs(scene, renderer);

  const navGrid = buildNavGrid(OBSTACLES, STREET, { radius: PLAYER_RADIUS });
  const peer = buildPeer(scene, renderer);
  const peerFeed = createPeerFeed({ path: { from: [-4, 2.4], to: [6, 2.4], period: 20, phase: 0 }, seed: 7 });
  /** @type {import('./engine/avatar.js').AvatarSample[]} */
  const peerBuffer = [];
  const basePixelRatio = Math.min(window.devicePixelRatio, 2);
  const governor = createPerfGovernor();

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

  const highlight = new THREE.BoxHelper(products.proxies[0], 0xfbbf24);
  highlight.visible = false;
  scene.add(highlight);

  const raycaster = new THREE.Raycaster();
  const pointerNdc = new THREE.Vector2();
  const lookDir = new THREE.Vector3();
  const pointerClient = { x: 0, y: 0 };
  let pointerDirty = false;
  let hoveredProductId = /** @type {string | null} */ (null);
  let hoveredNpcId = /** @type {string | null} */ (null);
  let player = /** @type {ReturnType<typeof createPlayer> | null} */ (null);
  let disposeExploreControls = /** @type {(() => void) | null} */ (null);

  const hoverTip = createHoverTip(body);
  const tour = createTour(CAMERA_PRESETS.map((preset) => preset.name));

  const clearHover = () => {
    hoveredProductId = null;
    hoveredNpcId = null;
    highlight.visible = false;
    hoverTip.hide();
  };

  const proxyFor = (/** @type {string} */ id) => {
    const proxy = products.proxies.find((entry) => entry.userData.product === id);
    return proxy ?? null;
  };

  /** @param {number} clientX @param {number} clientY @returns {{ type: 'product' | 'npc', id: string } | null} */
  function pickAt(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    pointerNdc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointerNdc, camera);
    const productHit = raycaster.intersectObjects(products.proxies, false)[0];
    if (productHit) return { type: 'product', id: /** @type {string} */ (productHit.object.userData.product) };
    const npcHit = raycaster.intersectObjects(npcs.npcs.map((npc) => npc.proxy), false)[0];
    if (npcHit) return { type: 'npc', id: /** @type {string} */ (npcHit.object.userData.npcId) };
    return null;
  }

  function applyHover() {
    if (store.get().mode !== 'explore' || inspector) {
      clearHover();
      return;
    }
    const hit = pickAt(pointerClient.x, pointerClient.y);
    if (!hit) {
      clearHover();
      return;
    }
    if (hit.type === 'npc') {
      hoveredProductId = null;
      hoveredNpcId = hit.id;
      highlight.visible = false;
      hoverTip.show(
        { titleNp: npcName(hit.id).nameNp, titleEn: hit.id === 'pasale-dai' ? 'Shopkeeper' : 'Neighbor', price: '', stock: 'क्लिक गर्नुहोस् · Click to greet' },
        pointerClient.x,
        pointerClient.y,
      );
      return;
    }
    const sku = getSku(hit.id);
    const stock = store.get().stockMap[hit.id] ?? 0;
    const proxy = proxyFor(hit.id);
    if (proxy) {
      highlight.setFromObject(proxy);
      highlight.visible = true;
    }
    hoveredProductId = hit.id;
    hoveredNpcId = null;
    hoverTip.show(tipLines(sku, stock, formatRupees(getVariant(hit.id, 0).price)), pointerClient.x, pointerClient.y);
  }

  const onPointerMove = (/** @type {PointerEvent} */ event) => {
    pointerClient.x = event.clientX;
    pointerClient.y = event.clientY;
    pointerDirty = true;
  };
  canvas.addEventListener('pointermove', onPointerMove);

  store.subscribe(() => {
    if (store.get().mode === 'explore') pointerDirty = true;
  });

  const stopTour = () => {
    if (tour.isActive()) {
      tour.stop();
      presetBar.setTourActive(false);
    }
  };

  /** @param {string} name */
  function beginFlight(name) {
    const preset = CAMERA_PRESETS.find((entry) => entry.name === name);
    if (!preset) return;
    if (store.get().mode !== 'explore') return;
    store.set({ mode: 'transition' });
    const origin = /** @type {[number, number, number]} */ ([camera.position.x, camera.position.y, camera.position.z]);
    rig.beginTransition(
      preset.position,
      preset.lookAt,
      {
        position: origin,
        lookAt: player ? player.lookAtPoint() : [...preset.lookAt],
      },
    );
  }

  /** @param {string} name */
  function flyToPreset(name) {
    stopTour();
    beginFlight(name);
  }

  function toggleTour() {
    if (tour.isActive()) {
      stopTour();
      return;
    }
    if (store.get().mode !== 'explore') return;
    tour.start();
    presetBar.setTourActive(true);
  }

  const presetBar = createPresetBar(body, {
    presets: CAMERA_PRESETS,
    onPreset: flyToPreset,
    onTourToggle: toggleTour,
  });

  function resyncPlayerFromCamera() {
    camera.getWorldDirection(lookDir);
    const pose = /** @type {[number, number, number]} */ ([camera.position.x, camera.position.y, camera.position.z]);
    const yaw = Math.atan2(lookDir.x, lookDir.z);
    if (!player) {
      player = createPlayer({
        position: pose,
        yaw,
        boxes: OBSTACLES,
        street: STREET,
        reducedMotion,
      });
      disposeExploreControls = attachExploreControls();
      return;
    }
    player.syncFrom(pose, yaw);
  }

  function attachExploreControls() {
    const movementKeys = createKeyAxis(window, {
      onChange: (axes) => {
        if (store.get().mode !== 'explore' || !player) return;
        stopTour();
        player.setMoveInput(axes.forward, axes.strafe);
        player.setTurnInput(axes.turn);
      },
    });
    const exploreDrag = createDragStream(canvas, {
      onDrag: (dx) => {
        if (!player) return;
        stopTour();
        if (store.get().mode !== 'explore') return;
        player.stepTurn(-dx * PLAYER.dragYawPerPixel);
      },
    });
    const exploreDpad = createDpad(
      body,
      {
        onDirection: (direction) => {
          if (store.get().mode !== 'explore' || !player) return;
          stopTour();
          if (direction === 'up') player.stepForward(PLAYER.stepDistance);
          else if (direction === 'down') player.stepForward(-PLAYER.stepDistance);
          else if (direction === 'left') player.stepTurn(-PLAYER.stepTurn);
          else player.stepTurn(PLAYER.stepTurn);
        },
      },
      { labels: MOVE_LABELS, groupLabel: 'हिँड्ने नियन्त्रण · Movement' },
    );
    const onInspectKey = (/** @type {KeyboardEvent} */ event) => {
      if (event.key !== 'e' && event.key !== 'E') return;
      if (store.get().mode !== 'explore' || inspector || !hoveredProductId) return;
      openInspector(getSku(hoveredProductId), 0);
      hoverTip.hide();
    };
    document.addEventListener('keydown', onInspectKey);
    const exploreJoystick = createJoystick(body, {
      onChange: (forward, strafe) => {
        if (store.get().mode !== 'explore' || !player) return;
        stopTour();
        player.setMoveInput(forward, strafe);
      },
    });
    return () => {
      movementKeys.dispose();
      exploreDrag.dispose();
      exploreDpad.dispose();
      exploreJoystick.dispose();
      document.removeEventListener('keydown', onInspectKey);
    };
  }

  const npcGreeting = (/** @type {string} */ id) => {
    const name = store.get().visitorName;
    const who = npcName(id).nameNp;
    return name ? `${who}: नमस्ते ${name}! के चाहियो?` : `${who}: नमस्ते! के चाहियो?`;
  };

  /** @param {number} clientX @param {number} clientY @returns {[number, number] | null} */
  function groundPointAt(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    pointerNdc.set(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(pointerNdc, camera);
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const point = new THREE.Vector3();
    const groundHit = raycaster.ray.intersectPlane(groundPlane, point);
    return groundHit ? [point.x, point.z] : null;
  }

  canvas.addEventListener('click', (event) => {
    if (!guard.wasClick(/** @type {PointerEvent} */ (event))) return;
    if (store.get().mode !== 'explore' || inspector) return;
    const hit = pickAt(event.clientX, event.clientY);
    if (!hit) {
      if (!player) return;
      const target = groundPointAt(event.clientX, event.clientY);
      if (!target) return;
      stopTour();
      hoverTip.hide();
      const path = findPath(navGrid, [player.getX(), player.getZ()], target);
      if (path) player.setPath(path);
      return;
    }
    if (hit.type === 'npc') {
      createToast(body, npcGreeting(hit.id));
      return;
    }
    stopTour();
    hoverTip.hide();
    openInspector(getSku(hit.id), 0);
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
    if (disposeExploreControls) disposeExploreControls();
    hoverTip.dispose();
    presetBar.dispose();
    products.dispose();
    npcs.dispose();
    peer.dispose();
    scene.remove(highlight);
    highlight.dispose();
    canvas.removeEventListener('pointermove', onPointerMove);
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
      rig.render();
      store.set({ mode: 'explore' });
      resyncPlayerFromCamera();
      pointerDirty = true;
    }
    if (player && store.get().mode === 'explore') {
      player.update(fixedDelta);
      const next = tour.update(fixedDelta, rig.getMode() === 'settled');
      if (next) beginFlight(next);
    }
  }

  /** @param {number} timeMs */
  function render(timeMs) {
    governor.observeFrame(timeMs);
    const tierStep = governor.update(timeMs);
    if (tierStep >= 0) {
      renderer.setPixelRatio(basePixelRatio * governor.dpr());
      mountPost();
    }
    if (store.get().mode === 'explore') {
      for (const packet of peerFeed.poll(timeMs)) addSample(peerBuffer, packet);
      trimBuffer(peerBuffer, timeMs);
      const peerPose = sampleAt(peerBuffer, timeMs);
      if (peerPose) peer.apply(peerPose);
      else peer.setVisible(false);
    } else {
      peer.setVisible(false);
    }
    culture.update(timeMs / 1000);
    atmosphere.update(timeMs / 1000);
    npcs.update(timeMs / 1000);
    if (player && store.get().mode === 'explore') player.apply(camera);
    else rig.render();
    if (rig.getMode() !== 'orbit') publishCamera();
    if (store.get().mode === 'explore') {
      if (pointerDirty) {
        pointerDirty = false;
        applyHover();
      } else if (hoverTip.isVisible()) {
        hoverTip.move(pointerClient.x, pointerClient.y);
      }
    } else if (hoverTip.isVisible()) {
      clearHover();
    }
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
