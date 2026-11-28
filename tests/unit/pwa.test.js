import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { PWA, registerServiceWork } from '../../src/engine/pwa.js';

function fakeNav({ withRegister = true } = {}) {
  /** @type {Array<[string, () => void]>} */
  const listeners = [];
  const nav = {
    listeners,
    serviceWorker: {
      registrations: 0,
      /** @param {string} _url @param {any} _options */
      async register(_url, _options) {
        this.registrations += 1;
        return {};
      },
      addEventListener(/** @type {string} */ type, /** @type {() => void} */ handler) {
        listeners.push([type, handler]);
      },
    },
  };
  if (!withRegister) delete /** @type {any} */ (nav.serviceWorker).register;
  return nav;
}

describe('registerServiceWork', () => {
  it('keeps the documented worker contract', () => {
    expect(PWA.swUrl).toBe('./sw.js');
    expect(PWA.updateToast.length).toBeGreaterThan(0);
  });

  it('fails soft without the serviceWorker API', async () => {
    expect(await registerServiceWork(/** @type {any} */ ({}), true)).toBe(false);
  });

  it('fails soft without a register method', async () => {
    expect(await registerServiceWork(/** @type {any} */ (fakeNav({ withRegister: false })), true)).toBe(false);
  });

  it('fails soft on insecure contexts', async () => {
    expect(await registerServiceWork(/** @type {any} */ (fakeNav()), false)).toBe(false);
  });

  it('registers at scope root on secure contexts', async () => {
    const nav = fakeNav();
    const registered = await registerServiceWork(/** @type {any} */ (nav), true);
    expect(registered).toBe(true);
    expect(nav.serviceWorker.registrations).toBe(1);
  });

  it('returns false when registration rejects, leaving the app online', async () => {
    const nav = fakeNav();
    nav.serviceWorker.register = () => Promise.reject(new Error('quota'));
    expect(await registerServiceWork(/** @type {any} */ (nav), true)).toBe(false);
  });

  it('announces a controller swap exactly once per session', async () => {
    const nav = fakeNav();
    let updates = 0;
    await registerServiceWork(/** @type {any} */ (nav), true, { onUpdate: () => (updates += 1) });
    const changes = nav.listeners.filter(([type]) => type === 'controllerchange');
    expect(changes).toHaveLength(1);
    changes[0][1]();
    changes[0][1]();
    expect(updates).toBe(1);
  });

  it('survives environments without addEventListener', async () => {
    const nav = fakeNav();
    delete /** @type {any} */ (nav.serviceWorker).addEventListener;
    expect(await registerServiceWork(/** @type {any} */ (nav), true)).toBe(true);
  });
});

describe('pwa manifest contract', () => {
  const manifest = JSON.parse(readFileSync(new URL('../../manifest.webmanifest', import.meta.url), 'utf8'));

  it('installs as a standalone Nepali app rooted at ./', () => {
    expect(manifest.display).toBe('standalone');
    expect(manifest.lang).toBe('ne');
    expect(manifest.start_url).toBe('./');
    expect(manifest.scope).toBe('./');
  });

  it('ships a maskable-capable svg icon matching the theme color', () => {
    expect(manifest.icons).toHaveLength(1);
    expect(manifest.icons[0].src).toBe('./icon.svg');
    expect(manifest.icons[0].type).toBe('image/svg+xml');
    expect(manifest.theme_color).toBe('#8f3b26');
  });

  it('keeps index.html, the manifest, and the icon in sync', () => {
    const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
    expect(html).toContain('rel="manifest" href="manifest.webmanifest"');
    expect(html).toContain('rel="icon" href="icon.svg"');
    expect(html).toContain(`content="${manifest.theme_color}"`);
    const sw = readFileSync(new URL('../../sw.js', import.meta.url), 'utf8');
    for (const shell of ['./index.html', './manifest.webmanifest', './icon.svg']) {
      expect(sw).toContain(`'${shell}'`);
    }
  });
});
