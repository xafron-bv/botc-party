// Cypress E2E tests - Scripts

describe('Scripts', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.window().then((win) => {
      try { win.localStorage.clear(); } catch (_) {}
    });
  });

  it('loads a built-in script and shows abilities that can be expanded', () => {
    cy.get('#load-tb').click();
    cy.get('#character-sheet .role').should('have.length.greaterThan', 5);

    cy.contains('#character-sheet .role .name', 'Chef')
      .should('be.visible')
      .parents('.role')
      .first()
      .click()
      .find('.ability')
      .should('be.visible')
      .and('contain', 'pairs of evil players');
  });

  it('script history: upload, load previous, rename, delete', () => {
    const customScript = [
      { id: '_meta', name: 'Test Script', author: 'cypress' },
      'chef',
      'librarian'
    ];

    // Upload custom script -> should be added to script history
    cy.get('#script-file').selectFile({
      contents: new Blob([JSON.stringify(customScript)], { type: 'application/json' }),
      fileName: 'test-script.json',
      mimeType: 'application/json'
    });

    cy.get('#load-status').should('contain', 'Custom script loaded successfully');
    cy.contains('#script-history-list .history-item .history-name', 'Test Script').should('exist');

    // Switch to something else, then load from history
    cy.get('#load-all-chars').click();
    cy.get('#character-sheet .role').should('have.length.greaterThan', 10);

    cy.contains('#script-history-list .history-item .history-name', 'Test Script')
      .parents('li.history-item')
      .click();

    // After loading, the sheet should include Chef from our custom script
    cy.contains('#character-sheet .role .name', 'Chef').should('be.visible');

    // Rename entry
    cy.contains('#script-history-list .history-item .history-name', 'Test Script')
      .parents('li.history-item')
      .within(() => {
        cy.get('.icon-btn.rename').click();
        cy.get('.history-edit-input').clear().type('Renamed Script');
        cy.get('.icon-btn.save').click();
      });

    cy.contains('#script-history-list .history-item .history-name', 'Renamed Script').should('exist');

    // Delete entry
    cy.on('window:confirm', (msg) => /Delete this script/i.test(msg));
    cy.contains('#script-history-list .history-item .history-name', 'Renamed Script')
      .parents('li.history-item')
      .within(() => {
        cy.get('.icon-btn.delete').click();
      });

    cy.contains('#script-history-list .history-item .history-name', 'Renamed Script').should('not.exist');
  });
});

