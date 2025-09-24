// Ensures number selection session (selectionActive) persists across page reload

describe('Selection session persistence', () => {
  beforeEach(() => {
    // Ensure deterministic state (no previously persisted session)
    cy.visit('./index.html');
    cy.clearLocalStorage();
    // Reload once more after clearing to start from a blank slate
    cy.reload();
  });

  it('restores selectionActive overlays and hidden grimoire after reload', () => {
    cy.get('#load-tb').click();
    cy.get('#player-count').clear().type('5');
    cy.get('#add-players').should('be.visible').click();
    cy.get('#player-circle li', { timeout: 8000 }).should('have.length', 5);
    cy.get('#open-player-setup').click();
    // Random fill bag to satisfy bag count requirement
    cy.get('#bag-random-fill').click();
    // Start number selection
    cy.get('#player-setup-panel .start-selection').click();
    // Expect body state and hidden grimoire (grimoireHidden toggles token visibility; we assert body class and overlays)
    cy.get('body').should('have.class', 'selection-active');
    cy.get('#player-circle li .number-overlay', { timeout: 8000 }).should('have.length', 5);
    // Reload
    cy.reload();
    // After reload restore selection-active UI
    cy.get('body').should('have.class', 'selection-active');
    // Wait for player circle to be rebuilt and overlays re-applied (restoreSelectionSession may retry)
    cy.get('#player-circle li', { timeout: 8000 }).should('have.length', 5);
    cy.get('#player-circle li .number-overlay', { timeout: 8000 }).should('have.length', 5);
  });
});
