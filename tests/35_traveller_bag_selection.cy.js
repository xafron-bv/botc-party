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
    cy.fillBag();
    cy.get('#bag-count-warning').should('not.be.visible');

    // Check travellers checkbox
    cy.get('#include-travellers-in-bag').check({ force: true });

    // Select a traveller (e.g., Beggar)
    cy.contains('#player-setup-character-list .team-header', 'Travellers')
      .next('.team-grid')
      .find('.token[title="Beggar"]')
      .first()
      .click({ force: true });

    // Now we have 8 players but 1 will be a traveller, so we need 7 non-traveller characters
    // But we have 8 in the bag, so it should show an error
    cy.get('#bag-count-warning').should('be.visible')
      .and('contain', 'Error')
      .and('contain', '7 characters')
      .and('contain', 'excluding 1 traveller');

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
    cy.fillBag();

    // Add travellers
    cy.get('#include-travellers-in-bag').check({ force: true });
    cy.contains('#player-setup-character-list .team-header', 'Travellers')
      .next('.team-grid')
      .find('.token[title="Gunslinger"]')
      .first()
      .click({ force: true });

    // Remove 1 outsider to account for the traveller (8 players - 1 traveller = 7 characters: 5/0/1/1)
    cy.contains('#player-setup-character-list .team-header', 'Outsider')
      .next('.team-grid')
      .find('input[type="checkbox"]:checked')
      .first()
      .click({ force: true });

    // Now bag should be valid
    cy.get('#bag-count-warning').should('not.be.visible');

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
    cy.fillBag();

    // Add Gunslinger traveller
    cy.get('#include-travellers-in-bag').check({ force: true });
    cy.contains('#player-setup-character-list .team-header', 'Travellers')
      .next('.team-grid')
      .find('.token[title="Gunslinger"]')
      .first()
      .click({ force: true });

    // Remove 1 regular character to account for the traveller
    cy.contains('#player-setup-character-list .team-header', 'Townsfolk')
      .next('.team-grid')
      .find('input[type="checkbox"]:checked')
      .first()
      .uncheck({ force: true });

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
    cy.get('#close-player-reveal-modal').click();
    cy.get('#player-reveal-modal').should('not.be.visible');

    // Player overlay should show 'T' for traveller
    cy.get('#player-circle li').eq(0).find('.number-overlay').should('contain', 'T');

    // Traveller should be removed from subsequent number pickers
    cy.get('#player-circle li').eq(1).find('.number-overlay').click();
    cy.get('#number-picker-overlay').should('be.visible');
    cy.get('#number-picker-grid .traveller-token[title="Gunslinger"]').should('not.exist');
  });

  it('shows traveller character names during selection while hiding regular character assignments', () => {
    cy.get('#open-player-setup').click({ force: true });
    cy.get('#player-setup-panel').should('be.visible');

    // Fill regular bag
    cy.fillBag();

    // Add Gunslinger traveller
    cy.get('#include-travellers-in-bag').check({ force: true });
    cy.contains('#player-setup-character-list .team-header', 'Travellers')
      .next('.team-grid')
      .find('.token[title="Gunslinger"]')
      .first()
      .click({ force: true });

    // Remove 1 regular character to account for the traveller
    cy.contains('#player-setup-character-list .team-header', 'Townsfolk')
      .next('.team-grid')
      .find('input[type="checkbox"]:checked')
      .first()
      .click({ force: true });

    // Start selection
    cy.get('#player-setup-panel .start-selection').click({ force: true });

    // Assign traveller to player 1
    cy.get('#player-circle li').eq(0).find('.number-overlay').click();
    cy.get('#number-picker-grid .traveller-token[title="Gunslinger"]').click();
    cy.get('#player-reveal-modal').should('be.visible');
    cy.get('#close-player-reveal-modal').click();

    // Assign regular character to player 2
    cy.get('#player-circle li').eq(1).find('.number-overlay').click();
    cy.get('#number-picker-overlay').should('be.visible');
    cy.get('#number-picker-grid .button.number').contains('1').click();
    cy.get('#player-reveal-modal').should('be.visible');
    cy.get('#close-player-reveal-modal').click();

    // During selection mode:
    // - Traveller (player 1) should show character name "Gunslinger"
    cy.get('#player-circle li').eq(0).find('.character-name').should('contain', 'Gunslinger');

    // - Regular character assignment (player 2) should NOT show character name (hidden until game starts)
    cy.get('#player-circle li').eq(1).find('.character-name').should('have.text', '');
    cy.get('#player-circle li').eq(1).find('.number-overlay').should('contain', '1');

    // - Other unassigned players should show question marks and no character names
    cy.get('#player-circle li').eq(2).find('.number-overlay').should('contain', '?');
    cy.get('#player-circle li').eq(2).find('.character-name').should('have.text', '');
  });

  it('locks traveller assignment once selected and keeps it unavailable to others', () => {
    cy.get('#open-player-setup').click({ force: true });
    cy.get('#player-setup-panel').should('be.visible');

    cy.fillBag();
    cy.get('#include-travellers-in-bag').check({ force: true });

    cy.contains('#player-setup-character-list .team-header', 'Travellers')
      .next('.team-grid')
      .find('.token')
      .first()
      .as('travellerOption')
      .invoke('attr', 'data-role-id')
      .as('travellerRoleId');

    cy.get('@travellerOption')
      .invoke('attr', 'title')
      .then((title) => {
        cy.wrap(title || '').as('travellerTitle');
      });

    cy.get('@travellerOption').click({ force: true });

    // Adjust bag counts if needed by deselecting one townsfolk (keeps tests deterministic)
    cy.contains('#player-setup-character-list .team-header', 'Townsfolk')
      .next('.team-grid')
      .find('input[type="checkbox"]:checked')
      .first()
      .click({ force: true });

    cy.get('#player-setup-panel .start-selection').click({ force: true });

    // Assign traveller to player 1
    cy.get('#player-circle li').eq(0).find('.number-overlay').click();
    cy.get('@travellerTitle').then((title) => {
      cy.get('#number-picker-grid .traveller-token').filter((_, el) => el.getAttribute('title') === title).first().click();
    });
    cy.get('#player-reveal-modal').should('be.visible');
    cy.get('#close-player-reveal-modal').click();
    cy.get('#player-circle li').eq(0).find('.number-overlay').should('contain', 'T');
    cy.get('#player-circle li').eq(0).find('.player-token').should('have.class', 'has-character');
    cy.get('@travellerRoleId').then((roleId) => {
      if (roleId) {
        cy.window().its('grimoireState.players[0].character').should('equal', roleId);
      }
    });

    // Attempting to reopen for the same player should do nothing
    cy.get('#player-circle li').eq(0).find('.number-overlay').click({ force: true });
    cy.get('#number-picker-overlay').should('not.be.visible');
    cy.window().its('grimoireState.players[0].character').should('not.be.null');

    // Traveller should remain unavailable to other players
    cy.get('#player-circle li').eq(1).find('.number-overlay').click();
    cy.get('@travellerTitle').then((title) => {
      cy.get('#number-picker-grid').then(($grid) => {
        const tokens = $grid.find(`.traveller-token[title="${title}"]`);
        expect(tokens.length).to.equal(0);
      });
    });
    cy.get('#close-number-picker').click({ force: true });
  });
});
