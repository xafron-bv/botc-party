// Cypress E2E tests - Center click opens sidebar when no game started

describe('Center click opens sidebar when collapsed before game starts', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.viewport(1280, 900);
    cy.window().then((win) => { try { win.localStorage.clear(); } catch (_) {} });
  });

  it('center clicks never auto-open the sidebar', () => {
    // Ensure sidebar is collapsed: click Close Sidebar button
    cy.get('#sidebar-close').click();
    cy.get('body').should('have.class', 'sidebar-collapsed');

    // With players present, clicking center should NOT open the sidebar
    cy.get('#player-circle li').should('have.length.greaterThan', 0);
    cy.get('#center').click('center', { force: true });
    cy.get('body').should('have.class', 'sidebar-collapsed');

    // Remove players to simulate pre-setup state
    cy.window().then((win) => {
      win.grimoireState.players = [];
      const circle = win.document.getElementById('player-circle');
      if (circle) circle.innerHTML = '';
    });
    cy.get('#player-circle li').should('have.length', 0);

    // Even with zero players, clicking the center should still do nothing
    cy.get('#center').click('center', { force: true });

    // Sidebar should remain collapsed until player uses toggle button
    cy.get('body').should('have.class', 'sidebar-collapsed');
  });
});
