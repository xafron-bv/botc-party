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

    // Enter selection flow and click overlay to open number picker
    cy.get('#player-setup-panel .start-selection').click();
    // Overlay should show a '?' before selection and be clickable
    cy.get('#player-circle li').eq(0).find('.number-overlay').should('be.visible').and('contain', '?').click();
    cy.get('#number-picker-overlay').should('be.visible');
    // Choose number 1 -> reveal modal should appear
    cy.get('#number-picker-overlay .number').contains('1').click();
    cy.get('#player-reveal-modal').should('be.visible');
    // Modal shows character token and ability, plus name input
    cy.get('#reveal-character-token .token').should('exist');
    cy.get('#reveal-ability').invoke('text').should('not.equal', '');
    cy.get('#reveal-name-input').clear().type('Alice');
    cy.get('#reveal-confirm-btn').click();
    // Modal closes; Player Setup modal stays hidden
    cy.get('#player-reveal-modal').should('not.be.visible');
    cy.get('#player-setup-panel').should('not.be.visible');
    // Overlay shows "1" on first player's token and is disabled, name updated
    cy.get('#player-circle li').eq(0).find('.number-overlay').should('contain', '1').and('have.class', 'disabled');
    cy.get('#player-circle li').eq(0).find('.player-name').should('contain', 'Alice');
    // Reset grimoire during selection should cancel and remove overlays
    cy.get('#sidebar-toggle').should('be.visible').click();
    cy.get('#reset-grimoire').click();
    cy.get('#player-circle li .number-overlay').should('have.length', 0);

    // Character not revealed on token yet
    cy.get('#player-circle li').eq(0).find('.character-name').should('have.text', '');
  });

  it('reveals all assigned characters when requested', () => {
    // Build and assign two players quickly
    cy.get('#open-player-setup').click();
    cy.get('#bag-random-fill').click();
    cy.get('#player-setup-panel .start-selection').click();
    // Assign all players sequentially by clicking overlays and choosing numbers 1..N
    cy.get('#player-circle li').should('have.length', 10).then(() => {
      for (let i = 0; i < 10; i++) {
        cy.get('#player-circle li').eq(i).find('.number-overlay').should('contain', '?').click();
        cy.get('#number-picker-overlay').should('be.visible');
        cy.get('#number-picker-overlay .number').contains(String(i + 1)).click();
        // Confirm the reveal modal for each player
        cy.get('#player-reveal-modal').should('be.visible');
        cy.get('#reveal-confirm-btn').click();
        cy.get('#player-reveal-modal').should('not.be.visible');
      }
    });

    // Finalize by starting the game: assigns characters, removes overlays, shows grimoire
    cy.get('#sidebar-toggle').should('be.visible').click();
    cy.get('#assign-and-start').click();
    // Character names should appear under player tokens and overlays removed
    cy.get('#player-circle li').eq(0).find('.character-name').invoke('text').should('not.equal', '');
    cy.get('#player-circle li').eq(1).find('.character-name').invoke('text').should('not.equal', '');
    cy.get('#player-circle li .number-overlay').should('have.length', 0);
  });

  it('auto-hides grimoire and updates button label on start selection', () => {
    // Open and random fill the bag
    cy.get('#open-player-setup').click();
    cy.get('#player-setup-panel').should('be.visible');
    cy.get('#bag-random-fill').click();
    cy.get('#bag-count-warning').should('not.be.visible');

    // Start selection should hide grimoire and set button to Show
    cy.get('#player-setup-panel .start-selection').click();
    cy.get('body').should('have.class', 'grimoire-hidden');
    cy.get('#reveal-assignments').should('contain', 'Show Grimoire');
    // Number picker should open after clicking the overlay on a player
    cy.get('#player-circle li').eq(0).find('.number-overlay').click();
    cy.get('#number-picker-overlay').should('be.visible');
  });
});


