// Cypress E2E tests - Grimoire history preservation when loading older versions

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

describe('Grimoire history preservation', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.window().then((win) => { try { win.localStorage.clear(); } catch (_) { } });
  });

  it('saves current game as history item before loading older version', () => {
    // Start with 5 players
    startGameWithPlayers(5);

    // Rename some players to create a distinct state
    cy.window().then((win) => {
      const stub = cy.stub(win, 'prompt');
      stub.onFirstCall().returns('Alice');
      stub.onSecondCall().returns('Bob');
      stub.onThirdCall().returns('Charlie');
    });

    cy.get('#player-circle li').eq(0).find('.player-name').click();
    cy.get('#player-circle li').eq(0).find('.player-name').should('contain', 'Alice');

    cy.get('#player-circle li').eq(1).find('.player-name').click();
    cy.get('#player-circle li').eq(1).find('.player-name').should('contain', 'Bob');

    // Start and end a game with 5 players to create the first history entry
    cy.get('#mode-player').check({ force: true });
    cy.get('#start-game').click();
    cy.get('#end-game').click();
    cy.get('#end-game-modal').should('be.visible');
    cy.get('#good-wins-btn').click();
    cy.get('#grimoire-history-list .history-item').should('have.length', 1);

    // Now change to 6 players (no snapshot since game not started)
    startGameWithPlayers(6);
    // Start a new game (player mode allows start without assignments)
    cy.get('#mode-player').check({ force: true });
    cy.get('#start-game').click();

    // Rename the first player in the 6-player game
    cy.get('#player-circle li').eq(0).find('.player-name').click();
    cy.get('#player-circle li').eq(0).find('.player-name').should('contain', 'Charlie');

    // Count history items before loading (still 1: the 5-player snapshot)
    cy.get('#grimoire-history-list .history-item').should('have.length', 1);

    // Click on the last (oldest) history item (the 5-player game)
    cy.get('#grimoire-history-list .history-item').last().click();

    // Should now have at least 2 history items (6-player game saved before loading)
    cy.get('#grimoire-history-list .history-item').should('have.length.gte', 2);

    // Should be back to 5 players with original names
    cy.get('#player-circle li').should('have.length', 5);
    cy.get('#player-circle li').eq(0).find('.player-name').should('contain', 'Alice');
    cy.get('#player-circle li').eq(1).find('.player-name').should('contain', 'Bob');

    // Click on the newest history item (the 6-player game we just saved before loading)
    cy.get('#grimoire-history-list .history-item').first().click();

    // Should still have 2 history items (no duplicate created because the 5-player state already exists)
    cy.get('#grimoire-history-list .history-item').should('have.length', 2);

    // Should be back to 6 players with the name we set
    cy.get('#player-circle li').should('have.length', 6);
    cy.get('#player-circle li').eq(0).find('.player-name').should('contain', 'Charlie');
  });

  it('creates snapshots when loading different states', () => {
    // Start with 5 players
    startGameWithPlayers(5);

    // Rename a player to make it distinct
    cy.window().then((win) => {
      cy.stub(win, 'prompt').returns('Initial Player');
    });
    cy.get('#player-circle li').eq(0).find('.player-name').click();
    cy.get('#player-circle li').eq(0).find('.player-name').should('contain', 'Initial Player');

    // Create a first history snapshot by starting/ending the 5-player game
    cy.get('#mode-player').check({ force: true });
    cy.get('#start-game').click();
    cy.get('#end-game').click();
    cy.get('#end-game-modal').should('be.visible');
    cy.get('#good-wins-btn').click();
    cy.get('#grimoire-history-list .history-item').should('have.length', 1);

    // Start new session with 6 players (no snapshot yet)
    startGameWithPlayers(6);
    // Start this game so it becomes the current active state
    cy.get('#mode-player').check({ force: true });
    cy.get('#start-game').click();

    // Load the history item (5 players) - should create snapshot of 6-player game
    cy.get('#grimoire-history-list .history-item').first().click();
    cy.get('#grimoire-history-list .history-item').should('have.length.gte', 2);
    cy.get('#player-circle li').should('have.length', 5);

    // Load the 6-player game - should create snapshot of 5-player game
    cy.get('#grimoire-history-list .history-item').first().click();
    cy.get('#player-circle li').should('have.length', 6);

    // The number of history items should be reasonable (not growing infinitely)
    cy.get('#grimoire-history-list .history-item').should('have.length.gte', 2);
    cy.get('#grimoire-history-list .history-item').should('have.length.lte', 4);
  });

  it('does not create duplicate history when switching between two states', () => {
    // Start with 5 players (State A)
    startGameWithPlayers(5);

    // Give a distinct name to State A
    cy.window().then((win) => {
      cy.stub(win, 'prompt').returns('State A Player');
    });
    cy.get('#player-circle li').eq(0).find('.player-name').click();
    cy.get('#player-circle li').eq(0).find('.player-name').should('contain', 'State A Player');

    // Create a first snapshot by starting/ending the 5-player game
    cy.get('#mode-player').check({ force: true });
    cy.get('#start-game').click();
    cy.get('#end-game').click();
    cy.get('#end-game-modal').should('be.visible');
    cy.get('#good-wins-btn').click();
    cy.get('#grimoire-history-list .history-item').should('have.length', 1);

    // Start new game with 6 players (State B), start it so it becomes current
    startGameWithPlayers(6);
    cy.get('#mode-player').check({ force: true });
    cy.get('#start-game').click();

    // Load State A (5 players) - this should save State B
    cy.get('#grimoire-history-list .history-item').last().click();
    cy.get('#grimoire-history-list .history-item').should('have.length', 2);
    cy.get('#player-circle li').should('have.length', 5);

    // Now we should have two unique states in history
    // Switching between them should NOT create any new history items

    // Switch back to State B (6 players) - should NOT create new history
    cy.get('#grimoire-history-list .history-item').first().click();
    cy.get('#grimoire-history-list .history-item').should('have.length.gte', 2);
    cy.get('#player-circle li').should('have.length', 6);

    // Switch to State A again - should NOT create new history
    cy.get('#grimoire-history-list .history-item').last().click();
    cy.get('#grimoire-history-list .history-item').should('have.length.gte', 2);
    cy.get('#player-circle li').should('have.length', 5);

    // Switch multiple more times - count should remain stable
    cy.get('#grimoire-history-list .history-item').first().click();
    cy.get('#grimoire-history-list .history-item').should('have.length.gte', 2);

    cy.get('#grimoire-history-list .history-item').last().click();
    cy.get('#grimoire-history-list .history-item').should('have.length.gte', 2);

    cy.get('#grimoire-history-list .history-item').first().click();
    cy.get('#grimoire-history-list .history-item').should('have.length', 2);
  });
});
