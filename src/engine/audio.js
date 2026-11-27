/**
 * Gesture-gated WebAudio bell chord (528 / 792 / 1056 Hz — a perfect harmonic
 * series). No audio files, pure synthesis, conservative gain. Per AGENTS.md
 * rule 5 the context is only created inside `play()`, which must be called
 * from a user gesture; a blocked or missing context degrades to a documented
 * state instead of throwing.
 */

export const BELL = {
  frequenciesHz: [528, 792, 1056],
  relativeGains: [1, 0.55, 0.32],
  masterGain: 0.2,
  attackSeconds: 0.008,
  decaySeconds: 1.8,
};

export const BELL_STATES = /** @type {const} */ ({
  IDLE: 'idle',
  STARTED: 'started',
  BLOCKED: 'blocked',
  UNSUPPORTED: 'unsupported',
  DISPOSED: 'disposed',
});

function defaultContextFactory() {
  if (typeof AudioContext !== 'undefined') return AudioContext;
  if (typeof /** @type {any} */ (globalThis).webkitAudioContext !== 'undefined') {
    return /** @type {any} */ (globalThis).webkitAudioContext;
  }
  return null;
}

/**
 * @param {object} [options]
 * @param {(() => (new () => any) | null) | null} [options.contextFactory] injectable for tests
 * @returns {{
 *   play: () => Promise<'idle' | 'started' | 'blocked' | 'unsupported' | 'disposed'>,
 *   getState: () => 'idle' | 'started' | 'blocked' | 'unsupported' | 'disposed',
 *   dispose: () => void,
 * }}
 */
export function createBell(options = {}) {
  const contextFactory = 'contextFactory' in options ? options.contextFactory : defaultContextFactory;
  const spec = BELL;

  /** @type {'idle' | 'started' | 'blocked' | 'unsupported' | 'disposed'} */
  let state = BELL_STATES.IDLE;
  /** @type {any} */
  let context = null;

  function scheduleChord() {
    const now = context.currentTime;
    const master = context.createGain();
    master.gain.setValueAtTime(0.0001, now);
    master.gain.exponentialRampToValueAtTime(spec.masterGain, now + spec.attackSeconds);
    master.gain.exponentialRampToValueAtTime(0.0001, now + spec.decaySeconds);
    master.connect(context.destination);

    spec.frequenciesHz.forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const partial = context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = frequency;
      partial.gain.value = spec.relativeGains[index];
      oscillator.connect(partial);
      partial.connect(master);
      oscillator.start(now);
      oscillator.stop(now + spec.decaySeconds);
    });
  }

  async function play() {
    if (state !== BELL_STATES.IDLE) return state;
    const ContextCtor = typeof contextFactory === 'function' ? contextFactory() : null;
    if (!ContextCtor) {
      state = BELL_STATES.UNSUPPORTED;
      return state;
    }
    try {
      context = new ContextCtor();
    } catch {
      context = null;
      state = BELL_STATES.UNSUPPORTED;
      return state;
    }
    if (context.state === 'suspended' && typeof context.resume === 'function') {
      try {
        await context.resume();
      } catch {
        state = BELL_STATES.BLOCKED;
        return state;
      }
    }
    if (context.state !== 'running' && context.state !== 'suspended') {
      state = BELL_STATES.BLOCKED;
      return state;
    }
    try {
      scheduleChord();
    } catch {
      state = BELL_STATES.BLOCKED;
      return state;
    }
    state = BELL_STATES.STARTED;
    return state;
  }

  return {
    play,
    getState() {
      return state;
    },
    dispose() {
      if (context && typeof context.close === 'function') {
        try {
          void context.close();
        } catch {
          /* already closed */
        }
      }
      context = null;
      state = BELL_STATES.DISPOSED;
    },
  };
}
