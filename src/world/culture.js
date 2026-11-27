import * as THREE from 'three';
import { makeArt, makeTexture, drawFlame, drawNepaliFlag } from './art.js';

export const CULTURE = {
  lungtaCount: 12,
  lungtaWidth: 0.42,
  lungtaHeight: 0.34,
  lungtaSwayAmplitude: 0.06,
  lungtaRope: { a: [-9.5, 5.1, -7.5], b: [10.5, 4.4, 9.0] },
  flagPoleHeight: 1.4,
  flagPoleRadius: 0.03,
  flagWidth: 0.95,
  flagHeight: 0.62,
  flagSwayAmplitude: 0.09,
  toranCount: 22,
  toranSag: 0.22,
  toranY: 2.42,
  toranFlowerRadius: 0.045,
  diyoBaseIntensity: 5.0,
  diyoLightDistance: 7,
  diyoFlameScale: 0.3,
  diyoPosition: [1.93, 0.18, 1.93],
};

export const CULTURE_COLORS = {
  marigold: 0xea580c,
  gold: 0xfbbf24,
  clay: 0xa4572e,
  clayDark: 0x6e3a20,
  rope: 0x8a6a42,
  flagCrimson: 0x991b1b,
};

export const LUNGTA_COLORS = [0x2b5f9e, 0xf1f5f9, 0xb0342c, 0x2e7d4f, 0xe3b23c];

export const DIYO_FLICKER_RANGE = { min: 0.6, max: 1.4 };

/** Layered-sine flame flicker multiplier in DIYO_FLICKER_RANGE. @param {number} t @returns {number} */
export function diyoFlicker(t) {
  const slow = Math.sin(t * 2.9 + 1.7) * Math.sin(t * 7.3);
  const fast = Math.sin(t * 5.3 + 2.1) * Math.sin(t * 13.1 + 0.4);
  const drift = Math.sin(t * 0.9 + 4.2) * 0.5 + 0.5;
  return 1 + slow * 0.2 + fast * 0.12 + drift * 0.08;
}

/**
 * Horizontal wind offset of one point on a cloth flag, in world units.
 * @param {number} t @param {number} phase @param {number} across 0..1 along the rope @param {number} hangFrac 0..1 down the flag @param {number} amplitude @returns {number}
 */
export function flagSway(t, phase, across, hangFrac, amplitude) {
  return Math.sin(t * 2.2 + phase + across * 1.2 + hangFrac * 1.6) * amplitude * (0.3 + 0.7 * hangFrac);
}

/**
 * Catenary-like sag points between two anchors; endpoints exact, symmetric sag.
 * @param {[number, number, number]} a @param {[number, number, number]} b @param {number} count @param {number} sag
 * @returns {Array<[number, number, number]>}
 */
export function toranSagPoints(a, b, count, sag) {
  /** @type {Array<[number, number, number]>} */
  const points = [];
  for (let i = 0; i < count; i++) {
    const u = count === 1 ? 0 : i / (count - 1);
    points.push([
      a[0] + (b[0] - a[0]) * u,
      a[1] + (b[1] - a[1]) * u - Math.sin(Math.PI * u) * sag,
      a[2] + (b[2] - a[2]) * u,
    ]);
  }
  return points;
}

/** @typedef {{ mesh: THREE.Mesh, normals: [number, number], phase: number, base: Float32Array }} ClothFlag */

/**
 * @param {THREE.Vector3} a @param {THREE.Vector3} b @returns {{ dirX: number, dirZ: number, normX: number, normZ: number }}
 */
function ropeBasis(a, b) {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const length = Math.hypot(dx, dz) || 1;
  const dirX = dx / length;
  const dirZ = dz / length;
  return { dirX, dirZ, normX: -dirZ, normZ: dirX };
}

/**
 * @param {THREE.Mesh} mesh @param {Float32Array} base @param {[number, number]} normal @param {number} phase @param {number} amplitude @param {number} t
 */
function animateCloth(mesh, base, normal, phase, amplitude, t) {
  const positions = /** @type {THREE.BufferAttribute} */ (mesh.geometry.getAttribute('position'));
  const array = positions.array;
  const planeGeometry = /** @type {THREE.PlaneGeometry} */ (mesh.geometry);
  const width = planeGeometry.parameters.width;
  const height = planeGeometry.parameters.height;
  for (let i = 0; i < array.length; i += 3) {
    const localX = base[i];
    const localY = base[i + 1];
    const across = localX / width + 0.5;
    const hangFrac = (height / 2 - localY) / height;
    const offset = flagSway(t, phase, across, hangFrac, amplitude);
    array[i] = base[i] + normal[0] * offset;
    array[i + 1] = localY;
    array[i + 2] = base[i + 2] + normal[1] * offset;
  }
  positions.needsUpdate = true;
  mesh.geometry.computeVertexNormals();
}

