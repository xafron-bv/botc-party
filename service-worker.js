const VERSION_URL = './version.json';
const ASSET_MANIFEST_URL = './asset-manifest.json';
const INDEX_HTML_CACHE_KEY = 'index.html';

// Fetch version.json once at script evaluation; resolves to cache name.
// On offline start, fall back to the most recent existing app-v* cache.
const _cacheNameReady = fetch(VERSION_URL)
  .then(r => r.json())
  .then(({ uiVersion }) => `botc-party-v${uiVersion}`)
  .catch(() =>
    caches.keys().then(names => {
      const latest = names.filter(n => n.startsWith('botc-party-v')).sort().pop();
      return latest || 'botc-party-v0';
    })
  );

function getCacheName() {
  return _cacheNameReady;
}

async function openCache() {
  return caches.open(await getCacheName());
}

// Minimal bootstrap files if manifest fetch fails
const BOOTSTRAP_FILES = [
  INDEX_HTML_CACHE_KEY,
  'version.json',
  'manifest.json',
  'styles.css',
  'script.js',
  'pwa.js'
];

// Files and patterns that should use network-first strategy
const NETWORK_FIRST_PATTERNS = [
  /\/index\.html$/,
  /\/service-worker\.js$/,
  /\/pwa\.js$/,
  /\/version\.json$/,
  /\.css$/
];

// Cache strategy: aggressive caching for offline-first PWA
const CACHEABLE_EXTENSIONS = ['.css', '.js', '.json', '.woff2', '.png', '.webp', '.svg', '.ico'];
const CACHEABLE_PATHS = ['/assets/', '/src/', '/build/', '/styles/'];

/**
 * Extract path from a manifest entry (supports both old string format and new {path, hash} format).
 */
function entryPath(entry) {
  return typeof entry === 'string' ? entry : entry.path;
}

/**
 * Build a path->hash map from manifest entries.
 * Returns null if entries use the old string format (no hashes available).
 */
function buildHashMap(entries) {
  if (!Array.isArray(entries) || entries.length === 0) return null;
  if (typeof entries[0] === 'string') return null; // old format
  const map = new Map();
  for (const entry of entries) {
    map.set(entry.path, entry.hash);
  }
  return map;
}

