describe('Player Setup - Setup Warning Indicators', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.window().then((win) => {
      try {
        win.localStorage.clear();
      } catch (_) { }
    });
    cy.get('#mode-storyteller').should('exist').and('be.checked');
    cy.get('#load-tb').click({ force: true });
    cy.get('#character-sheet .role').should('have.length.greaterThan', 5);
    cy.get('#player-count').clear().type('5');
    cy.get('#reset-grimoire').click();
    cy.get('#player-circle li').should('have.length', 5);
    cy.get('#open-player-setup').click();
    cy.get('#player-setup-panel').should('be.visible');
  });

  it('shows a warning icon when setup-modifying characters are selected', () => {
    // Baron (Minion) modifies setup in Trouble Brewing
    cy.get('#player-setup-character-list .role[title="Baron"]').as('baronToken');
    cy.get('@baronToken').scrollIntoView().should('exist');
    cy.get('@baronToken').find('.player-setup-warning-icon').should('exist').and('not.be.visible');

    cy.get('@baronToken').click({ force: true });
    cy.get('@baronToken').find('input[type="checkbox"]').should('be.checked');
    cy.window().then((win) => {
      const bag = (win.grimoireState && win.grimoireState.playerSetup && win.grimoireState.playerSetup.bag) || [];
      expect(bag).to.include('baron');
    });
    cy.get('@baronToken').find('.player-setup-warning-icon').should('be.visible');

    cy.get('@baronToken').click({ force: true });
    cy.get('@baronToken').find('.player-setup-warning-icon').should('not.be.visible');

    // Washerwoman does not modify setup and should never show the icon
    cy.get('#player-setup-character-list .role[title="Washerwoman"]').as('washerToken');
    cy.get('@washerToken').scrollIntoView().should('exist');
    cy.get('@washerToken').find('.player-setup-warning-icon').should('not.exist');

    cy.get('@washerToken').click({ force: true });
    cy.get('@washerToken').find('.player-setup-warning-icon').should('not.exist');
  });
});
