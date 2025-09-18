/// <reference types="cypress" />

// Test: After declaring a winner (ending the game), Start Game and Player Setup are disabled until reset.

describe('Winner gating disables start flow until reset', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.viewport(1280, 900);
    cy.window().then((win) => { try { win.localStorage.clear(); } catch (_) { } });
  });

  function fullyAssignFivePlayers() {
    // Open player setup and random fill
    cy.get('#open-player-setup').click();
    cy.get('#player-setup-panel').should('be.visible');
    cy.get('#bag-random-fill').click();
    cy.get('#bag-count-warning').should('not.be.visible');
    cy.get('#player-setup-panel .start-selection').click();
    // Assign numbers 1..5
    for (let i = 0; i < 5; i++) {
      cy.get('#player-circle li').eq(i).find('.number-overlay').should('contain', '?').click();
      cy.get('#number-picker-overlay').should('be.visible');
      cy.get('#number-picker-overlay .number').contains(String(i + 1)).click();
      cy.get('body').then($body => {
        const modal = $body.find('#player-reveal-modal');
        if (modal.length && modal.is(':visible')) {
          const confirmBtn = modal.find('#reveal-confirm-btn');
          if (confirmBtn.length) {
            cy.wrap(confirmBtn).click();
          }
        }
      });
    }
    // Sidebar already visible, panel auto-closed after selection process
  }

  it('gates start/player setup after winner until reset', () => {
    // Initially, with no players, open-player-setup is disabled
    cy.get('#open-player-setup').should('be.disabled');

    // Add players
    cy.get('#player-count').clear().type('5');
    cy.get('#add-players').click();
    cy.get('#open-player-setup').should('not.be.disabled');
    cy.get('#start-game').should('be.disabled'); // need assignments

    // Load a script so roles are available
    cy.get('#load-tb').click();

    fullyAssignFivePlayers();
    cy.get('#start-game').should('not.be.disabled');
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
    cy.get('#start-game').should('be.disabled'); // still need assignments
  });
});
