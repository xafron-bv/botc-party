// Cypress E2E tests - Start Game button reset behavior differs by mode

const preparePlayers = (n) => {
  cy.get('#player-count').then(($el) => {
    const el = $el[0];
    el.value = String(n);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  });
  cy.get('#reset-grimoire').click();
  cy.get('#player-circle li').should('have.length', n);
};

describe('Start Game button conditional reset', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.viewport(1280, 900);
    cy.window().then((win) => { try { win.localStorage.clear(); } catch (_) { } });
    cy.get('#load-tb').click();
    cy.get('#character-sheet .role').should('have.length.greaterThan', 5);
  });

  it('Player mode: Start Game resets grimoire (clears characters/reminders/death)', () => {
    preparePlayers(5);
    // Assign a character and death state to first player
    cy.get('#player-circle li .player-token').first().click();
    cy.get('#character-modal').should('be.visible');
    cy.get('#character-search').type('Chef');
    cy.get('#character-grid .token[title="Chef"]').first().click();
    cy.get('#character-modal').should('not.be.visible');
    cy.get('#player-circle li .player-token').first().should('have.class', 'has-character');

    // Mark dead via ribbon
    cy.get('#player-circle li .player-token .death-ribbon').first().within(() => {
      cy.get('rect, path').first().click({ force: true });
    });
    cy.get('#player-circle li .player-token').first().should('have.class', 'is-dead');

    // Switch to player mode then click Start Game
    cy.get('#mode-player').check({ force: true });
    cy.get('#start-game').should('not.be.disabled').click({ force: true });

    // After starting game in player mode we expect a reset state: characters cleared, not dead
    cy.get('#player-circle li .player-token').first().should('not.have.class', 'has-character');
    cy.get('#player-circle li .player-token').first().should('not.have.class', 'is-dead');
  });

  it('Storyteller mode: Start Game does NOT reset grimoire (state preserved)', () => {
    preparePlayers(5);
    // Assign characters to ALL players (required to enable Start Game in storyteller mode)
    cy.get('#player-circle li .player-token').each(($el, idx) => {
      cy.wrap($el).click();
      cy.get('#character-modal').should('be.visible');
      if (idx === 0) {
        cy.get('#character-search').clear().type('Chef');
      }
      cy.get('#character-grid .token[title="Chef"]').first().click();
      cy.get('#character-modal').should('not.be.visible');
    });
    cy.get('#player-circle li .player-token').should('have.length', 5).each(($el) => {
      cy.wrap($el).should('have.class', 'has-character');
    });

    // Mark first player dead
    cy.get('#player-circle li .player-token .death-ribbon').first().within(() => {
      cy.get('rect, path').first().click({ force: true });
    });
    cy.get('#player-circle li .player-token').first().should('have.class', 'is-dead');

    // Ensure storyteller mode (default) and click Start Game
    cy.get('#mode-storyteller').should('be.checked');
    cy.get('#start-game').should('not.be.disabled').click({ force: true });

    // After starting game in storyteller mode we expect state preserved for first player
    cy.get('#player-circle li .player-token').first().should('have.class', 'has-character');
    cy.get('#player-circle li .player-token').first().should('have.class', 'is-dead');
  });
});
