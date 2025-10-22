// Cypress E2E tests - Death ribbon, text reminders, modal behaviors, filtering

// Use shared cy.setupGame helper for pre-game gating

describe('Death & Reminders', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.viewport(1280, 900);
    cy.window().then((win) => {
      try { win.localStorage.clear(); } catch (_) { }
    });
    // Ensure the sidebar is open so the persistent desktop toggle does not cover
    // the load script buttons after UI changes making it always visible.
    cy.get('body').then(($body) => {
      if ($body.hasClass('sidebar-collapsed') || !$body.hasClass('sidebar-open')) {
        const toggle = $body.find('#sidebar-toggle:visible');
        if (toggle.length) {
          cy.wrap(toggle).click({ force: true });
        }
        // Fallback: directly add class if still not open (race resilience)
        if (!$body.hasClass('sidebar-open')) {
          $body.addClass('sidebar-open');
          $body.removeClass('sidebar-collapsed');
        }
      }
    });
    cy.get('#load-tb').click({ force: true });
    cy.get('#character-sheet .role').should('have.length.greaterThan', 5);
    cy.setupGame({ players: 5, loadScript: false });
    // Assign one character to enable ability UI
    cy.get('#player-circle li .player-token').first().click({ force: true });
    cy.get('#character-modal').should('be.visible');
    cy.get('#character-search').type('Chef');
    cy.get('#character-grid .token[title="Chef"]').first().click();
  });

  it('toggles death ribbon through 3-phase cycle (dead -> vote used -> resurrect)', () => {
    // Phase 1: Alive -> Dead
    cy.get('#player-circle li .player-token .death-ribbon').first().within(() => {
      cy.get('rect, path').first().click({ force: true });
    });
    cy.get('#player-circle li .player-token').first().should('have.class', 'is-dead');
    cy.get('#player-circle li .player-token').first().find('.death-vote-indicator').should('exist');

    // Phase 2: Use ghost vote (indicator removed but still dead)
    cy.get('#player-circle li .player-token .death-ribbon').first().within(() => {
      cy.get('rect, path').eq(1).click({ force: true });
    });
    cy.get('#player-circle li .player-token').first().should('have.class', 'is-dead');
    cy.get('#player-circle li .player-token').first().find('.death-vote-indicator').should('not.exist');

    // Phase 3: Resurrect (stub confirm dialog to auto-confirm)
    cy.window().then((win) => { cy.stub(win, 'confirm').returns(true).as('confirmStub'); });
    cy.get('#player-circle li .player-token .death-ribbon').first().within(() => {
      cy.get('rect, path').eq(2).click({ force: true });
    });
    cy.get('@confirmStub').should('have.been.called');
    cy.get('#player-circle li .player-token').first().should('not.have.class', 'is-dead');
  });

  it('adds text reminder via Alt-click on + and can edit/delete it', () => {
    // Alt-click opens text reminder modal on desktop
    cy.get('#player-circle li .reminder-placeholder').first().click({ altKey: true, force: true });
    cy.get('#text-reminder-modal').should('be.visible');
    cy.get('#reminder-text-input').type('Poisoned today');
    cy.get('#save-reminder-btn').click();
    cy.get('#text-reminder-modal').should('not.be.visible');
    cy.get('#player-circle li').first().find('.text-reminder .text-reminder-content').should('contain', 'Poisoned today');

    // Edit via hover edit icon on desktop
    cy.window().then((win) => {
      cy.stub(win, 'prompt').returns('Poisoned at dusk');
    });
    cy.get('#player-circle li .text-reminder').first().trigger('mouseenter');
    cy.get('#player-circle li .text-reminder .reminder-action.edit').first().click({ force: true });
    cy.get('#player-circle li').first().find('.text-reminder .text-reminder-content').should('contain', 'Poisoned at dusk');

    // Delete text reminder via hover delete icon on desktop (no confirmation expected)
    cy.window().then((win) => { cy.stub(win, 'confirm').as('confirmStub'); });
    cy.get('#player-circle li .text-reminder').first().trigger('mouseenter');
    cy.get('@confirmStub').its('callCount').then((before) => {
      cy.get('#player-circle li .text-reminder .reminder-action.delete').first().click({ force: true });
      cy.get('@confirmStub').its('callCount').should('eq', before);
    });
    cy.get('#player-circle li .text-reminder').should('have.length', 0);
  });

  it('deletes icon reminder without confirmation and short labels are not force-spaced', () => {
    // Add a generic icon reminder
    cy.get('#player-circle li .reminder-placeholder').first().click({ force: true });
    cy.get('#reminder-token-modal').should('be.visible');
    cy.get('#reminder-token-grid .token[title="Wrong"]').first().click({ force: true });
    cy.get('#reminder-token-modal').should('not.be.visible');
    cy.get('#player-circle li').first().find('.icon-reminder').should('have.length.greaterThan', 0);

    // Expand stack for hover actions (hover reminders region only)
    cy.get('#player-circle li').first().find('.reminders').trigger('mouseenter', { force: true });
    cy.get('#player-circle li').first().should('have.attr', 'data-expanded', '1');

    // Edit the icon reminder label to a very short string 'hi'
    cy.window().then((win) => { cy.stub(win, 'prompt').returns('hi'); });
    cy.get('#player-circle li').first().find('.icon-reminder').first().trigger('mouseenter');
    cy.get('#player-circle li').first().find('.icon-reminder .reminder-action.edit').first().click({ force: true });
    // Assert the curved SVG text renders without forced spacing (no textLength for short labels)
    cy.get('#player-circle li').first().find('.icon-reminder .icon-reminder-svg textPath').first()
      .should('contain.text', 'hi')
      .invoke('attr', 'textLength').should('be.undefined');

    // Delete the icon reminder and ensure no confirmation occurs
    cy.window().then((win) => { cy.stub(win, 'confirm').as('confirmStub2'); });
    cy.get('#player-circle li').first().find('.icon-reminder').first().trigger('mouseenter');
    cy.get('@confirmStub2').its('callCount').then((before) => {
      cy.get('#player-circle li').first().find('.icon-reminder .reminder-action.delete').first().click({ force: true });
      cy.get('@confirmStub2').its('callCount').should('eq', before);
    });
    cy.get('#player-circle li').first().find('.icon-reminder').should('have.length', 0);
  });

  it('reminder token modal opens/closes via backdrop and search filters tokens', () => {
    // Ensure no other stacks are expanded, then open modal
    cy.get('#player-circle li').should('have.attr', 'data-expanded', '0');
    cy.get('#player-circle li .reminder-placeholder').first().click({ force: true });
    cy.get('#reminder-token-modal').should('be.visible');

    // Filter tokens for "Wrong"
    cy.get('#reminder-token-search').type('wrong');
    cy.get('#reminder-token-grid .token').should('have.length.greaterThan', 0);
    // Ensure a generic token like "Wrong" is present
    cy.get('#reminder-token-grid .token[title="Wrong"]').should('have.length.greaterThan', 0);
    cy.get('#reminder-token-grid .token').first().click();
    cy.get('#reminder-token-modal').should('not.be.visible');
    cy.get('#player-circle li .icon-reminder').should('have.length.greaterThan', 0);

    // Open again and close by clicking backdrop (outside content)
    cy.get('#player-circle li .reminder-placeholder').first().click({ force: true });
    cy.get('#reminder-token-modal').should('be.visible');
    // Click on the modal background by targeting the container itself
    cy.get('#reminder-token-modal').click('topLeft', { force: true });
    cy.get('#reminder-token-modal').should('not.be.visible');
  });

  it('searches reminder tokens by character name and combined terms', () => {
    // Open modal
    cy.get('#player-circle li .reminder-placeholder').first().click({ force: true });
    cy.get('#reminder-token-modal').should('be.visible');

    // Search by character name only - use a character we know is in TB and has reminders
    // Fortune Teller has "Red Herring" reminder
    cy.get('#reminder-token-search').clear().type('fortune');
    cy.get('#reminder-token-grid .token').should('have.length.greaterThan', 0);
    cy.get('#reminder-token-grid .token[title="Red Herring"]').should('exist');

    // Multi-term search: character name + partial wording
    cy.get('#reminder-token-search').clear().type('fortune red');
    cy.get('#reminder-token-grid .token[title="Red Herring"]').should('exist');

    // Close
    cy.get('#reminder-token-modal').click('topLeft', { force: true });
    cy.get('#reminder-token-modal').should('not.be.visible');
  });

  it('touch: tapping death ribbon does not expand a collapsed reminder stack', () => {
    // Reload in touch mode to ensure touch paths
    cy.visit('/', {
      onBeforeLoad(win) {
        Object.defineProperty(win, 'ontouchstart', { value: true, configurable: true });
        Object.defineProperty(win.navigator, 'maxTouchPoints', { value: 1, configurable: true });
      }
    });
    cy.window().then((win) => { try { win.localStorage.clear(); } catch (_) { } });
    // Load Trouble Brewing and start game using shared helper (handles pre-game gating)
    cy.get('#load-tb').click({ force: true });
    cy.get('#character-sheet .role').should('have.length.greaterThan', 5);
    cy.setupGame({ players: 5, loadScript: false });
    // Add one reminder to first player so there is a collapsed stack
    cy.get('#player-circle li .reminder-placeholder').first().click({ force: true });
    cy.get('#reminder-token-modal').should('be.visible');
    cy.get('#reminder-token-grid .token[title="Wrong"]').first().click();
    cy.get('#reminder-token-modal').should('not.be.visible');
    // Ensure stack is collapsed
    cy.get('#player-circle li').first().invoke('attr', 'data-expanded', '0');
    cy.get('#player-circle li').first().should('have.attr', 'data-expanded', '0');
    // Tap death ribbon (simulate touch)
    cy.get('#player-circle li').first().find('.death-ribbon')
      .trigger('touchstart', { touches: [{ clientX: 5, clientY: 5 }], force: true });
    cy.get('#player-circle li').first().find('.death-ribbon')
      .trigger('touchend', { force: true });
    // Should remain collapsed
    cy.get('#player-circle li').first().should('have.attr', 'data-expanded', '0');
  });

  it('touch: long press on death ribbon opens menu without toggling state', () => {
    cy.visit('/', {
      onBeforeLoad(win) {
        Object.defineProperty(win, 'ontouchstart', { value: true, configurable: true });
        Object.defineProperty(win.navigator, 'maxTouchPoints', { value: 1, configurable: true });
      }
    });
    cy.window().then((win) => { try { win.localStorage.clear(); } catch (_) { } });
    cy.get('#load-tb').click({ force: true });
    cy.get('#character-sheet .role').should('have.length.greaterThan', 5);
    cy.setupGame({ players: 5, loadScript: false });

    cy.get('#player-circle li .player-token').first().should('not.have.class', 'is-dead');

    cy.get('#player-circle li').first().find('.death-ribbon')
      .trigger('touchstart', { touches: [{ clientX: 10, clientY: 10 }], force: true });
    cy.wait(550);
    cy.get('#player-circle li').first().find('.death-ribbon')
      .trigger('touchend', { force: true });

    cy.get('#player-context-menu').should('be.visible');

    // Simulate the synthetic click Mobile Safari emits after touchend
    cy.get('#player-circle li .death-ribbon').first().find('rect, path').first()
      .trigger('click', { force: true });

    cy.get('#player-circle li .player-token').first().should('not.have.class', 'is-dead');

    cy.get('body').click('topLeft', { force: true });
  });

  it('desktop: hovering over character circle does not expand collapsed reminders', () => {
    // Desktop default visit already done in beforeEach
    // Add one reminder to first player
    cy.get('#player-circle li .reminder-placeholder').first().click({ force: true });
    cy.get('#reminder-token-modal').should('be.visible');
    cy.get('#reminder-token-grid .token[title="Wrong"]').first().click();
    cy.get('#reminder-token-modal').should('not.be.visible');
    // Ensure collapsed
    cy.get('#player-circle li').first().invoke('attr', 'data-expanded', '0');
    cy.get('#player-circle li').first().should('have.attr', 'data-expanded', '0');
    // Hover over token
    cy.get('#player-circle li').first().find('.player-token').trigger('mouseenter');
    // Should remain collapsed
    cy.get('#player-circle li').first().should('have.attr', 'data-expanded', '0');
  });
});

