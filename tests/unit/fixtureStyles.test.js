import { describe, it, expect } from 'vitest';
import { FIXTURE_STYLES, STYLE_NAMES, DEFAULT_FIXTURE_STYLE, LED_COLOR, isStyleName, styleFromParam, fixtureTokensFor } from '../../src/world/fixtureStyles.js';

describe('FIXTURE_STYLES tokens', () => {
  it('covers exactly the three authored styles', () => {
    expect(STYLE_NAMES).toEqual(['traditional', 'modern', 'supermart']);
    expect(Object.keys(FIXTURE_STYLES).sort()).toEqual([...STYLE_NAMES].sort());
  });

  it('defaults to traditional — the established identity', () => {
    expect(DEFAULT_FIXTURE_STYLE).toBe('traditional');
    expect(styleFromParam(undefined)).toBe('traditional');
    expect(styleFromParam(null)).toBe('traditional');
    expect(styleFromParam('bogus')).toBe('traditional');
    expect(styleFromParam('supermart')).toBe('supermart');
  });

  it('gives each style distinct gondola and counter materials', () => {
    const gondolas = STYLE_NAMES.map((name) => fixtureTokensFor(name).gondolaColor);
    expect(new Set(gondolas).size).toBe(STYLE_NAMES.length);
    const counters = STYLE_NAMES.map((name) => fixtureTokensFor(name).counterTopColor);
    expect(new Set(counters).size).toBe(STYLE_NAMES.length);
  });

  it('keeps LED off in traditional and on in the retail-modern styles', () => {
    expect(fixtureTokensFor('traditional').ledIntensity).toBe(0);
    expect(fixtureTokensFor('modern').ledIntensity).toBeGreaterThan(0);
    expect(fixtureTokensFor('supermart').ledIntensity).toBeGreaterThan(0);
    for (const name of STYLE_NAMES) {
      expect(fixtureTokensFor(name).ledColor).toBe(LED_COLOR);
    }
  });

  it('scopes supermart-only extras and boosts light progressively', () => {
    expect(fixtureTokensFor('traditional').extras).toEqual({ endCap: false, dumpBin: false, basketStack: false, ceilingGrid: false });
    expect(fixtureTokensFor('modern').extras).toEqual({ endCap: false, dumpBin: false, basketStack: false, ceilingGrid: false });
    expect(fixtureTokensFor('supermart').extras).toEqual({ endCap: true, dumpBin: true, basketStack: true, ceilingGrid: true });
    const boosts = STYLE_NAMES.map((name) => fixtureTokensFor(name).light.sunIntensityBoost);
    expect(boosts[0]).toBeLessThan(boosts[1]);
    expect(boosts[1]).toBeLessThan(boosts[2]);
  });

  it('uses a distinct tag palette combination per style', () => {
    const keys = STYLE_NAMES.map((name) => {
      const tag = fixtureTokensFor(name).tag;
      return `${tag.paper}-${tag.price}`;
    });
    expect(new Set(keys).size).toBe(STYLE_NAMES.length);
    for (const name of STYLE_NAMES) {
      const tag = fixtureTokensFor(name).tag;
      expect(tag.paper).not.toBe(tag.ink);
      expect(tag.price).not.toBe(tag.ink);
    }
  });
});

describe('isStyleName', () => {
  it('guards unknown values', () => {
    expect(isStyleName('modern')).toBe(true);
    expect(isStyleName('Traditional')).toBe(false);
    expect(isStyleName('')).toBe(false);
    expect(isStyleName('night')).toBe(false);
  });
});
