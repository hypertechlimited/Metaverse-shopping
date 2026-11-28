export const GOVERNOR = {
  sampleWindowMs: 2000,
  engageFps: 45,
  recoverFps: 58,
  cooldownMs: 4000,
  tiers: [2, 1.5, 1.25, 1],
};

/**
 * Runtime quality governor: samples real frame timestamps and steps the
 * device-pixel-ratio tier down under sustained load, back up under sustained
 * headroom. Hysteresis (engage < 45, recover > 58) plus a cooldown between
 * steps prevent oscillation. Pure state machine — the renderer side applies
 * the tier through a callback.
 *
 * @param {{ tiers?: number[], engageFps?: number, recoverFps?: number, cooldownMs?: number, sampleWindowMs?: number }} [options]
 * @returns {{ observeFrame: (nowMs: number) => void, update: (nowMs: number) => number, tier: () => number, dpr: () => number }}
 */
export function createPerfGovernor(options = {}) {
  const tiers = options.tiers ?? GOVERNOR.tiers;
  const engageFps = options.engageFps ?? GOVERNOR.engageFps;
  const recoverFps = options.recoverFps ?? GOVERNOR.recoverFps;
  const cooldownMs = options.cooldownMs ?? GOVERNOR.cooldownMs;
  const sampleWindowMs = options.sampleWindowMs ?? GOVERNOR.sampleWindowMs;
  let tierIndex = 0;
  /** @type {number[]} */
  const frameTimes = [];
  let lastChangeMs = Number.NaN;
  let lowStreak = false;
  let highStreak = false;

  return {
    /** @param {number} nowMs */
    observeFrame(nowMs) {
      frameTimes.push(nowMs);
      while (frameTimes.length > 2 && nowMs - frameTimes[0] > sampleWindowMs) frameTimes.shift();
    },
    /** @param {number} nowMs @returns {number} tier index after this update (-1 when unchanged) */
    update(nowMs) {
      if (frameTimes.length < 2) return -1;
      const span = frameTimes[frameTimes.length - 1] - frameTimes[0];
      if (span < sampleWindowMs / 2 || span <= 0) return -1;
      const fps = (frameTimes.length - 1) / (span / 1000);
      if (!Number.isFinite(fps)) return -1;
      lowStreak = lowStreak && fps < engageFps;
      highStreak = highStreak && fps > recoverFps;
      if (fps < engageFps) lowStreak = true;
      if (fps > recoverFps) highStreak = true;
      const cooled = !Number.isFinite(lastChangeMs) || nowMs - lastChangeMs >= cooldownMs;
      const canStepDown = tierIndex < tiers.length - 1;
      const canStepUp = tierIndex > 0;
      if (lowStreak && cooled && canStepDown) {
        tierIndex++;
        lastChangeMs = nowMs;
        lowStreak = false;
        highStreak = false;
        return tierIndex;
      }
      if (highStreak && cooled && canStepUp) {
        tierIndex--;
        lastChangeMs = nowMs;
        lowStreak = false;
        highStreak = false;
        return tierIndex;
      }
      return -1;
    },
    tier: () => tierIndex,
    dpr: () => tiers[tierIndex],
  };
}
