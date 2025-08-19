// Cypress E2E tests - Death ribbon, text reminders, modal behaviors, filtering

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

describe('Death & Reminders', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.viewport(1280, 900);
    cy.window().then((win) => {
      try { win.localStorage.clear(); } catch (_) {}
    });
    cy.get('#load-tb').click();
    cy.get('#character-sheet .role').should('have.length.greaterThan', 5);
    startGameWithPlayers(5);
    // Assign one character to enable ability UI
    cy.get('#player-circle li .player-token').first().click();
    cy.get('#character-modal').should('be.visible');
    cy.get('#character-search').type('Chef');
    cy.get('#character-grid .token[title="Chef"]').first().click();
  });

  it('toggles death ribbon and persists visual state', () => {
    // Click the death ribbon shapes (rect/path) to ensure event binding is hit
    cy.get('#player-circle li .player-token .death-ribbon').first().within(() => {
      cy.get('rect, path').first().click({ force: true });
    });
    cy.get('#player-circle li .player-token').first().should('have.class', 'is-dead');

    // Toggle back via another shape click
    cy.get('#player-circle li .player-token .death-ribbon').first().within(() => {
      cy.get('rect, path').last().click({ force: true });
    });
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

    // Delete text reminder via hover delete icon on desktop
    cy.window().then((win) => { cy.stub(win, 'confirm').returns(true); });
    cy.get('#player-circle li .text-reminder').first().trigger('mouseenter');
    cy.get('#player-circle li .text-reminder .reminder-action.delete').first().click({ force: true });
    cy.get('#player-circle li .text-reminder').should('have.length', 0);
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

    // Search by character name only (Monk is in Trouble Brewing)
    cy.get('#reminder-token-search').clear().type('monk');
    cy.get('#reminder-token-grid .token[title="Protected"]').should('have.length.greaterThan', 0);

    // Multi-term search: character name + partial wording
    cy.get('#reminder-token-search').clear().type('monk prot');
    cy.get('#reminder-token-grid .token[title="Protected"]').should('have.length.greaterThan', 0);

    // Close
    cy.get('#reminder-token-modal').click('topLeft', { force: true });
    cy.get('#reminder-token-modal').should('not.be.visible');
  });
});

