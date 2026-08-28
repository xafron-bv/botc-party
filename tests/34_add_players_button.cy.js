
// Cypress E2E tests - Default players and always-available controls

describe('Default Players & Setup Controls', () => {
  beforeEach(() => {
    cy.resetApp({ mode: 'storyteller', loadScript: false });
  });

  it('preloads five players and keeps setup buttons enabled', () => {
    cy.get('#player-circle li').should('have.length', 5);
    cy.get('#player-count').should('have.value', '5');
    cy.get('#add-players').should('not.exist');

    cy.get('#open-player-setup').should('not.be.disabled');
    cy.get('#end-game').should('be.visible');
    cy.get('#mode-storyteller').should('not.be.disabled');
    cy.get('#mode-player').should('not.be.disabled');
  });

  it('updates player count via reset without disabling anything', () => {
    cy.ensureSidebarOpen();
    cy.get('#player-count').clear().type('7');
    cy.get('#reset-grimoire').click();

    cy.get('#player-circle li').should('have.length', 7);
    cy.get('#open-player-setup').should('not.be.disabled');
    cy.ensureSidebarOpen();
    cy.get('#end-game').scrollIntoView().should('be.visible');
  });

  it('allows script loading with immediate access to setup actions', () => {
    cy.ensureSidebarOpen();
    cy.get('#load-tb').click();
    cy.get('#character-sheet .role').should('have.length.greaterThan', 5);

    cy.get('#open-player-setup').should('not.be.disabled');
    cy.ensureSidebarOpen();
    cy.get('#end-game').scrollIntoView().should('be.visible');
  });

  it('keeps controls enabled after resetting multiple times', () => {
    cy.ensureSidebarOpen();
    cy.get('#player-count').clear().type('8');
    cy.get('#reset-grimoire').click();
    cy.get('#player-circle li').should('have.length', 8);

    cy.get('#player-count').clear().type('5');
    cy.get('#reset-grimoire').click();
    cy.get('#player-circle li').should('have.length', 5);

    cy.get('#open-player-setup').should('not.be.disabled');
    cy.ensureSidebarOpen();
    cy.get('#end-game').scrollIntoView().should('be.visible');
  });
});
