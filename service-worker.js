const CACHE_NAME = 'botc-offline-grimoire-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/styles.css',
  '/script.js',
  '/tokens.json',
  '/manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://botc.app/assets/background4-C7TzDZ7M.webp',
  'https://botc.app/assets/token-blank-05128509.webp'
];

self.addEventListener('install', event => {
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
  // Handle token image requests
  if (event.request.url.includes('script.bloodontheclocktower.com/images/icon/')) {
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
                  console.log(`Cached token image: ${event.request.url}`);
                });
              }
              return response;
            })
            .catch(() => {
              // Return a placeholder image if fetch fails
              return caches.match('https://botc.app/assets/token-blank-05128509.webp');
            });
        })
    );
    return;
  }

  // Handle tokens.json requests
  if (event.request.url.includes('/tokens.json')) {
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
                  // Cache all token images after successfully caching tokens.json
                  cacheAllTokenImages();
                });
              }
              return response;
            })
            .catch(error => {
              console.error('Failed to fetch tokens.json:', error);
              // Return a basic fallback if tokens.json fails
              return new Response(JSON.stringify({
                townsfolk: [],
                outsider: [],
                minion: [],
                demon: [],
                travellers: [],
                fabled: []
              }), {
                headers: { 'Content-Type': 'application/json' }
              });
            });
        })
    );
    return;
  }

  // Handle other requests
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
              return caches.match('/index.html');
            }
            return null;
          });
      })
  );
});

async function cacheAllTokenImages() {
  try {
    const cache = await caches.open(CACHE_NAME);
    
    // Get tokens.json from cache instead of fetching again
    const cachedResponse = await cache.match('/tokens.json');
    if (!cachedResponse) {
      console.log('tokens.json not found in cache, skipping image caching');
      return;
    }
    
    const tokens = await cachedResponse.json();
    const imageUrls = [];
    
    // Extract all image URLs from the tokens
    Object.values(tokens).forEach(team => {
      if (Array.isArray(team)) {
        team.forEach(role => {
          if (role.image) {
            imageUrls.push(role.image);
          }
        });
      }
    });
    
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
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
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
