const CACHE_NAME = 'botc-party-grimoire-v23';
const urlsToCache = [
  './',
  './index.html',
  './terms.html',
  './LICENSE.md',
  './styles.css',
  './script.js',
  './utils.js',
  './pwa.js',
  './ui/tooltip.js',
  './ui/svg.js',
  './ui/guides.js',
  './ui/sidebar.js',
  './ui/tour.js',
  './ui/layout.js',
  './ui/history/index.js',
  './ui/history/script.js',
  './ui/history/grimoire.js',
  './characters.json',
  './Trouble Brewing.json',
  './Bad Moon Rising.json',
  './Sects and Violets.json',
  './manifest.json',
  './assets/fontawesome/css/all.min.css',
  './assets/fontawesome/webfonts/fa-solid-900.woff2',
  './assets/fontawesome/webfonts/fa-regular-400.woff2',
  './assets/fontawesome/webfonts/fa-brands-400.woff2',
  './assets/img/background4-C7TzDZ7M.webp',
  './assets/img/background4-X8jQb4tv.webp',
  './assets/img/background-bJ1INm6Z.webp',
  './assets/img/token-BqDQdWeO.webp',
  './assets/icons/android-chrome-192x192.png',
  './assets/icons/android-chrome-512x512.png'
];

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
        // First cache the basic files
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('Basic files cached successfully');
        // Don't cache token images during install to avoid circular dependency
        // They will be cached on first fetch
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
      caches.match(event.request)
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
                    cacheAllTokenImages();
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
                  cacheAllTokenImages();
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
  if (event.request.url.endsWith('Trouble%20Brewing.json') || event.request.url.endsWith('Bad%20Moon%20Rising.json') || event.request.url.endsWith('Sects%20and%20Violets.json')) {
    event.respondWith(
      caches.match(event.request).then(response => {
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
          return caches.match(event.request)
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

  // Handle other requests - cache first
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
              });
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
    const cachedResponse = await cache.match('./characters.json');
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
      self.clients.claim()
    ])
  );
});

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