self.addEventListener('install', event => {
  // Activate immediately
  self.skipWaiting();

  event.waitUntil(
    getCacheName()
      .then(cacheName => caches.open(cacheName))
      .then(async (cache) => {
        console.log('Service worker installing - fetching manifest and caching core files');

        let coreFiles = BOOTSTRAP_FILES;
        let manifest = null;
        try {
          const res = await fetch(ASSET_MANIFEST_URL);
          if (res.ok) {
            manifest = await res.json();
            if (manifest.core && Array.isArray(manifest.core)) {
              coreFiles = manifest.core.map(entryPath);
              // Also cache the manifest itself
              cache.put(new Request(ASSET_MANIFEST_URL), new Response(JSON.stringify(manifest)));
            }
          }
        } catch (e) {
          console.warn('Failed to fetch asset manifest during install, using bootstrap list', e);
        }

        // Build hash maps for differential caching
        const newHashMap = manifest ? buildHashMap(manifest.core || manifest.files) : null;
        let oldHashMap = null;
        let oldCache = null;

        // Find previous cache for differential updates
        if (newHashMap) {
          try {
            const allCacheNames = await caches.keys();
            const currentCacheName = await getCacheName();
            const prevCacheName = allCacheNames
              .filter(n => n.startsWith('botc-party-v') && n !== currentCacheName)
              .sort()
              .pop();
            if (prevCacheName) {
              oldCache = await caches.open(prevCacheName);
              const oldManifestResponse = await oldCache.match(new Request(ASSET_MANIFEST_URL));
              if (oldManifestResponse) {
                const oldManifest = await oldManifestResponse.json();
                oldHashMap = buildHashMap(oldManifest.core || oldManifest.files);
              }
            }
          } catch {
            // Fall back to fetching everything
          }
        }

        const fetchAndCache = async (filePath) => {
          const absoluteUrl = new URL(filePath, self.location).toString();

          // Differential: if hash matches old cache, copy instead of fetching
          if (newHashMap && oldHashMap && oldCache) {
            const newHash = newHashMap.get(filePath);
            const oldHash = oldHashMap.get(filePath);
            if (newHash && oldHash && newHash === oldHash) {
              const oldResponse = await oldCache.match(absoluteUrl, { ignoreSearch: true });
              if (oldResponse) {
                await cache.put(new Request(absoluteUrl, { mode: 'same-origin' }), oldResponse.clone());
                return; // copied from old cache, no network fetch needed
              }
            }
          }

          // Hash mismatch or no old cache -- fetch from network
          const request = new Request(absoluteUrl, { cache: 'reload', mode: 'same-origin' });
          const response = await fetch(request);
          if (!response || !response.ok) {
            throw new Error(`HTTP ${response ? response.status : '0'} while caching ${absoluteUrl}`);
          }
          await cache.put(request, cleanResponse(response));
        };

        const attempts = coreFiles.map(async (filePath) => {
          try {
            await fetchAndCache(filePath);
            return { path: filePath, ok: true };
          } catch (err) {
            console.warn(`Core asset failed to cache (${filePath}):`, err);
            return { path: filePath, ok: false };
          }
        });

        await Promise.all(attempts);

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
    if (data.type === 'SKIP_WAITING') {
      self.skipWaiting();
    } else if (data.type === 'PREFETCH_ALL') {
      event.waitUntil(prefetchAllAssetsFromManifest());
    } else if (data.type === 'PREFETCH_ASSETS' && Array.isArray(data.files)) {
      event.waitUntil(prefetchSpecificAssets(data.files));
    }
  } catch { }
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
          return cleanResponse(preloaded);
        }
      } catch { }

      try {
        const networkResponse = await fetch(event.request);
        if (networkResponse && networkResponse.ok) {
          cacheIndexHtmlResponse(networkResponse);
        }
        return cleanResponse(networkResponse);
      } catch { /* offline -- fall through to cache */ }

      try {
        const cached = await findCachedIndexHtml();
        if (cached) {
          return cached;
        }
      } catch { /* cache lookup failed -- fall through to offline message */ }

      return new Response('App is offline and not yet cached. Please connect to the internet and reload.', {
        status: 503,
        statusText: 'Service Unavailable',
        headers: new Headers({
          'Content-Type': 'text/plain'
        })
      });
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
            openCache().then(cache => {
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
                return findCachedIndexHtml();
              }
              return null;
            });
        })
    );
    return;
  }

  // Cache-first for all other requests (assets, data, etc.)
  // Use the versioned cache (openCache) instead of caches.match() to avoid
  // serving stale content from old caches during the activation transition.
  event.respondWith(
    openCache()
      .then(cache => cache.match(event.request, { ignoreSearch: true }))
      .catch(() => caches.match(event.request, { ignoreSearch: true })) // openCache failed (offline start) -- search all caches
      .then(response => {
        if (response) {
          // Update cache in background if it's a JSON file
          if (pathname.endsWith('.json')) {
            fetch(event.request)
              .then(freshResponse => {
                if (freshResponse.ok) {
                  openCache().then(cache => {
                    cache.put(event.request, freshResponse.clone());
                  });
                }
              })
              .catch(() => { });
          }
          return handleRangeRequest(event.request, response);
        }

        // Not in cache, fetch from network
        return fetch(event.request)
          .then(response => {
            if (response.ok && shouldCacheRequest(event.request)) {
              const responseClone = response.clone();
              openCache().then(cache => {
                cache.put(event.request, responseClone);
              });
            }
            return response;
          })
          .catch(() => {
            // Return cached index.html for navigation requests
            if (event.request.mode === 'navigate') {
              return findCachedIndexHtml();
            }
            // Return 404 for other requests to avoid "Failed to convert value to Response"
            return new Response(null, { status: 404, statusText: 'Not Found' });
          });
      })
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    getCacheName().then(async (cacheName) => {
      const cacheWhitelist = [cacheName];

      // Delete old caches FIRST, before claiming clients.
      const allCacheNames = await caches.keys();
      await Promise.all(
        allCacheNames.map(name => {
          if (cacheWhitelist.indexOf(name) === -1) {
            console.log('Deleting old cache:', name);
            return caches.delete(name);
          }
        })
      );

      // Now claim clients and start background tasks
      await self.clients.claim();

      // Enable navigation preload when supported
      if (self.registration && self.registration.navigationPreload) {
        await self.registration.navigationPreload.enable().catch(() => {});
      }

      // Background tasks (best-effort, don't block activation)
      prefetchAllAssetsFromManifest().catch(() => {});
    })
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
    const paths = json.files.map(entryPath);
    await prefetchSpecificAssets(paths);
  } catch { }
}

