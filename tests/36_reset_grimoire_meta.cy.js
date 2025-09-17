describe('Reset Grimoire meta state', () => {
  it('clears winner, unhides grimoire, and empties player setup bag', () => {
    cy.visit('/');

    // Prepare players
    cy.get('#player-count').clear().type('5');
    cy.get('#reset-grimoire').click();

  // Load a script so roles populate
  cy.get('#load-tb').click();
  cy.get('#character-sheet .role').should('have.length.greaterThan', 5);

    // Hide grimoire (sets grimoireHidden)
    cy.get('#reveal-assignments').click();
    cy.get('body').should('have.class', 'grimoire-hidden');

    // Open player setup and random fill bag to ensure >0 entries
    cy.get('#open-player-setup').click();
    cy.get('#player-setup-panel').should('be.visible');
    cy.get('#bag-random-fill').click();
    // Ensure at least one role checkbox is checked (bag populated)
    cy.get('#player-setup-character-list input[type="checkbox"]').then(($checks) => {
      const checked = $checks.filter(':checked');
      expect(checked.length).to.be.greaterThan(0);
    });
    cy.get('#player-setup-panel .close-button, #close-player-setup').click({ multiple: true, force: true });

    // Declare winner via button
  cy.get('#good-wins-btn').click({ force: true });
    cy.get('#winner-message').should('contain.text', 'Good has won');

    // Perform Reset Grimoire
    cy.get('#reset-grimoire').click();

    // Winner cleared
    cy.get('#winner-message').should('not.exist');

    // Grimoire unhidden
    cy.get('body').should('not.have.class', 'grimoire-hidden');

    // Player setup bag emptied: open panel and expect zero checked checkboxes
    cy.get('#open-player-setup').click();
    cy.get('#player-setup-panel').should('be.visible');
    cy.get('#player-setup-character-list input[type="checkbox"]').then(($checksAfter) => {
      const checkedAfter = $checksAfter.filter(':checked');
      expect(checkedAfter.length).to.eq(0);
    });
  });
});
