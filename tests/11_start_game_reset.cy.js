// Cypress E2E tests - Start Game reset behavior preserves names

const startGameWithPlayers = (n) => {
  cy.get('#player-count').then(($el) => {
    const el = $el[0];
    el.value = String(n);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  });
  cy.get('#reset-grimoire').click();
  cy.get('#player-circle li').should('have.length', n);
};

describe('Reset Grimoire preserves names but clears assignments/reminders/death', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.viewport(1280, 900);
    cy.window().then((win) => { try { win.localStorage.clear(); } catch (_) { } });
    cy.get('#load-tb').click();
    cy.get('#character-sheet .role').should('have.length.greaterThan', 5);
    startGameWithPlayers(6);
  });

  it('resets players while keeping names and shows feedback', () => {
    // Rename first player to Alice
    cy.window().then((win) => { cy.stub(win, 'prompt').returns('Alice'); });
    cy.get('#player-circle li .player-name').first().click();
    cy.get('#player-circle li .player-name').first().should('contain', 'Alice');

    // Assign a character to first player
    cy.get('#player-circle li .player-token').first().click();
    cy.get('#character-modal').should('be.visible');
    cy.get('#character-search').type('Chef');
    cy.get('#character-grid .token[title="Chef"]').first().click();
    cy.get('#character-modal').should('not.be.visible');
    cy.get('#player-circle li .player-token').first().should('have.class', 'has-character');

    // Add a reminder token to first player
    cy.get('#player-circle li .reminder-placeholder').first().click();
    cy.get('#reminder-token-modal').should('be.visible');
    cy.get('#reminder-token-grid .token').first().click();
    cy.get('#reminder-token-modal').should('not.be.visible');
    cy.get('#player-circle li').first().find('.icon-reminder, .text-reminder').should('have.length.greaterThan', 0);

    // Mark dead via ribbon
    cy.get('#player-circle li .player-token .death-ribbon').first().within(() => {
      cy.get('rect, path').first().click({ force: true });
    });
    cy.get('#player-circle li .player-token').first().should('have.class', 'is-dead');

    // Click Reset Grimoire again with same count; expect reset but name preserved
    cy.get('#reset-grimoire').click();

    // No start message on reset (shown only when Start Game is clicked)
    cy.contains('#game-status', 'New game started').should('not.exist');

    // Names preserved
    cy.get('#player-circle li .player-name').first().should('contain', 'Alice');

    // Character cleared
    cy.get('#player-circle li .player-token').first().should('not.have.class', 'has-character');
    cy.get('#player-circle li .character-name').first().should('have.text', '');

    // Reminders cleared
    cy.get('#player-circle li').first().find('.icon-reminder, .text-reminder').should('have.length', 0);

    // Death reset
    cy.get('#player-circle li .player-token').first().should('not.have.class', 'is-dead');
  });
});
