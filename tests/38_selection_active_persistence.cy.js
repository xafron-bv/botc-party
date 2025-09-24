// Ensures number selection session (selectionActive) persists across page reload

describe('Selection session persistence', () => {
  beforeEach(() => {
    cy.visit('./index.html');
  });

  it('restores selectionActive overlays and hidden grimoire after reload', () => {
    cy.get('#load-tb').click();
    cy.get('#player-count').clear().type('4');
    cy.get('#add-players').click();
    cy.get('#player-circle li').should('have.length', 4);
    cy.get('#open-player-setup').click();
    // Random fill bag to satisfy bag count requirement
    cy.get('#bag-random-fill').click();
    // Start number selection
    cy.get('#player-setup-panel .start-selection').click();
    // Expect body state and hidden grimoire (grimoireHidden toggles token visibility; we assert body class and overlays)
    cy.get('body').should('have.class', 'selection-active');
    cy.get('#player-circle li .number-overlay').should('have.length', 4);
    // Reload
    cy.reload();
    // After reload restore selection-active UI
    cy.get('body').should('have.class', 'selection-active');
    cy.get('#player-circle li .number-overlay').should('have.length', 4);
  });
});
