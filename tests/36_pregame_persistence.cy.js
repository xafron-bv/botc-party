// Verifies that pre-game state (players added but game not started) persists across reload
// and that Start Game button remains visible/enabled while End Game hidden after refresh.

describe('Pre-game state persistence', () => {
  beforeEach(() => {
    cy.visit('./index.html');
  });

  it('persists players and pre-game gating across reload', () => {
    // Add players (default count already present after picking a script and adding players)
    // Load a script first so players can be meaningfully set up
    cy.get('#load-tb').click();
    // Add players (uses current player count input value)
    cy.get('#player-count').clear().type('5');
    cy.get('#add-players').click();

    // Ensure players rendered
    cy.get('#player-circle li').should('have.length', 5);

    // Ensure game has NOT started yet
    cy.get('body').should('have.class', 'pre-game');
    cy.get('#start-game').should('be.visible').and('not.be.disabled');
    cy.get('#end-game').should('not.be.visible');

    // Reload page
    cy.reload();

    // After reload, verify players and pre-game state restored
    cy.get('#player-circle li').should('have.length', 5);
    cy.get('body').should('have.class', 'pre-game');
    cy.get('#start-game').should('be.visible').and('not.be.disabled');
    cy.get('#end-game').should('not.be.visible');
  });
});
