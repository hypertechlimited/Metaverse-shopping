import { describe, it, expect } from 'vitest';
import { createTour, TOUR } from '../../src/engine/tour.js';

const NAMES = ['Entrance', 'Counter', 'Back Rack'];

describe('guided auto-tour', () => {
  it('flies to the first preset immediately after start', () => {
    const tour = createTour(NAMES);
    tour.start();
    expect(tour.update(0.01, true)).toBe('Entrance');
  });

  it('waits at each preset for the dwell time', () => {
    const tour = createTour(NAMES);
    tour.start();
    expect(tour.update(0.01, true)).toBe('Entrance');
    expect(tour.update(TOUR.dwellSeconds / 2, true)).toBeNull();
    expect(tour.update(TOUR.dwellSeconds / 2 - 0.01, true)).toBeNull();
    expect(tour.update(0.01, true)).toBe('Counter');
  });

  it('holds while the camera is mid-flight (not settled)', () => {
    const tour = createTour(NAMES);
    tour.start();
    expect(tour.update(0.01, true)).toBe('Entrance');
    expect(tour.update(TOUR.dwellSeconds, true)).toBe('Counter');
    expect(tour.update(0.01, false)).toBeNull();
    expect(tour.update(TOUR.dwellSeconds - 0.01, true)).toBeNull();
    expect(tour.update(0.01, true)).toBe('Back Rack');
  });

  it('cycles back to the first preset after the last', () => {
    const tour = createTour(NAMES);
    tour.start();
    expect(tour.update(0.01, true)).toBe('Entrance');
    for (let i = 0; i < NAMES.length - 1; i++) {
      expect(tour.update(TOUR.dwellSeconds, true)).not.toBeNull();
      expect(tour.update(0.01, true)).toBeNull();
    }
    expect(tour.update(TOUR.dwellSeconds, true)).toBe('Entrance');
  });

  it('stop forgets progress and isActive reports false', () => {
    const tour = createTour(NAMES);
    tour.start();
    expect(tour.isActive()).toBe(true);
    tour.stop();
    expect(tour.isActive()).toBe(false);
    expect(tour.currentIndex()).toBe(-1);
    expect(tour.update(10, true)).toBeNull();
  });

  it('rejects an empty preset list', () => {
    expect(() => createTour([])).toThrow();
  });
});
