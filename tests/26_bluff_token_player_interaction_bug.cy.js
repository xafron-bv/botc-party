describe('Bluff Token Player Interaction Bug', () => {
  beforeEach(() => {
    cy.visit('/');
    // Start a game with 10 players
    cy.get('#player-count').clear().type('10');
    cy.get('#start-game').click();
    // Load Trouble Brewing script
    cy.get('#load-tb').click();
    cy.get('#load-status', { timeout: 10000 }).should('contain', 'successfully');
  });

  it('should allow player token clicks after assigning a bluff token', () => {
    // First verify player tokens work before bluff assignment
    cy.get('#player-circle li').first().find('.player-token').click();
    cy.get('#character-modal').should('be.visible');
    cy.get('#character-search').type('washerwoman');
    cy.get('#character-grid .token').first().click();

    // Verify character was assigned
    cy.get('#player-circle li').first().find('.player-token')
      .should('have.css', 'background-image')
      .and('include', 'washerwoman');

    // Now assign a bluff token
    cy.get('#bluff-tokens-container .bluff-token').first().click();
    cy.get('#character-modal').should('be.visible');
    cy.get('#character-search').type('baron');
    cy.get('#character-grid .token').first().click();

    // Verify bluff was assigned
    cy.get('#bluff-tokens-container .bluff-token').first()
      .should('have.attr', 'data-character', 'baron');

    // Now try to click on another player token - this should work
    cy.get('#player-circle li').eq(1).find('.player-token').click();
    cy.get('#character-modal').should('be.visible');
    cy.get('#character-search').type('virgin');
    cy.get('#character-grid .token').first().click();

    // Verify second player character was assigned
    cy.get('#player-circle li').eq(1).find('.player-token')
      .should('have.css', 'background-image')
      .and('include', 'virgin');
  });

  it('should allow player token clicks after canceling bluff selection via close button', () => {
    // Open bluff modal and then close it
    cy.get('#bluff-tokens-container .bluff-token').first().click();
    cy.get('#character-modal').should('be.visible');
    cy.get('#close-character-modal').click();
    cy.get('#character-modal').should('not.be.visible');

    // Now player tokens should still work
    cy.get('#player-circle li').first().find('.player-token').click();
    cy.get('#character-modal').should('be.visible');
    cy.get('#character-search').type('washerwoman');
    cy.get('#character-grid .token').first().click();

    // Verify character was assigned
    cy.get('#player-circle li').first().find('.player-token')
      .should('have.css', 'background-image')
      .and('include', 'washerwoman');
  });

  it('should allow player token clicks after canceling bluff selection by clicking outside modal', () => {
    // Open bluff modal and then close it by clicking outside
    cy.get('#bluff-tokens-container .bluff-token').first().click();
    cy.get('#character-modal').should('be.visible');

    // Click outside the modal (on the backdrop)
    cy.get('#character-modal').click('topLeft');
    cy.get('#character-modal').should('not.be.visible');

    // Now player tokens should still work
    cy.get('#player-circle li').first().find('.player-token').click();
    cy.get('#character-modal').should('be.visible');
    cy.get('#character-search').type('washerwoman');
    cy.get('#character-grid .token').first().click();

    // Verify character was assigned
    cy.get('#player-circle li').first().find('.player-token')
      .should('have.css', 'background-image')
      .and('include', 'washerwoman');
  });
});
