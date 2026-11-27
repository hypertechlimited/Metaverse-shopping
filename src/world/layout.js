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

/** @type {Array<{ name: string, position: [number, number, number], lookAt: [number, number, number] }>} */
export const CAMERA_PRESETS = [
  { name: 'Entrance', position: [6.8, 2.9, 7.6], lookAt: [0, 1.2, 0] },
  { name: 'Counter', position: [-0.8, 1.6, 3.2], lookAt: [-0.8, 1.2, 0.5] },
  { name: 'Back Rack', position: [-1.6, 1.6, -1.6], lookAt: [-1.6, 1.4, -4.0] },
  { name: 'Front Pedi', position: [1.0, 1.5, 4.6], lookAt: [1.6, 0.8, 2.1] },
  { name: 'Corner', position: [3.4, 1.6, 3.4], lookAt: [1.3, 1.0, 1.3] },
  { name: 'Overview', position: [7.4, 4.6, 7.4], lookAt: [0, 0.8, 0] },
];
