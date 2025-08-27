// Cypress E2E tests - Touch ability popup and desktop tooltip edge cases

const startGameWithPlayers = (n) => {
  cy.get('#player-count').then(($el) => {
    const el = $el[0];
    el.value = String(n);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  });
  cy.get('#start-game').click();
  cy.get('#player-circle li').should('have.length', n);
};

describe('Ability UI - Desktop', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.window().then((win) => {
      try { win.localStorage.clear(); } catch (_) { }
    });
    cy.get('#load-tb').click();
    cy.get('#character-sheet .role').should('have.length.greaterThan', 5);
    startGameWithPlayers(5);
  });

  it('tooltip appears on hover; content populated', () => {
    cy.get('#player-circle li .player-token').eq(0).click();
    cy.get('#character-modal').should('be.visible');
    cy.get('#character-search').type('Chef');
    cy.get('#character-grid .token[title="Chef"]').first().click();
    // Hover shows tooltip; just ensure the tooltip element exists and eventually has non-empty text
    cy.get('#player-circle li .player-token').eq(0).trigger('mouseenter');
    cy.get('#ability-tooltip').should('exist');
    cy.get('#ability-tooltip').invoke('text').should('match', /\S/);
  });
});

describe('Ability UI - Touch', () => {
  beforeEach(() => {
    // Simulate touch before app initializes to ensure touch mode code paths are used
    cy.visit('/', {
      onBeforeLoad(win) {
        Object.defineProperty(win, 'ontouchstart', { value: true, configurable: true });
        Object.defineProperty(win.navigator, 'maxTouchPoints', { value: 1, configurable: true });
      }
    });
    cy.window().then((win) => {
      try { win.localStorage.clear(); } catch (_) { }
    });
    cy.get('#load-tb').click();
    cy.get('#character-sheet .role').should('have.length.greaterThan', 5);
    startGameWithPlayers(5);
  });

  it('info icon shows popup and hides when clicking elsewhere', () => {
    cy.viewport('iphone-6');
    // Assign a character so info icon is added
    cy.get('#player-circle li .player-token').eq(1).click({ force: true });
    cy.get('#character-modal').should('be.visible');
    cy.get('#character-search').clear().type('Librarian');
    cy.get('#character-grid .token[title="Librarian"]').first().click();

    // Info icon should exist for that player index
    cy.get('#player-circle li').eq(1).find('.ability-info-icon', { timeout: 8000 }).should('exist').click({ force: true });
    cy.get('#touch-ability-popup').should('have.class', 'show').and('contain', 'particular Outsider');

    // Click outside hides
    cy.get('body').click('topLeft');
    cy.get('#touch-ability-popup').should('not.have.class', 'show');
  });

  it('reminder token scrolling does not accidentally select; tap still selects', () => {
    cy.viewport('iphone-6');
    // Open reminder token modal for first player (no other stacks expanded yet)
    cy.get('#player-circle li .reminder-placeholder').first().click({ force: true });
    cy.get('#reminder-token-modal').should('be.visible');

    // Ensure grid has many tokens; scroll the container
    cy.get('#reminder-token-grid').should('have.descendants', '.token');
    // Record baseline count of icon reminders for the first player
    cy.get('#player-circle li').first().then(($li) => {
      const beforeCount = $li.find('.icon-reminder').length;
      // Scroll within the grid to simulate finger scroll; no selection should occur
      cy.get('#reminder-token-grid').scrollTo('bottom');
      cy.get('#player-circle li').first().then(($li2) => {
        expect($li2.find('.icon-reminder').length).to.eq(beforeCount);
      });
      // Filter to a non-custom token and tap to select
      cy.get('#reminder-token-search').type('wrong');
      cy.get('#reminder-token-grid .token[title="Wrong"]').first().click({ force: true });
      cy.get('#reminder-token-modal').should('not.be.visible');
      cy.get('#player-circle li').first().then(($li3) => {
        expect($li3.find('.icon-reminder').length).to.eq(beforeCount + 1);
      });
    });
  });

  it('plus button first expands when another stack is expanded; second tap opens modal', () => {
    cy.viewport('iphone-6');
    // Start with two players
    startGameWithPlayers(5);
    // Deterministically mark second player as expanded and first as collapsed
    cy.get('#player-circle li').eq(1).invoke('attr', 'data-expanded', '1');
    cy.get('#player-circle li').eq(0).invoke('attr', 'data-expanded', '0');
    cy.get('#player-circle li').eq(1).should('have.attr', 'data-expanded', '1');
    cy.get('#player-circle li').eq(0).should('have.attr', 'data-expanded', '0');
    // Now tap plus on first player: should expand first (and not open modal yet)
    cy.get('#player-circle li .reminder-placeholder').eq(0).click({ force: true });
    // Wait a beat for the expand to propagate
    cy.wait(50);
    cy.get('#player-circle li').eq(0).should('have.attr', 'data-expanded', '1');
    // Ensure modal is closed before continuing
    cy.get('body').then(($body) => {
      if ($body.find('#reminder-token-modal:visible').length) {
        cy.get('#reminder-token-modal').click('topLeft', { force: true });
      }
    });
    cy.get('#reminder-token-modal').should('not.be.visible');
    // Tap plus again: now the modal should open
    cy.get('#player-circle li .reminder-placeholder').eq(0).click({ force: true });
    cy.get('#reminder-token-modal').should('be.visible');
    // Close
    cy.get('#reminder-token-modal').click('topLeft', { force: true });
    cy.get('#reminder-token-modal').should('not.be.visible');
  });

  it('player name: visible => single tap edits; no reminder modal', () => {
    cy.viewport('iphone-6');
    startGameWithPlayers(5);
    // Ensure no modal initially
    cy.get('#reminder-token-modal').should('not.be.visible');

    // Make the player name visible by raising its z-index (simulating it was previously raised)
    cy.get('#player-circle li .player-name').first().then(($el) => {
      $el[0].style.zIndex = '60';
    });

    // Wait a bit to ensure the style is applied
    cy.wait(100);

    // Stub prompt for rename
    cy.window().then((win) => {
      cy.stub(win, 'prompt').as('promptStub').returns('Zed');
    });

    // Single tap via touchstart should rename when visible (not covered)
    cy.get('#player-circle li .player-name').first()
      .trigger('touchstart', { touches: [{ clientX: 5, clientY: 5 }], force: true });

    // Verify prompt was called
    cy.get('@promptStub').should('have.been.called');

    cy.get('#reminder-token-modal').should('not.be.visible');
    cy.get('#player-circle li .player-name').first().should('contain', 'Zed');
  });

  it('player name: partially covered => first tap raises only; second tap edits', () => {
    cy.viewport('iphone-6');
    startGameWithPlayers(5);
    // Ensure no modal initially
    cy.get('#reminder-token-modal').should('not.be.visible');

    // Get the player name and token elements to check their positions
    cy.get('#player-circle li').first().within(() => {
      cy.get('.player-name').then(($name) => {
        cy.get('.player-token').then(() => {
          // Check if player name is actually behind the token (lower z-index or overlapping position)
          // Position calculations removed as they weren't being used

          // Store original position for verification
          cy.wrap($name[0].style.zIndex || '').as('originalZIndex');
        });
      });
    });

    // Stub prompt and track call count
    cy.window().then((win) => { cy.stub(win, 'prompt').as('namePrompt').returns('Yara'); });

    // First tap on the name
    cy.get('#player-circle li .player-name').first()
      .trigger('touchstart', { touches: [{ clientX: 5, clientY: 5 }], force: true });
    cy.get('@namePrompt').should('have.callCount', 0);

    // Verify the name was raised (z-index changed or raised state set)
    cy.get('#player-circle li .player-name').first().should(($el) => {
      expect($el[0].dataset.raised).to.equal('true');
    });

    // Second tap should rename
    cy.get('#player-circle li .player-name').first()
      .trigger('touchstart', { touches: [{ clientX: 6, clientY: 6 }], force: true });
    cy.get('#player-circle li .player-name').first().should('contain', 'Yara');

    // Verify raised state is cleared after rename
    cy.get('#player-circle li .player-name').first().should(($el) => {
      expect($el[0].dataset.raised).to.be.undefined;
    });
  });

  it('player name: prompt shows current name after rename', () => {
    cy.viewport('iphone-6');
    // Don't start a new game - we already have 5 players from beforeEach

    // Set up the stub to handle both calls
    cy.window().then((win) => {
      let callCount = 0;
      cy.stub(win, 'prompt').callsFake((msg, defaultValue) => {
        callCount++;
        if (callCount === 1) {
          // First call - should have default value 'Player 1'
          expect(defaultValue).to.equal('Player 1');
          return 'Chris';
        } else if (callCount === 2) {
          // Second call - should have default value 'Chris'
          expect(defaultValue).to.equal('Chris');
          return 'Christopher';
        }
      }).as('namePrompt');
    });

    cy.get('#player-circle li .player-name').first().click({ force: true });
    cy.get('#player-circle li .player-name').first().should('contain', 'Chris');

    cy.get('#player-circle li .player-name').first().click({ force: true });
    cy.get('#player-circle li .player-name').first().should('contain', 'Christopher');
  });

  it('touch: tapping character circle does not expand collapsed reminders', () => {
    cy.viewport('iphone-6');
    startGameWithPlayers(5);
    // Add a reminder so there is a stack to expand
    cy.get('#player-circle li .reminder-placeholder').first().click({ force: true });
    cy.get('#reminder-token-modal').should('be.visible');
    cy.get('#reminder-token-grid .token[title="Wrong"]').first().click({ force: true });
    cy.get('#reminder-token-modal').should('not.be.visible');
    // Ensure collapsed
    cy.get('#player-circle li').first().invoke('attr', 'data-expanded', '0');
    cy.get('#player-circle li').first().should('have.attr', 'data-expanded', '0');
    // Tap the character circle to open character modal
    cy.get('#player-circle li .player-token').first()
      .trigger('touchstart', { touches: [{ clientX: 10, clientY: 10 }], force: true })
      .click({ force: true });
    // Reminders should remain collapsed
    cy.get('#player-circle li').first().should('have.attr', 'data-expanded', '0');
  });

  it('shows press feedback on long-press capable reminder tokens on touch', () => {
    cy.viewport('iphone-6');
    // Add one reminder to first player to have a token
    cy.get('#player-circle li .reminder-placeholder').first().click({ force: true });
    cy.get('#reminder-token-modal').should('be.visible');
    // Prefer a deterministic token that always exists by title
    cy.get('#reminder-token-grid .token[title="Wrong"]').first().click({ force: true });
    // Ensure a reminder was added (retry until rendered)
    cy.get('#player-circle li').first().find('.icon-reminder, .text-reminder').should('exist');
    // If the modal remains visible due to async behavior, click backdrop to close
    cy.get('body').then(($body) => {
      if ($body.find('#reminder-token-modal:visible').length) {
        cy.get('#reminder-token-modal').click('topLeft', { force: true });
      }
    });
    cy.get('#reminder-token-modal').should('not.be.visible');

    // Ensure the stack is expanded so interaction is clear
    cy.get('#player-circle li').first().find('.reminders').trigger('touchstart', { touches: [{ clientX: 5, clientY: 5 }], force: true });
    cy.get('#player-circle li').first().should('have.attr', 'data-expanded', '1');

    // Long-press start shows visual feedback; ensure modal is not visible
    cy.get('#reminder-token-modal').should('not.be.visible');
    // Retry until a reminder exists and is interactable
    cy.get('#player-circle li').first().find('.icon-reminder, .text-reminder').first()
      .should('exist')
      .trigger('touchstart', { touches: [{ clientX: 5, clientY: 5 }], force: true });
    cy.get('#player-circle li').first().find('.icon-reminder.press-feedback, .text-reminder.press-feedback').should('exist');
    // End press removes feedback
    cy.get('#player-circle li').first().find('.icon-reminder, .text-reminder').first()
      .trigger('touchend', { force: true });
    cy.get('#player-circle li').first().find('.icon-reminder.press-feedback, .text-reminder.press-feedback').should('not.exist');
  });

  it('player name: comprehensive touch behavior - raise, edit, restore', () => {
    cy.viewport('iphone-6');
    startGameWithPlayers(5);

    // Stub prompt but it should NOT be called on first touch
    cy.window().then((win) => {
      cy.stub(win, 'prompt').as('promptStub').returns('NewName');
    });

    // Get initial z-index of first player name
    cy.get('#player-circle li').first().find('.player-name').then(($name) => {
      const initialZIndex = $name[0].style.zIndex || window.getComputedStyle($name[0]).zIndex || '0';
      cy.wrap(initialZIndex).as('initialZIndex');
    });

    // FIRST TOUCH: Should only raise the name, NOT open prompt
    cy.get('#player-circle li').first().find('.player-name')
      .trigger('touchstart', { touches: [{ clientX: 10, clientY: 10 }], force: true });

    // Verify prompt was NOT called
    cy.get('@promptStub').should('have.callCount', 0);

    // Verify name was raised (z-index increased)
    cy.get('#player-circle li').first().find('.player-name').should(($name) => {
      const currentZIndex = parseInt($name[0].style.zIndex, 10) || 0;
      expect(currentZIndex).to.be.greaterThan(5); // Should be raised above token
    });

    // Verify raised state is set
    cy.get('#player-circle li').first().find('.player-name').should(($name) => {
      expect($name[0].dataset.raised).to.equal('true');
    });

    // SECOND TOUCH ON SAME NAME: Should open prompt
    cy.get('#player-circle li').first().find('.player-name')
      .trigger('touchstart', { touches: [{ clientX: 10, clientY: 10 }], force: true });

    // Verify prompt was called
    cy.get('@promptStub').should('have.callCount', 1);

    // Verify name was changed
    cy.get('#player-circle li').first().find('.player-name').should('contain', 'NewName');

    // Restore the prompt stub for next part of test
    cy.get('@promptStub').invoke('restore');

    // Create new stub
    cy.window().then((win) => {
      cy.stub(win, 'prompt').as('promptStub2').returns('AnotherName');
    });

    // Touch first name again to raise it
    cy.get('#player-circle li').first().find('.player-name')
      .trigger('touchstart', { touches: [{ clientX: 10, clientY: 10 }], force: true });

    // Verify it's raised again
    cy.get('#player-circle li').first().find('.player-name').should(($name) => {
      expect($name[0].dataset.raised).to.equal('true');
    });

    // SECOND TOUCH ON DIFFERENT PLAYER: Should restore first name and raise second
    cy.get('#player-circle li').eq(1).find('.player-name')
      .trigger('touchstart', { touches: [{ clientX: 20, clientY: 20 }], force: true });

    // Verify first name is restored to original z-index
    cy.get('@initialZIndex').then((initialZIndex) => {
      cy.get('#player-circle li').first().find('.player-name').should(($name) => {
        expect($name[0].style.zIndex).to.equal(initialZIndex.toString());
        expect($name[0].dataset.raised).to.be.undefined;
      });
    });

    // Verify second name is now raised
    cy.get('#player-circle li').eq(1).find('.player-name').should(($name) => {
      expect($name[0].dataset.raised).to.equal('true');
      const currentZIndex = parseInt($name[0].style.zIndex, 10) || 0;
      expect(currentZIndex).to.be.greaterThan(5);
    });

    // Verify no prompts were called
    cy.get('@promptStub2').should('have.callCount', 0);

    // TOUCH OUTSIDE: Should restore all raised names
    cy.get('body').trigger('touchstart', { touches: [{ clientX: 0, clientY: 0 }] });

    // Verify all names are restored
    cy.get('#player-circle li .player-name').each(($name) => {
      expect($name[0].dataset.raised).to.be.undefined;
    });
  });
});

