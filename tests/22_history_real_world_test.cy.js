// Real-world test - Load a script, export, then import

describe('History Export/Import Real World', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.window().then((win) => {
      try { win.localStorage.clear(); } catch (_) {}
    });
  });

  it('should not duplicate when loading a script, exporting, and importing', () => {
    // Load Trouble Brewing script
    cy.get('#load-tb').click();
    
    // Wait for script to load
    cy.get('#character-sheet .role').should('have.length.greaterThan', 5);
    
    // Check script history has the auto-saved entry
    cy.get('#script-history-list .history-item').should('have.length', 1);
    
    // Export the history
    cy.get('#export-history-btn').click();
    
    // Get the exported content
    cy.window().then((win) => {
      const exportedContent = win.lastDownloadedFile.content;
      
      // Import it back immediately
      cy.get('#import-history-file').selectFile({
        contents: Cypress.Buffer.from(exportedContent),
        fileName: 'tb-export.json',
        mimeType: 'application/json'
      }, { force: true });
      
      // Should still have only 1 script history entry
      cy.get('#script-history-list .history-item').should('have.length', 1);
      
      // Verify in localStorage
      cy.window().then((win2) => {
        const scriptHistory = JSON.parse(win2.localStorage.getItem('botcScriptHistoryV1'));
        expect(scriptHistory).to.have.length(1);
        expect(scriptHistory[0].name).to.include('Trouble Brewing');
      });
    });
  });

  it('should handle multiple import attempts without creating duplicates', () => {
    // Create two different scripts
    cy.get('#load-tb').click();
    cy.wait(500);
    cy.get('#load-bmr').click();
    cy.wait(500);
    
    // Should have 2 entries
    cy.get('#script-history-list .history-item').should('have.length', 2);
    
    // Export
    cy.get('#export-history-btn').click();
    
    cy.window().then((win) => {
      const exportedContent = win.lastDownloadedFile.content;
      
      // Import the same file 3 times
      for (let i = 0; i < 3; i++) {
        cy.get('#import-history-file').selectFile({
          contents: Cypress.Buffer.from(exportedContent),
          fileName: `import-${i}.json`,
          mimeType: 'application/json'
        }, { force: true });
        cy.wait(200);
      }
      
      // Should still have only 2 entries, not 8
      cy.get('#script-history-list .history-item').should('have.length', 2);
      
      // Verify in localStorage
      cy.window().then((win2) => {
        const scriptHistory = JSON.parse(win2.localStorage.getItem('botcScriptHistoryV1'));
        expect(scriptHistory).to.have.length(2);
      });
    });
  });
});