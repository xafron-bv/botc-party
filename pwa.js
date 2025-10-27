// Service Worker registration and update handling (browser-native ES module)

// Disable service worker during Cypress tests to avoid caching issues
if (window.Cypress && 'serviceWorker' in navigator && navigator.serviceWorker.getRegistrations) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => registration.unregister());
  });
} else if (!window.Cypress && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./service-worker.js')
      .then((registration) => {
        console.log('Service worker registered successfully:', registration);

        // Suppress update prompt only on first standalone launch (A2HS first open)
        const isStandalone =
          (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) ||
          window.navigator.standalone === true;
        const FIRST_LAUNCH_KEY = 'pwa_first_standalone_launch_done';
        let suppressUpdatePrompt = false;
        if (isStandalone && !localStorage.getItem(FIRST_LAUNCH_KEY)) {
          suppressUpdatePrompt = true;
          localStorage.setItem(FIRST_LAUNCH_KEY, '1');
        }

        // Check for updates on page load
        registration.update();

        // Check for updates periodically (every 5 minutes)
        setInterval(() => {
          registration.update();
        }, 5 * 60 * 1000);

        // Handle service worker updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          console.log('Service worker update found!');

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed') {
              // Only prompt if there's an existing controller (i.e., this is an update, not first install)
              if (navigator.serviceWorker.controller) {
                console.log('New service worker installed (update available)');
                if (!suppressUpdatePrompt) {
                  if (confirm('A new version is available! Reload to update?')) {
                    window.location.reload();
                  }
                } else {
                  console.log('Suppressing update prompt on first standalone launch');
                }
              } else {
                console.log('Service worker installed for the first time');
              }
            }
          });
        });

        // Proactively trigger asset prefetching once SW is ready/active
        const triggerPrefetch = () => {
          try {
            if (registration && registration.active) {
              registration.active.postMessage({ type: 'PREFETCH_ALL' });
            } else if (navigator.serviceWorker && navigator.serviceWorker.controller) {
              navigator.serviceWorker.controller.postMessage({ type: 'PREFETCH_ALL' });
            }
            try { window.__prefetchRequested = true; } catch (_) {}
          } catch (_) { /* best effort */ }
        };

        // When SW is ready, ask it to prefetch all assets
        navigator.serviceWorker.ready.then(() => triggerPrefetch());
        // Also attempt immediately in case it's already active
        triggerPrefetch();

        // Rely on the service worker to handle bulk prefetching in the background
        // so the main thread remains responsive during first paint.
      })
      .catch((error) => {
        console.error('Service worker registration failed:', error);
      });
  });

  // Handle controller change (when skipWaiting is called)
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });
}
