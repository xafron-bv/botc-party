describe('Cypress setup stability', () => {
  it('opens a persisted collapsed sidebar before using sidebar controls', () => {
    cy.visit('/', {
      onBeforeLoad(win) {
        win.localStorage.setItem('sidebarCollapsed', '1');
      }
    });

    cy.get('body').should('have.class', 'sidebar-collapsed');
    cy.setupGame({ players: 5, loadScript: true });
    cy.get('body').should('not.have.class', 'sidebar-collapsed');
    cy.get('#sidebar').should(($sidebar) => {
      expect($sidebar[0].getBoundingClientRect().width).to.be.greaterThan(200);
    });
    cy.get('#end-game').should('be.visible');
  });

  it('restores desktop reminder behavior after a touch-emulated session', () => {
    cy.visit('/', {
      onBeforeLoad(win) {
        Object.defineProperty(win, 'ontouchstart', { value: true, configurable: true });
        Object.defineProperty(win.navigator, 'maxTouchPoints', { value: 1, configurable: true });
      }
    });
    cy.get('#load-tb').click({ force: true });
    cy.setupGame({ players: 5, loadScript: false });

    cy.visit('/', {
      onBeforeLoad(win) {
        try { win.localStorage.clear(); } catch (_) { }
      }
    });
    cy.get('#load-tb').click({ force: true });
    cy.setupGame({ players: 5, loadScript: false });
    cy.get('#player-circle li .reminder-placeholder').first().click({ altKey: true, force: true });
    cy.get('#text-reminder-modal').should('be.visible');
    cy.get('#reminder-token-modal').should('not.be.visible');
  });
});
