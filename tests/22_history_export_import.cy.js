// Cypress E2E tests - History Export/Import

describe('History Export/Import', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.window().then((win) => {
      try { win.localStorage.clear(); } catch (_) {}
    });
  });

  it('should show export and import buttons in the UI', () => {
    // Scroll to the History Management section
    cy.contains('h3', 'History Management').scrollIntoView();
    
    // Export button should exist
    cy.get('#export-history-btn').should('exist').and('be.visible');
    cy.get('#export-history-btn').should('contain', 'Export History');
    
    // Import button should exist
    cy.get('#import-history-btn').should('exist').and('be.visible');
    cy.get('#import-history-btn').should('contain', 'Import History');
    
    // File input for import should exist but be hidden
    cy.get('#import-history-file').should('exist');
  });

  it('should export empty history when no entries exist', () => {
    // Click export button
    cy.get('#export-history-btn').click();
    
    // Verify download was triggered with correct content
    cy.window().then((win) => {
      expect(win.lastDownloadedFile).to.exist;
      expect(win.lastDownloadedFile.filename).to.match(/botc-history-\d{4}-\d{2}-\d{2}\.json/);
      
      const content = JSON.parse(win.lastDownloadedFile.content);
      expect(content).to.deep.equal({
        version: 1,
        exportDate: win.lastDownloadedFile.exportDate,
        scriptHistory: [],
        grimoireHistory: []
      });
    });
  });

  it('should export history with script and grimoire entries', () => {
    // Seed history with test data
    const scriptEntry = {
      id: 'script_test_1',
      name: 'Test Script',
      data: [{ id: '_meta', name: 'Test Script', author: 'cypress' }, 'chef', 'librarian'],
      createdAt: Date.now() - 1000,
      updatedAt: Date.now() - 1000
    };
    
    const grimoireEntry = {
      id: 'grimoire_test_1',
      name: 'Test Game',
      playerCount: 5,
      script: ['chef', 'librarian'],
      players: [
        { id: 'player_1', name: 'Alice', character: 'chef', isDead: false, isVoteless: false }
      ],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    cy.window().then((win) => {
      win.localStorage.setItem('botcScriptHistoryV1', JSON.stringify([scriptEntry]));
      win.localStorage.setItem('botcGrimoireHistoryV1', JSON.stringify([grimoireEntry]));
    });
    cy.reload();
    
    // Click export button
    cy.get('#export-history-btn').click();
    
    // Verify download content
    cy.window().then((win) => {
      const content = JSON.parse(win.lastDownloadedFile.content);
      expect(content.version).to.equal(1);
      expect(content.scriptHistory).to.have.length(1);
      expect(content.grimoireHistory).to.have.length(1);
      expect(content.scriptHistory[0]).to.deep.equal(scriptEntry);
      expect(content.grimoireHistory[0]).to.deep.equal(grimoireEntry);
    });
  });

  it('should import history from uploaded JSON file', () => {
    const importData = {
      version: 1,
      exportDate: new Date().toISOString(),
      scriptHistory: [
        {
          id: 'imported_script_1',
          name: 'Imported Script',
          data: [{ id: '_meta', name: 'Imported Script', author: 'import' }, 'butler', 'investigator'],
          createdAt: Date.now() - 2000,
          updatedAt: Date.now() - 2000
        }
      ],
      grimoireHistory: [
        {
          id: 'imported_grimoire_1',
          name: 'Imported Game',
          playerCount: 7,
          script: ['butler', 'investigator'],
          players: [],
          createdAt: Date.now() - 1000,
          updatedAt: Date.now() - 1000
        }
      ]
    };
    
    // Mock file upload
    cy.get('#import-history-file').selectFile({
      contents: Cypress.Buffer.from(JSON.stringify(importData)),
      fileName: 'test-history.json',
      mimeType: 'application/json'
    }, { force: true });
    
    // Verify history was imported
    cy.contains('#script-history-list .history-item .history-name', 'Imported Script').should('exist');
    cy.contains('#grimoire-history-list .history-item .history-name', 'Imported Game').should('exist');
  });

  it('should merge imported history with existing history', () => {
    // Seed existing history
    const existingScript = {
      id: 'existing_script_1',
      name: 'Existing Script',
      data: [{ id: '_meta', name: 'Existing Script', author: 'existing' }, 'drunk'],
      createdAt: Date.now() - 3000,
      updatedAt: Date.now() - 3000
    };
    
    cy.window().then((win) => {
      win.localStorage.setItem('botcScriptHistoryV1', JSON.stringify([existingScript]));
    });
    cy.reload();
    
    // Import new history
    const importData = {
      version: 1,
      exportDate: new Date().toISOString(),
      scriptHistory: [
        {
          id: 'imported_script_2',
          name: 'Another Import',
          data: [{ id: '_meta', name: 'Another Import', author: 'import' }, 'mayor'],
          createdAt: Date.now() - 1000,
          updatedAt: Date.now() - 1000
        }
      ],
      grimoireHistory: []
    };
    
    cy.get('#import-history-file').selectFile({
      contents: Cypress.Buffer.from(JSON.stringify(importData)),
      fileName: 'merge-test.json',
      mimeType: 'application/json'
    }, { force: true });
    
    // Both entries should exist
    cy.contains('#script-history-list .history-item .history-name', 'Existing Script').should('exist');
    cy.contains('#script-history-list .history-item .history-name', 'Another Import').should('exist');
  });

  it('should handle entries with same ID but different content by creating new entry', () => {
    // Seed existing history
    const existingScript = {
      id: 'duplicate_id_1',
      name: 'Original Entry',
      data: [{ id: '_meta', name: 'Original Entry', author: 'original' }, 'drunk'],
      createdAt: Date.now() - 3000,
      updatedAt: Date.now() - 3000
    };
    
    cy.window().then((win) => {
      win.localStorage.setItem('botcScriptHistoryV1', JSON.stringify([existingScript]));
    });
    cy.reload();
    
    // Import with same ID but different content
    const importData = {
      version: 1,
      exportDate: new Date().toISOString(),
      scriptHistory: [
        {
          id: 'duplicate_id_1', // Same ID as existing
          name: 'Different Content Entry', // Different name
          data: [{ id: '_meta', name: 'Different Content Entry', author: 'different' }, 'mayor'], // Different data
          createdAt: Date.now() - 1000,
          updatedAt: Date.now() - 1000
        }
      ],
      grimoireHistory: []
    };
    
    cy.get('#import-history-file').selectFile({
      contents: Cypress.Buffer.from(JSON.stringify(importData)),
      fileName: 'duplicate-test.json',
      mimeType: 'application/json'
    }, { force: true });
    
    // Both entries should exist since they have different content
    cy.contains('#script-history-list .history-item .history-name', 'Original Entry').should('exist');
    cy.contains('#script-history-list .history-item .history-name', 'Different Content Entry').should('exist');
    
    // Check that IDs are different
    cy.window().then((win) => {
      const history = JSON.parse(win.localStorage.getItem('botcScriptHistoryV1'));
      expect(history).to.have.length(2);
      expect(history[0].id).to.not.equal(history[1].id);
    });
  });

  it('should show error message for invalid JSON file', () => {
    // Upload invalid JSON
    cy.get('#import-history-file').selectFile({
      contents: Cypress.Buffer.from('{ invalid json }'),
      fileName: 'invalid.json',
      mimeType: 'application/json'
    }, { force: true });
    
    // Should show error alert
    cy.on('window:alert', (str) => {
      expect(str).to.match(/error.*import.*invalid/i);
    });
  });

  it('should show error message for wrong file format', () => {
    // Upload file with wrong structure
    const invalidData = {
      someOtherField: 'not the right format'
    };
    
    cy.get('#import-history-file').selectFile({
      contents: Cypress.Buffer.from(JSON.stringify(invalidData)),
      fileName: 'wrong-format.json',
      mimeType: 'application/json'
    }, { force: true });
    
    // Should show error alert
    cy.on('window:alert', (str) => {
      expect(str).to.match(/error.*import.*format/i);
    });
  });

  it('should not create duplicate entries when importing the same history', () => {
    // Create initial history with specific timestamp to ensure consistency
    const createdAt = Date.now() - 10000;
    const updatedAt = Date.now() - 10000;
    
    const scriptEntry = {
      id: 'script_no_dup_1',
      name: 'No Duplicate Script',
      data: [{ id: '_meta', name: 'No Duplicate Script', author: 'test' }, 'chef', 'librarian'],
      createdAt: createdAt,
      updatedAt: updatedAt
    };
    
    const grimoireEntry = {
      id: 'grimoire_no_dup_1',
      name: 'No Duplicate Game',
      playerCount: 5,
      script: ['chef', 'librarian'],
      players: [
        { id: 'player_1', name: 'Alice', character: 'chef', isDead: false, isVoteless: false }
      ],
      createdAt: createdAt,
      updatedAt: updatedAt
    };
    
    cy.window().then((win) => {
      win.localStorage.setItem('botcScriptHistoryV1', JSON.stringify([scriptEntry]));
      win.localStorage.setItem('botcGrimoireHistoryV1', JSON.stringify([grimoireEntry]));
    });
    cy.reload();
    
    // Verify initial state
    cy.get('#script-history-list .history-item').should('have.length', 1);
    cy.get('#grimoire-history-list .history-item').should('have.length', 1);
    
    // Import the exact same data
    const importData = {
      version: 1,
      exportDate: new Date().toISOString(),
      scriptHistory: [scriptEntry],
      grimoireHistory: [grimoireEntry]
    };
    
    cy.get('#import-history-file').selectFile({
      contents: Cypress.Buffer.from(JSON.stringify(importData)),
      fileName: 'reimport-test.json',
      mimeType: 'application/json'
    }, { force: true });
    
    // Should still have only one entry each, not duplicates
    cy.get('#script-history-list .history-item').should('have.length', 1);
    cy.get('#grimoire-history-list .history-item').should('have.length', 1);
    
    // Verify in localStorage too
    cy.window().then((win2) => {
      const scriptHistory = JSON.parse(win2.localStorage.getItem('botcScriptHistoryV1'));
      const grimoireHistory = JSON.parse(win2.localStorage.getItem('botcGrimoireHistoryV1'));
      expect(scriptHistory).to.have.length(1);
      expect(grimoireHistory).to.have.length(1);
      expect(scriptHistory[0].name).to.equal('No Duplicate Script');
      expect(grimoireHistory[0].name).to.equal('No Duplicate Game');
    });
  });

  it('should trigger file download with correct filename and content', () => {
    // This test verifies the actual download mechanism
    let downloadTriggered = false;
    
    cy.window().then((win) => {
      // Override createElement to intercept download
      const originalCreateElement = win.document.createElement;
      win.document.createElement = function(tagName) {
        const element = originalCreateElement.call(this, tagName);
        if (tagName === 'a') {
          const originalClick = element.click;
          element.click = function() {
            if (element.download && element.href.startsWith('blob:')) {
              downloadTriggered = true;
              // Extract filename
              expect(element.download).to.match(/botc-history-\d{4}-\d{2}-\d{2}\.json/);
            }
            originalClick.call(this);
          };
        }
        return element;
      };
    });
    
    cy.get('#export-history-btn').click();
    
    cy.window().then(() => {
      expect(downloadTriggered).to.be.true;
    });
  });
});