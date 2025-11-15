// Cypress E2E tests - Pre-game grimoire gray-out behavior

describe('Pre-game grimoire disabled/gray state', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.viewport(1280, 900);
    cy.window().then((win) => { try { win.localStorage.clear(); } catch (_) { } });
    // Ensure five players
    cy.get('#player-count').clear().type('5');
    cy.get('#reset-grimoire').click();
  });

  it('applies pre-game class before starting game', () => {
    cy.get('body').should('have.class', 'pre-game');
  });

  it('prevents opening character modal before Start Game', () => {
    cy.get('#player-circle li .player-token').first().click({ force: true });
    cy.get('#character-modal').should('not.be.visible');
    // Also ensure pointer-events is none on a representative interactive element
    cy.get('#player-circle li .player-token').first().should('have.css', 'pointer-events', 'none');
    // And reminder placeholder cannot open modal either
    cy.get('#player-circle li .reminder-placeholder').first().click({ force: true });
    cy.get('#reminder-token-modal').should('not.be.visible');
  });

  it('allows Start Game then enables interactions', () => {
    // Load a script so character modal can open
    cy.get('#load-tb').click();
    cy.get('#start-game').should('not.be.disabled').click();
    cy.get('body').should('not.have.class', 'pre-game');
    // Ensure modal initially hidden
    cy.get('#character-modal').should('not.be.visible');
    // Click token to open; allow for async render
    cy.get('#player-circle li .player-token').first().click({ force: true });
    cy.get('#character-modal').should('be.visible');
  });
});
