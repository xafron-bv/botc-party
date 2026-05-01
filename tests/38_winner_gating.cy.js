/// <reference types="cypress" />

// Test: After declaring a winner the storyteller can still edit and reset; no gating.

describe('Winner does not gate post-game editing or setup', () => {
  beforeEach(() => {
    cy.resetApp({ mode: 'storyteller', loadScript: false });
  });


  it('keeps player setup and end-game-related controls usable after a winner is declared', () => {
    cy.ensureSidebarOpen();

    // Controls should be available immediately since players are preloaded
    cy.get('#open-player-setup').should('not.be.disabled');
    cy.get('#end-game').should('be.visible');

    // Load a script so roles are available
    cy.get('#load-tb').click();

    // End game -> open modal and declare winner (force in case sidebar collapsed)
    cy.get('#sidebar').then(($s) => {
      if (($s.width() || 0) < 50) {
        cy.get('#sidebar-toggle').click({ force: true });
      }
    });
    cy.get('#end-game').click({ force: true });
    cy.get('#end-game-modal').should('be.visible');
    cy.get('#good-wins-btn').click();

    // Open Player Setup remains usable; End Game button is hidden because the game is over
    cy.get('#open-player-setup').should('not.be.disabled');
    cy.get('#end-game').should('not.be.visible');

    // Reset still works
    cy.on('window:confirm', () => true);
    cy.get('#reset-grimoire').click({ force: true });

    cy.get('#open-player-setup').should('not.be.disabled');
    cy.get('#end-game').should('be.visible');
  });
});
