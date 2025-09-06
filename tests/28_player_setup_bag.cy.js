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
    cy.get('#reset-grimoire').click();
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
    // Name click opens the picker
    cy.get('#player-circle li').eq(0).find('.player-name').click();
    cy.get('#number-picker-overlay').should('be.visible');
    // Choose number 1
    cy.get('#number-picker-overlay .number').contains('1').click();
    // Number 1 becomes disabled
    cy.get('#number-picker-overlay .number').contains('1').should('have.class', 'disabled');
    // Overlay closes for next player; Player Setup modal should stay hidden
    cy.get('#number-picker-overlay').should('not.be.visible');
    cy.get('#player-setup-panel').should('not.be.visible');
    // Badge "1" appears on first player's token and cannot re-pick
    cy.get('#player-circle li').eq(0).find('.number-badge').should('contain', '1');

    // Character not revealed on token yet
    cy.get('#player-circle li').eq(0).find('.character-name').should('have.text', '');
  });

  it('reveals all assigned characters when requested', () => {
    // Build and assign two players quickly
    cy.get('#open-player-setup').click();
    cy.get('#bag-random-fill').click();
    cy.get('#player-setup-panel .start-selection').click();
    cy.get('#player-circle li').eq(0).find('.player-name').click();
    cy.get('#number-picker-overlay').should('be.visible');
    cy.get('#number-picker-overlay .number').contains('1').click();
    // Next player opens picker by clicking name
    cy.get('#player-circle li').eq(1).find('.player-name').click();
    cy.get('#number-picker-overlay').should('be.visible');
    cy.get('#number-picker-overlay .number').contains('2').click();
    // Verify badges present
    cy.get('#player-circle li').eq(0).find('.number-badge').should('contain', '1');
    cy.get('#player-circle li').eq(1).find('.number-badge').should('contain', '2');

    // Finalize by starting the game: assigns characters, removes badges, shows grimoire
    cy.get('#reset-grimoire').click();
    // Character names should appear under player tokens and badges removed
    cy.get('#player-circle li').eq(0).find('.character-name').invoke('text').should('not.equal', '');
    cy.get('#player-circle li').eq(1).find('.character-name').invoke('text').should('not.equal', '');
    cy.get('#player-circle li .number-badge').should('have.length', 0);
  });

  it('auto-hides grimoire and updates button label on start selection', () => {
    // Open and random fill the bag
    cy.get('#open-player-setup').click();
    cy.get('#player-setup-panel').should('be.visible');
    cy.get('#bag-random-fill').click();
    cy.get('#bag-count-warning').should('not.be.visible');

    // Start selection should leave grimoire visible and set button to Hide
    cy.get('#player-setup-panel .start-selection').click();
    cy.get('#reveal-assignments').should('contain', 'Hide Grimoire');
    // Number picker should open after choosing a player name
    cy.get('#player-circle li').eq(0).find('.player-name').click();
    cy.get('#number-picker-overlay').should('be.visible');
  });
});


