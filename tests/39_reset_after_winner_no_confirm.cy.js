/// <reference types="cypress" />

// Regression test: After declaring a winner (game ended), clicking Reset Grimoire should NOT
// show the in-progress confirmation dialog because the game has already ended.
// Prior bug: Confirmation appeared even after a winner was set.

describe('Reset after winner does not prompt', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.viewport(1280, 900);
    cy.window().then((win) => { try { win.localStorage.clear(); } catch (_) { } });
  });

  function addFivePlayers() {
    cy.get('#player-count').clear().type('5');
    cy.get('#add-players').click();
  }

  function fullyAssignFivePlayers() {
    // Open player setup and random fill
    cy.get('#open-player-setup').click();
    cy.get('#player-setup-panel').should('be.visible');
    cy.get('#bag-random-fill').click();
    cy.get('#bag-count-warning').should('not.be.visible');
    cy.get('#player-setup-panel .start-selection').click();
    for (let i = 0; i < 5; i++) {
      cy.get('#player-circle li').eq(i).find('.number-overlay').should('contain', '?').click();
      cy.get('#number-picker-overlay').should('be.visible');
      cy.get('#number-picker-overlay .number').contains(String(i + 1)).click();
      // Handle optional reveal confirmation modal if appears
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
  }

  it('does not show confirm after winner declared', () => {
    // Add players & load script
    addFivePlayers();
    cy.get('#load-tb').click();
    fullyAssignFivePlayers();

    // Start then end game with winner
    cy.get('#start-game').click({ force: true });
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
