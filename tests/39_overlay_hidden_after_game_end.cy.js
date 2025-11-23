// Ensures pre-game overlay is not shown after a winner is declared

describe('Overlay hidden after game end', () => {
  beforeEach(() => {
    cy.visit('./index.html');
    cy.ensureStorytellerMode();
  });

  it('hides pre-game overlay after declaring winner', () => {
    cy.resetApp({ mode: 'storyteller', loadScript: true });
    cy.get('#player-count').clear().type('5');
    cy.get('#reset-grimoire').click();
    cy.ensureSidebarOpen();
    cy.get('#pre-game-overlay').should('not.exist');
    cy.get('#end-game').should('be.visible');
    // Declare winner (open end game modal and pick a side)
    cy.get('#end-game').click();
    cy.get('#good-wins-btn').click();
    // Body should remain overlay-free
    cy.get('body').should('not.have.class', 'pre-game');
    cy.get('#pre-game-overlay').should('not.exist');
  });
});
