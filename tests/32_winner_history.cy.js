describe('Winner state persisted in history', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.viewport(1280, 900);
    cy.window().then((win) => { try { win.localStorage.clear(); } catch (_) { } });
    cy.get('#load-tb').click();
    cy.get('#character-sheet .role').should('have.length.greaterThan', 5);
    // Use player mode so Start Game is always clickable
    cy.get('#mode-player').check({ force: true });
    // 5 players baseline
    cy.get('#player-count').clear().type('5');
    cy.get('#reset-grimoire').click();
    cy.get('#player-circle li').should('have.length', 5);
  });

  it('stores Good/Evil winner per game and restores from history', () => {
    // 1) End game, set evil has won -> adds history item
    cy.get('#end-game').scrollIntoView().should('be.visible').click({ force: true });
    cy.get('#end-game-modal').should('be.visible');
    cy.get('#evil-wins-btn').click();
    cy.get('#end-game-modal').should('not.be.visible');
    cy.get('#grimoire-history-list li').should('have.length.at.least', 1);

    // 2) New state, end it, set good has won -> adds new history item
    cy.get('#reset-grimoire').click();
    cy.get('#end-game').scrollIntoView().should('be.visible').click({ force: true });
    cy.get('#end-game-modal').should('be.visible');
    cy.get('#good-wins-btn').click();
    cy.get('#end-game-modal').should('not.be.visible');
    cy.get('#grimoire-history-list li').should('have.length.at.least', 2);

    // 3) Start new game, reset, then load latest and previous and verify messages
    cy.get('#reset-grimoire').click();
    // Load most recent (index 0)
    cy.get('#grimoire-history-list li').eq(0).click();
    cy.get('#winner-message').should('contain.text', 'Good has won');

    // Stub confirm to ensure it's NOT called when loading another ended game
    cy.window().then((win) => { cy.stub(win, 'confirm').as('confirmStub'); });

    // Load previous (index 1) - should NOT prompt since current game is already ended
    cy.get('#grimoire-history-list li').eq(1).click();
    cy.get('#winner-message').should('contain.text', 'Evil has won');

    // Verify confirm was NOT called
    cy.get('@confirmStub').should('have.callCount', 0);
  });
});

