const CACHE_NAME = 'botc-party-grimoire-v137';
const ASSET_MANIFEST_URL = './asset-manifest.json';
const INDEX_HTML_CACHE_KEY = 'index.html';

// Minimal core files needed to bootstrap the app using normalized paths (avoid './')
const CORE_FILES = [
  INDEX_HTML_CACHE_KEY,
  'manifest.json'
];

// Files and patterns that should use network-first strategy
const NETWORK_FIRST_PATTERNS = [
  /\/index\.html$/,
  /\/service-worker\.js$/,
  /\/pwa\.js$/
];

// Cache strategy: aggressive caching for offline-first PWA
const CACHEABLE_EXTENSIONS = ['.css', '.js', '.json', '.woff2', '.png', '.webp', '.svg', '.ico'];
const CACHEABLE_PATHS = ['/assets/', '/src/', '/build/', '/styles/'];

self.addEventListener('install', event => {
  // Skip waiting to activate immediately
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service worker installing - caching core files');
        // Cache minimal core files during install
        return cache.addAll(CORE_FILES);
      })
      .then(() => {
        console.log('Core files cached - app will cache resources dynamically as they are used');
      })
      .catch(error => {
        console.error('Service worker installation failed:', error);
      })
  );
});

self.addEventListener('message', (event) => {
  try {
    const { data } = event;
    if (!data) return;
    if (data && data.type === 'PREFETCH_ALL') {
      event.waitUntil(prefetchAllAssetsFromManifest());
    } else if (data && data.type === 'PREFETCH_ASSETS' && Array.isArray(data.files)) {
      event.waitUntil(prefetchSpecificAssets(data.files));
    }
  } catch (_) { }
});

self.addEventListener('fetch', event => {
  // Only handle GET requests; pass others through to network
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);
  const pathname = url.pathname;

  // Optimize navigations with navigation preload and robust fallbacks
  if (event.request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const preloaded = await event.preloadResponse;
        if (preloaded) {
          cacheIndexHtmlResponse(preloaded);
          return preloaded;
        }
      } catch (_) { }

      try {
        const networkResponse = await fetch(event.request);
        if (networkResponse && networkResponse.ok) {
          cacheIndexHtmlResponse(networkResponse);
        }
        return networkResponse;
      } catch (_) {
        const cached = await caches.match(INDEX_HTML_CACHE_KEY);
        if (cached) {
          return cached;
        }
        // If nothing in cache, return a basic error page
        return new Response('App is offline and not yet cached. Please connect to the internet and reload.', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: new Headers({
            'Content-Type': 'text/plain'
          })
        });
      }
    })());
    return;
  }

  // Network-first for critical app files that might update
  if (isNetworkFirst(event.request.url)) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Fall back to cache if network fails
          return caches.match(event.request, { ignoreSearch: true })
            .then(response => {
              if (response) {
                return response;
              }
              // Return cached index.html for navigation requests
              if (event.request.mode === 'navigate') {
                return caches.match(INDEX_HTML_CACHE_KEY);
              }
              return null;
            });
        })
    );
    return;
  }

  // Cache-first for all other requests (assets, data, etc.)
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true })
      .then(response => {
        if (response) {
          // Update cache in background if it's a JSON file
          if (pathname.endsWith('.json')) {
            fetch(event.request)
              .then(freshResponse => {
                if (freshResponse.ok) {
                  caches.open(CACHE_NAME).then(cache => {
                    cache.put(event.request, freshResponse.clone());
                  });
                }
              })
              .catch(() => { });
          }
          return response;
        }

        // Not in cache, fetch from network
        return fetch(event.request)
          .then(response => {
            if (response.ok && shouldCacheRequest(event.request)) {
              const responseClone = response.clone();
              caches.open(CACHE_NAME).then(cache => {
                cache.put(event.request, responseClone);
              });
            }
            return response;
          })
          .catch(() => {
            // Return cached index.html for navigation requests
            if (event.request.mode === 'navigate') {
              return caches.match(INDEX_HTML_CACHE_KEY);
            }
            return null;
          });
      })
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    Promise.all([
      // Delete old caches
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheWhitelist.indexOf(cacheName) === -1) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Take control of all clients immediately
      self.clients.claim(),
      // Enable navigation preload when supported
      (self.registration && self.registration.navigationPreload && self.registration.navigationPreload.enable()) || Promise.resolve(),
      // Kick off asset prefetching based on the generated manifest
      prefetchAllAssetsFromManifest()
    ])
  );
});

// Helper function to determine if a request should be cached
function shouldCacheRequest(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Cache files with specified extensions
  if (CACHEABLE_EXTENSIONS.some(ext => pathname.endsWith(ext))) {
    return true;
  }

  // Cache files in specified directories
  if (CACHEABLE_PATHS.some(path => pathname.includes(path))) {
    return true;
  }

  return false;
}

async function prefetchAllAssetsFromManifest() {
  try {
    const res = await fetch(ASSET_MANIFEST_URL, { cache: 'no-store' }).catch(() => null);
    if (!res || !res.ok) return;
    const json = await res.json().catch(() => null);
    if (!json || !Array.isArray(json.files)) return;
    await prefetchSpecificAssets(json.files);
  } catch (_) { }
}

async function prefetchSpecificAssets(files) {
  if (!Array.isArray(files) || files.length === 0) return;
  const cache = await caches.open(CACHE_NAME);

  const toFetch = [];
  for (const file of files) {
    try {
      const url = new URL(file, self.location);
      // Skip non-cacheable requests by heuristic
      if (!shouldCacheRequest({ url })) continue;
      const match = await cache.match(url.toString(), { ignoreSearch: true });
      if (!match) toFetch.push(url.toString());
    } catch (_) { /* ignore malformed */ }
  }

  // Limit concurrency to avoid overwhelming the network
  const CONCURRENCY = 8;
  let index = 0;
  async function worker() {
    while (index < toFetch.length) {
      const cur = toFetch[index++];
      try {
        const resp = await fetch(cur, { cache: 'no-store' });
        if (resp && resp.ok) {
          await cache.put(cur, resp.clone());
        }
      } catch (_) { /* best effort */ }
    }
  }
  const workers = Array.from({ length: Math.min(CONCURRENCY, Math.max(1, toFetch.length)) }, worker);
  await Promise.all(workers);
}

// Helper function to check if a URL should use network-first strategy
function isNetworkFirst(url) {
  const pathname = new URL(url).pathname;
  return NETWORK_FIRST_PATTERNS.some(pattern => pattern.test(pathname));
}

async function cacheIndexHtmlResponse(response) {
  try {
    if (!response) return;
    if (!response.ok) return;
    if (response.type === 'opaqueredirect') return;
    const cache = await caches.open(CACHE_NAME);
    await cache.put(INDEX_HTML_CACHE_KEY, response.clone());
    try {
      await cache.delete('./index.html');
    } catch (_) { /* cleanup only */ }
  } catch (_) { /* best effort */ }
}

// Handle background sync for offline functionality
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

function doBackgroundSync() {
  // Perform any background sync tasks
  console.log('Background sync completed');
}

// Allow clients to trigger immediate activation of a waiting service worker
self.addEventListener('message', event => {
  if (!event || !event.data) return;
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
