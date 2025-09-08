// Cypress E2E tests - Reset confirmation logic after loading ended game from history

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

describe('Reset confirmation after loading ended game from history', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.viewport(1280, 900);
    cy.window().then((win) => { try { win.localStorage.clear(); } catch (_) { } });
    cy.get('#load-tb').click();
    cy.get('#character-sheet .role').should('have.length.greaterThan', 5);
  });

  it('does not ask for confirmation when resetting after loading an ended game from history', () => {
    // Create and end a game to generate a history item
    startGameWithPlayers(5);
    cy.get('#mode-player').check({ force: true });
    cy.get('#start-game').click();
    cy.get('#end-game').click();
    cy.get('#end-game-modal').should('be.visible');
    cy.get('#good-wins-btn').click();
    cy.get('#grimoire-history-list .history-item').should('have.length.greaterThan', 0);

    // Load the ended game from history
    cy.get('#grimoire-history-list .history-item').first().click();

    // Stubbing confirm to detect whether it's called
    cy.window().then((win) => { cy.stub(win, 'confirm').as('confirmStub'); });

    // Reset should not ask for confirmation since the loaded game is ended
    cy.get('#reset-grimoire').click();
    cy.get('@confirmStub').should('have.callCount', 0);

    // Still should reset to current player count without blocking
    cy.get('#player-circle li').should('have.length', 5);
  });

  it('asks for confirmation when loading a history item while a game is started', () => {
    startGameWithPlayers(5);
    cy.get('#mode-player').check({ force: true });
    cy.get('#start-game').click();

    // Create a history item by ending the game
    cy.get('#end-game').click();
    cy.get('#end-game-modal').should('be.visible');
    cy.get('#good-wins-btn').click();
    cy.get('#grimoire-history-list .history-item').should('have.length.greaterThan', 0);

    // Start a new game so current session is active
    cy.get('#start-game').click();

    // Stub confirm and click a history item
    cy.window().then((win) => { cy.stub(win, 'confirm').returns(false).as('confirmStub2'); });
    cy.get('#grimoire-history-list .history-item').first().click();

    // Should have prompted once and not changed players when cancelled
    cy.get('@confirmStub2').should('have.callCount', 1);
    cy.get('#player-circle li').should('have.length', 5);
  });

  it('hides End Game button after loading an ended game from history', () => {
    // Create ended game history entry
    startGameWithPlayers(5);
    cy.get('#mode-player').check({ force: true });
    cy.get('#start-game').click();
    cy.get('#end-game').click();
    cy.get('#end-game-modal').should('be.visible');
    cy.get('#good-wins-btn').click();
    cy.get('#grimoire-history-list .history-item').should('have.length.greaterThan', 0);

    // Start a new game to ensure End Game is currently visible
    cy.get('#start-game').click();
    cy.get('#end-game').should('be.visible');

    // Load the ended game; accept confirmation
    cy.window().then((win) => { cy.stub(win, 'confirm').returns(true); });
    cy.get('#grimoire-history-list .history-item').first().click();

    // After loading an ended game, End Game should be hidden and Start Game shown
    cy.get('#end-game').should('not.be.visible');
    cy.get('#start-game').should('be.visible');
  });
});


