// Cypress E2E tests - In-app Tour

describe('Tour', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.viewport(1280, 900);
    cy.window().then((win) => {
      try { win.localStorage.clear(); } catch (_) {}
    });
  });

  it('starts next to a target element and can go back/next/skip; sidebar state changes when required', () => {
    // Start the tour
    cy.get('#start-tour').click();

    // Popover should be visible and near the toggle initially
    cy.get('.tour-popover').should('be.visible');
    cy.get('.tour-highlight').should('be.visible');

    // Verify highlight bounds approximately match the sidebar toggle bounds
    cy.get('#sidebar-toggle').then(($toggle) => {
      const t = $toggle[0].getBoundingClientRect();
      cy.get('.tour-highlight').then(($hl) => {
        const h = $hl[0].getBoundingClientRect();
        const within = (a, b, tol = 4) => Math.abs(a - b) <= tol;
        expect(within(h.left, t.left)).to.be.true;
        expect(within(h.top, t.top)).to.be.true;
        expect(within(h.width, t.width)).to.be.true;
        expect(within(h.height, t.height)).to.be.true;
      });
    });

    // Next to open sidebar (tour step triggers it in onBeforeNext)
    cy.contains('.tour-popover .actions .button', 'Next').click();
    cy.get('body').should('not.have.class', 'sidebar-collapsed');

    // Go forward and back
    cy.contains('.tour-popover .actions .button', 'Next').click(); // to game-setup
    cy.contains('.tour-popover .actions .button', 'Back').should('not.be.disabled').click(); // back to open-sidebar
    cy.contains('.tour-popover .actions .button', 'Next').click(); // forward again

    // Continue to assign-character step which collapses sidebar on enter
    cy.contains('.tour-popover .actions .button', 'Next').click(); // to scripts
    cy.contains('.tour-popover .actions .button', 'Next').click(); // to assign-character
    cy.get('body').should('have.class', 'sidebar-collapsed');

    // Skip from here
    cy.contains('.tour-popover .actions .button', 'Skip').click();
    cy.get('.tour-popover').should('not.be.visible');
    cy.get('.tour-highlight').should('not.be.visible');
  });
});