/** @param {THREE.WebGLRenderer} renderer @returns {THREE.Texture} */
function flameTexture(renderer) {
  return makeTexture(makeArt(64, 64, drawFlame), renderer);
}

/**
 * @param {THREE.Scene} scene @param {THREE.Texture} texture
 * @returns {{ light: THREE.PointLight, flame: THREE.Sprite }}
 */
function buildDiyo(scene, texture) {
  const light = new THREE.PointLight(0xffb45e, CULTURE.diyoBaseIntensity, CULTURE.diyoLightDistance, 2);
  light.position.set(CULTURE.diyoPosition[0], CULTURE.diyoPosition[1] + 0.22, CULTURE.diyoPosition[2]);
  scene.add(light);

  const lamp = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.06, 0.09, 10),
    new THREE.MeshStandardMaterial({ color: CULTURE_COLORS.clay, roughness: 0.9 }),
  );
  lamp.position.set(CULTURE.diyoPosition[0], CULTURE.diyoPosition[1] + 0.045, CULTURE.diyoPosition[2]);
  lamp.castShadow = true;
  scene.add(lamp);

  const oil = new THREE.Mesh(
    new THREE.CircleGeometry(0.075, 10),
    new THREE.MeshStandardMaterial({ color: CULTURE_COLORS.clayDark, roughness: 0.4 }),
  );
  oil.rotation.x = -Math.PI / 2;
  oil.position.set(CULTURE.diyoPosition[0], CULTURE.diyoPosition[1] + 0.091, CULTURE.diyoPosition[2]);
  scene.add(oil);

  const flame = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }),
  );
  flame.position.set(CULTURE.diyoPosition[0], CULTURE.diyoPosition[1] + 0.2, CULTURE.diyoPosition[2]);
  flame.scale.set(CULTURE.diyoFlameScale, CULTURE.diyoFlameScale * 1.2, 1);
  scene.add(flame);

  return { light, flame };
}

/**
 * @param {THREE.Scene} scene
 * @param {THREE.Vector3} a
 * @param {THREE.Vector3} b
 * @param {THREE.MeshStandardMaterial} ropeMaterial
 * @param {THREE.InstancedMesh} flowers
 * @param {number} flowerOffset
 */
function buildToran(scene, a, b, ropeMaterial, flowers, flowerOffset) {
  const points = toranSagPoints([a.x, a.y, a.z], [b.x, b.y, b.z], CULTURE.toranCount, CULTURE.toranSag);
  const curve = new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, y, z)));
  const rope = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.012, 5), ropeMaterial);
  rope.castShadow = true;
  scene.add(rope);

  const matrix = new THREE.Matrix4();
  for (let i = 0; i < points.length; i++) {
    const [x, y, z] = points[i];
    matrix.makeTranslation(x, y - CULTURE.toranFlowerRadius * 1.4, z);
    flowers.setMatrixAt(flowerOffset + i, matrix);
    flowers.setColorAt(flowerOffset + i, new THREE.Color(i % 2 === 0 ? CULTURE_COLORS.marigold : CULTURE_COLORS.gold));
  }
}

/**
 * @param {THREE.Scene} scene @param {THREE.Texture} texture
 * @returns {ClothFlag}
 */
