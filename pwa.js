// Service Worker registration and update handling (browser-native ES module)

if ('serviceWorker' in navigator) {
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

