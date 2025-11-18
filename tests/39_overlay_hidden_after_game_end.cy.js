// Ensures pre-game overlay is not shown after a winner is declared

describe('Overlay hidden after game end', () => {
  beforeEach(() => {
    cy.visit('./index.html');
    cy.ensureStorytellerMode();
  });

  it('hides pre-game overlay after declaring winner', () => {
    cy.get('#load-tb').click();
    cy.get('#player-count').clear().type('5');
    cy.get('#reset-grimoire').click();
    // Pre-game overlay should be visible (pre-game state)
    cy.get('body').should('have.class', 'pre-game');
    cy.get('#pre-game-overlay').should('be.visible');
    // Start game
    cy.get('#start-game').click();
    cy.get('#end-game').should('be.visible');
    // Declare winner (open end game modal and pick a side)
    cy.get('#end-game').click();
    cy.get('#good-wins-btn').click();
    // Body should no longer have pre-game class and overlay hidden
    cy.get('body').should('not.have.class', 'pre-game');
    cy.get('#pre-game-overlay').should('not.be.visible');
    // Ensure no 'Game Finished' text is present
    cy.get('#pre-game-overlay .overlay-inner').then($el => {
      const text = $el.text();
      expect(text).not.to.contain('Game Finished');
      expect(text).not.to.contain('Reset the grimoire');
    });
  });
});
