// Cypress E2E test - Traveller bag should reset when Include Travellers checkbox is unchecked

describe('Player Setup - Traveller Checkbox Reset', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.viewport(1280, 900);
    cy.window().then((win) => {
      try { win.localStorage.clear(); } catch (_) { }
    });
    cy.get('#load-tb').click({ force: true });
    cy.get('#character-sheet .role').should('have.length.greaterThan', 5);
    cy.get('#include-travellers').check({ force: true }).should('be.checked');
    cy.setupGame({ players: 8, loadScript: false });
  });

  it('clears selected travellers when Include Travellers in Selection is unchecked', () => {
    cy.get('#open-player-setup').click({ force: true });
    cy.get('#player-setup-panel').should('be.visible');

    // Fill regular bag for 8 players
    cy.get('#bag-random-fill').click({ force: true });
    cy.get('#bag-count-warning').should('not.be.visible');

    // Enable travellers in bag
    cy.get('#include-travellers-in-bag').check({ force: true });

    // Select 2 travellers
    cy.contains('#player-setup-character-list .team-header', 'Travellers')
      .next('.team-grid')
      .find('.token')
      .eq(0)
      .click({ force: true });

    cy.contains('#player-setup-character-list .team-header', 'Travellers')
      .next('.team-grid')
      .find('.token')
      .eq(1)
      .click({ force: true });

    // Verify travellers are selected (should show error because we need 6 chars but have 8)
    cy.get('#bag-count-warning').should('be.visible')
      .and('contain', '6 characters')
      .and('contain', 'excluding 2 travellers');

    // Uncheck the travellers checkbox
    cy.get('#include-travellers-in-bag').uncheck({ force: true });

    // Travellers section should disappear
    cy.get('#player-setup-character-list').should('not.contain', 'Travellers');

    // Warning should now show we need 8 characters (no travellers excluded)
    cy.get('#bag-count-warning').should('not.be.visible');

    // Re-enable travellers checkbox
    cy.get('#include-travellers-in-bag').check({ force: true });

    // Travellers section should reappear
    cy.get('#player-setup-character-list').should('contain', 'Travellers');

    // Previously selected travellers should NOT be checked anymore
    cy.contains('#player-setup-character-list .team-header', 'Travellers')
      .next('.team-grid')
      .find('input[type="checkbox"]:checked')
      .should('have.length', 0);

    // Warning should be hidden (8 characters for 8 players is correct)
    cy.get('#bag-count-warning').should('not.be.visible');
  });

  it('preserves regular bag characters when unchecking Include Travellers', () => {
    cy.get('#open-player-setup').click({ force: true });
    cy.get('#player-setup-panel').should('be.visible');

    // Use random fill to get a valid bag for 8 players
    cy.get('#bag-random-fill').click({ force: true });
    cy.get('#bag-count-warning').should('not.be.visible');

    // Enable and select travellers
    cy.get('#include-travellers-in-bag').check({ force: true });
    cy.contains('#player-setup-character-list .team-header', 'Travellers')
      .next('.team-grid')
      .find('.token')
      .first()
      .click({ force: true });

    // Should show error (need 7, have 8)
    cy.get('#bag-count-warning').should('be.visible')
      .and('contain', '7 characters')
      .and('contain', 'excluding 1 traveller');

    // Uncheck travellers
    cy.get('#include-travellers-in-bag').uncheck({ force: true });

    // Regular bag should still have 8 characters and no warning
    cy.get('#bag-count-warning').should('not.be.visible');

    // Count how many regular characters are checked (should be 8)
    let totalChecked = 0;
    cy.contains('#player-setup-character-list .team-header', 'Townsfolk')
      .next('.team-grid')
      .find('input[type="checkbox"]:checked')
      .then($checked => { totalChecked += $checked.length; });

    cy.contains('#player-setup-character-list .team-header', 'Outsider')
      .next('.team-grid')
      .find('input[type="checkbox"]:checked')
      .then($checked => { totalChecked += $checked.length; });

    cy.contains('#player-setup-character-list .team-header', 'Minions')
      .next('.team-grid')
      .find('input[type="checkbox"]:checked')
      .then($checked => { totalChecked += $checked.length; });

    cy.contains('#player-setup-character-list .team-header', 'Demons')
      .next('.team-grid')
      .find('input[type="checkbox"]:checked')
      .then($checked => {
        totalChecked += $checked.length;
        expect(totalChecked).to.equal(8);
      });
  });

  it('resets travellers when toggling checkbox multiple times', () => {
    cy.get('#open-player-setup').click({ force: true });
    cy.get('#player-setup-panel').should('be.visible');

    cy.get('#bag-random-fill').click({ force: true });

    // Enable and select a traveller
    cy.get('#include-travellers-in-bag').check({ force: true });
    cy.contains('#player-setup-character-list .team-header', 'Travellers')
      .next('.team-grid')
      .find('.token[title="Beggar"]')
      .first()
      .click({ force: true });

    // Verify selection
    cy.contains('#player-setup-character-list .team-header', 'Travellers')
      .next('.team-grid')
      .find('.token[title="Beggar"]')
      .first()
      .find('input[type="checkbox"]')
      .should('be.checked');

    // Uncheck
    cy.get('#include-travellers-in-bag').uncheck({ force: true });

    // Re-check
    cy.get('#include-travellers-in-bag').check({ force: true });

    // Beggar should not be selected
    cy.contains('#player-setup-character-list .team-header', 'Travellers')
      .next('.team-grid')
      .find('.token[title="Beggar"]')
      .first()
      .find('input[type="checkbox"]')
      .should('not.be.checked');

    // Select a different traveller
    cy.contains('#player-setup-character-list .team-header', 'Travellers')
      .next('.team-grid')
      .find('.token[title="Gunslinger"]')
      .first()
      .click({ force: true });

    // Verify Gunslinger is selected
    cy.contains('#player-setup-character-list .team-header', 'Travellers')
      .next('.team-grid')
      .find('.token[title="Gunslinger"]')
      .first()
      .find('input[type="checkbox"]')
      .should('be.checked');

    // Uncheck again
    cy.get('#include-travellers-in-bag').uncheck({ force: true });

    // Re-check again
    cy.get('#include-travellers-in-bag').check({ force: true });

    // Neither should be selected
    cy.contains('#player-setup-character-list .team-header', 'Travellers')
      .next('.team-grid')
      .find('input[type="checkbox"]:checked')
      .should('have.length', 0);
  });
});
