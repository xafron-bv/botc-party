// Verifies that setup state persists across reload without a start gate
// and that End Game remains available.

describe('Pre-game state persistence', () => {
  beforeEach(() => {
    cy.visit('./index.html');
    cy.ensureStorytellerMode();
  });

  it('persists players and pre-game gating across reload', () => {
    // Add players (default count already present after picking a script and adding players)
    // Load a script first so players can be meaningfully set up
    cy.get('#load-tb').click();
    // Ensure player list is refreshed to known length
    cy.get('#player-count').clear().type('5');
    cy.get('#reset-grimoire').click();

    // Ensure players rendered
    cy.get('#player-circle li').should('have.length', 5);

    // Ensure interactions are available without gating
    cy.get('body').should('not.have.class', 'pre-game');
    cy.get('#sidebar').scrollTo('top', { ensureScrollable: false });
    cy.get('#end-game').should('be.visible');

    // Reload page
    cy.reload();

    // After reload, verify players and pre-game state restored
    cy.get('#player-circle li').should('have.length', 5);
    cy.get('body').should('not.have.class', 'pre-game');
    cy.get('#sidebar').scrollTo('top', { ensureScrollable: false });
    cy.get('#end-game').should('be.visible');
  });
});
