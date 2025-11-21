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
      update: () => { },
      addEventListener: () => { },
      installing: { addEventListener: () => { } }
    };
    const sw = {
      controller: null,
      addEventListener: () => { },
      register: () => Promise.resolve(swRegistration)
    };
    Object.defineProperty(win.navigator, 'serviceWorker', { value: sw, configurable: true });
  } catch (_) { }
});

// Custom helper commands
// Adds N players, optionally loads Trouble Brewing script, then starts the game
// Usage: cy.setupGame({ players: 5, loadScript: true })
// Default: players=5, loadScript=true
Cypress.Commands.add('setupGame', ({ players = 5, loadScript = true, mode = 'storyteller' } = {}) => {
  cy.window().then((win) => { try { win.localStorage.removeItem('sidebarCollapsed'); } catch (_) { } });
  if (mode === 'storyteller') {
    cy.ensureStorytellerMode();
  } else if (mode === 'player') {
    cy.ensurePlayerMode();
  }
  if (loadScript) {
    cy.get('#load-tb').click({ force: true });
    cy.get('#character-sheet .role').should('have.length.greaterThan', 5);
  }
  cy.get('#player-count').then(($el) => {
    const el = $el[0];
    el.value = String(players);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  });
  cy.get('#reset-grimoire').click({ force: true });
  cy.get('#player-circle li').should('have.length', players);
  // Ensure sidebar is open so the End Game button is visible
  cy.get('body').then(($b) => {
    if ($b.hasClass('sidebar-collapsed')) {
      cy.get('#sidebar-toggle').click({ force: true });
    }
  });
  cy.get('#sidebar').then(($sidebar) => {
    if (($sidebar.width() || 0) < 50) {
      cy.get('#sidebar-toggle').click({ force: true });
    }
  });
  cy.get('#end-game').scrollIntoView().should('be.visible');
});

Cypress.Commands.add('ensureStorytellerMode', () => {
  cy.get('#mode-storyteller').then(($radio) => {
    if (!$radio.is(':checked')) {
      cy.wrap($radio).click({ force: true });
    }
  });
  cy.get('#mode-storyteller').should('be.checked');
});

Cypress.Commands.add('ensurePlayerMode', () => {
  cy.get('#mode-player').then(($radio) => {
    if (!$radio.is(':checked')) {
      cy.wrap($radio).click({ force: true });
    }
  });
  cy.get('#mode-player').should('be.checked');
});

// Simple command kept for compatibility; no Start Game gate exists anymore
Cypress.Commands.add('startGame', () => {
  cy.get('#end-game').should('be.visible');
});

Cypress.Commands.add('ensureSidebarOpen', () => {
  cy.window().then((win) => {
    const body = win.document.body;
    body.classList.remove('sidebar-collapsed');
    body.classList.add('sidebar-open');
    const sidebar = win.document.getElementById('sidebar');
    if (sidebar) {
      sidebar.style.width = '';
      sidebar.style.display = '';
      sidebar.style.overflow = 'visible';
    }
  });
  cy.get('#sidebar-toggle').then($btn => {
    if ($btn.is(':visible')) cy.wrap($btn).click({ force: true });
  });
});

Cypress.Commands.add('resetApp', ({
  mode = 'storyteller',
  loadScript = false,
  viewport = [1280, 900],
  clearStorage = true,
  showSidebar = true,
  showGrimoire = true
} = {}) => {
  cy.visit('/');
  if (viewport) {
    Array.isArray(viewport) ? cy.viewport(viewport[0], viewport[1]) : cy.viewport(viewport);
  }
  if (clearStorage) {
    cy.window().then((win) => { try { win.localStorage.clear(); } catch (_) { } });
  }
  if (mode === 'storyteller') {
    cy.ensureStorytellerMode();
  } else if (mode === 'player') {
    cy.ensurePlayerMode();
  }
  if (showSidebar) {
    cy.ensureSidebarOpen();
  }
  if (loadScript) {
    cy.get('#load-tb').click({ force: true });
    cy.get('#character-sheet .role').should('have.length.greaterThan', 5);
  }
  if (showGrimoire) {
    cy.window().then((win) => { if (win.grimoireState) win.grimoireState.grimoireHidden = false; });
  }
});

Cypress.Commands.add('fillBag', () => {
  return cy.window().then((win) => {
    const helper = win.__BOTCPARTY_TEST_API && win.__BOTCPARTY_TEST_API.fillBagWithStandardSetup;
    if (typeof helper !== 'function') {
      throw new Error('Unable to access fillBagWithStandardSetup helper');
    }
    helper();
  });
});