function buildRooftopFlag(scene, texture) {
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(CULTURE.flagPoleRadius, CULTURE.flagPoleRadius, CULTURE.flagPoleHeight, 6),
    new THREE.MeshStandardMaterial({ color: CULTURE_COLORS.clayDark, roughness: 0.85 }),
  );
  pole.position.set(-1.7, CULTURE.flagPoleHeight / 2 + 3.95, -1.7);
  pole.castShadow = true;
  scene.add(pole);

  const geometry = new THREE.PlaneGeometry(CULTURE.flagWidth, CULTURE.flagHeight, 6, 2);
  const material = new THREE.MeshStandardMaterial({
    map: texture,
    transparent: true,
    alphaTest: 0.4,
    side: THREE.DoubleSide,
    roughness: 0.9,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(-1.7 - CULTURE.flagWidth / 2, CULTURE.flagPoleHeight + 3.95 - CULTURE.flagHeight / 2 - 0.05, -1.7);
  scene.add(mesh);

  const base = new Float32Array(geometry.getAttribute('position').array);
  return { mesh, base, normals: [0, 1], phase: 0.7 };
}

/** @param {THREE.Scene} scene @param {THREE.WebGLRenderer} renderer */
export function buildCulture(scene, renderer) {
  const ropeA = new THREE.Vector3(...CULTURE.lungtaRope.a);
  const ropeB = new THREE.Vector3(...CULTURE.lungtaRope.b);
  const ropeDir = ropeB.clone().sub(ropeA);
  const ropeLength = ropeDir.length();
  ropeDir.normalize();
  const basis = ropeBasis(ropeA, ropeB);

  const ropeLine = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([ropeA, ropeB]),
    new THREE.LineBasicMaterial({ color: CULTURE_COLORS.rope }),
  );
  scene.add(ropeLine);

  /** @type {ClothFlag[]} */
  const flags = [];
  for (let i = 0; i < CULTURE.lungtaCount; i++) {
    const u = CULTURE.lungtaCount === 1 ? 0 : i / (CULTURE.lungtaCount - 1);
    const material = new THREE.MeshStandardMaterial({
      color: LUNGTA_COLORS[i % LUNGTA_COLORS.length],
      side: THREE.DoubleSide,
      roughness: 0.95,
    });
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(CULTURE.lungtaWidth, CULTURE.lungtaHeight, 4, 2),
      material,
    );
    mesh.position.copy(ropeA).addScaledVector(ropeDir, u * ropeLength);
    mesh.position.y -= CULTURE.lungtaHeight / 2 + 0.02;
    mesh.rotation.y = Math.atan2(-basis.dirZ, basis.dirX);
    scene.add(mesh);
    const base = new Float32Array(mesh.geometry.getAttribute('position').array);
    flags.push({ mesh, base, normals: [basis.normX, basis.normZ], phase: (i * 2.39996) % (Math.PI * 2) });
  }

  const ropeMaterial = new THREE.MeshStandardMaterial({ color: CULTURE_COLORS.rope, roughness: 0.9 });
  const flowers = new THREE.InstancedMesh(
    new THREE.SphereGeometry(CULTURE.toranFlowerRadius, 6, 5),
    new THREE.MeshStandardMaterial({ roughness: 0.75 }),
    CULTURE.toranCount * 2,
  );
  buildToran(
    scene,
    new THREE.Vector3(-4.55, CULTURE.toranY, 1.66),
    new THREE.Vector3(1.62, CULTURE.toranY, 1.66),
    ropeMaterial,
    flowers,
    0,
  );
  buildToran(
    scene,
    new THREE.Vector3(1.66, CULTURE.toranY, -4.55),
    new THREE.Vector3(1.66, CULTURE.toranY, 1.62),
    ropeMaterial,
    flowers,
    CULTURE.toranCount,
  );
  flowers.instanceMatrix.needsUpdate = true;
  scene.add(flowers);

  const diyo = buildDiyo(scene, flameTexture(renderer));
  const rooftopFlag = buildRooftopFlag(scene, makeTexture(makeArt(160, 110, drawNepaliFlag), renderer));

  /** @param {number} t seconds */
  function update(t) {
    const flicker = diyoFlicker(t);
    diyo.light.intensity = CULTURE.diyoBaseIntensity * flicker;
    const norm = (flicker - DIYO_FLICKER_RANGE.min) / (DIYO_FLICKER_RANGE.max - DIYO_FLICKER_RANGE.min);
    diyo.flame.material.opacity = 0.65 + 0.35 * norm;
    diyo.flame.scale.set(
      CULTURE.diyoFlameScale * (1 + 0.08 * Math.sin(t * 11.3)),
      CULTURE.diyoFlameScale * 1.2 * (1 + 0.12 * Math.sin(t * 13.7 + 1.1)),
      1,
    );
    for (const flag of flags) {
      animateCloth(flag.mesh, flag.base, flag.normals, flag.phase, CULTURE.lungtaSwayAmplitude, t);
    }
    animateCloth(rooftopFlag.mesh, rooftopFlag.base, rooftopFlag.normals, rooftopFlag.phase, CULTURE.flagSwayAmplitude, t);
  }

  return { update };
}
