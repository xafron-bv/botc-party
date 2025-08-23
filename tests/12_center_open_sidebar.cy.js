// Cypress E2E tests - Center click opens sidebar when no game started

describe('Center click opens sidebar when collapsed before game starts', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.viewport(1280, 900);
    cy.window().then((win) => { try { win.localStorage.clear(); } catch (_) {} });
  });

  it('opens sidebar on center click if no players and sidebar collapsed', () => {
    // Ensure sidebar is collapsed: click Close Sidebar button
    cy.get('#sidebar-close').click();
    cy.get('body').should('have.class', 'sidebar-collapsed');

    // No game started yet -> #player-circle empty
    cy.get('#player-circle li').should('have.length', 0);

    // The toggle button should be visible when collapsed
    cy.get('#sidebar-toggle').should('be.visible');

    // Click in the center area
    cy.get('#center').click('center');

    // Sidebar should open (body class toggled)
    cy.get('body').should('not.have.class', 'sidebar-collapsed');
  });
});