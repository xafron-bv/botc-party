const CACHE_NAME = 'botc-offline-grimoire-v1';
const urlsToCache = [
  '/',
  '/index.html',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://botc.app/assets/background4-C7TzDZ7M.webp',
  // Add all required token and avatar images here to make them available offline
  // This is just a sample for demonstration
  'https://botc.app/assets/chef_g-C3a3cGeP.webp',
  'https://botc.app/assets/poisoner_e-Usf7TcoY.webp',
  'https://botc.app/assets/monk_g-D4wNFA-b.webp',
  'https://botc.app/assets/imp_e-DNpveOPY.webp',
  'https://botc.app/assets/avatar0-u1LxaXkZ.webp',
  'https://botc.app/assets/avatar1-CIODRiLI.webp',
  'https://botc.app/assets/avatar2-C2yX3Z_9.webp',
  'https://botc.app/assets/avatar3-D_x-Yv0A.webp',
  'https://botc.app/assets/avatar4-D6Z-v0bB.webp',
  'https://botc.app/assets/avatar5-C_Z_v0bB.webp',
  'https://botc.app/assets/avatar6-D_Z_v0bB.webp',
  'https://botc.app/assets/avatar7-C_Z_v0bB.webp',
  'https://botc.app/assets/avatar8-D_Z_v0bB.webp',
  'https://botc.app/assets/avatar9-C_Z_v0bB.webp',
  'https://botc.app/assets/avatar10-Ce5aMeqa.webp',
  'https://botc.app/assets/avatar11-D0soE0Fu.webp',
  'https://botc.app/assets/avatar12-C_Z_v0bB.webp',
  'https://botc.app/assets/avatar13-D_Z_v0bB.webp',
  'https://botc.app/assets/avatar14-h_wJnEaW.webp',
  'https://botc.app/assets/avatar15-C_Z_v0bB.webp',
  'https://botc.app/assets/avatar16-D_Z_v0bB.webp',
  'https://botc.app/assets/avatar17-amVAvnUE.webp',
  'https://botc.app/assets/avatar18-C_Z_v0bB.webp',
  'https://botc.app/assets/avatar19-D_Z_v0bB.webp',
  'https://botc.app/assets/avatar20-C_Z_v0bB.webp',
  'https://botc.app/assets/avatar21-D_Z_v0bB.webp',
  'https://botc.app/assets/avatar22-C_Z_v0bB.webp',
  'https://botc.app/assets/avatar23-D_Z_v0bB.webp',
  'https://botc.app/assets/avatar24-D1bqdpeq.webp',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});

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
