// Cypress E2E tests - Day/Night slider resets when starting a new game

const startGameWithPlayers = (n) => {
  cy.get('#player-count').then(($el) => {
    const el = $el[0];
    el.value = String(n);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  });
  cy.get('#reset-grimoire').click();
  cy.get('#player-circle li').should('have.length', n);
};

describe('Day/Night slider resets when starting a new game', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.viewport(1280, 900);
    cy.window().then((win) => { try { win.localStorage.clear(); } catch (_) { } });
    cy.get('#load-tb').click();
    cy.get('#character-sheet .role').should('have.length.greaterThan', 5);
  });

  it('disables tracking and resets phases to N1 after starting new game', () => {
    startGameWithPlayers(5);

    // enable and add some phases
    cy.get('#day-night-toggle').click();
    cy.get('#day-night-slider').should('have.class', 'open');
    cy.get('#add-phase-button').click().click();

    // Start game and ensure reset (confirm any prior reset if prompted)
    cy.get('#mode-player').check({ force: true });
    cy.window().then((win) => { cy.stub(win, 'confirm').returns(true); });
    cy.get('#start-game').click();
    cy.get('#day-night-slider').should('not.have.class', 'open');
    cy.get('#current-phase').should('have.text', 'N1');
  });
});

