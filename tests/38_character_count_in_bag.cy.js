describe('Player Setup - Character Count in Bag', () => {
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

  it('shows count input when character is checked', () => {
    cy.get('#open-player-setup').click();
    cy.get('#player-setup-panel').should('be.visible');

    // Find the first townsfolk token
    cy.get('#player-setup-character-list .team-grid .role').first().then($token => {
      const checkbox = $token.find('input[type="checkbox"]');

      // Initially, count input should not be visible (display: none)
      cy.wrap($token).find('.character-count-input').should('not.be.visible');

      // Click checkbox
      cy.wrap(checkbox).check({ force: true });

      // Now count input should appear with default value of 1
      cy.wrap($token).find('.character-count-input').should('be.visible').and('have.value', '1');
    });
  });

  it('adds exactly one entry when token label is toggled', () => {
    cy.get('#open-player-setup').click();
    cy.get('#player-setup-panel').should('be.visible');

    cy.get('#player-setup-character-list .team-grid .role').first().as('firstRole');
    cy.get('@firstRole').click({ force: true });

    cy.window().then((win) => {
      const bag = (win.grimoireState && win.grimoireState.playerSetup && win.grimoireState.playerSetup.bag) || [];
      expect(bag.length).to.equal(1);
    });
  });

  it('allows increasing character count', () => {
    cy.get('#open-player-setup').click();
    cy.get('#player-setup-panel').should('be.visible');

    // Check first townsfolk
    cy.get('#player-setup-character-list .team-grid .role').first().as('firstRole');
    cy.get('@firstRole').find('input[type="checkbox"]').check({ force: true });

    // Increase count to 3
    cy.get('@firstRole').find('.character-count-input')
      .should('be.visible')
      .invoke('val', '3')
      .trigger('change');

    // Wait for state to update
    cy.wait(100);

    // Verify the bag contains 3 copies of this character
    cy.window().then((win) => {
      const bag = (win.grimoireState && win.grimoireState.playerSetup && win.grimoireState.playerSetup.bag) || [];
      // Get the role ID from the token
      cy.get('@firstRole').invoke('attr', 'title').then((roleName) => {
        const roleId = Object.values(win.grimoireState.allRoles).find(r => r.name === roleName)?.id;
        if (roleId) {
          const countInBag = bag.filter(entry =>
            (typeof entry === 'string' ? entry : entry.id) === roleId
          ).length;
          expect(countInBag).to.equal(3);
        }
      });
    });
  });

  it('allows adding multiple copies of same character (e.g., Village Idiot)', () => {
    cy.get('#open-player-setup').click();
    cy.get('#player-setup-panel').should('be.visible');

    // Find "Washerwoman" (or any townsfolk)
    cy.get('#player-setup-character-list .role[title="Washerwoman"]').as('washerwoman');
    cy.get('@washerwoman').find('input[type="checkbox"]').check({ force: true });

    // Set count to 5
    cy.get('@washerwoman').find('.character-count-input')
      .should('be.visible')
      .invoke('val', '5')
      .trigger('change');

    // Wait for state to update
    cy.wait(100);

    // Verify bag count includes all 5
    cy.window().then((win) => {
      const bag = (win.grimoireState && win.grimoireState.playerSetup && win.grimoireState.playerSetup.bag) || [];
      const washerwomanCount = bag.filter(entry => {
        const id = typeof entry === 'string' ? entry : entry.id;
        return id === 'washerwoman';
      }).length;
      expect(washerwomanCount).to.equal(5);
    });
  });

  it('updates bag count warning correctly with multiple copies', () => {
    cy.get('#open-player-setup').click();
    cy.get('#player-setup-panel').should('be.visible');

    // Add one character with count of 10 (matching player count)
    cy.get('#player-setup-character-list .role[title="Washerwoman"]').as('washerwoman');
    cy.get('@washerwoman').find('input[type="checkbox"]').check({ force: true });
    cy.get('@washerwoman').find('.character-count-input')
      .invoke('val', '10')
      .trigger('change');

    // Wait for state to update
    cy.wait(100);

    // Warning should be visible (wrong team distribution)
    cy.get('#bag-count-warning').should('be.visible');
    cy.get('#bag-count-warning').invoke('text').should('match', /Warning|Expected/i);
  });

  it('removes all copies when checkbox is unchecked', () => {
    cy.get('#open-player-setup').click();
    cy.get('#player-setup-panel').should('be.visible');

    // Check first townsfolk and set count to 3
    cy.get('#player-setup-character-list .team-grid .role').first().as('firstRole');
    cy.get('@firstRole').find('input[type="checkbox"]').check({ force: true });
    cy.get('@firstRole').find('.character-count-input')
      .invoke('val', '3')
      .trigger('change');

    cy.wait(100);

    cy.window().then((win) => {
      const bagBefore = (win.grimoireState && win.grimoireState.playerSetup && win.grimoireState.playerSetup.bag) || [];
      expect(bagBefore.length).to.be.greaterThan(0);
    });

    // Uncheck the character
    cy.get('@firstRole').find('input[type="checkbox"]').uncheck({ force: true });

    // Count input should be hidden
    cy.get('@firstRole').find('.character-count-input').should('not.be.visible');

    // All copies should be removed from bag
    cy.window().then((win) => {
      cy.get('@firstRole').invoke('attr', 'title').then((roleName) => {
        const roleId = Object.values(win.grimoireState.allRoles).find(r => r.name === roleName)?.id;
        const bag = (win.grimoireState && win.grimoireState.playerSetup && win.grimoireState.playerSetup.bag) || [];
        const countInBag = bag.filter(entry =>
          (typeof entry === 'string' ? entry : entry.id) === roleId
        ).length;
        expect(countInBag).to.equal(0);
      });
    });
  });

  it('auto-fill helper sets count to 1 for each selected character', () => {
    cy.get('#open-player-setup').click();
    cy.get('#player-setup-panel').should('be.visible');

    // Use helper to populate the bag
    cy.fillBag();
    cy.get('#bag-count-warning').should('not.be.visible');

    // All checked characters should have count inputs visible with value 1
    cy.get('#player-setup-character-list input[type="checkbox"]:checked').first().parent().scrollIntoView();
    cy.get('#player-setup-character-list input[type="checkbox"]:checked').each(($checkbox) => {
      cy.wrap($checkbox).parent().find('.character-count-input')
        .scrollIntoView()
        .should('be.visible')
        .and('have.value', '1');
    });

    // Verify bag has correct total count (should be 10)
    cy.window().then((win) => {
      const bag = (win.grimoireState && win.grimoireState.playerSetup && win.grimoireState.playerSetup.bag) || [];
      expect(bag.length).to.equal(10);
    });
  });

  it('supports extreme case: all players get same character (Atheist game)', () => {
    cy.get('#open-player-setup').click();
    cy.get('#player-setup-panel').should('be.visible');

    // Select only one character and set count to 10
    cy.get('#player-setup-character-list .role[title="Washerwoman"]').as('washerwoman');
    cy.get('@washerwoman').find('input[type="checkbox"]').check({ force: true });
    cy.get('@washerwoman').find('.character-count-input')
      .invoke('val', '10')
      .trigger('change');

    // Wait for state to update
    cy.wait(100);

    // Verify bag contains 10 copies
    cy.window().then((win) => {
      const bag = (win.grimoireState && win.grimoireState.playerSetup && win.grimoireState.playerSetup.bag) || [];
      expect(bag.length).to.equal(10);

      const washerwomanCount = bag.filter(entry => {
        const id = typeof entry === 'string' ? entry : entry.id;
        return id === 'washerwoman';
      }).length;
      expect(washerwomanCount).to.equal(10);
    });

    // Start selection should work even with warning
    cy.get('#player-setup-panel .start-selection').click();
    cy.get('#player-circle li').eq(0).find('.number-overlay').should('be.visible').and('contain', '?');
  });

  it('count cannot be less than 1', () => {
    cy.get('#open-player-setup').click();
    cy.get('#player-setup-panel').should('be.visible');

    cy.get('#player-setup-character-list .team-grid .role').first().as('firstRole');
    cy.get('@firstRole').find('input[type="checkbox"]').check({ force: true });

    // Try to set count to 0 or negative
    cy.get('@firstRole').find('.character-count-input')
      .invoke('val', '0')
      .trigger('change');

    // Should reset to 1
    cy.get('@firstRole').find('.character-count-input').should('have.value', '1');

    cy.window().then((win) => {
      const bag = (win.grimoireState && win.grimoireState.playerSetup && win.grimoireState.playerSetup.bag) || [];
      expect(bag.length).to.be.greaterThan(0);
    });
  });

  it('persists character counts across panel close/reopen', () => {
    cy.get('#open-player-setup').click();
    cy.get('#player-setup-panel').should('be.visible');

    // Set a character to count 3
    cy.get('#player-setup-character-list .role[title="Washerwoman"]').as('washerwoman');
    cy.get('@washerwoman').find('input[type="checkbox"]').check({ force: true });
    cy.get('@washerwoman').find('.character-count-input')
      .invoke('val', '3')
      .trigger('change');

    // Wait for state to save
    cy.wait(100);

    // Close panel
    cy.get('#close-player-setup').click();
    cy.get('#player-setup-panel').should('not.be.visible');

    // Reopen panel
    cy.get('#open-player-setup').click();
    cy.get('#player-setup-panel').should('be.visible');

    // Count should still be 3
    cy.get('#player-setup-character-list .role[title="Washerwoman"]')
      .find('.character-count-input')
      .should('have.value', '3');
  });
});
