// Manual test to verify duplicate issue

describe('History Export/Import Manual Test', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.window().then((win) => {
      try { win.localStorage.clear(); } catch (_) {}
    });
  });

  it('manual test - export and reimport creates duplicates', () => {
    // Create initial history
    const scriptEntry = {
      id: 'manual_test_1',
      name: 'Manual Test Script',
      data: [{ id: '_meta', name: 'Manual Test Script', author: 'test' }, 'chef'],
      createdAt: 1234567890,
      updatedAt: 1234567890
    };
    
    cy.window().then((win) => {
      win.localStorage.setItem('botcScriptHistoryV1', JSON.stringify([scriptEntry]));
    });
    cy.reload();
    
    // Verify we have 1 entry
    cy.get('#script-history-list .history-item').should('have.length', 1);
    
    // Export
    cy.get('#export-history-btn').click();
    
    // Get exported data and log it
    cy.window().then((win) => {
      const exportedData = JSON.parse(win.lastDownloadedFile.content);
      cy.log('Exported data:', JSON.stringify(exportedData));
      
      // Now reimport the exact same file
      cy.get('#import-history-file').selectFile({
        contents: Cypress.Buffer.from(win.lastDownloadedFile.content),
        fileName: 'reimport.json',
        mimeType: 'application/json'
      }, { force: true });
    });
    
    // After import, check how many entries we have
    cy.get('#script-history-list .history-item').should('have.length', 2); // This will fail if it's working correctly
    
    // Check localStorage
    cy.window().then((win) => {
      const history = JSON.parse(win.localStorage.getItem('botcScriptHistoryV1'));
      expect(history).to.have.length(2); // This will fail if it's working correctly
      // The issue: we should have 1 entry, but we'll have 2 because of duplicate
    });
  });
});