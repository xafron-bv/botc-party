const CACHE_NAME = 'botc-party-grimoire-v41';

// Dynamic caching patterns instead of hardcoded file lists
const CACHE_PATTERNS = {
  // Core app files - always cache
  core: [
    './',
    './index.html',
    './terms.html',
    './LICENSE.md',
    './manifest.json'
  ],
  // File extensions to cache
  extensions: ['.css', '.js', '.json', '.woff2', '.png', '.webp'],
  // Directories to cache
  directories: [
    './assets/',
    './ui/',
    './build/'
  ]
};

// Files that should always be fetched from network first
const networkFirstFiles = [
  'index.html',
  'styles.css',
  'script.js', 'utils.js', 'pwa.js', 'ui/tooltip.js', 'ui/svg.js', 'ui/guides.js', 'ui/sidebar.js', 'ui/tour.js', 'ui/layout.js',
  'service-worker.js',
  'manifest.json'
];

self.addEventListener('install', event => {
  // Skip waiting to activate immediately
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        // Cache only core files during install
        return cache.addAll(CACHE_PATTERNS.core);
      })
      .then(() => {
        console.log('Core files cached successfully');
        // Cache other assets dynamically on first fetch
      })
      .catch(error => {
        console.error('Service worker installation failed:', error);
      })
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  const isNetworkFirst = networkFirstFiles.some(file =>
    url.pathname.endsWith(file) || url.pathname === '/' || url.pathname === '/workspace/'
  );

  // Only handle GET requests; pass others through to network
  if (event.request.method !== 'GET') {
    return;
  }

  // Optimize navigations with navigation preload and robust fallbacks
  if (event.request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const preloaded = await event.preloadResponse;
        if (preloaded) {
          const clone = preloaded.clone();
          caches.open(CACHE_NAME).then(cache => cache.put('./index.html', clone));
          return preloaded;
        }
      } catch (_) {}

      try {
        const networkResponse = await fetch(event.request);
        if (networkResponse && networkResponse.ok) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put('./index.html', clone));
        }
        return networkResponse;
      } catch (_) {
        const cached = await caches.match('./index.html');
        if (cached) return cached;
        return Response.redirect('./index.html');
      }
    })());
    return;
  }

  // Handle character image requests - cache first
  if (event.request.url.includes('/build/img/icons/')) {
    event.respondWith(
      caches.match(event.request)
        .then(response => {
          if (response) {
            return response;
          }
          return fetch(event.request)
            .then(response => {
              if (response.ok) {
                const responseClone = response.clone();
                caches.open(CACHE_NAME).then(cache => {
                  cache.put(event.request, responseClone);
                  console.log(`Cached character image: ${event.request.url}`);
                });
              }
              return response;
            })
            .catch(() => {
              // Return a placeholder image if fetch fails
              return caches.match('./assets/img/token-BqDQdWeO.webp');
            });
        })
    );
    return;
  }

  // Handle characters.json requests - cache first
  if (event.request.url.includes('/characters.json') || event.request.url.endsWith('characters.json')) {
    event.respondWith(
      caches.match(event.request, { ignoreSearch: true })
        .then(response => {
          if (response) {
            // Try to fetch fresh version in background
            fetch(event.request)
              .then(freshResponse => {
                if (freshResponse.ok) {
                  const responseClone = freshResponse.clone();
                  caches.open(CACHE_NAME).then(cache => {
                    cache.put(event.request, responseClone);
                    // Cache all token images after successfully caching characters.json
                    event.waitUntil(cacheAllTokenImages());
                  });
                }
              })
              .catch(() => { });
            return response;
          }
          return fetch(event.request)
            .then(response => {
              if (response.ok) {
                const responseClone = response.clone();
                caches.open(CACHE_NAME).then(cache => {
                  cache.put(event.request, responseClone);
                  // Cache all token images after successfully caching characters.json
                  event.waitUntil(cacheAllTokenImages());
                });
              }
              return response;
            })
            .catch(error => {
              console.error('Failed to fetch characters.json:', error);
              // Return a basic fallback if characters.json fails
              return new Response(JSON.stringify([]), { headers: { 'Content-Type': 'application/json' } });
            });
        })
    );
    return;
  }

  // Cache base script JSON files on fetch as well - cache first
  {
    const decodedPath = decodeURIComponent(url.pathname);
    const baseScriptNames = ['Trouble Brewing.json', 'Bad Moon Rising.json', 'Sects and Violets.json'];
    if (baseScriptNames.some(name => decodedPath.endsWith(name))) {
      event.respondWith(
        caches.match(event.request, { ignoreSearch: true }).then(response => {
          if (response) return response;
          return fetch(event.request).then(res => {
            if (res.ok) {
              const clone = res.clone();
              caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
            }
            return res;
          });
        })
      );
      return;
    }
  }

  // Handle network-first files (HTML, CSS, JS)
  if (isNetworkFirst) {
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
                return caches.match('./index.html');
              }
              return null;
            });
        })
    );
    return;
  }

  // Handle other requests - dynamic cache first based on patterns
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true })
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request)
          .then(response => {
            if (response.ok) {
              // Check if this request should be cached based on patterns
              if (shouldCacheRequest(event.request)) {
                const responseClone = response.clone();
                caches.open(CACHE_NAME).then(cache => {
                  cache.put(event.request, responseClone);
                  console.log(`Dynamically cached: ${event.request.url}`);
                });
              }
            }
            return response;
          })
          .catch(() => {
            // Return cached response for navigation requests
            if (event.request.mode === 'navigate') {
              return caches.match('./index.html');
            }
            return null;
          });
      })
  );
});

async function cacheAllTokenImages() {
  try {
    const cache = await caches.open(CACHE_NAME);

    // Get characters.json from cache instead of fetching again
    const cachedResponse = await cache.match('./characters.json', { ignoreSearch: true });
    if (!cachedResponse) {
      console.log('characters.json not found in cache, skipping image caching');
      return;
    }

    const characters = await cachedResponse.json();
    const imageUrls = [];

    // Extract all image URLs from the characters list
    if (Array.isArray(characters)) {
      characters.forEach(role => {
        if (role && role.image) {
          imageUrls.push(role.image);
        }
      });
    }

    console.log(`Found ${imageUrls.length} token images to cache`);

    // Cache all token images
    const cachePromises = imageUrls.map(async (imageUrl) => {
      try {
        const imageResponse = await fetch(imageUrl);
        if (imageResponse.ok) {
          await cache.put(imageUrl, imageResponse.clone());
          console.log(`Cached: ${imageUrl}`);
        }
      } catch (error) {
        console.log(`Failed to cache image: ${imageUrl}`, error);
      }
    });

    await Promise.allSettled(cachePromises);
    console.log('Token image caching completed');

  } catch (error) {
    console.error('Error caching token images:', error);
  }
}

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
      (self.registration && self.registration.navigationPreload && self.registration.navigationPreload.enable()) || Promise.resolve()
    ])
  );
});

// Helper function to determine if a request should be cached based on patterns
function shouldCacheRequest(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Always cache core files
  if (CACHE_PATTERNS.core.some(corePath => pathname.endsWith(corePath.replace('./', '')))) {
    return true;
  }

  // Cache files with specified extensions
  if (CACHE_PATTERNS.extensions.some(ext => pathname.endsWith(ext))) {
    return true;
  }

  // Cache files in specified directories
  if (CACHE_PATTERNS.directories.some(dir => pathname.startsWith(dir.replace('./', '/')))) {
    return true;
  }

  // Cache JSON files (scripts and character data)
  if (pathname.endsWith('.json')) {
    return true;
  }

  return false;
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
