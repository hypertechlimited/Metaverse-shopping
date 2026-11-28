export const AVATAR = {
  interpDelayMs: 120,
  maxExtrapolateMs: 250,
  teleportDistance: 3,
  bufferLimit: 64,
  windowMarginMs: 500,
};

/**
 * Remote-avatar motion buffer: the client-side half of snapshot interpolation
 * (Quake 3 / Source model). The world is rendered at `now - interpDelayMs`;
 * between samples it interpolates, on gaps it extrapolates for a bounded time
 * from capped velocity, then holds. Nothing guesses past the bound.
 *
 * @typedef {{ t: number, x: number, z: number, yaw: number }} AvatarSample
 */

/**
 * Validate and insert a sample. Environmental garbage (NaN/Infinity) and
 * clock anomalies (non-increasing timestamps) are dropped — fail soft.
 * @param {AvatarSample[]} buffer @param {AvatarSample} sample @returns {boolean} accepted
 */
export function addSample(buffer, sample) {
  if (!Number.isFinite(sample.t) || !Number.isFinite(sample.x) || !Number.isFinite(sample.z) || !Number.isFinite(sample.yaw)) {
    return false;
  }
  const last = buffer[buffer.length - 1];
  if (last && sample.t <= last.t) return false;
  buffer.push({ t: sample.t, x: sample.x, z: sample.z, yaw: sample.yaw });
  if (buffer.length > AVATAR.bufferLimit) buffer.splice(0, buffer.length - AVATAR.bufferLimit);
  return true;
}

/**
 * Drop samples older than the render window ever needs to be.
 * @param {AvatarSample[]} buffer @param {number} nowMs
 */
export function trimBuffer(buffer, nowMs) {
  const horizon = nowMs - AVATAR.interpDelayMs - AVATAR.maxExtrapolateMs - AVATAR.windowMarginMs;
  let drop = 0;
  while (drop < buffer.length - 1 && buffer[drop + 1].t <= horizon) drop++;
  if (drop > 0) buffer.splice(0, drop);
}

/**
 * @param {number} a @param {number} b @param {number} u @returns {number} shortest-arc angle lerp
 */
function lerpAngle(a, b, u) {
  const delta = Math.atan2(Math.sin(b - a), Math.cos(b - a));
  return a + delta * u;
}

/**
 * @param {AvatarSample} a @param {AvatarSample} b @param {number} nowMs
 * @returns {{ x: number, z: number, yaw: number }}
 */
function blend(a, b, nowMs) {
  const span = b.t - a.t;
  const u = span > 0 ? Math.min(1, Math.max(0, (nowMs - a.t) / span)) : 1;
  return {
    x: a.x + (b.x - a.x) * u,
    z: a.z + (b.z - a.z) * u,
    yaw: lerpAngle(a.yaw, b.yaw, u),
  };
}

/**
 * @param {AvatarSample[]} buffer @param {number} nowMs
 * @returns {{ x: number, z: number, yaw: number, extrapolated: boolean } | null}
 */
export function sampleAt(buffer, nowMs) {
  if (buffer.length === 0) return null;
  const renderTime = nowMs - AVATAR.interpDelayMs;
  const first = buffer[0];
  if (renderTime <= first.t) {
    return { x: first.x, z: first.z, yaw: first.yaw, extrapolated: false };
  }
  const last = buffer[buffer.length - 1];
  if (renderTime > last.t) {
    const overdue = renderTime - last.t;
    if (overdue > AVATAR.maxExtrapolateMs) {
      return { x: last.x, z: last.z, yaw: last.yaw, extrapolated: false };
    }
    const prev = buffer.length >= 2 ? buffer[buffer.length - 2] : null;
    let vx = 0;
    let vz = 0;
    if (prev && last.t > prev.t && Math.hypot(last.x - prev.x, last.z - prev.z) < AVATAR.teleportDistance) {
      const dt = (last.t - prev.t) / 1000;
      vx = (last.x - prev.x) / dt;
      vz = (last.z - prev.z) / dt;
    }
    return {
      x: last.x + vx * (overdue / 1000),
      z: last.z + vz * (overdue / 1000),
      yaw: last.yaw,
      extrapolated: true,
    };
  }
  for (let i = buffer.length - 1; i >= 1; i--) {
    if (buffer[i - 1].t <= renderTime) {
      const a = buffer[i - 1];
      const b = buffer[i];
      if (Math.hypot(b.x - a.x, b.z - a.z) >= AVATAR.teleportDistance) {
        return { x: b.x, z: b.z, yaw: b.yaw, extrapolated: false };
      }
      return { ...blend(a, b, renderTime), extrapolated: false };
    }
  }
  return { x: first.x, z: first.z, yaw: first.yaw, extrapolated: false };
}
