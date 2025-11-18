describe('Reset Grimoire meta state', () => {
  it('clears winner, unlocks grimoire, and empties player setup bag', () => {
    cy.visit('/');
    cy.ensureStorytellerMode();

    // Prepare players
    cy.get('#player-count').clear().type('5');
    cy.get('#reset-grimoire').click();

    // Load a script so roles populate
    cy.get('#load-tb').click();
    cy.get('#character-sheet .role').should('have.length.greaterThan', 5);

    // Lock the grimoire to ensure reset clears the state
    cy.get('#grimoire-lock-toggle').should('contain', 'Lock Grimoire').click();
    cy.get('#grimoire-lock-toggle').should('contain', 'Unlock Grimoire');
    cy.get('body').should('have.class', 'grimoire-locked');

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

    // Grimoire unlocked
    cy.get('body').should('not.have.class', 'grimoire-locked');
    cy.get('#grimoire-lock-toggle').should('contain', 'Lock Grimoire');

    // Player setup bag emptied: open panel and expect zero checked checkboxes
    cy.get('#open-player-setup').click();
    cy.get('#player-setup-panel').should('be.visible');
    cy.get('#player-setup-character-list input[type="checkbox"]').then(($checksAfter) => {
      const checkedAfter = $checksAfter.filter(':checked');
      expect(checkedAfter.length).to.eq(0);
    });
  });
});
