import { describe, it, expect } from 'vitest';
import { NPC_ROSTER, npcName, npcPose, NPCS } from '../../src/world/npc.js';
import { NPC_PATHS, OBSTACLES, PASALE_DAI_POSITION, PLAYER_RADIUS } from '../../src/world/layout.js';
import { resolveCircle } from '../../src/engine/collision.js';

describe('npc roster', () => {
  it('is the pasale dai plus two neighbors', () => {
    expect(NPC_ROSTER.map((npc) => npc.id)).toEqual(['pasale-dai', 'neighbor-didi', 'sathi-bhai']);
  });

  it('throws on an unknown npc id', () => {
    expect(() => npcName('ghost')).toThrow();
    expect(npcName('pasale-dai').nameNp.length).toBeGreaterThan(0);
  });
});

describe('npcPose (pure path mapping)', () => {
  it('starts near the path origin and stays within the segment bounds', () => {
    const path = NPC_PATHS['neighbor-didi'];
    for (let i = 0; i <= 200; i++) {
      const pose = npcPose((i / 10), path);
      const minX = Math.min(path.from[0], path.to[0]);
      const maxX = Math.max(path.from[0], path.to[0]);
      const minZ = Math.min(path.from[1], path.to[1]);
      const maxZ = Math.max(path.from[1], path.to[1]);
      expect(pose.x).toBeGreaterThanOrEqual(minX);
      expect(pose.x).toBeLessThanOrEqual(maxX);
      expect(pose.z).toBeGreaterThanOrEqual(minZ);
      expect(pose.z).toBeLessThanOrEqual(maxZ);
    }
  });

  it('bobs with |sin(t·6)|·0.04, zero at t = 0', () => {
    const path = NPC_PATHS['neighbor-didi'];
    expect(npcPose(0, path).bob).toBe(0);
    const peak = npcPose(Math.PI / (2 * NPCS.bobFrequency), path);
    expect(peak.bob).toBeCloseTo(NPCS.bobAmplitude, 6);
  });

  it('is periodic in the path period regardless of phase', () => {
    const path = NPC_PATHS['sathi-bhai'];
    const a = npcPose(3.3, path);
    const b = npcPose(3.3 + path.period, path);
    expect(b.x).toBeCloseTo(a.x, 6);
    expect(b.z).toBeCloseTo(a.z, 6);
    expect(b.bob).toBeGreaterThanOrEqual(0);
    expect(b.bob).toBeLessThanOrEqual(NPCS.bobAmplitude);
  });
});

describe('npc paths respect the collision world', () => {
  it('every sampled position along every path resolves outside all obstacles', () => {
    for (const path of Object.values(NPC_PATHS)) {
      for (let i = 0; i <= 400; i++) {
        const pose = npcPose((i / 400) * path.period, path);
        const resolved = resolveCircle(pose.x, pose.z, PLAYER_RADIUS, OBSTACLES);
        expect(resolved.hit, `npc at (${pose.x.toFixed(2)}, ${pose.z.toFixed(2)})`).toBe(false);
      }
    }
  });

  it('the pasale dai stands clear of every obstacle', () => {
    const resolved = resolveCircle(PASALE_DAI_POSITION[0], PASALE_DAI_POSITION[2], PLAYER_RADIUS, OBSTACLES);
    expect(resolved.hit).toBe(false);
  });
});
