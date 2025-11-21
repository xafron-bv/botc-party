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
    // End Game should always be available
    cy.get('#sidebar').scrollTo('top', { ensureScrollable: false });
    cy.get('#end-game').should('be.visible');

    // Reload page
    cy.reload();

    // Validate End Game still visible after reload (active game persisted)
    cy.get('#end-game').should('be.visible');
    // Pre-game class should be absent
    cy.get('body').should('not.have.class', 'pre-game');
  });
});
