import * as THREE from 'three';
import { makeArt, makeTexture, drawFlame, drawNepaliFlag, drawWindhorseFlag } from './art.js';
import { mergedParts, placedGeometry } from './merge.js';

export const CULTURE = {
  lungtaCount: 12,
  secondLungtaCount: 8,
  lungtaWidth: 0.42,
  lungtaHeight: 0.34,
  lungtaSwayAmplitude: 0.06,
  lungtaRope: /** @type {{ a: [number, number, number], b: [number, number, number] }} */ ({ a: [-9.5, 5.1, -7.5], b: [10.5, 4.4, 9.0] }),
  secondLungtaRope: /** @type {{ a: [number, number, number], b: [number, number, number] }} */ ({ a: [11.5, 5.0, -9.0], b: [-9.0, 4.5, 10.5] }),
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

export const LUNGTA_CLOTH_CSS = ['#2b5f9e', '#f1f5f9', '#b0342c', '#2e7d4f', '#e3b23c'];

export const TORAN_FLOWER_COLORS = [0xea580c, 0xfbbf24, 0xc2185b];

export const TASSEL_POSITIONS = [0, 0.25, 0.5, 0.75, 1];
export const TASSEL_BEADS = 3;

export const DIYO_FLICKER_RANGE = { min: 0.6, max: 1.4 };

export const REDUCED_MOTION_SCALE = 0.2;

/** @param {boolean} reducedMotion @returns {number} */
export function motionScale(reducedMotion) {
  return reducedMotion ? REDUCED_MOTION_SCALE : 1;
}

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
/** @typedef {{ mesh: THREE.Mesh }} MergedCloth */

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

/**
 * Bakes per-vertex cloth state (across/hang/phase/normal) into a flag geometry so
 * many flags can merge into one draw call per cloth material and still sway
 * individually. Must run before the geometry is transformed.
 * @param {THREE.PlaneGeometry} geometry @param {number} phase @param {{ normX: number, normZ: number }} basis
 * @returns {THREE.PlaneGeometry}
 */
function clothVertexData(geometry, phase, basis) {
  const positions = geometry.getAttribute('position');
  const count = positions.count;
  const across = new Float32Array(count);
  const hang = new Float32Array(count);
  const phases = new Float32Array(count);
  const normals = new Float32Array(count * 2);
  for (let i = 0; i < count; i++) {
    across[i] = positions.getX(i) / CULTURE.lungtaWidth + 0.5;
    hang[i] = (CULTURE.lungtaHeight / 2 - positions.getY(i)) / CULTURE.lungtaHeight;
    phases[i] = phase;
    normals[i * 2] = basis.normX;
    normals[i * 2 + 1] = basis.normZ;
  }
  geometry.setAttribute('aAcross', new THREE.BufferAttribute(across, 1));
  geometry.setAttribute('aHang', new THREE.BufferAttribute(hang, 1));
  geometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
  geometry.setAttribute('aNormal', new THREE.BufferAttribute(normals, 2));
  return geometry;
}

/**
 * CPU cloth animation over a merged flag geometry: per-vertex sway from the
 * baked attributes, no per-frame allocation.
 * @param {MergedCloth} cloth @param {number} t @param {number} amplitude
 */
function animateMergedCloth(cloth, t, amplitude) {
  const geometry = cloth.mesh.geometry;
  const positions = /** @type {THREE.BufferAttribute} */ (geometry.getAttribute('position'));
  const base = /** @type {THREE.BufferAttribute} */ (geometry.getAttribute('aBase'));
  const phases = /** @type {THREE.BufferAttribute} */ (geometry.getAttribute('aPhase'));
  const across = /** @type {THREE.BufferAttribute} */ (geometry.getAttribute('aAcross'));
  const hang = /** @type {THREE.BufferAttribute} */ (geometry.getAttribute('aHang'));
  const normals = /** @type {THREE.BufferAttribute} */ (geometry.getAttribute('aNormal'));
  for (let i = 0; i < positions.count; i++) {
    const offset = flagSway(t, phases.getX(i), across.getX(i), hang.getX(i), amplitude);
    positions.setXYZ(
      i,
      base.getX(i) + normals.getX(i) * offset,
      base.getY(i),
      base.getZ(i) + normals.getY(i) * offset,
    );
  }
  positions.needsUpdate = true;
  geometry.computeVertexNormals();
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
 * @param {THREE.Vector3} a
 * @param {THREE.Vector3} b
 * @param {THREE.InstancedMesh} flowers
 * @param {number} flowerOffset
 * @returns {THREE.BufferGeometry} toran rope strand geometry
 */
function buildToran(a, b, flowers, flowerOffset) {
  const points = toranSagPoints([a.x, a.y, a.z], [b.x, b.y, b.z], CULTURE.toranCount, CULTURE.toranSag);
  const curve = new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, y, z)));

  const matrix = new THREE.Matrix4();
  let instance = flowerOffset;
  for (let i = 0; i < points.length; i++) {
    const [x, y, z] = points[i];
    matrix.makeTranslation(x, y - CULTURE.toranFlowerRadius * 1.4, z);
    flowers.setMatrixAt(instance, matrix);
    flowers.setColorAt(instance, new THREE.Color(TORAN_FLOWER_COLORS[i % TORAN_FLOWER_COLORS.length]));
    instance++;
  }
  const anchorPoints = toranSagPoints([a.x, a.y, a.z], [b.x, b.y, b.z], TASSEL_POSITIONS.length, CULTURE.toranSag);
  for (let i = 0; i < anchorPoints.length; i++) {
    const [x, y, z] = anchorPoints[i];
    for (let bead = 0; bead < TASSEL_BEADS; bead++) {
      matrix.makeTranslation(
        x,
        y - CULTURE.toranFlowerRadius * (1.4 + bead * 1.9),
        z,
      );
      flowers.setMatrixAt(instance, matrix);
      flowers.setColorAt(instance, new THREE.Color(bead % 2 === 0 ? TORAN_FLOWER_COLORS[0] : TORAN_FLOWER_COLORS[2]));
      instance++;
    }
  }
  return new THREE.TubeGeometry(curve, 24, 0.012, 5);
}

