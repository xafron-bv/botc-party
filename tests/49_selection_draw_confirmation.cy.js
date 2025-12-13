describe('Player Setup - Draw confirmation UX', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.viewport(1280, 900);
    cy.window().then((win) => { try { win.localStorage.clear(); } catch (_) { } });
    cy.ensureStorytellerMode();
    cy.get('#load-tb').click();
    cy.get('#character-sheet .role').should('have.length.greaterThan', 5);
    cy.get('#player-count').clear().type('5');
    cy.get('#reset-grimoire').click();
    cy.get('#player-circle li').should('have.length', 5);
    cy.get('#open-player-setup').click();
    cy.fillBag();
    cy.get('#bag-count-warning').should('not.be.visible');
    cy.get('#player-setup-panel .start-selection').click();
  });

  it('draws a character without choosing a number', () => {
    cy.get('#number-picker-overlay').should('be.visible');
    cy.get('#number-picker-overlay').should('contain.text', 'Player 1');
    cy.get('#number-picker-overlay .button.number').should('have.length', 0);

    cy.get('#selection-reveal-btn').should('be.visible').click();
    cy.get('#player-reveal-modal').should('be.visible');
  });
});
