describe('Offline Functionality', () => {
  beforeEach(() => {
    cy.visit('/', { timeout: 10000 });
    cy.wait(500);
  });

  it('should load the app when going offline after initial visit', () => {
    // First, ensure service worker is ready
    cy.window().then((win) => {
      return win.navigator.serviceWorker.ready;
    });

    // Load a script to cache additional resources
    cy.get('#load-tb').click();
    cy.wait(1000);

    // Now simulate going offline
    cy.window().then((win) => {
      cy.stub(win.navigator, 'onLine').value(false);
    });

    // Reload the page
    cy.reload();

    // App should still load
    cy.get('#app', { timeout: 10000 }).should('be.visible');
    cy.get('#grimoire').should('exist');
    cy.get('#sidebar').should('exist');
  });

  it('should handle offline mode with cached script data', () => {
    // Ensure service worker is ready
    cy.window().then((win) => {
      return win.navigator.serviceWorker.ready;
    });

    // Load Trouble Brewing
    cy.get('#load-tb').click();
    cy.wait(1000);

    // Set player count
    cy.get('#player-count').clear().type('7');
    cy.get('#add-players').click();
    cy.wait(500);

    // Verify game state
    cy.get('#player-circle li').should('have.length', 7);

    // Simulate offline by intercepting all external requests
    cy.intercept('**/*.json', { forceNetworkError: true });
    cy.intercept('**/*.js', { forceNetworkError: true });
    cy.intercept('**/*.css', { forceNetworkError: true });

    // Reload the page
    cy.reload();

    // App should load from cache
    cy.get('#app', { timeout: 10000 }).should('be.visible');
    cy.get('#grimoire').should('exist');
  });
});
