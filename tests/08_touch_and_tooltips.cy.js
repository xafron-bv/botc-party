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
      try { win.localStorage.clear(); } catch (_) {}
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
      try { win.localStorage.clear(); } catch (_) {}
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
    // Expand second player's stack via touchstart (simulate tap on its area)
    cy.get('#player-circle li').eq(1).trigger('touchstart', { touches: [{ clientX: 5, clientY: 5 }] });
    cy.get('#player-circle li').eq(1).should('have.attr', 'data-expanded', '1');
    // Now tap plus on first player: should collapse second and expand first, but NOT open modal yet
    cy.get('#player-circle li .reminder-placeholder').eq(0).click({ force: true });
    cy.get('#player-circle li').eq(0).should('have.attr', 'data-expanded', '1');
    cy.get('#reminder-token-modal').should('not.be.visible');
    // Tap plus again: now the modal should open
    cy.get('#player-circle li .reminder-placeholder').eq(0).click({ force: true });
    cy.get('#reminder-token-modal').should('be.visible');
    // Close
    cy.get('#reminder-token-modal').click('topLeft', { force: true });
    cy.get('#reminder-token-modal').should('not.be.visible');
  });

  it('shows press feedback on long-press capable reminder tokens on touch', () => {
    cy.viewport('iphone-6');
    // Add one reminder to first player to have a token
    cy.get('#player-circle li .reminder-placeholder').first().click({ force: true });
    cy.get('#reminder-token-modal').should('be.visible');
    cy.get('#reminder-token-grid .token').first().click({ force: true });
    cy.get('#reminder-token-modal').should('not.be.visible');

    // Ensure the stack is expanded so interaction is clear
    cy.get('#player-circle li').first().trigger('touchstart', { touches: [{ clientX: 5, clientY: 5 }] });
    cy.get('#player-circle li').first().should('have.attr', 'data-expanded', '1');

    // Long-press start shows visual feedback
    cy.get('#player-circle li').first().find('.icon-reminder, .text-reminder').first()
      .trigger('touchstart', { touches: [{ clientX: 5, clientY: 5 }], force: true });
    cy.get('#player-circle li').first().find('.icon-reminder.press-feedback, .text-reminder.press-feedback').should('exist');
    // End press removes feedback
    cy.get('#player-circle li').first().find('.icon-reminder, .text-reminder').first()
      .trigger('touchend', { force: true });
    cy.get('#player-circle li').first().find('.icon-reminder.press-feedback, .text-reminder.press-feedback').should('not.exist');
  });
});

