describe('Bluff Token Player Interaction Bug', () => {
  beforeEach(() => {
    cy.visit('/');
    // Load Trouble Brewing script first (mirrors bluff tokens spec pattern)
    cy.get('#load-tb').click({ force: true });
    cy.get('#load-status', { timeout: 10000 }).should('contain', 'successfully');
    // Use unified helper to start game with 10 players (handles pre-game gating)
    cy.setupGame({ players: 10, loadScript: false });
  });

  it('should allow player token clicks after assigning a bluff token', () => {
    // First verify player tokens work before bluff assignment
    cy.get('#player-circle li').first().find('.player-token').click({ force: true });
    cy.get('#character-modal').should('be.visible');
    cy.get('#character-search').should('be.visible').type('washerwoman', { force: true });
    cy.get('#character-grid .token').first().click();

    // Verify character was assigned
    cy.get('#player-circle li').first().find('.player-token')
      .should('have.css', 'background-image')
      .and('include', 'washerwoman');

    // Now assign a bluff token (must use townsfolk/outsider)
    cy.get('#bluff-tokens-container .bluff-token').first().click({ force: true });
    cy.get('#character-modal').should('be.visible');
    cy.get('#character-search').should('be.visible').clear().type('butler', { force: true });
    cy.get('#character-grid .token').first().click();

    // Verify bluff was assigned
    cy.get('#bluff-tokens-container .bluff-token').first()
      .should('have.attr', 'data-character', 'butler');

    // Now try to click on another player token - this should work
    cy.get('#player-circle li').eq(1).find('.player-token').click({ force: true });
    cy.get('#character-modal').should('be.visible');
    cy.get('#character-search').should('be.visible').clear().type('virgin', { force: true });
    cy.get('#character-grid .token').first().click();

    // Verify second player character was assigned
    cy.get('#player-circle li').eq(1).find('.player-token')
      .should('have.css', 'background-image')
      .and('include', 'virgin');
  });

  it('should allow player token clicks after canceling bluff selection via close button', () => {
    // Open bluff modal and then close it
    cy.get('#bluff-tokens-container .bluff-token').first().click({ force: true });
    cy.get('#character-modal').should('be.visible');
    cy.get('#character-modal').click('topLeft', { force: true });
    cy.get('#character-modal').should('not.be.visible');

    // Now player tokens should still work
    cy.get('#player-circle li').first().find('.player-token').click({ force: true });
    cy.get('#character-modal').should('be.visible');
    cy.get('#character-search').should('be.visible').type('washerwoman', { force: true });
    cy.get('#character-grid .token').first().click();

    // Verify character was assigned
    cy.get('#player-circle li').first().find('.player-token')
      .should('have.css', 'background-image')
      .and('include', 'washerwoman');
  });

  it('should allow player token clicks after canceling bluff selection by clicking outside modal', () => {
    // Open bluff modal and then close it by clicking outside
    cy.get('#bluff-tokens-container .bluff-token').first().click({ force: true });
    cy.get('#character-modal').should('be.visible');

    // Click outside the modal (on the backdrop)
    cy.get('#character-modal').click('topLeft');
    cy.get('#character-modal').should('not.be.visible');

    // Now player tokens should still work
    cy.get('#player-circle li').first().find('.player-token').click({ force: true });
    cy.get('#character-modal').should('be.visible');
    cy.get('#character-search').should('be.visible').type('washerwoman', { force: true });
    cy.get('#character-grid .token').first().click();

    // Verify character was assigned
    cy.get('#player-circle li').first().find('.player-token')
      .should('have.css', 'background-image')
      .and('include', 'washerwoman');
  });
});
