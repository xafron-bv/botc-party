// Debug test to check duplicate issue

describe('History Export/Import Duplicate Debug', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.window().then((win) => {
      try { win.localStorage.clear(); } catch (_) {}
    });
  });

  it('shows the actual duplicate issue when exporting and importing', () => {
    // Capture console logs
    cy.on('window:before:load', (win) => {
      cy.spy(win.console, 'log');
    });
    // Create a script entry
    const scriptEntry = {
      id: 'debug_script_1',
      name: 'Debug Script',
      data: [{ id: '_meta', name: 'Debug Script', author: 'test' }, 'chef', 'librarian'],
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
    
    // Log the exported data and check for differences
    cy.window().then((win) => {
      const exportedData = JSON.parse(win.lastDownloadedFile.content);
      cy.log('Exported data:', JSON.stringify(exportedData, null, 2));
      
      // Compare what we started with vs what was exported
      const originalEntry = scriptEntry;
      const exportedEntry = exportedData.scriptHistory[0];
      
      cy.log('Original entry:', JSON.stringify(originalEntry));
      cy.log('Exported entry:', JSON.stringify(exportedEntry));
      
      // Check if they're identical
      const identical = 
        originalEntry.id === exportedEntry.id &&
        originalEntry.name === exportedEntry.name &&
        JSON.stringify(originalEntry.data) === JSON.stringify(exportedEntry.data) &&
        originalEntry.createdAt === exportedEntry.createdAt &&
        originalEntry.updatedAt === exportedEntry.updatedAt;
        
      cy.log('Are they identical?', identical);
      if (!identical) {
        cy.log('Differences found:');
        cy.log('ID match:', originalEntry.id === exportedEntry.id);
        cy.log('Name match:', originalEntry.name === exportedEntry.name);
        cy.log('Data match:', JSON.stringify(originalEntry.data) === JSON.stringify(exportedEntry.data));
        cy.log('CreatedAt match:', originalEntry.createdAt === exportedEntry.createdAt, originalEntry.createdAt, 'vs', exportedEntry.createdAt);
        cy.log('UpdatedAt match:', originalEntry.updatedAt === exportedEntry.updatedAt, originalEntry.updatedAt, 'vs', exportedEntry.updatedAt);
      }
      
      // Now import it back
      cy.get('#import-history-file').selectFile({
        contents: Cypress.Buffer.from(win.lastDownloadedFile.content),
        fileName: 'reimport.json',
        mimeType: 'application/json'
      }, { force: true });
    });
    
    // Wait a bit for import to process
    cy.wait(500);
    
    // Check how many entries we have now
    cy.get('#script-history-list .history-item').then(($items) => {
      cy.log(`Found ${$items.length} items after import`);
      
      // Log localStorage data
      cy.window().then((win) => {
        const history = JSON.parse(win.localStorage.getItem('botcScriptHistoryV1'));
        cy.log('localStorage entries:', JSON.stringify(history, null, 2));
        
        // This should fail if duplicates are created
        if (history.length !== 1) {
          cy.log('DUPLICATE FOUND! Expected 1 entry but got:', history.length);
          history.forEach((entry, i) => {
            cy.log(`Entry ${i}:`, JSON.stringify(entry));
          });
        }
        
        // Should only have 1 entry, not 2
        expect(history).to.have.length(1);
        expect($items).to.have.length(1);
      });
    });
  });
});