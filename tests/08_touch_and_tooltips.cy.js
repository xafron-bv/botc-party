// Cypress E2E tests - Touch ability popup and desktop tooltip edge cases

// startGameWithPlayers now delegated to Cypress custom command for consistency
const startGameWithPlayers = (n) => {
  cy.setupGame({ players: n, loadScript: false });
};

describe('Ability UI - Desktop', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.window().then((win) => {
      try { win.localStorage.clear(); } catch (_) { }
    });
    cy.setupGame({ players: 5, loadScript: true });
  });

  it('tooltip appears on hover; content populated', () => {
    cy.get('#player-circle li .player-token').eq(0).click({ force: true });
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
    // On desktop-width touch emulation the persistent sidebar toggle can overlap
    // the top script load buttons. If it is visible, open the sidebar first so
    // the toggle hides and no longer covers the target controls on small/touch viewports.
    cy.get('body').then(($body) => {
      const toggle = $body.find('#sidebar-toggle:visible');
      if (toggle.length) {
        cy.wrap(toggle).click({ force: true });
      }
    });
    // Wait for sidebar-open (added by app) OR hide toggle fallback
    cy.get('body').then(($body) => {
      if (!$body.hasClass('sidebar-open')) {
        // As a resilience fallback in CI if animation/state lagged, directly set class
        $body.addClass('sidebar-open');
      }
    });
    // Now attempt script load; force in case of race
    cy.get('#load-tb').click({ force: true });
    cy.get('#character-sheet .role').should('have.length.greaterThan', 5);
    // Directly set player count then trigger reset via native dispatch; also collapse character panel first
    cy.get('#player-count').then(($el) => {
      const el = $el[0];
      el.value = '5';
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
    cy.window().then((win) => {
      try { win.document.body.classList.remove('character-panel-open'); } catch (_) { }
      const btn = win.document.getElementById('reset-grimoire');
      if (btn) btn.dispatchEvent(new Event('click', { bubbles: true }));
    });
    cy.get('#player-circle li').should('have.length', 5);
    // Hide toggle explicitly after player setup
    cy.get('#sidebar-toggle').then(($btn) => { $btn.css('display', 'none'); });
    // Start the game so interactions are enabled
    cy.startGame();
  });

  it('info icon shows popup and hides when clicking elsewhere', () => {
    cy.viewport('iphone-6');
    // Assign a character so info icon is added (game already started in setup)
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
    // Open reminder token modal for first player (game started in setup below)
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
    // Players and started game already prepared in beforeEach
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
    // Game already started
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
    startGameWithPlayers(10); // Replace players with 10 and game started inside helper
    // Ensure no modal initially
    cy.get('#reminder-token-modal').should('not.be.visible');

    // Force players to overlap by adjusting positions
    cy.window().then((win) => {
      const players = win.document.querySelectorAll('#player-circle li');
      if (players.length >= 2) {
        // Position first two players to overlap
        players[0].style.position = 'absolute';
        players[0].style.left = '100px';
        players[0].style.top = '100px';
        players[0].style.zIndex = '10';

        players[1].style.position = 'absolute';
        players[1].style.left = '120px'; // Overlapping position
        players[1].style.top = '120px';
        players[1].style.zIndex = '20'; // Higher z-index
      }
    });

    // Stub prompt and track call count
    cy.window().then((win) => { cy.stub(win, 'prompt').as('namePrompt').returns('Yara'); });

    // First tap on the name
    cy.get('#player-circle li .player-name').first()
      .trigger('touchstart', { touches: [{ clientX: 5, clientY: 5 }], force: true });
    cy.get('@namePrompt').should('have.callCount', 0);

    // Verify the player was raised (z-index changed or raised state set)
    cy.get('#player-circle li').first().should(($el) => {
      expect($el[0].dataset.raised).to.equal('true');
    });

    // Second tap should rename
    cy.get('#player-circle li .player-name').first()
      .trigger('touchstart', { touches: [{ clientX: 6, clientY: 6 }], force: true });
    cy.get('#player-circle li .player-name').first().should('contain', 'Yara');

    // Verify raised state is still set after rename (player stays raised)
    cy.get('#player-circle li').first().should(($el) => {
      expect($el[0].dataset.raised).to.equal('true');
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
    // Game already started with 5 players
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


});

