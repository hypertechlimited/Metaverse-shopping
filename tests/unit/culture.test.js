import { describe, it, expect } from 'vitest';
import {
  CULTURE,
  DIYO_FLICKER_RANGE,
  LUNGTA_COLORS,
  diyoFlicker,
  flagSway,
  toranSagPoints,
} from '../../src/world/culture.js';
import { PASAL_BOARD_TEXT, PASAL_BOARD_SUBTITLE } from '../../src/world/art.js';

describe('pasal board text parity', () => {
  it('board text equals the golden Devanagari string with the reph conjunct', () => {
    expect(PASAL_BOARD_TEXT).toBe('सगरमाथा कर्नर पसल');
  });

  it('subtitle is the Latin translation', () => {
    expect(PASAL_BOARD_SUBTITLE).toBe('SAGARMATHA CORNER STORE');
  });
});

describe('diyo flicker', () => {
  it('stays inside the documented range across ten minutes of samples', () => {
    for (let t = 0; t < 600; t += 0.017) {
      const value = diyoFlicker(t);
      expect(value).toBeGreaterThanOrEqual(DIYO_FLICKER_RANGE.min);
      expect(value).toBeLessThanOrEqual(DIYO_FLICKER_RANGE.max);
    }
  });

  it('is not a mechanical pulse (irregular, layered)', () => {
    const samples = [];
    for (let t = 0; t < 60; t += 0.25) samples.push(diyoFlicker(t));
    const spread = Math.max(...samples) - Math.min(...samples);
    expect(spread).toBeGreaterThan(0.2);
  });

  it('is aperiodic at the dominant sine period', () => {
    const dominantPeriod = (2 * Math.PI) / 7.3;
    for (let t = 1; t < 6; t += 0.5) {
      expect(Math.abs(diyoFlicker(t) - diyoFlicker(t + dominantPeriod))).toBeGreaterThan(0.001);
    }
  });

  it('is deterministic', () => {
    expect(diyoFlicker(12.34)).toBe(diyoFlicker(12.34));
  });
});

describe('lungta flag sway', () => {
  it('never exceeds the configured amplitude', () => {
    for (let t = 0; t < 30; t += 0.1) {
      for (let hangFrac = 0; hangFrac <= 1; hangFrac += 0.25) {
        expect(Math.abs(flagSway(t, 0.3, 0.5, hangFrac, CULTURE.lungtaSwayAmplitude)))
          .toBeLessThanOrEqual(CULTURE.lungtaSwayAmplitude + 1e-9);
      }
    }
  });

  it('moves more at the free bottom edge than the pinned top edge', () => {
    let topMax = 0;
    let bottomMax = 0;
    for (let t = 0; t < 40; t += 0.05) {
      topMax = Math.max(topMax, Math.abs(flagSway(t, 0.9, 0.5, 0, 0.06)));
      bottomMax = Math.max(bottomMax, Math.abs(flagSway(t, 0.9, 0.5, 1, 0.06)));
    }
    expect(bottomMax).toBeGreaterThan(0.05);
    expect(topMax).toBeLessThan(0.02);
  });

  it('is deterministic and phase-shifted between neighbouring flags', () => {
    expect(flagSway(3.3, 0.4, 0.5, 0.5, 0.06)).toBe(flagSway(3.3, 0.4, 0.5, 0.5, 0.06));
    expect(flagSway(3.3, 0.4, 0.5, 0.5, 0.06)).not.toBe(flagSway(3.3, 1.9, 0.5, 0.5, 0.06));
  });
});

describe('toran sag curve', () => {
  const a = /** @type {[number, number, number]} */ ([-4.55, 2.42, 1.66]);
  const b = /** @type {[number, number, number]} */ ([1.62, 2.42, 1.66]);

  it('anchors exactly on both endpoints', () => {
    const points = toranSagPoints(a, b, CULTURE.toranCount, CULTURE.toranSag);
    expect(points).toHaveLength(CULTURE.toranCount);
    expect(points[0]).toEqual([a[0], a[1], a[2]]);
    expect(points[points.length - 1]).toEqual([b[0], b[1], b[2]]);
  });

  it('sags below the straight chord and is symmetric', () => {
    const points = toranSagPoints(a, b, CULTURE.toranCount, CULTURE.toranSag);
    const mid = points[Math.floor(CULTURE.toranCount / 2)];
    expect(mid[1]).toBeLessThan(a[1] - CULTURE.toranSag * 0.98);
    for (let i = 0; i < CULTURE.toranCount; i++) {
      expect(points[i][1]).toBeCloseTo(points[CULTURE.toranCount - 1 - i][1], 10);
    }
  });
});

describe('culture constants', () => {
  it('cycles lungta flags through the canonical five-color order', () => {
    expect(LUNGTA_COLORS).toEqual([0x2b5f9e, 0xf1f5f9, 0xb0342c, 0x2e7d4f, 0xe3b23c]);
    expect(CULTURE.lungtaCount % LUNGTA_COLORS.length).not.toBe(1);
  });

  it('configures the diyo as a physical falloff light', () => {
    expect(CULTURE.diyoBaseIntensity).toBeGreaterThan(0);
    expect(CULTURE.diyoLightDistance).toBeGreaterThan(0);
    expect(CULTURE.diyoPosition).toHaveLength(3);
  });
});
