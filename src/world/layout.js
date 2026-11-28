export const PLAYER_RADIUS = 0.45;

export const STREET = { minX: -14, maxX: 14, minZ: -14, maxZ: 14 };

/** @type {{ wallHeight: number, propHeight: number }} */
export const SHELL = { wallHeight: 3.2, propHeight: 1.0 };

/** @type {{ radius: number, height: number, target: [number, number, number] }} */
export const LANDING_ORBIT = { radius: 9.8, height: 3.8, target: [0, 1.2, 0] };

/** @type {[number, number, number]} */
export const ENTER_POSITION = [6.8, 2.9, 7.6];

/** @type {Array<{ name: string, minX: number, maxX: number, minZ: number, maxZ: number }>} */
export const OBSTACLES = [
  { name: 'Back Brick Wall', minX: -5.1, maxX: 1.7, minZ: -5.1, maxZ: -4.4 },
  { name: 'Left Brick Wall', minX: -5.1, maxX: -4.4, minZ: -5.1, maxZ: 1.7 },
  { name: 'Wooden Counter', minX: -2.6, maxX: 0.9, minZ: 0.0, maxZ: 1.1 },
  { name: 'Back Shelf Rack', minX: -4.4, maxX: 1.1, minZ: -4.45, maxZ: -3.55 },
  { name: 'Corner Pillar', minX: 1.1, maxX: 1.65, minZ: 1.1, maxZ: 1.65 },
];

/** @type {Record<string, { label: string, np: string, surface: string, topY: number }>} */
export const ZONES = {
  Counter: { label: 'Counter', np: 'काउन्टर', surface: 'Wooden Counter', topY: 1.07 },
  'Back Rack': { label: 'Back Rack', np: 'पछाडिको ताक', surface: 'Back Shelf Rack', topY: 1.0 },
  'Front Pedi': { label: 'Front Pedi', np: 'अगाडिको पेडी', surface: 'East Pedi', topY: 0.18 },
  Corner: { label: 'Corner', np: 'कुनो', surface: 'Street', topY: 0 },
};

/** @type {Record<string, [number, number, number]>} sku id → base-center spot; y is the resting surface height */
export const PRODUCT_SPOTS = {
  'ilam-tea-250g': [-2.35, 1.07, 0.28],
  'mombatti-4pack': [-1.9, 1.07, 0.28],
  'salai-10pack': [-1.45, 1.07, 0.28],
  'gungdi-ghee': [-4.0, 1.0, -4.0],
  'nun-1kg': [-3.3, 1.0, -4.0],
  'sakkhar-1kg': [-2.45, 1.0, -4.0],
  'musuro-dal-1kg': [-1.6, 1.0, -4.0],
  'besaar-200g': [-0.75, 1.0, -4.0],
  'khorsani-100g': [0.0, 1.0, -4.0],
  'masyaura-250g': [0.6, 1.0, -4.0],
  'waiwai-5pack': [1.975, 0.18, -1.6],
  'gundruk-250g': [1.975, 0.18, -1.0],
  'sukuti-250g': [1.975, 0.18, -0.4],
  'sabun-nahaune': [1.975, 0.18, 0.2],
  'marsyangdi-rice-5kg': [2.15, 0, 2.05],
  'toriko-tel-1l': [2.75, 0, 1.95],
  'chiura-1kg': [2.05, 0, 2.65],
};

export const PASALE_DAI_POSITION = [-0.8, 0, -0.5];

/** @type {Record<string, { from: [number, number], to: [number, number], period: number, phase: number }>} */
export const NPC_PATHS = {
  'neighbor-didi': { from: [-6, 3.4], to: [5, 3.4], period: 14, phase: 0.2 },
  'sathi-bhai': { from: [3.6, -5], to: [3.6, 5], period: 18, phase: 0.65 },
};

/** @typedef {'day' | 'dusk'} MoodName */

/** @type {Array<{ name: string, position: [number, number, number], lookAt: [number, number, number], mood?: MoodName }>} */
export const CAMERA_PRESETS = [
  { name: 'Entrance', position: [6.8, 2.9, 7.6], lookAt: [0, 1.2, 0] },
  { name: 'Counter', position: [-0.8, 1.6, 3.2], lookAt: [-0.8, 1.2, 0.5] },
  { name: 'Back Rack', position: [-1.6, 1.6, -1.6], lookAt: [-1.6, 1.4, -4.0] },
  { name: 'Front Pedi', position: [1.0, 1.5, 4.6], lookAt: [1.6, 0.8, 2.1] },
  { name: 'Corner', position: [3.4, 1.6, 3.4], lookAt: [1.3, 1.0, 1.3] },
  { name: 'Overview', position: [7.4, 4.6, 7.4], lookAt: [0, 0.8, 0] },
  { name: 'Dusk', position: [-8.2, 2.1, 8.2], lookAt: [0, 1.4, 0], mood: 'dusk' },
];