async function prefetchSpecificAssets(files) {
  if (!Array.isArray(files) || files.length === 0) return;
  const cache = await openCache();

  const toFetch = [];
  for (const file of files) {
    try {
      const filePath = typeof file === 'object' ? file.path : file;
      const url = new URL(filePath, self.location);
      // Skip non-cacheable requests by heuristic
      if (!shouldCacheRequest({ url })) continue;
      const match = await cache.match(url.toString(), { ignoreSearch: true });
      if (!match) toFetch.push(url.toString());
    } catch { /* ignore malformed */ }
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
      } catch { /* best effort */ }
    }
  }
  const workers = Array.from({ length: Math.min(CONCURRENCY, Math.max(1, toFetch.length)) }, worker);
  await Promise.all(workers);
}

// Safari requires 206 Partial Content for Range requests (e.g. audio/video).
// Slice the cached response body and return proper headers.
async function handleRangeRequest(request, response) {
  const rangeHeader = request.headers.get('range');
  if (!rangeHeader) return response;

  const blob = await response.blob();
  const total = blob.size;
  const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
  if (!match) return response;

  const start = Number(match[1]);
  const end = match[2] ? Number(match[2]) : total - 1;
  const slice = blob.slice(start, end + 1);

  return new Response(slice, {
    status: 206,
    statusText: 'Partial Content',
    headers: new Headers({
      'Content-Type': blob.type,
      'Content-Length': String(slice.size),
      'Content-Range': `bytes ${start}-${end}/${total}`
    })
  });
}

// Helper function to check if a URL should use network-first strategy
function isNetworkFirst(url) {
  const pathname = new URL(url).pathname;
  return NETWORK_FIRST_PATTERNS.some(pattern => pattern.test(pathname));
}

// Safari rejects redirected responses served for navigations. Build a clean copy.
function cleanResponse(response) {
  if (!response || !response.redirected) return response;
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers
  });
}

// Find cached index.html for offline navigation. iOS Safari's global
// caches.match() can fail to search all caches, so fall back to opening
// each versioned cache and matching directly.
async function findCachedIndexHtml() {
  const indexUrl = new URL('./index.html', self.location).toString();
  // Try global search first (works on most browsers)
  const global = await caches.match(INDEX_HTML_CACHE_KEY, { ignoreSearch: true })
    || await caches.match(indexUrl, { ignoreSearch: true });
  if (global) return cleanResponse(global);
  // Fallback: search each versioned cache directly
  const names = await caches.keys();
  for (const name of names.filter(n => n.startsWith('botc-party-v')).sort().reverse()) {
    const cache = await caches.open(name);
    const match = await cache.match(INDEX_HTML_CACHE_KEY, { ignoreSearch: true })
      || await cache.match(indexUrl, { ignoreSearch: true });
    if (match) return cleanResponse(match);
  }
  return null;
}

async function cacheIndexHtmlResponse(response) {
  try {
    if (!response) return;
    if (!response.ok) return;
    if (response.type === 'opaqueredirect') return;
    const clone = response.clone();
    const cache = await openCache();
    await cache.put(INDEX_HTML_CACHE_KEY, cleanResponse(clone));
  } catch { /* best effort */ }
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
