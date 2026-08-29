describe('Player mode End Game controls', () => {
  const visitCleanPlayerMode = (width, height) => {
    cy.viewport(width, height);
    cy.visit('/', {
      onBeforeLoad(win) {
        win.localStorage.clear();
      }
    });
    cy.get('#mode-player').should('be.checked');
  };

  [[1280, 900], [320, 568]].forEach(([width, height]) => {
    it(`keeps End Game unavailable at ${width}x${height}`, () => {
      visitCleanPlayerMode(width, height);

      cy.get('#end-game').should('have.css', 'display', 'none').click({ force: true });
      cy.get('#end-game-modal').should('not.be.visible');
      cy.get('#good-wins-btn').click({ force: true });
      cy.window().its('grimoireState.winner').should('be.null');

      cy.reload();
      cy.get('#mode-player').should('be.checked');
      cy.get('#end-game').should('have.css', 'display', 'none');
    });
  });

  it('updates End Game when switching modes and resetting', () => {
    visitCleanPlayerMode(1280, 900);

    cy.get('#mode-storyteller').click({ force: true });
    cy.get('#end-game').should('be.visible').click();
    cy.get('#end-game-modal').should('be.visible');

    cy.get('#mode-player').click({ force: true });
    cy.get('#end-game').should('not.be.visible');
    cy.get('#end-game-modal').should('not.be.visible');

    cy.get('#reset-grimoire').click({ force: true });
    cy.get('#end-game').should('not.be.visible');

    cy.reload();
    cy.get('#mode-player').should('be.checked');
    cy.get('#end-game').should('not.be.visible');

    cy.get('#mode-storyteller').click({ force: true });
    cy.get('#end-game').should('be.visible');
    cy.get('#end-game-modal').should('not.be.visible');
  });

  it('keeps End Game hidden after restoring history in player mode', () => {
    visitCleanPlayerMode(1280, 900);
    cy.get('#mode-storyteller').click({ force: true });
    cy.window().then((win) => {
      win.grimoireState.gameStarted = true;
      cy.stub(win, 'confirm').returns(true);
    });
    cy.get('#reset-grimoire').click();
    cy.get('#grimoire-history-list .history-item').should('have.length', 1);

    cy.get('#mode-player').click({ force: true });
    cy.get('#grimoire-history-list .history-item').first().click();

    cy.ensureSidebarOpen();
    cy.get('#mode-player').should('be.checked');
    cy.get('#end-game').should('have.css', 'display', 'none');
    cy.get('#end-game-modal').should('not.be.visible');
  });
});
