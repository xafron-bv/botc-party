// Cypress E2E tests - Traveller selection in player setup bag

describe('Traveller Bag Selection', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.viewport(1280, 900);
    cy.window().then((win) => {
      try { win.localStorage.clear(); } catch (_) { }
    });
    cy.get('#load-tb').click({ force: true });
    cy.get('#character-sheet .role').should('have.length.greaterThan', 5);
    // Enable travelers in script
    cy.get('#include-travellers').check({ force: true }).should('be.checked');
    cy.setupGame({ players: 8, loadScript: false });
  });

  it('shows "Include Travellers in Selection" checkbox in player setup modal', () => {
    cy.get('#open-player-setup').click({ force: true });
    cy.get('#player-setup-panel').should('be.visible');
    cy.get('#include-travellers-in-bag').should('exist').and('not.be.checked');
  });

  it('shows traveller tokens when checkbox is checked', () => {
    cy.get('#open-player-setup').click({ force: true });
    cy.get('#player-setup-panel').should('be.visible');

    // Initially should not show travellers
    cy.get('#player-setup-character-list').should('not.contain', 'Travellers');

    // Check the checkbox
    cy.get('#include-travellers-in-bag').check({ force: true });

    // Should now show travellers section
    cy.get('#player-setup-character-list').should('contain', 'Travellers');

    // Should have some traveller tokens
    cy.contains('#player-setup-character-list .team-header', 'Travellers')
      .next('.team-grid')
      .find('.token')
      .should('have.length.greaterThan', 0);
  });

  it('allows selecting travellers in bag without affecting regular bag count', () => {
    cy.get('#open-player-setup').click({ force: true });
    cy.get('#player-setup-panel').should('be.visible');

    // Fill regular bag for 8 players (should be 5/1/1/1)
    cy.get('#bag-random-fill').click({ force: true });
    cy.get('#bag-count-warning').should('not.be.visible');

    // Check travellers checkbox
    cy.get('#include-travellers-in-bag').check({ force: true });

    // Select a traveller (e.g., Beggar)
    cy.contains('#player-setup-character-list .team-header', 'Travellers')
      .next('.team-grid')
      .find('.token[title="Beggar"]')
      .first()
      .click({ force: true });

    // Regular bag count warning should still not be visible
    cy.get('#bag-count-warning').should('not.be.visible');

    // Traveller should be checked
    cy.contains('#player-setup-character-list .team-header', 'Travellers')
      .next('.team-grid')
      .find('.token[title="Beggar"]')
      .first()
      .find('input[type="checkbox"]')
      .should('be.checked');
  });

  it('shows traveller tokens in number picker during selection', () => {
    cy.get('#open-player-setup').click({ force: true });
    cy.get('#player-setup-panel').should('be.visible');

    // Fill regular bag
    cy.get('#bag-random-fill').click({ force: true });

    // Add travellers
    cy.get('#include-travellers-in-bag').check({ force: true });
    cy.contains('#player-setup-character-list .team-header', 'Travellers')
      .next('.team-grid')
      .find('.token[title="Gunslinger"]')
      .first()
      .click({ force: true });

    // Start selection
    cy.get('#player-setup-panel .start-selection').click({ force: true });

    // Click on a player to open number picker
    cy.get('#player-circle li').eq(0).find('.number-overlay').should('contain', '?').click();
    cy.get('#number-picker-overlay').should('be.visible');

    // Should show "Select a Traveller:" section
    cy.get('#number-picker-grid').should('contain', 'Select a Traveller:');

    // Should show Gunslinger token
    cy.get('#number-picker-grid .traveller-token[title="Gunslinger"]').should('exist');
  });

  it('assigns traveller when traveller token is clicked in number picker', () => {
    cy.get('#open-player-setup').click({ force: true });
    cy.get('#player-setup-panel').should('be.visible');

    // Fill regular bag
    cy.get('#bag-random-fill').click({ force: true });

    // Add Gunslinger traveller
    cy.get('#include-travellers-in-bag').check({ force: true });
    cy.contains('#player-setup-character-list .team-header', 'Travellers')
      .next('.team-grid')
      .find('.token[title="Gunslinger"]')
      .first()
      .click({ force: true });

    // Start selection
    cy.get('#player-setup-panel .start-selection').click({ force: true });

    // Click on player 1 to open number picker
    cy.get('#player-circle li').eq(0).find('.number-overlay').click();
    cy.get('#number-picker-overlay').should('be.visible');

    // Click Gunslinger token
    cy.get('#number-picker-grid .traveller-token[title="Gunslinger"]').click();

    // Should open reveal modal
    cy.get('#player-reveal-modal').should('be.visible');
    cy.get('#reveal-character-token').should('contain.text', 'Gunslinger');

    // Confirm
    cy.get('#reveal-confirm-btn').click();
    cy.get('#player-reveal-modal').should('not.be.visible');

    // Player overlay should show 'T' for traveller
    cy.get('#player-circle li').eq(0).find('.number-overlay').should('contain', 'T');

    // Traveller should be removed from subsequent number pickers
    cy.get('#player-circle li').eq(1).find('.number-overlay').click();
    cy.get('#number-picker-overlay').should('be.visible');
    cy.get('#number-picker-grid .traveller-token[title="Gunslinger"]').should('not.exist');
  });

  it('regular character numbers still work after travellers are in bag', () => {
    cy.get('#open-player-setup').click({ force: true });
    cy.get('#player-setup-panel').should('be.visible');

    // Fill regular bag
    cy.get('#bag-random-fill').click({ force: true });

    // Add traveller
    cy.get('#include-travellers-in-bag').check({ force: true });
    cy.contains('#player-setup-character-list .team-header', 'Travellers')
      .next('.team-grid')
      .find('.token')
      .first()
      .click({ force: true });

    // Start selection
    cy.get('#player-setup-panel .start-selection').click({ force: true });

    // Assign traveller to player 1
    cy.get('#player-circle li').eq(0).find('.number-overlay').click();
    cy.get('#number-picker-grid .traveller-token').first().click();
    cy.get('#player-reveal-modal').should('be.visible');
    cy.get('#reveal-confirm-btn').click();

    // Assign regular character to player 2
    cy.get('#player-circle li').eq(1).find('.number-overlay').click();
    cy.get('#number-picker-overlay').should('be.visible');
    cy.get('#number-picker-grid .button.number').contains('1').click();
    cy.get('#player-reveal-modal').should('be.visible');
    cy.get('#reveal-confirm-btn').click();

    // Player 2 should show number 1
    cy.get('#player-circle li').eq(1).find('.number-overlay').should('contain', '1');
  });
});
