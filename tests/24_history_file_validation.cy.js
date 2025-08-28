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