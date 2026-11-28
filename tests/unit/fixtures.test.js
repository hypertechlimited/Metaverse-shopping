import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { OBSTACLES } from '../../src/world/layout.js';
import { FIXTURE_STYLES } from '../../src/world/fixtureStyles.js';
import { fixtureExtraBoxes, obstructedExtraBoxes, applyFixtureStyle } from '../../src/world/fixtures.js';

describe('fixture extras layout', () => {
  it('emits no extras for traditional and modern', () => {
    expect(fixtureExtraBoxes('traditional', FIXTURE_STYLES)).toEqual([]);
    expect(fixtureExtraBoxes('modern', FIXTURE_STYLES)).toEqual([]);
  });

  it('emits end cap, dump bin and basket stack for supermart', () => {
    const entries = fixtureExtraBoxes('supermart', FIXTURE_STYLES);
    expect(entries.map((entry) => entry.kind).sort()).toEqual(['basketStack', 'dumpBin', 'endCap']);
  });

  it('never intersects an OBSTACLES box in any style', () => {
    for (const style of Object.keys(FIXTURE_STYLES)) {
      expect(obstructedExtraBoxes(/** @type {any} */ (style), FIXTURE_STYLES)).toEqual([]);
    }
  });

  it('keeps the end cap inside the dead-end pocket east of the rack', () => {
    const cap = fixtureExtraBoxes('supermart', FIXTURE_STYLES).find((entry) => entry.kind === 'endCap');
    expect(cap).toBeDefined();
    if (!cap) return;
    const rack = OBSTACLES.find((box) => box.name === 'Back Shelf Rack');
    expect(rack).toBeDefined();
    if (!rack) return;
    expect(cap.box.minX).toBeGreaterThanOrEqual(rack.maxX);
    expect(cap.box.minZ).toBeGreaterThanOrEqual(rack.minZ);
    expect(cap.box.maxZ).toBeLessThanOrEqual(rack.maxZ);
  });
});

describe('applyFixtureStyle scene wiring', () => {
  /** @returns {THREE.Scene} */
  function sceneWithBaseMeshes() {
    const scene = new THREE.Scene();
    for (const name of ['gondola', 'counter-top']) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial());
      mesh.name = name;
      scene.add(mesh);
    }
    return scene;
  }

  it('emits no extras for traditional', () => {
    const scene = sceneWithBaseMeshes();
    applyFixtureStyle(scene, FIXTURE_STYLES.traditional);
    const names = scene.children.filter((child) => child.name.startsWith('fixture')).map((child) => child.name);
    expect(names).toEqual([]);
  });

  it('emits the five supermart extras that never cast shadows', () => {
    const scene = sceneWithBaseMeshes();
    const handle = applyFixtureStyle(scene, FIXTURE_STYLES.supermart);
    const extras = scene.children.filter((child) => child.name.startsWith('fixture'));
    expect(extras.map((child) => child.name).sort()).toEqual(['fixture-baskets', 'fixture-chatti', 'fixture-endcap', 'fixture-grid', 'fixture-led']);
    for (const extra of extras) {
      expect(extra.castShadow).toBe(false);
      expect(extra.receiveShadow).toBe(true);
    }
    handle.dispose();
    expect(scene.children.filter((child) => child.name.startsWith('fixture'))).toEqual([]);
  });
});
