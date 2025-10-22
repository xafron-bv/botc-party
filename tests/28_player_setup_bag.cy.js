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
    // Click the checkbox directly to uncheck it
    cy.get('#player-setup-character-list .role input[type="checkbox"]:checked')
      .first()
      .uncheck({ force: true });

    // Wait a bit for state to update
    cy.wait(100);

    // Verify bag now has 9 items (one less)
    cy.window().then((win) => {
      const bag = (win.grimoireState && win.grimoireState.playerSetup && win.grimoireState.playerSetup.bag) || [];
      expect(bag.length).to.equal(9);
    });

    cy.get('#bag-count-warning').should('be.visible');

    // Characters checked in list are considered in the bag
    cy.get('#player-setup-character-list .role input[type="checkbox"]').then($checks => {
      expect($checks.filter(':checked').length).to.be.greaterThan(0);
    });
  });

  it('displays live setup counts for each team', () => {
    // Reconfigure to 7 players to take advantage of a 5 townsfolk requirement
    cy.get('#player-count').clear().type('7');
    cy.get('#reset-grimoire').click();
    cy.get('#player-circle li').should('have.length', 7);

    cy.get('#open-player-setup').click();
    cy.get('#player-setup-panel').should('be.visible');

    // When bag is empty, counts should reflect 0 selected out of the required totals
    cy.get('#player-setup-counts [data-team="townsfolk"] .team-count-value').should('contain', '0/5');
    cy.get('#player-setup-counts [data-team="outsiders"] .team-count-value').should('contain', '0/0');
    cy.get('#player-setup-counts [data-team="minions"] .team-count-value').should('contain', '0/1');
    cy.get('#player-setup-counts [data-team="demons"] .team-count-value').should('contain', '0/1');

    // After random fill the counts should match the required distribution
    cy.get('#bag-random-fill').click();
    cy.get('#player-setup-counts [data-team="townsfolk"] .team-count-value').should('contain', '5/5');
    cy.get('#player-setup-counts [data-team="outsiders"] .team-count-value').should('contain', '0/0');
    cy.get('#player-setup-counts [data-team="minions"] .team-count-value').should('contain', '1/1');
    cy.get('#player-setup-counts [data-team="demons"] .team-count-value').should('contain', '1/1');

    // Uncheck one townsfolk to verify the live count updates
    cy.contains('#player-setup-character-list .team-header', 'Townsfolk')
      .next('.team-grid')
      .find('input[type="checkbox"]:checked')
      .first()
      .uncheck({ force: true });

    cy.wait(50);

    cy.get('#player-setup-counts [data-team="townsfolk"] .team-count-value').should('contain', '4/5');
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
    // Choose number 1 -> reveal modal may appear (optional UI); if present, confirm it
    cy.get('#number-picker-overlay .number').contains('1').click();
    cy.get('body').then($body => {
      const modal = $body.find('#player-reveal-modal');
      if (modal.length && modal.is(':visible')) {
        // Optional reveal modal path
        const nameInput = modal.find('#reveal-name-input');
        if (nameInput.length) {
          cy.wrap(nameInput).clear().type('Alice');
        }
        const confirmBtn = modal.find('#reveal-confirm-btn');
        if (confirmBtn.length) {
          cy.wrap(confirmBtn).click();
        }
      } else {
        // If no modal, still set a name directly on player token for parity
        cy.get('#player-circle li').eq(0).find('.player-name').invoke('text').then(t => {
          if (!/Alice/.test(t)) {
            // rename via prompt simulation not available; skip
          }
        });
      }
    });
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
        cy.get('body').then($body => {
          const modal = $body.find('#player-reveal-modal');
          if (modal.length && modal.is(':visible')) {
            const confirmBtn = modal.find('#reveal-confirm-btn');
            if (confirmBtn.length) {
              cy.wrap(confirmBtn).click();
            }
          }
        });
      }
    });

    // Finalize by starting the game: assigns characters, removes overlays, shows grimoire
    cy.get('#sidebar-toggle').should('be.visible').click();
    cy.get('#start-game').click();
    // Character names should appear under player tokens and overlays removed
    cy.get('#player-circle li').eq(0).find('.character-name').invoke('text').should('not.equal', '');
    cy.get('#player-circle li').eq(1).find('.character-name').invoke('text').should('not.equal', '');
    cy.get('#player-circle li .number-overlay').should('have.length', 0);
  });

  it('does not auto-hide grimoire on start selection (button controls it)', () => {
    // Open and random fill the bag
    cy.get('#open-player-setup').click();
    cy.get('#player-setup-panel').should('be.visible');
    cy.get('#bag-random-fill').click();
    cy.get('#bag-count-warning').should('not.be.visible');

    // Start selection should NOT hide grimoire; button remains "Hide Grimoire"
    cy.get('#player-setup-panel .start-selection').click();
    cy.get('body').should('not.have.class', 'grimoire-hidden');
    cy.get('#reveal-assignments').should('contain', 'Hide Grimoire');
    // Number picker should open after clicking the overlay on a player
    cy.get('#player-circle li').eq(0).find('.number-overlay').click();
    cy.get('#number-picker-overlay').should('be.visible');
  });
});


