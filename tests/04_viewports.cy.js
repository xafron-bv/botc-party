// Cross-device smoke tests: desktop, mobile touch, and tablet (iPad Pro)

const specs = [
  { name: 'desktop', viewport: [1280, 900], touch: false },
  { name: 'mobile-touch', viewport: 'iphone-6', touch: true },
  { name: 'ipad-pro', viewport: [1024, 1366], touch: true }
];

specs.forEach(({ name, viewport }) => {
  describe(`Viewport: ${name}`, () => {
    beforeEach(() => {
      cy.visit('/');
      if (Array.isArray(viewport)) cy.viewport(viewport[0], viewport[1]);
      else cy.viewport(viewport);
      // Disable service worker
      cy.intercept('GET', '/service-worker.js', { statusCode: 404, body: '' });
    });

    it('basic interactions work', () => {
      // Load script
      cy.get('#load-tb').click();
      cy.get('#character-sheet .role').should('have.length.greaterThan', 5);

      // Start a small game
      cy.get('#player-count').clear().type('5');
      cy.get('#start-game').click();
      cy.get('#player-circle li').should('have.length', 5);

      // Assign one character
      // Ensure sidebar is closed to avoid coverage by sidebar elements
      cy.get('body').then(($b) => {
        if (!$b.hasClass('sidebar-collapsed')) {
          cy.get('#sidebar-close').click({ force: true });
        }
      });
      cy.get('#player-circle li .player-token').first().click({ force: true });
      cy.get('#character-modal').should('be.visible');
      cy.get('#character-search').type('Chef');
      cy.get('#character-grid .token[title="Chef"]').first().click();

      // Add one reminder (token modal path works on touch and desktop per code)
      cy.get('#player-circle li .reminder-placeholder').first().click({ force: true });
      cy.get('#reminder-token-modal', { timeout: 8000 }).should('be.visible');
      cy.get('#reminder-token-grid .token').first().click({ force: true });
      // Close the modal if still visible (fallback)
      cy.get('body').then(($b) => {
        if ($b.find('#reminder-token-modal:visible').length) {
          cy.get('#close-reminder-token-modal').click({ force: true });
        }
      });

      // Tooltip behavior differs for touch; just assert character name is visible
      cy.get('#player-circle li .character-name').first().should('contain', 'Chef');
    });
  });
});

