import { describe, it, expect } from 'vitest';
import { OBSTACLES, PLAYER_RADIUS, STREET, LANDING_ORBIT, ENTER_POSITION, CAMERA_PRESETS } from '../../src/world/layout.js';

describe('layout spec parity', () => {
  it('obstacle AABBs equal the specification table exactly', () => {
    expect(OBSTACLES).toEqual([
      { name: 'Back Brick Wall', minX: -5.1, maxX: 1.7, minZ: -5.1, maxZ: -4.4 },
      { name: 'Left Brick Wall', minX: -5.1, maxX: -4.4, minZ: -5.1, maxZ: 1.7 },
      { name: 'Wooden Counter', minX: -2.6, maxX: 0.9, minZ: 0.0, maxZ: 1.1 },
      { name: 'Back Shelf Rack', minX: -4.4, maxX: 1.1, minZ: -4.45, maxZ: -3.55 },
      { name: 'Corner Pillar', minX: 1.1, maxX: 1.65, minZ: 1.1, maxZ: 1.65 },
    ]);
  });

  it('player radius and street clamps match the spec', () => {
    expect(PLAYER_RADIUS).toBe(0.45);
    expect(STREET).toEqual({ minX: -14, maxX: 14, minZ: -14, maxZ: 14 });
  });

  it('landing orbit and enter position match the spec', () => {
    expect(LANDING_ORBIT.radius).toBe(9.8);
    expect(LANDING_ORBIT.height).toBe(3.8);
    expect(ENTER_POSITION).toEqual([6.8, 2.9, 7.6]);
  });

  it('defines exactly six camera presets with valid geometry', () => {
    expect(CAMERA_PRESETS).toHaveLength(6);
    for (const preset of CAMERA_PRESETS) {
      expect(preset.position).toHaveLength(3);
      expect(preset.lookAt).toHaveLength(3);
      expect(preset.name.length).toBeGreaterThan(0);
    }
  });
});