/** @param {{ a: [number, number, number], b: [number, number, number] }} rope @returns {[THREE.Vector3, THREE.Vector3]} */
function ropeEndpoints(rope) {
  return [new THREE.Vector3(...rope.a), new THREE.Vector3(...rope.b)];
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

/**
 * @param {THREE.Scene} scene
 * @param {{ a: [number, number, number], b: [number, number, number] }} rope
 * @param {number} count
 * @param {THREE.MeshStandardMaterial[]} materials
 * @param {ClothFlag[]} flags
 * @param {number} phaseSeed
 */
/**
 * @param {{ a: [number, number, number], b: [number, number, number] }} rope
 * @param {number} count
 * @param {THREE.MeshStandardMaterial[]} materials
 * @param {Map<number, THREE.BufferGeometry[]>} partsByMaterial
 * @param {number} phaseSeed
 */
function collectFlagLine(rope, count, materials, partsByMaterial, phaseSeed) {
  const ropeA = new THREE.Vector3(...rope.a);
  const ropeB = new THREE.Vector3(...rope.b);
  const ropeDir = ropeB.clone().sub(ropeA);
  const ropeLength = ropeDir.length();
  ropeDir.normalize();
  const basis = ropeBasis(ropeA, ropeB);
  const rotationY = Math.atan2(-basis.dirZ, basis.dirX);

  for (let i = 0; i < count; i++) {
    const u = count === 1 ? 0 : i / (count - 1);
    const materialIndex = i % materials.length;
    const geometry = clothVertexData(
      new THREE.PlaneGeometry(CULTURE.lungtaWidth, CULTURE.lungtaHeight, 4, 2),
      (phaseSeed + i * 2.39996) % (Math.PI * 2),
      basis,
    );
    placedGeometry(geometry, {
      position: [
        ropeA.x + ropeDir.x * u * ropeLength,
        ropeA.y - CULTURE.lungtaHeight / 2 - 0.02,
        ropeA.z + ropeDir.z * u * ropeLength,
      ],
      rotation: [0, rotationY, 0],
    });
    const bucket = partsByMaterial.get(materialIndex);
    if (!bucket) throw new Error('partsByMaterial is missing a cloth material slot');
    bucket.push(geometry);
  }
}

/** @param {THREE.Scene} scene @param {THREE.WebGLRenderer} renderer @param {{ reducedMotion?: boolean }} [options] */
export function buildCulture(scene, renderer, options = {}) {
  const reducedMotion = options.reducedMotion === true;
  const scale = motionScale(reducedMotion);

  const printMaterials = LUNGTA_CLOTH_CSS.map((clothColor) => new THREE.MeshStandardMaterial({
    map: makeTexture(makeArt(64, 64, (ctx, w, h) => drawWindhorseFlag(ctx, w, h, clothColor)), renderer),
    side: THREE.DoubleSide,
    roughness: 0.95,
  }));
  /** @type {Map<number, THREE.BufferGeometry[]>} */
  const partsByMaterial = new Map(printMaterials.map((_, index) => [index, []]));
  collectFlagLine(CULTURE.lungtaRope, CULTURE.lungtaCount, printMaterials, partsByMaterial, 0);
  collectFlagLine(CULTURE.secondLungtaRope, CULTURE.secondLungtaCount, printMaterials, partsByMaterial, Math.PI);
  /** @type {MergedCloth[]} */
  const cloths = [];
  for (const [index, parts] of partsByMaterial) {
    const geometry = mergedParts(parts);
    const positions = /** @type {THREE.BufferAttribute} */ (geometry.getAttribute('position'));
    geometry.setAttribute('aBase', positions.clone());
    const mesh = new THREE.Mesh(geometry, printMaterials[index]);
    mesh.name = `lungta-${index}`;
    scene.add(mesh);
    cloths.push({ mesh });
  }

  const instancesPerToran = CULTURE.toranCount + TASSEL_POSITIONS.length * TASSEL_BEADS;
  const ropeMaterial = new THREE.MeshStandardMaterial({ color: CULTURE_COLORS.rope, roughness: 0.9 });
  const flowers = new THREE.InstancedMesh(
    new THREE.SphereGeometry(CULTURE.toranFlowerRadius, 6, 5),
    new THREE.MeshStandardMaterial({ roughness: 0.75 }),
    instancesPerToran * 2,
  );
  const ropeParts = [
    buildToran(
      new THREE.Vector3(-4.55, CULTURE.toranY, 1.66),
      new THREE.Vector3(1.62, CULTURE.toranY, 1.66),
      flowers,
      0,
    ),
    buildToran(
      new THREE.Vector3(1.66, CULTURE.toranY, -4.55),
      new THREE.Vector3(1.66, CULTURE.toranY, 1.62),
      flowers,
      instancesPerToran,
    ),
  ];
  flowers.instanceMatrix.needsUpdate = true;
  scene.add(flowers);
  scene.add(new THREE.Mesh(mergedParts(ropeParts), ropeMaterial));

  const ropeLine = new THREE.LineSegments(
    new THREE.BufferGeometry().setFromPoints([
      ...ropeEndpoints(CULTURE.lungtaRope),
      ...ropeEndpoints(CULTURE.secondLungtaRope),
    ]),
    new THREE.LineBasicMaterial({ color: CULTURE_COLORS.rope }),
  );
  scene.add(ropeLine);

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
    for (const cloth of cloths) {
      animateMergedCloth(cloth, t, CULTURE.lungtaSwayAmplitude * scale);
    }
    animateCloth(
      rooftopFlag.mesh,
      rooftopFlag.base,
      rooftopFlag.normals,
      rooftopFlag.phase,
      CULTURE.flagSwayAmplitude * scale,
      t,
    );
  }

  return { update };
}
