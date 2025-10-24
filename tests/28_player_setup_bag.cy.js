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

  it('shows traveller count in setup info during selection', () => {
    // Switch to 7 players for a smaller setup table row
    cy.get('#player-count').clear().type('7');
    cy.get('#reset-grimoire').click();
    cy.get('#player-circle li').should('have.length', 7);

    // Open Player Setup and include travellers
    cy.get('#open-player-setup').click();
    cy.get('#player-setup-panel').should('be.visible');
    cy.get('#include-travellers-in-bag').check({ force: true }).should('be.checked');

    // Auto-fill base setup for 7 players then add a traveller to the bag
    cy.get('#bag-random-fill').click();
    cy.contains('#player-setup-character-list .team-header', 'Travellers')
      .next('.team-grid')
      .find('input[type="checkbox"]')
      .first()
      .check({ force: true });

    // Adjust the non-traveller bag to match the 6-player distribution (3/1/1/1)
    cy.contains('#player-setup-character-list .team-header', 'Townsfolk')
      .next('.team-grid')
      .find('input[type="checkbox"]:checked')
      .eq(0)
      .uncheck({ force: true });
    cy.contains('#player-setup-character-list .team-header', 'Townsfolk')
      .next('.team-grid')
      .find('input[type="checkbox"]:checked')
      .eq(0)
      .uncheck({ force: true });

    cy.contains('#player-setup-character-list .team-header', 'Outsiders')
      .next('.team-grid')
      .find('input[type="checkbox"]')
      .first()
      .check({ force: true });

    cy.get('#bag-count-warning').should('not.be.visible');

    // Start number selection
    cy.get('#player-setup-panel .start-selection').click();
    cy.get('#player-setup-panel').should('not.be.visible');

    // Center setup info should now include the traveller count suffix
    cy.get('#setup-info').should('contain', '3/1/1/1/1');
  });

  it('hides death ribbon and death vote indicator during number selection', () => {
    // First, start the game and mark a player as dead to ensure death ribbon exists
    cy.get('#start-game').click();
    cy.get('#player-circle li .player-token .death-ribbon').first().should('be.visible');

    // Mark first player as dead
    cy.get('#player-circle li .player-token .death-ribbon').first().within(() => {
      cy.get('rect, path').first().click({ force: true });
    });
    cy.get('#player-circle li .player-token').first().should('have.class', 'is-dead');

    // Death vote indicator should be visible
    cy.get('#player-circle li .player-token').first().find('.death-vote-indicator').should('be.visible');

    // Reset and start number selection
    cy.get('#reset-grimoire').click();
    cy.get('#player-circle li').should('have.length', 10);

    // Open Player Setup panel and configure bag
    cy.get('#open-player-setup').click();
    cy.get('#player-setup-panel').should('be.visible');
    cy.get('#bag-random-fill').click();
    cy.get('#bag-count-warning').should('not.be.visible');

    // Start number selection
    cy.get('#player-setup-panel .start-selection').click();

    // Body should have selection-active class
    cy.get('body').should('have.class', 'selection-active');

    // Death ribbon should NOT be visible during selection
    cy.get('#player-circle li .player-token .death-ribbon').first().should('not.be.visible');

    // Assign a number to first player
    cy.get('#player-circle li').eq(0).find('.number-overlay').should('be.visible').and('contain', '?').click();
    cy.get('#number-picker-overlay').should('be.visible');
    cy.get('#number-picker-overlay .number').contains('1').click();

    // Close reveal modal if it appears
    cy.get('body').then($body => {
      const modal = $body.find('#player-reveal-modal');
      if (modal.length && modal.is(':visible')) {
        const confirmBtn = modal.find('#reveal-confirm-btn');
        if (confirmBtn.length) {
          cy.wrap(confirmBtn).click();
        }
      }
    });

    // Number overlay should now show "1"
    cy.get('#player-circle li').eq(0).find('.number-overlay').should('contain', '1').and('have.class', 'disabled');

    // Death ribbon should STILL not be visible during selection (even with number assigned)
    cy.get('#player-circle li .player-token .death-ribbon').first().should('not.be.visible');

    // Try to click the death ribbon (force: true to bypass visibility) - should not mark as dead
    cy.get('#player-circle li .player-token .death-ribbon').first().within(() => {
      cy.get('rect, path').first().click({ force: true });
    });
    cy.get('#player-circle li .player-token').first().should('not.have.class', 'is-dead');
  });

  it('allows reassigning traveller to number and vice versa during number selection', () => {
    // Use existing 10 player setup
    cy.get('#open-player-setup').click();
    cy.get('#player-setup-panel').should('be.visible');

    // Enable travellers and fill bag
    cy.get('#include-travellers-in-bag').check({ force: true });
    cy.get('#bag-random-fill').click();

    // Add one traveller, remove one townsfolk to keep total at 10
    cy.contains('#player-setup-character-list .team-header', 'Travellers')
      .next('.team-grid')
      .find('input[type="checkbox"]')
      .first()
      .check({ force: true });

    cy.contains('#player-setup-character-list .team-header', 'Townsfolk')
      .next('.team-grid')
      .find('input[type="checkbox"]:checked')
      .first()
      .uncheck({ force: true });

    // Start selection
    cy.get('#player-setup-panel .start-selection').click();

    // Assign traveller to first player
    cy.get('#player-circle li').eq(0).click();
    cy.get('#number-picker-overlay').should('be.visible');
    cy.get('#number-picker-overlay .traveller-token').first().click();
    cy.get('body').then($body => {
      if ($body.find('#player-reveal-modal:visible').length) {
        cy.get('#reveal-confirm-btn').click();
      }
    });
    cy.get('#player-circle li').eq(0).find('.number-overlay').should('contain', 'T');

    // Reassign that player to a number - click directly on the overlay with force
    cy.get('#player-circle li').eq(0).find('.number-overlay').click({ force: true });
    cy.get('#number-picker-overlay').should('be.visible');
    // Traveller should be back in the list
    cy.get('#number-picker-overlay .traveller-token').should('have.length', 1);
    cy.get('#number-picker-overlay .number').contains('1').click();
    cy.get('body').then($body => {
      if ($body.find('#player-reveal-modal:visible').length) {
        cy.get('#reveal-confirm-btn').click();
      }
    });
    cy.get('#player-circle li').eq(0).find('.number-overlay').should('contain', '1');

    // Assign the traveller to another player to verify it's available
    cy.get('#player-circle li').eq(1).click();
    cy.get('#number-picker-overlay').should('be.visible');
    cy.get('#number-picker-overlay .traveller-token').should('have.length', 1);
    cy.get('#number-picker-overlay .traveller-token').first().click();
    cy.get('body').then($body => {
      if ($body.find('#player-reveal-modal:visible').length) {
        cy.get('#reveal-confirm-btn').click();
      }
    });
    cy.get('#player-circle li').eq(1).find('.number-overlay').should('contain', 'T');
  });


});


