// Cypress E2E tests - Ended game loading guards and history duplication prevention

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

describe('Ended Game Loading Guards', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.viewport(1280, 900);
    cy.window().then((win) => { try { win.localStorage.clear(); } catch (_) { } });
    cy.get('#load-tb').click();
    cy.get('#character-sheet .role').should('have.length.greaterThan', 5);
  });

  it('hides start game and player setup buttons when loading an ended game from history', () => {
    // Start with 5 players
    startGameWithPlayers(5);

    // Assign characters to all players
    cy.get('#player-circle li').each(($li, index) => {
      cy.wrap($li).find('.player-token').click();
      cy.get('#character-modal').should('be.visible');
      cy.get('#character-search').type('Chef');
      cy.get('#character-grid .token[title="Chef"]').first().click();
      cy.get('#character-modal').should('not.be.visible');
    });

    // Start and end the game
    cy.get('#start-game').click();
    cy.get('#end-game').click();
    cy.get('#end-game-modal').should('be.visible');
    cy.get('#good-wins-btn').click();
    
    // Verify game is ended and saved to history
    cy.get('#grimoire-history-list .history-item').should('have.length', 1);
    cy.get('#start-game').should('be.visible');
    cy.get('#end-game').should('not.be.visible');

    // Start a new game with 6 players
    startGameWithPlayers(6);
    cy.get('#player-circle li').each(($li, index) => {
      cy.wrap($li).find('.player-token').click();
      cy.get('#character-modal').should('be.visible');
      cy.get('#character-search').type('Chef');
      cy.get('#character-grid .token[title="Chef"]').first().click();
      cy.get('#character-modal').should('not.be.visible');
    });

    cy.get('#start-game').click();
    cy.get('#end-game').click();
    cy.get('#end-game-modal').should('be.visible');
    cy.get('#evil-wins-btn').click();
    
    // Verify we now have 2 history entries
    cy.get('#grimoire-history-list .history-item').should('have.length', 2);

    // Load the first ended game (5 players, good wins)
    cy.get('#grimoire-history-list .history-item').last().click();
    
    // Verify we're back to the 5-player ended game
    cy.get('#player-circle li').should('have.length', 5);
    
    // When loading an ended game from history, Start Game and Player Setup buttons should be hidden
    cy.get('#start-game').should('not.be.visible');
    cy.get('#end-game').should('not.be.visible');
    cy.get('#open-player-setup').should('not.be.visible');
    
    // Verify no "New game started" message appears
    cy.contains('#game-status', 'New game started').should('not.exist');
  });

  it('allows starting a new game after resetting an ended game from history', () => {
    // Start with 5 players
    startGameWithPlayers(5);

    // Assign characters to all players
    cy.get('#player-circle li').each(($li, index) => {
      cy.wrap($li).find('.player-token').click();
      cy.get('#character-modal').should('be.visible');
      cy.get('#character-search').type('Chef');
      cy.get('#character-grid .token[title="Chef"]').first().click();
      cy.get('#character-modal').should('not.be.visible');
    });

    // Start and end the game
    cy.get('#start-game').click();
    cy.get('#end-game').click();
    cy.get('#end-game-modal').should('be.visible');
    cy.get('#good-wins-btn').click();
    
    // Verify game is ended and saved to history
    cy.get('#grimoire-history-list .history-item').should('have.length', 1);

    // Load the ended game from history
    cy.get('#grimoire-history-list .history-item').first().click();
    
    // Verify we're back to the ended game with buttons hidden
    cy.get('#player-circle li').should('have.length', 5);
    cy.get('#start-game').should('not.be.visible');
    cy.get('#end-game').should('not.be.visible');
    cy.get('#open-player-setup').should('not.be.visible');
    
    // Reset the grimoire
    cy.get('#reset-grimoire').click();
    
    // After reset, buttons should be visible again
    cy.get('#start-game').should('be.visible');
    cy.get('#open-player-setup').should('be.visible');
    
    // Now we should be able to start a new game
    cy.get('#start-game').click();
    cy.get('#start-game').should('not.be.visible');
    cy.get('#end-game').should('be.visible');
    
    // Verify "New game started" message appears
    cy.contains('#game-status', 'New game started').should('be.visible');
  });

  it('prevents duplicate history entries when resetting grimoire that already exists in history', () => {
    // Start with 5 players
    startGameWithPlayers(5);

    // Assign characters to all players
    cy.get('#player-circle li').each(($li, index) => {
      cy.wrap($li).find('.player-token').click();
      cy.get('#character-modal').should('be.visible');
      cy.get('#character-search').type('Chef');
      cy.get('#character-grid .token[title="Chef"]').first().click();
      cy.get('#character-modal').should('not.be.visible');
    });

    // Start and end the game
    cy.get('#start-game').click();
    cy.get('#end-game').click();
    cy.get('#end-game-modal').should('be.visible');
    cy.get('#good-wins-btn').click();
    
    // Verify game is ended and saved to history
    cy.get('#grimoire-history-list .history-item').should('have.length', 1);

    // Load the ended game from history
    cy.get('#grimoire-history-list .history-item').first().click();
    
    // Verify we're back to the ended game
    cy.get('#player-circle li').should('have.length', 5);
    
    // Reset the grimoire with the same player count
    cy.get('#player-count').then(($el) => {
      const el = $el[0];
      el.value = '5';
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
    cy.get('#reset-grimoire').click();
    
    // Verify we still have only 1 history entry (no duplicate created)
    cy.get('#grimoire-history-list .history-item').should('have.length', 1);
    
    // Verify the grimoire was reset (characters cleared)
    cy.get('#player-circle li').each(($li, index) => {
      cy.wrap($li).find('.player-token').should('not.have.class', 'has-character');
    });
  });

  it('creates new history entry when resetting grimoire with different player count', () => {
    // Start with 5 players
    startGameWithPlayers(5);

    // Assign characters to all players
    cy.get('#player-circle li').each(($li, index) => {
      cy.wrap($li).find('.player-token').click();
      cy.get('#character-modal').should('be.visible');
      cy.get('#character-search').type('Chef');
      cy.get('#character-grid .token[title="Chef"]').first().click();
      cy.get('#character-modal').should('not.be.visible');
    });

    // Start and end the game
    cy.get('#start-game').click();
    cy.get('#end-game').click();
    cy.get('#end-game-modal').should('be.visible');
    cy.get('#good-wins-btn').click();
    
    // Verify game is ended and saved to history
    cy.get('#grimoire-history-list .history-item').should('have.length', 1);

    // Load the ended game from history
    cy.get('#grimoire-history-list .history-item').first().click();
    
    // Verify we're back to the ended game
    cy.get('#player-circle li').should('have.length', 5);
    
    // Reset the grimoire with different player count
    cy.get('#player-count').then(($el) => {
      const el = $el[0];
      el.value = '6';
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
    cy.get('#reset-grimoire').click();
    
    // Verify we now have 2 history entries (original + new 6-player state)
    cy.get('#grimoire-history-list .history-item').should('have.length', 2);
    
    // Verify the grimoire was reset to 6 players
    cy.get('#player-circle li').should('have.length', 6);
  });

  it('shows buttons again after resetting an ended game from history', () => {
    // Start with 5 players
    startGameWithPlayers(5);

    // Assign characters to all players
    cy.get('#player-circle li').each(($li, index) => {
      cy.wrap($li).find('.player-token').click();
      cy.get('#character-modal').should('be.visible');
      cy.get('#character-search').type('Chef');
      cy.get('#character-grid .token[title="Chef"]').first().click();
      cy.get('#character-modal').should('not.be.visible');
    });

    // Start and end the game
    cy.get('#start-game').click();
    cy.get('#end-game').click();
    cy.get('#end-game-modal').should('be.visible');
    cy.get('#good-wins-btn').click();
    
    // Verify game is ended and saved to history
    cy.get('#grimoire-history-list .history-item').should('have.length', 1);

    // Load the ended game from history
    cy.get('#grimoire-history-list .history-item').first().click();
    
    // Verify we're back to the ended game with buttons hidden
    cy.get('#player-circle li').should('have.length', 5);
    cy.get('#start-game').should('not.be.visible');
    cy.get('#end-game').should('not.be.visible');
    cy.get('#open-player-setup').should('not.be.visible');
    
    // Reset the grimoire
    cy.get('#reset-grimoire').click();
    
    // After reset, buttons should be visible again
    cy.get('#start-game').should('be.visible');
    cy.get('#open-player-setup').should('be.visible');
    
    // Player setup should work
    cy.get('#open-player-setup').click();
    cy.get('#player-setup-panel').should('be.visible');
  });
});