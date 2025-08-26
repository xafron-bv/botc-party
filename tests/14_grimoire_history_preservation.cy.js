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
    
    // Should now have 3 history items
    cy.get('#grimoire-history-list .history-item').should('have.length', 3);
    
    // Should be back to 6 players with the name we set
    cy.get('#player-circle li').should('have.length', 6);
    cy.get('#player-circle li').eq(0).find('.player-name').should('contain', 'Charlie');
  });

  it('creates snapshots each time a history item is loaded', () => {
    // Start with 5 players
    startGameWithPlayers(5);
    
    // Start new game with 6 players to create history
    startGameWithPlayers(6);
    cy.get('#grimoire-history-list .history-item').should('have.length', 1);
    
    // Load the history item multiple times
    cy.get('#grimoire-history-list .history-item').first().click();
    cy.get('#grimoire-history-list .history-item').should('have.length', 2);
    
    // Loading again should create another snapshot
    cy.get('#grimoire-history-list .history-item').eq(1).click();
    cy.get('#grimoire-history-list .history-item').should('have.length', 3);
  });
});