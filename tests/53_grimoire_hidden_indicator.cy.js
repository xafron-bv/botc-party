describe('Grimoire hidden indicator overlay', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.window().then((win) => { try { win.localStorage.clear(); } catch (_) { } });
    cy.ensureStorytellerMode();
    cy.setupGame({ players: 5, loadScript: false });
  });

  it('shows a large central GRIMOIRE HIDDEN banner only when the grimoire is hidden', () => {
    cy.get('#mode-player').click({ force: true });
    cy.startGame();
    cy.get('#sidebar-backdrop').click({ force: true });

    // Default: not hidden, banner not shown
    cy.get('#grimoire-hidden-banner').should('not.be.visible');
    cy.get('#grimoire-hidden-banner').should('have.attr', 'aria-hidden', 'true');

    // Hide grimoire
    cy.get('#reveal-assignments').click({ force: true });
    cy.get('body').should('have.class', 'grimoire-hidden');
    cy.get('#grimoire-hidden-banner').should('be.visible');
    cy.get('#grimoire-hidden-banner').should('contain.text', 'GRIMOIRE HIDDEN');
    cy.get('#grimoire-hidden-banner').should('have.attr', 'aria-hidden', 'false');

    // Show grimoire again
    cy.get('#reveal-assignments').click({ force: true });
    cy.get('body').should('not.have.class', 'grimoire-hidden');
    cy.get('#grimoire-hidden-banner').should('not.be.visible');
    cy.get('#grimoire-hidden-banner').should('have.attr', 'aria-hidden', 'true');
  });
});
