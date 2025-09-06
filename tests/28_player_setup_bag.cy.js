describe('Player Setup - Bag Flow (Storyteller mode)', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.viewport(1280, 900);
    cy.window().then((win) => { try { win.localStorage.clear(); } catch (_) { } });
    // Ensure storyteller mode
    cy.get('#mode-storyteller').should('exist').and('be.checked');
    // Load a base script
    cy.get('#load-tb').click();
    cy.get('#character-sheet .role').should('have.length.greaterThan', 5);
    // Start with 10 players for stable counts
    cy.get('#player-count').clear().type('10');
    cy.get('#start-game').click();
    cy.get('#player-circle li').should('have.length', 10);
  });

  it('shows bag builder with counts warning and random fill', () => {
    // Open Player Setup panel
    cy.get('#open-player-setup').click();
    cy.get('#player-setup-panel').should('be.visible');

    // Initially, bag is empty and warning shows mismatch
    cy.get('#bag-count-warning').should('be.visible');

    // Click Random Fill and ensure counts match configured setup for 10 players
    cy.get('#bag-random-fill').click();
    cy.get('#bag-count-warning').should('not.be.visible');

    // Toggling a non-matching character should show the warning again
    cy.get('#player-setup-character-list .role').first().click();
    cy.get('#bag-count-warning').should('be.visible');

    // Characters checked in list are considered in the bag
    cy.get('#player-setup-character-list .role input[type="checkbox"]').then($checks => {
      expect($checks.filter(':checked').length).to.be.greaterThan(0);
    });
  });

  it('supports number picking without revealing assignments prematurely', () => {
    // Open and random fill the bag
    cy.get('#open-player-setup').click();
    cy.get('#player-setup-panel').should('be.visible');
    cy.get('#bag-random-fill').click();
    cy.get('#bag-count-warning').should('not.be.visible');

    // Enter selection flow: pick a player, then choose a number
    cy.get('#player-setup-panel .start-selection').click();
    cy.get('#player-circle li').eq(0).click();

    // Fullscreen picker
    cy.get('#number-picker-overlay').should('be.visible');
    // Choose number 1
    cy.get('#number-picker-overlay .number').contains('1').click();
    // Number 1 becomes disabled
    cy.get('#number-picker-overlay .number').contains('1').should('have.class', 'disabled');
    // Overlay closes to prevent peeking
    cy.get('#number-picker-overlay').should('not.be.visible');

    // Character not revealed on token yet
    cy.get('#player-circle li').eq(0).find('.character-name').should('have.text', '');
  });

  it('reveals all assigned characters when requested', () => {
    // Build and assign two players quickly
    cy.get('#open-player-setup').click();
    cy.get('#bag-random-fill').click();
    cy.get('#player-setup-panel .start-selection').click();
    cy.get('#player-circle li').eq(0).click();
    cy.get('#number-picker-overlay .number').contains('1').click();
    cy.get('#player-setup-panel .start-selection').click();
    cy.get('#player-circle li').eq(1).click();
    cy.get('#number-picker-overlay .number').contains('2').click();

    // Close the player setup panel first (button is behind modal)
    cy.get('#close-player-setup').click();
    // Reveal characters (toggle shows Show/Hide; click once to show grimoire)
    cy.get('#reveal-assignments').should('be.visible').and('contain', 'Show').click();
    // Character names should appear under player tokens
    cy.get('#player-circle li').eq(0).find('.character-name').invoke('text').should('not.equal', '');
    cy.get('#player-circle li').eq(1).find('.character-name').invoke('text').should('not.equal', '');
  });

  it('auto-hides grimoire and updates button label on start selection', () => {
    // Open and random fill the bag
    cy.get('#open-player-setup').click();
    cy.get('#player-setup-panel').should('be.visible');
    cy.get('#bag-random-fill').click();
    cy.get('#bag-count-warning').should('not.be.visible');

    // Start selection should auto-hide and update button label
    cy.get('#player-setup-panel .start-selection').click();
    cy.get('#reveal-assignments').should('contain', 'Show Grimoire');
    // Number picker should open after choosing a player
    cy.get('#player-circle li').eq(0).click();
    cy.get('#number-picker-overlay').should('be.visible');
  });
});


