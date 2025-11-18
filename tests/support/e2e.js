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
  cy.get('#start-game').should('not.be.disabled').click({ force: true });
  cy.get('body').should('not.have.class', 'pre-game');
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

// Simple command to just start the game assuming players already exist
Cypress.Commands.add('startGame', () => {
  cy.get('#start-game').should('not.be.disabled').click({ force: true });
  cy.get('body').should('not.have.class', 'pre-game');
});
