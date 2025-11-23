// Cypress E2E tests - Pre-game gating removed

describe('Pre-game grimoire access is always available', () => {
  beforeEach(() => {
    cy.resetApp({ mode: 'storyteller', loadScript: false });
  });

  it('keeps the grimoire interactive without a start gate', () => {
    cy.get('body').should('not.have.class', 'pre-game');
    cy.get('#pre-game-overlay').should('not.exist');
    cy.get('#load-tb').click();
    cy.get('#character-modal').should('not.be.visible');
    cy.get('#player-circle li .player-token').first().click({ force: true });
    cy.get('#character-modal').should('be.visible');
  });

  it('remains overlay-free when switching to player mode', () => {
    cy.get('#mode-player').click({ force: true });
    cy.get('body').should('not.have.class', 'pre-game');
    cy.get('#pre-game-overlay').should('not.exist');
  });
});
