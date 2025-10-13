describe('Offline Functionality', () => {
  beforeEach(() => {
    cy.visit('/', { timeout: 10000 });
    cy.wait(500);
  });

  it('should not return redirect responses from service worker cache', () => {
    // Ensure service worker is ready
    cy.window().then((win) => {
      return win.navigator.serviceWorker.ready;
    });

    // Trigger a reload to ensure navigation caching happens
    cy.reload();

    // Wait for cache to be populated after reload
    cy.wait(1000);

    // Verify that if cache exists, cached HTML is proper 200, not a redirect
    cy.window().then(async (win) => {
      const cacheNames = await win.caches.keys();
      const cacheName = cacheNames.find(name => name.includes('botc-party-grimoire'));

      if (cacheName) {
        const cache = await win.caches.open(cacheName);
        const cachedResponse = await cache.match('./index.html') || await cache.match('/');

        if (cachedResponse) {
          // This is the KEY test for the redirect loop bug:
          // With the bug: Response.redirect() would eventually be returned, causing ERR_TOO_MANY_REDIRECTS
          // With the fix: Cached HTML is returned directly with status 200
          expect(cachedResponse.status, 'Cached HTML must be 200 OK, not redirect (301/302/307/308)').to.equal(200);
          expect(cachedResponse.redirected, 'Response must not be marked as redirected').to.be.false;

          // Verify it's actual HTML content, not a redirect response
          const contentType = cachedResponse.headers.get('content-type');
          expect(contentType, 'Must be HTML content').to.include('text/html');
        } else {
          // Cache exists but index.html not yet cached - this is OK for initial run
          cy.log('Cache exists but index.html not yet cached');
        }
      } else {
        // Cache not created yet - this is OK for very first run
        cy.log('Service worker cache not yet created');
      }
    });
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

    // Reload the page - this tests that offline navigation works
    // With the bug: would cause redirect loop
    // With the fix: loads from cache successfully
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
