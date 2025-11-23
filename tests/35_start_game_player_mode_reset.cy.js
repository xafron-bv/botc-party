// Cypress E2E tests - Start Game button reset behavior differs by mode (uses shared cy.setupGame helper)

describe('Game state reset vs preserve by mode changes', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.window().then((win) => { try { win.localStorage.clear(); } catch (_) { } });
    cy.setupGame({ players: 5, loadScript: true });
  });

  it('Player mode: resetting after winner clears characters/reminders/death', () => {
    // Game already set up via beforeEach helper
    // Assign a character and death state to first player
    cy.get('#player-circle li .player-token').first().click({ force: true });
    cy.get('#character-modal', { timeout: 6000 }).should('be.visible');
    cy.get('#character-search').type('Chef');
    cy.get('#character-grid .token[title="Chef"]').first().click();
    cy.get('#character-modal').should('not.be.visible');
    cy.get('#player-circle li .player-token').first().should('have.class', 'has-character');

    // Mark dead via ribbon
    cy.get('#player-circle li .player-token .death-ribbon').first().within(() => {
      cy.get('rect, path').first().click({ force: true });
    });
    cy.get('#player-circle li .player-token').first().should('have.class', 'is-dead');

    // Switch to player mode and end with winner
    cy.get('#mode-player').check({ force: true });
    cy.get('#end-game').click({ force: true });
    cy.get('#end-game-modal').should('be.visible');
    cy.get('#good-wins-btn').click();

    // Reset grimoire should clear state
    cy.get('#reset-grimoire').click({ force: true });

    // After reset we expect a clean state: characters cleared, not dead
    cy.get('#player-circle li .player-token').first().should('not.have.class', 'has-character');
    cy.get('#player-circle li .player-token').first().should('not.have.class', 'is-dead');
  });

  it('Storyteller mode: State preserved when already started (no implicit reset)', () => {
    // Game already set up via beforeEach helper
    // Assign one character and death state, then end with winner to ensure state remains until reset
    cy.get('#player-circle li .player-token').first().click({ force: true });
    cy.get('#character-modal', { timeout: 6000 }).should('be.visible');
    cy.get('#character-search').type('Chef');
    cy.get('#character-grid .token[title="Chef"]').first().click();
    cy.get('#player-circle li .player-token').first().should('have.class', 'has-character');
    cy.get('#player-circle li .player-token .death-ribbon').first().within(() => {
      cy.get('rect, path').first().click({ force: true });
    });
    cy.get('#player-circle li .player-token').first().should('have.class', 'is-dead');
    // End game
    cy.get('#end-game').click({ force: true });
    cy.get('#end-game-modal').should('be.visible');
    cy.get('#good-wins-btn').click();
    // Expect state preserved in storyteller mode (no implicit reset of characters until manual reset)
    cy.get('#player-circle li .player-token').first().should('have.class', 'has-character');
  });
});
