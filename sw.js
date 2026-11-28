const CACHE = 'sagarmatha-v1';
const SHELL = ['./', './index.html', './src/ui/styles.css', './manifest.webmanifest', './icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.mode === 'navigate' || url.pathname.endsWith('/index.html')) {
    event.respondWith(networkFirst(event, request));
    return;
  }
  event.respondWith(staleWhileRevalidate(event, request));
});

/** @param {FetchEvent} event @param {Request} request @returns {Promise<Response>} */
async function networkFirst(event, request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE);
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    const shell = await caches.match('./index.html');
    if (shell) return shell;
    throw new Error('offline and uncached');
  }
}

/** @param {FetchEvent} event @param {Request} request @returns {Promise<Response>} */
async function staleWhileRevalidate(event, request) {
  const cached = await caches.match(request);
  const refresh = fetch(request)
    .then(async (response) => {
      if (response.ok) {
        const cache = await caches.open(CACHE);
        await cache.put(request, response.clone());
      }
    })
    .catch(() => undefined);
  event.waitUntil(refresh);
  if (cached) return cached;
  try {
    return await fetch(request);
  } catch {
    return new Response('', { status: 504, statusText: 'offline and uncached' });
  }
}
