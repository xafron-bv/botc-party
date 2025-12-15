// Cypress E2E tests - Print styles

describe('Print styles', () => {
  it('keeps game info visible in the print stylesheet', () => {
    cy.request('/styles/print.css')
      .its('body')
      .should((body) => {
        expect(body).not.to.match(/#setup-info\s*\{[^}]*display\s*:\s*none/i);
      });
  });
});
