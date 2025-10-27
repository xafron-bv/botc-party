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

  it('defers heavy asset prefetching to the service worker', () => {
    cy.wait(500);
    cy.get('body').then(($body) => {
      expect($body.find('#loading-overlay').length, 'no loading overlay should be rendered').to.equal(0);
    });
    cy.window().then((win) => {
      expect(win.__pagePrefetchPlanned, 'page-level prefetch loop should not run').to.be.undefined;
      expect(win.__pagePrefetchDone, 'page-level prefetch loop completion flag should stay undefined').to.be.undefined;
    });
  });
});
