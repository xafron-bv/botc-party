// Cypress E2E tests - Grimoire history preservation when loading older versions

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

    // Now change to 6 players - this creates history entry #1
    startGameWithPlayers(6);
    cy.get('#grimoire-history-list .history-item').should('have.length', 1);

    // Rename the first player in the 6-player game
    cy.get('#player-circle li').eq(0).find('.player-name').click();
    cy.get('#player-circle li').eq(0).find('.player-name').should('contain', 'Charlie');

    // Count history items before loading
    cy.get('#grimoire-history-list .history-item').should('have.length', 1);

    // Click on the first history item (the 5-player game)
    cy.get('#grimoire-history-list .history-item').first().click();

    // Should now have 2 history items (current 6-player game saved before loading)
    cy.get('#grimoire-history-list .history-item').should('have.length', 2);

    // Should be back to 5 players with original names
    cy.get('#player-circle li').should('have.length', 5);
    cy.get('#player-circle li').eq(0).find('.player-name').should('contain', 'Alice');
    cy.get('#player-circle li').eq(1).find('.player-name').should('contain', 'Bob');

    // Click on the newest history item (the 6-player game we just saved)
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

    // Start new game with 6 players to create history
    startGameWithPlayers(6);
    cy.get('#grimoire-history-list .history-item').should('have.length', 1);

    // Load the history item (5 players) - should create snapshot of 6-player game
    cy.get('#grimoire-history-list .history-item').first().click();
    cy.get('#grimoire-history-list .history-item').should('have.length', 2);
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

    // Start new game with 6 players to create history (State A saved)
    startGameWithPlayers(6);
    cy.get('#grimoire-history-list .history-item').should('have.length', 1);

    // Load State A (5 players) - this should save State B
    cy.get('#grimoire-history-list .history-item').first().click();
    cy.get('#grimoire-history-list .history-item').should('have.length', 2);
    cy.get('#player-circle li').should('have.length', 5);

    // Now we have two unique states in history
    // Switching between them should NOT create any new history items

    // Switch back to State B (6 players) - should NOT create new history
    cy.get('#grimoire-history-list .history-item').first().click();
    cy.get('#grimoire-history-list .history-item').should('have.length', 2); // Still 2
    cy.get('#player-circle li').should('have.length', 6);

    // Switch to State A again - should NOT create new history
    cy.get('#grimoire-history-list .history-item').last().click();
    cy.get('#grimoire-history-list .history-item').should('have.length', 2); // Still 2
    cy.get('#player-circle li').should('have.length', 5);

    // Switch multiple more times - count should remain stable
    cy.get('#grimoire-history-list .history-item').first().click();
    cy.get('#grimoire-history-list .history-item').should('have.length', 2);

    cy.get('#grimoire-history-list .history-item').last().click();
    cy.get('#grimoire-history-list .history-item').should('have.length', 2);

    cy.get('#grimoire-history-list .history-item').first().click();
    cy.get('#grimoire-history-list .history-item').should('have.length', 2);
  });
});
