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
  cy.ensureSidebarOpen();
  if (mode === 'storyteller') {
    cy.ensureStorytellerMode();
  } else if (mode === 'player') {
    cy.ensurePlayerMode();
  }
  if (loadScript) {
    cy.get('#load-tb').click({ force: true });
    cy.get('#character-sheet .role').should('have.length.greaterThan', 5);
    cy.ensureSidebarOpen();
  }
  cy.get('#player-count').then(($el) => {
    const el = $el[0];
    el.value = String(players);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  });
  cy.get('#reset-grimoire').click({ force: true });
  cy.get('#player-circle li').should('have.length', players);
  cy.ensureSidebarOpen();
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
  cy.get('body').then(($body) => {
    if ($body.hasClass('character-panel-open')) {
      cy.get('#character-panel-toggle').click({ force: true });
    }
  });
  cy.get('body').should('not.have.class', 'character-panel-open').then(($body) => {
    if ($body.hasClass('sidebar-collapsed')) {
      cy.get('#sidebar-toggle').should('be.visible').click({ force: true });
    }
  });
  cy.get('body').should('not.have.class', 'sidebar-collapsed');
  cy.get('#sidebar').should(($sidebar) => {
    const sidebar = $sidebar[0]; const rect = sidebar.getBoundingClientRect(); const view = sidebar.ownerDocument.defaultView;
    expect(rect.width, 'sidebar width').to.be.greaterThan(Math.min(200, view.innerWidth * 0.5));
    expect(rect.left, 'sidebar left edge').to.be.gte(-1);
    expect(view.getComputedStyle(sidebar).overflowY, 'sidebar vertical overflow').to.equal('auto');
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
  cy.visit('/', clearStorage ? {
    onBeforeLoad: (win) => {
      try { win.localStorage.clear(); } catch (_) { }
    }
  } : {});
  if (viewport) {
    Array.isArray(viewport) ? cy.viewport(viewport[0], viewport[1]) : cy.viewport(viewport);
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
