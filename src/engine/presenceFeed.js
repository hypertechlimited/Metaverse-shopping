import { npcPose } from '../world/npc.js';

export const PEER = {
  sendRateMs: 100,
  jitterMs: 40,
  spikeEvery: 11,
  spikeMs: 300,
};

/**
 * Deterministic fake network for the presence layer: samples a scripted path
 * on a fixed send cadence and delivers each packet after reproducible
 * pseudo-random latency (baseline jitter plus a periodic spike), exactly the
 * anomalies a real WebSocket produces — so the interpolation buffer is
 * exercised, not the happy path.
 *
 * @param {object} options
 * @param {{ from: [number, number], to: [number, number], period: number, phase: number }} options.path
 * @param {number} [options.seed]
 * @param {number} [options.sendRateMs]
 * @param {number} [options.latencyMs] constant one-way latency
 * @returns {{ poll: (nowMs: number) => { t: number, x: number, z: number, yaw: number }[], reset: (nowMs: number) => void }}
 */
export function createPeerFeed(options) {
  const sendRateMs = options.sendRateMs ?? PEER.sendRateMs;
  const latencyMs = options.latencyMs ?? PEER.jitterMs;
  let seed = (options.seed ?? 1) >>> 0;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  let nextSendMs = 0;
  let packetIndex = 0;
  /** @type {{ x: number, z: number } | null} */
  let lastPose = null;
  /** @type {{ t: number, x: number, z: number, yaw: number }[]} */
  const inFlight = [];

  return {
    reset(nowMs) {
      nextSendMs = nowMs;
      packetIndex = 0;
      lastPose = null;
      inFlight.length = 0;
    },
    /** @param {number} nowMs @returns {{ t: number, x: number, z: number, yaw: number }[]} */
    poll(nowMs) {
      while (nextSendMs <= nowMs) {
        const pose = npcPose(nextSendMs / 1000, options.path);
        const spike = packetIndex % PEER.spikeEvery === PEER.spikeEvery - 1;
        const jitter = random() * PEER.jitterMs + (spike ? PEER.spikeMs : 0);
        const yaw = lastPose
          ? Math.atan2(pose.x - lastPose.x, pose.z - lastPose.z)
          : Math.atan2(options.path.to[0] - options.path.from[0], options.path.to[1] - options.path.from[1]);
        inFlight.push({ t: nextSendMs + latencyMs + jitter, x: pose.x, z: pose.z, yaw });
        lastPose = { x: pose.x, z: pose.z };
        packetIndex++;
        nextSendMs += sendRateMs;
      }
      /** @type {{ t: number, x: number, z: number, yaw: number }[]} */
      const arrived = [];
      let keep = 0;
      for (let i = 0; i < inFlight.length; i++) {
        const packet = inFlight[i];
        if (packet.t <= nowMs) arrived.push(packet);
        else inFlight[keep++] = packet;
      }
      inFlight.length = keep;
      return arrived;
    },
  };
}
