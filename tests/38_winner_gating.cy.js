/// <reference types="cypress" />

// Test: After declaring a winner (ending the game), Start Game and Player Setup are disabled until reset.

describe('Winner gating disables start flow until reset', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.viewport(1280, 900);
    cy.window().then((win) => { try { win.localStorage.clear(); } catch (_) { } });
  });


  it('gates start/player setup after winner until reset', () => {
    // Controls should be available immediately since players are preloaded
    cy.get('#open-player-setup').should('not.be.disabled');
    cy.get('#start-game').should('not.be.disabled');

    // Load a script so roles are available
    cy.get('#load-tb').click();

    // We no longer require full assignments to start; start immediately
    cy.get('#start-game').click({ force: true });
    // End game -> open modal and declare winner (force in case sidebar collapsed)
    cy.get('#end-game').click({ force: true });
    cy.get('#end-game-modal').should('be.visible');
    cy.get('#good-wins-btn').click();

    // Gate should apply
    cy.get('#start-game').should('be.disabled');
    cy.get('#open-player-setup').should('be.disabled');

    // Reset to clear gate
    cy.on('window:confirm', () => true);
    cy.get('#reset-grimoire').click({ force: true });

    cy.get('#open-player-setup').should('not.be.disabled');
    cy.get('#start-game').should('not.be.disabled');
  });
});
