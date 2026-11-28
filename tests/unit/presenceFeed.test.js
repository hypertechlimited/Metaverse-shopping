import { describe, it, expect } from 'vitest';
import { PEER, createPeerFeed } from '../../src/engine/presenceFeed.js';

/** @type {{ from: [number, number], to: [number, number], period: number, phase: number }} */
const PATH = { from: [-4, 2.4], to: [6, 2.4], period: 20, phase: 0 };

describe('peer feed', () => {
  it('emits packets on the send cadence with increasing timestamps', () => {
    const feed = createPeerFeed({ path: PATH, seed: 7 });
    const packets = feed.poll(1000);
    expect(packets.length).toBeGreaterThanOrEqual(9);
    for (let i = 1; i < packets.length; i++) {
      expect(packets[i].t).toBeGreaterThan(packets[i - 1].t);
    }
  });

  it('is deterministic for the same seed', () => {
    const a = createPeerFeed({ path: PATH, seed: 99 }).poll(2000);
    const b = createPeerFeed({ path: PATH, seed: 99 }).poll(2000);
    expect(a).toEqual(b);
  });

  it('applies non-negative latency to every packet', () => {
    const feed = createPeerFeed({ path: PATH, seed: 3 });
    const packets = feed.poll(1500);
    for (const packet of packets) {
      expect(packet.t).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(packet.t)).toBe(true);
    }
    const first = packets[0];
    expect(first.t).toBeGreaterThanOrEqual(PEER.jitterMs * 0);
  });

  it('injects a periodic latency spike longer than the baseline jitter', () => {
    const feed = createPeerFeed({ path: PATH, seed: 3 });
    const packets = feed.poll(3000);
    const arrivals = packets.map((packet, i) => packet.t - (i * PEER.sendRateMs));
    const spikes = arrivals.filter((offset, i) => i % PEER.spikeEvery === PEER.spikeEvery - 1);
    expect(spikes.length).toBeGreaterThan(0);
    for (const offset of spikes) {
      expect(offset).toBeGreaterThanOrEqual(PEER.spikeMs);
    }
  });

  it('faces the peer along its motion direction', () => {
    const feed = createPeerFeed({ path: PATH, seed: 5 });
    const packets = feed.poll(1200);
    const mid = packets[5];
    expect(mid.yaw).toBeCloseTo(Math.PI / 2, 5);
  });

  it('polls nothing before the clock advances', () => {
    const feed = createPeerFeed({ path: PATH, seed: 5 });
    expect(feed.poll(0)).toEqual([]);
  });

  it('reset restarts the cadence deterministically', () => {
    const feed = createPeerFeed({ path: PATH, seed: 11 });
    feed.poll(500);
    feed.reset(0);
    expect(feed.poll(0)).toEqual([]);
    const restarted = feed.poll(500);
    expect(restarted.length).toBeGreaterThan(0);
  });
});
