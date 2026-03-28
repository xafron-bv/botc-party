// Service Worker registration and update handling (browser-native ES module)

const runningInCypress = Boolean(window.Cypress);
const allowServiceWorker =
  !runningInCypress || window.__allowServiceWorkerInTests === true;

const reloadPage = () => {
  const overlay = document.getElementById('loading-overlay');
  if (overlay) {
    overlay.classList.remove('loading-overlay--hidden');
  }
  if (typeof window.__swReload === 'function') {
    window.__swReload();
    return;
  }
  window.location.reload();
};

const VERSION_JSON_URL = './version.json';
const SERVICE_WORKER_BASE_URL = './service-worker.js';
const SERVICE_WORKER_VERSIONED_PREFIX = './service-worker.js?v=';

async function buildServiceWorkerUrl() {
  try {
    const res = await fetch(VERSION_JSON_URL, { cache: 'no-store' });
    if (!res.ok) {
      throw new Error(`version.json fetch failed: ${res.status}`);
    }
    const data = await res.json();
    const { uiVersion } = data || {};
    if (Number.isFinite(uiVersion) && uiVersion > 0) {
      return `${SERVICE_WORKER_VERSIONED_PREFIX}${uiVersion}`;
    }
  } catch (err) {
    console.warn('Falling back to base service worker URL (no cache-bust)', err);
  }
  return SERVICE_WORKER_BASE_URL;
}

/** Fetch the current version.json (cache-busted) and return its fields. */
async function fetchVersionInfo() {
  try {
    const res = await fetch(VERSION_JSON_URL, { cache: 'no-store' });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// -- Version checking (independent of SW lifecycle) --
let loadedUiVersion = null;

/**
 * Check version.json for changes since this page loaded.
 * Returns true if any version (ui) changed.
 */
async function checkForVersionChanges() {
  const newVersion = await fetchVersionInfo();
  if (!newVersion) return false;

  const uiChanged = loadedUiVersion !== null && newVersion.uiVersion !== loadedUiVersion;

  return uiChanged;
}

// Disable service worker during Cypress tests unless explicitly allowed
if (runningInCypress && !allowServiceWorker && 'serviceWorker' in navigator && navigator.serviceWorker.getRegistrations) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => registration.unregister());
  });
} else if ('serviceWorker' in navigator && allowServiceWorker) {
  window.addEventListener('load', async () => {
    const serviceWorkerUrl = await buildServiceWorkerUrl();

    // Capture the versions that this page was built against
    const currentVersion = await fetchVersionInfo();
    if (currentVersion) {
      loadedUiVersion = currentVersion.uiVersion;
    }

    navigator.serviceWorker
      .register(serviceWorkerUrl)
      .then((registration) => {
        console.log('Service worker registered successfully:', registration);
        console.log('Registering service worker with cache-busting uiVersion query:', serviceWorkerUrl);

        // Check for updates on page load
        registration.update();

        // Check for updates periodically (every 5 minutes)
        setInterval(() => {
          registration.update();
          checkForVersionChanges();
        }, 5 * 60 * 1000);

        // Handle service worker updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          console.log('Service worker update found!');

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                console.log('New service worker installed (update available)');
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
            try { window.__prefetchRequested = true; } catch { }
          } catch { /* best effort */ }
        };

        navigator.serviceWorker.ready.then(() => triggerPrefetch());
        triggerPrefetch();
      })
      .catch((error) => {
        console.error('Service worker registration failed:', error);
      });
  });

  // When the controller changes (new SW activated via skipWaiting), mark
  // a pending UI reload and check for breaking changes.
  // Skip the first controllerchange (fresh install claiming the page).
  let hadController = Boolean(navigator.serviceWorker.controller);
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    try {
      window.__swControllerChanged = true;
      if (hadController) {
        window.__swUpdateAvailable = true;
      }
      hadController = true;
    } catch { /* best effort */ }
    checkForVersionChanges();
  });

  // When the user returns to the page, reload if the version changed or
  // a new SW was activated while away.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      checkForVersionChanges().then((uiChanged) => {
        if (uiChanged || window.__swUpdateAvailable) {
          window.__swUpdateAvailable = false;
          reloadPage();
        }
      });
    }
  });
}
