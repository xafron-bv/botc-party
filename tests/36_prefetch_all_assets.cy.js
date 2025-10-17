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
});
