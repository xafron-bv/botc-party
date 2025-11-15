// Verifies that after starting a game, reloading preserves active game state UI (End Game visible)

describe('Active game persistence', () => {
  beforeEach(() => {
    cy.visit('./index.html');
  });

  it('restores active game UI after reload', () => {
    cy.get('#load-tb').click();
    // Configure player count explicitly
    cy.get('#player-count').clear().type('5');
    cy.get('#reset-grimoire').click();
    cy.get('#player-circle li').should('have.length', 5);
    // Start game directly (allowed whenever players exist per new rules)
    cy.get('#start-game').should('be.visible').click();
    cy.get('#end-game').should('be.visible');
    cy.get('#start-game').should('not.be.visible');

    // Reload page
    cy.reload();

    // Validate End Game still visible and Start hidden after reload (active game persisted)
    cy.get('#end-game').should('be.visible');
    cy.get('#start-game').should('not.be.visible');
    // Pre-game class should be absent
    cy.get('body').should('not.have.class', 'pre-game');
  });
});
