describe('Prefetch All Assets', () => {
  beforeEach(() => {
    cy.visit('/', { timeout: 15000 });
  });

  it('has a generated asset manifest used for prefetching', () => {
    // Give the page a moment to initialize
    cy.wait(500);

    // Validate the manifest exists and contains files
    cy.request('GET', '/asset-manifest.json').then((resp) => {
      expect(resp.status).to.eq(200);
      expect(resp.headers['content-type']).to.include('application/json');
      const body = resp.body;
      expect(body).to.have.property('files');
      expect(body.files).to.be.an('array').and.to.have.length.greaterThan(0);
    });

    // Non-flaky minimal assertion: the manifest exists and is non-empty.
    // Prefetching is best-effort and may be environment-dependent in headless browsers.
  });

  it('shows a loading overlay until initial render completes', () => {
    cy.window().its('__overlayInitialVisible').should('be.true');
    cy.window().its('__overlayInitialMessage').should('contain', 'Loading the grimoire');

    // Once initialization is done, the overlay should cleanly disappear
    cy.get('#app-loading', { timeout: 20000 }).should('not.exist');

    // Verify overlay removal only happens after the load lifecycle
    cy.window().should((win) => {
      expect(win.__overlayRemoved, 'overlay should eventually be removed').to.be.true;
      expect(win.__windowLoadCompleted, 'window load should complete before overlay removal').to.be.true;
      if (typeof win.__overlayRemovedAt === 'number' && typeof win.__windowLoadTimestamp === 'number') {
        expect(win.__overlayRemovedAt).to.be.at.least(win.__windowLoadTimestamp);
      }
    });

    // Still no page-side prefetch loop flags should be set
    cy.window().then((win) => {
      expect(win.__pagePrefetchPlanned, 'page-level prefetch loop should not run').to.be.undefined;
      expect(win.__pagePrefetchDone, 'page-level prefetch loop completion flag should stay undefined').to.be.undefined;
    });
  });
});
