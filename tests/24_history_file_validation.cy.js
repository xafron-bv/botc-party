// Test that history files are detected when uploaded as scripts

describe('History File Validation', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.window().then((win) => {
      try { win.localStorage.clear(); } catch (_) {}
    });
  });

  it('should show error when uploading a history export file as a script', () => {
    // Create a history export file structure
    const historyExport = {
      version: 1,
      exportDate: new Date().toISOString(),
      scriptHistory: [
        {
          id: 'script_1',
          name: 'Test Script',
          data: [{ id: '_meta', name: 'Test Script', author: 'test' }, 'chef'],
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      ],
      grimoireHistory: [
        {
          id: 'grimoire_1',
          name: 'Test Game',
          playerCount: 5,
          script: ['chef'],
          players: [],
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      ]
    };

    // Spy on alert
    cy.on('window:alert', (str) => {
      expect(str).to.match(/history.*file.*import.*button/i);
    });

    // Try to upload it as a script
    cy.get('#script-file').selectFile({
      contents: Cypress.Buffer.from(JSON.stringify(historyExport)),
      fileName: 'botc-history-2024-01-01.json',
      mimeType: 'application/json'
    });

    // The character sheet should not be updated
    cy.get('#character-sheet').should('contain', 'Load a script to see available characters');
    
    // Load status should show error
    cy.get('#load-status').should('have.class', 'error');
    cy.get('#load-status').should('contain', 'history');
  });

  it('should still allow regular script files', () => {
    // Create a regular script file
    const regularScript = [
      { id: '_meta', name: 'Regular Script', author: 'test' },
      'chef',
      'librarian',
      'investigator'
    ];

    // Upload it
    cy.get('#script-file').selectFile({
      contents: Cypress.Buffer.from(JSON.stringify(regularScript)),
      fileName: 'regular-script.json',
      mimeType: 'application/json'
    });

    // Should load successfully
    cy.get('#character-sheet .role').should('have.length', 3);
    cy.get('#load-status').should('have.class', 'status');
    cy.get('#load-status').should('contain', 'successfully');
  });

  it('should detect history files even with different structures', () => {
    // Test various history file structures
    const testCases = [
      {
        // Minimal history file
        data: { version: 1, scriptHistory: [], grimoireHistory: [] },
        shouldDetect: true
      },
      {
        // History with only version and histories
        data: { version: 1, scriptHistory: [], grimoireHistory: [], exportDate: '2024-01-01' },
        shouldDetect: true
      },
      {
        // Regular script (array)
        data: ['chef', 'librarian'],
        shouldDetect: false
      },
      {
        // Object but not history
        data: { characters: ['chef'], meta: 'test' },
        shouldDetect: false
      }
    ];

    testCases.forEach((testCase, index) => {
      if (testCase.shouldDetect) {
        cy.on('window:alert', (str) => {
          expect(str).to.match(/history.*file.*import.*button/i);
        });
      }

      cy.get('#script-file').selectFile({
        contents: Cypress.Buffer.from(JSON.stringify(testCase.data)),
        fileName: `test-${index}.json`,
        mimeType: 'application/json'
      });

      if (testCase.shouldDetect) {
        cy.get('#load-status').should('have.class', 'error');
      }

      // Clear for next test
      cy.reload();
    });
  });
});

describe('Script File in History Import Validation', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.window().then((win) => {
      try { win.localStorage.clear(); } catch (_) {}
    });
  });

  it('should show error when trying to import a script file as history', () => {
    // Create a regular script file
    const scriptFile = [
      { id: '_meta', name: 'Test Script', author: 'test' },
      'chef',
      'librarian',
      'investigator'
    ];

    // Spy on alert
    cy.on('window:alert', (str) => {
      expect(str).to.match(/script.*file.*upload.*script/i);
    });

    // Try to import it as history
    cy.get('#import-history-file').selectFile({
      contents: Cypress.Buffer.from(JSON.stringify(scriptFile)),
      fileName: 'my-script.json',
      mimeType: 'application/json'
    }, { force: true });

    // History should not be updated
    cy.get('#script-history-list .history-item').should('have.length', 0);
    cy.get('#grimoire-history-list .history-item').should('have.length', 0);
  });

  it('should detect various script file formats', () => {
    const scriptFormats = [
      {
        // Array of character IDs (common format)
        data: ['chef', 'librarian', 'mayor'],
        isScript: true
      },
      {
        // Array with meta object
        data: [{ id: '_meta', name: 'Script' }, 'chef', 'librarian'],
        isScript: true
      },
      {
        // Array with character objects
        data: [
          { id: 'chef', name: 'Chef', team: 'townsfolk' },
          { id: 'librarian', name: 'Librarian', team: 'townsfolk' }
        ],
        isScript: true
      },
      {
        // Valid history file
        data: { version: 1, scriptHistory: [], grimoireHistory: [] },
        isScript: false
      },
      {
        // Empty array (could be empty script)
        data: [],
        isScript: true
      },
      {
        // Object that's not a history file
        data: { characters: ['chef'], someField: 'value' },
        isScript: true
      }
    ];

    scriptFormats.forEach((format, index) => {
      if (format.isScript) {
        cy.on('window:alert', (str) => {
          expect(str).to.match(/script.*file.*upload.*script/i);
        });
      }

      cy.get('#import-history-file').selectFile({
        contents: Cypress.Buffer.from(JSON.stringify(format.data)),
        fileName: `test-${index}.json`,
        mimeType: 'application/json'
      }, { force: true });

      if (format.isScript) {
        // Should not add any history
        cy.get('#script-history-list .history-item').should('have.length', 0);
        cy.get('#grimoire-history-list .history-item').should('have.length', 0);
      }

      // Clear for next test
      cy.reload();
    });
  });

  it('should still allow valid history files', () => {
    // Create a valid history file
    const historyFile = {
      version: 1,
      exportDate: new Date().toISOString(),
      scriptHistory: [
        {
          id: 'script_test',
          name: 'Test Script',
          data: ['chef'],
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
      ],
      grimoireHistory: []
    };

    // Import it
    cy.get('#import-history-file').selectFile({
      contents: Cypress.Buffer.from(JSON.stringify(historyFile)),
      fileName: 'valid-history.json',
      mimeType: 'application/json'
    }, { force: true });

    // Should successfully import
    cy.get('#script-history-list .history-item').should('have.length', 1);
    cy.contains('#script-history-list .history-item .history-name', 'Test Script').should('exist');
  });
});