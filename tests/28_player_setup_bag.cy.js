describe('Player Setup - Bag Flow (Storyteller mode)', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.viewport(1280, 900);
    cy.window().then((win) => { try { win.localStorage.clear(); } catch (_) { } });
    cy.ensureStorytellerMode();
    // Load a base script
    cy.get('#load-tb').click();
    cy.get('#character-sheet .role').should('have.length.greaterThan', 5);
    // Start with 10 players for stable counts
    cy.get('#player-count').clear().type('10');
    cy.get('#reset-grimoire').click();
    cy.get('#player-circle li').should('have.length', 10);
  });

  it('shows bag builder with counts warning that clears when bag is filled', () => {
    // Open Player Setup panel
    cy.get('#open-player-setup').click();
    cy.get('#player-setup-panel').should('be.visible');

    // Initially, bag is empty and warning shows mismatch
    cy.get('#bag-count-warning').should('be.visible');

    // Use helper to fill and ensure counts match configured setup for 10 players
    cy.fillBag();
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

  it('shuffles character order within teams without altering selections', () => {
    cy.get('#open-player-setup').click();
    cy.get('#player-setup-panel').should('be.visible');
    cy.fillBag();
    cy.get('#bag-count-warning').should('not.be.visible');

    const getTownsfolkOrder = () => cy.contains('#player-setup-character-list .team-header', 'Townsfolk')
      .next('.team-grid')
      .find('.token.role')
      .then($tokens => Array.from($tokens, el => el.dataset.roleId));

    getTownsfolkOrder().as('initialTownsfolkOrder');

    cy.get('#bag-shuffle').click();

    cy.get('@initialTownsfolkOrder').then((initialOrder) => {
      getTownsfolkOrder().should((shuffledOrder) => {
        expect(shuffledOrder).to.not.deep.equal(initialOrder);
      });
    });

    cy.get('#player-setup-character-list .role input[type="checkbox"]:checked')
      .should('have.length', 10);
    cy.get('#bag-count-warning').should('not.be.visible');
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

    // After filling via helper the counts should match the required distribution
    cy.fillBag();
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
    // Open and fill the bag via helper
    cy.get('#open-player-setup').click();
    cy.get('#player-setup-panel').should('be.visible');
    cy.fillBag();
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
        const confirmBtn = modal.find('#close-player-reveal-modal');
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
    cy.fillBag();
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
            const confirmBtn = modal.find('#close-player-reveal-modal');
            if (confirmBtn.length) {
              cy.wrap(confirmBtn).click();
            }
          }
        });
      }
    });

    // Sidebar is collapsed after selection; reopen it to access the reveal button
    cy.get('#sidebar-toggle').click({ force: true });
    cy.get('#reveal-selected-characters').should('be.visible').and('not.be.disabled').click();

    // Character names should appear under player tokens and overlays removed
    cy.get('#player-circle li').eq(0).find('.character-name').invoke('text').should('not.equal', '');
    cy.get('#player-circle li').eq(1).find('.character-name').invoke('text').should('not.equal', '');
    cy.get('#player-circle li .number-overlay').should('have.length', 0);
  });

  it('does not auto-hide grimoire on start selection (button controls it)', () => {
    // Open and fill the bag via helper
    cy.get('#open-player-setup').click();
    cy.get('#player-setup-panel').should('be.visible');
    cy.fillBag();
    cy.get('#bag-count-warning').should('not.be.visible');

    // Start selection should NOT lock or hide grimoire; button remains "Lock Grimoire"
    cy.get('#player-setup-panel .start-selection').click();
    cy.get('body').should('not.have.class', 'grimoire-hidden');
    cy.get('#grimoire-lock-toggle').should('contain', 'Lock Grimoire');
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
    cy.fillBag();
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
    // Mark a player as dead to ensure death ribbon exists
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
    cy.fillBag();
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
        const confirmBtn = modal.find('#close-player-reveal-modal');
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

  it('locks a number assignment for a player once selected', () => {
    cy.get('#open-player-setup').click();
    cy.get('#player-setup-panel').should('be.visible');
    cy.fillBag();
    cy.get('#bag-count-warning').should('not.be.visible');

    cy.get('#player-setup-panel .start-selection').click();

    cy.get('#player-circle li').eq(0).find('.number-overlay').should('contain', '?').click();
    cy.get('#number-picker-overlay').should('be.visible');
    cy.get('#number-picker-overlay .number').contains('1').click();
    cy.get('body').then($body => {
      if ($body.find('#player-reveal-modal:visible').length) {
        cy.get('#close-player-reveal-modal').click();
      }
    });

    cy.get('#player-circle li').eq(0).find('.number-overlay').should('contain', '1');
    cy.get('#number-picker-overlay').should('not.be.visible');

    cy.get('#player-circle li').eq(0).find('.number-overlay').click({ force: true });
    cy.get('#number-picker-overlay').should('not.be.visible');
    cy.get('#player-circle li').eq(0).find('.number-overlay').should('contain', '1');
  });

  it('prevents reassigning traveller to a number during number selection', () => {
    // Use existing 10 player setup
    cy.get('#open-player-setup').click();
    cy.get('#player-setup-panel').should('be.visible');

    // Enable travellers and fill bag
    cy.get('#include-travellers-in-bag').check({ force: true });
    cy.fillBag();

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
        cy.get('#close-player-reveal-modal').click();
      }
    });
    cy.get('#player-circle li').eq(0).find('.number-overlay').should('contain', 'T');

    // Attempting to click again should not reopen the picker
    cy.get('#player-circle li').eq(0).find('.number-overlay').click({ force: true });
    cy.get('#number-picker-overlay').should('not.be.visible');
    cy.window().its('grimoireState.players[0].character').should('not.be.null');

    // The traveller should not appear for other players once assigned
    cy.get('#player-circle li').eq(1).click();
    cy.get('#number-picker-overlay').should('be.visible');
    cy.get('#number-picker-overlay .traveller-token').should('have.length', 0);
    cy.get('#close-number-picker').click({ force: true });
  });

  it('clears dead status and reminders when starting a new selection', () => {
    // 1. Set up some dirty state directly in grimoireState
    cy.window().then((win) => {
      const p1 = win.grimoireState.players[0];
      p1.dead = true;
      
      const p2 = win.grimoireState.players[1];
      p2.reminders.push({
        text: 'Test Reminder',
        type: 'token',
        id: 'test-reminder-1'
      });
    });

    // 2. Open Player Setup and Start Selection
    cy.get('#open-player-setup').click();
    cy.fillBag(); // Helper to fill bag for 10 players (from beforeEach)
    cy.get('#player-setup-panel .start-selection').click();

    // 3. Verify state is reset
    cy.window().then((win) => {
      const p1 = win.grimoireState.players[0];
      expect(p1.dead).to.be.false;
      
      const p2 = win.grimoireState.players[1];
      expect(p2.reminders).to.have.length(0);

      // Verify bag is preserved (10 players)
      expect(win.grimoireState.playerSetup.bag).to.have.length(10);
    });

    // Also verify UI elements are gone
    cy.get('#player-circle li').eq(0).find('.player-token').should('not.have.class', 'is-dead');
    cy.get('#player-circle li').eq(1).find('.token-reminder').should('not.exist');
  });
});
