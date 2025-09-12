// Cypress global hooks/config for this project
// Ensure consistent viewport and faster test stability
beforeEach(() => {
  cy.viewport(1280, 900);
  // Prevent service worker from interfering with tests
  cy.intercept('GET', '/service-worker.js', { statusCode: 404, body: '' });
});

// Provide a safe stub for serviceWorker API before app code runs
Cypress.on('window:before:load', (win) => {
  try {
    const swRegistration = {
      update: () => {},
      addEventListener: () => {},
      installing: { addEventListener: () => {} }
    };
    const sw = {
      controller: null,
      addEventListener: () => {},
      register: () => Promise.resolve(swRegistration)
    };
    Object.defineProperty(win.navigator, 'serviceWorker', { value: sw, configurable: true });
  } catch (_) {}
});

