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
    cy.ensureSidebarOpen();
  });

  it('does not ask for confirmation when resetting after loading an ended game from history', () => {
    // Create and end a game to generate a history item
    startGameWithPlayers(5);
    cy.get('#mode-player').check({ force: true });
    cy.window().then((win) => { if (win.grimoireState) win.grimoireState.gameStarted = true; });
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

  it('asks for confirmation when loading a history item while an active (non-ended) game is in progress', () => {
    // Create ended game history entry
    startGameWithPlayers(5);
    cy.get('#mode-player').check({ force: true });
    cy.window().then((win) => { if (win.grimoireState) win.grimoireState.gameStarted = true; });
    cy.get('#end-game').click();
    cy.get('#end-game-modal').should('be.visible');
    cy.get('#good-wins-btn').click();
    cy.get('#grimoire-history-list .history-item').should('have.length.greaterThan', 0);

    // Reset after winner to clear gating and mark an active game
    cy.get('#reset-grimoire').click();
    cy.get('#mode-player').check({ force: true });
    cy.window().then((win) => { if (win.grimoireState) win.grimoireState.gameStarted = true; });

    // Stub confirm and click a history item (ended game) -> should prompt
    cy.window().then((win) => { cy.stub(win, 'confirm').returns(false).as('confirmStub2'); });
    cy.get('#grimoire-history-list .history-item').first().click();

    cy.get('@confirmStub2').should('have.callCount', 1);
    cy.get('#player-circle li').should('have.length', 5);
  });

  it('hides End Game button after loading an ended game from history', () => {
    // Create ended game history entry
    startGameWithPlayers(5);
    cy.get('#mode-player').check({ force: true });
    cy.window().then((win) => { if (win.grimoireState) win.grimoireState.gameStarted = true; });
    cy.get('#end-game').click();
    cy.get('#end-game-modal').should('be.visible');
    cy.get('#good-wins-btn').click();
    cy.get('#grimoire-history-list .history-item').should('have.length.greaterThan', 0);

    // Reset after winner, then mark a fresh active game so End Game button is visible
    cy.get('#reset-grimoire').click();
    cy.get('#mode-player').check({ force: true });
    cy.window().then((win) => { if (win.grimoireState) win.grimoireState.gameStarted = true; });
    cy.get('body').then(($b) => { if ($b.hasClass('sidebar-collapsed')) cy.get('#sidebar-toggle').click({ force: true }); });
    cy.get('#end-game').should('be.visible');

    // Load the ended game; accept confirmation
    cy.window().then((win) => { cy.stub(win, 'confirm').returns(true); });
    cy.get('#grimoire-history-list .history-item').first().click();

    cy.get('#end-game').should('not.be.visible');
  });
});
