/// <reference types="cypress" />

// Regression test: After declaring a winner (game ended), clicking Reset Grimoire should NOT
// show the in-progress confirmation dialog because the game has already ended.
// Prior bug: Confirmation appeared even after a winner was set.

describe('Reset after winner does not prompt', () => {
  beforeEach(() => {
    cy.resetApp({ mode: 'storyteller', loadScript: false });
  });

  function addFivePlayers() {
    cy.get('#player-count').clear().type('5');
    cy.get('#reset-grimoire').click();
  }

  function fullyAssignFivePlayers() {
    // Open player setup and fill bag for the current configuration
    cy.get('#open-player-setup').click();
    cy.get('#player-setup-panel').should('be.visible');
    cy.fillBag();
    cy.get('#player-setup-panel .start-selection').click({ force: true });
    cy.get('body').should('have.class', 'selection-active');
    for (let i = 0; i < 5; i++) {
      cy.get('#player-circle li').eq(i).find('.number-overlay').should('contain', '?').click();
      cy.get('#number-picker-overlay').should('be.visible');
      cy.get('#number-picker-overlay .number').contains(String(i + 1)).click();
      // Handle optional reveal confirmation modal if appears
      cy.get('body').then($body => {
        const modal = $body.find('#player-reveal-modal');
        if (modal.length && modal.is(':visible')) {
          const confirmBtn = modal.find('#close-player-reveal-modal');
          if (confirmBtn.length) {
            cy.wrap(confirmBtn).click();
          }
        }
      });
    }
    // Open sidebar for reveal/end controls
    cy.get('body').then(($b) => {
      if ($b.hasClass('sidebar-collapsed')) {
        cy.get('#sidebar-toggle').click({ force: true });
      }
    });
    // Reveal assignments to apply characters
    cy.get('#reveal-selected-characters').should('be.visible').click();
  }

  it('does not show confirm after winner declared', () => {
    // Add players & load script
    addFivePlayers();
    cy.get('#load-tb').click();
    fullyAssignFivePlayers();

    // End game with winner
    cy.get('#end-game').click({ force: true });
    cy.get('#end-game-modal').should('be.visible');
    cy.get('#good-wins-btn').click();
    cy.get('#winner-message').should('contain.text', 'Good has won');

    // Spy on window.confirm; it should NOT be called when resetting after winner
    const confirmStub = cy.stub();
    cy.on('window:confirm', confirmStub);

    cy.get('#reset-grimoire').click({ force: true });

    cy.then(() => {
      expect(confirmStub, 'confirm should not be called after winner').not.to.have.been.called;
    });
  });
});
