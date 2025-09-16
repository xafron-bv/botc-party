// Cypress E2E tests - Upload script, All Characters, and Background persistence

describe('Upload & Background', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.viewport(1280, 900);
    cy.window().then((win) => {
      try { win.localStorage.clear(); } catch (_) { }
    });
  });

  it('uploads a valid custom script and adds it to history', () => {
    const fixturePath = '/tmp/cy_uploaded.json';
    const customScript = [
      { id: '_meta', name: 'Uploaded Script', author: 'cypress' },
      'chef',
      'librarian'
    ];
    cy.writeFile(fixturePath, customScript);
    cy.get('#script-file').selectFile(fixturePath, { force: true });

    cy.contains('#load-status', 'Custom script loaded successfully!').should('exist');
    cy.contains('#character-sheet .role .name', 'Chef').should('exist');
    cy.contains('#character-sheet .role .name', 'Librarian').should('exist');

    // History should include the uploaded entry
    cy.contains('#script-history-list .history-item .history-name', 'Uploaded Script').should('exist');
  });

  it('shows an error for invalid JSON upload', () => {
    cy.reload();
    const badPath = '/tmp/cy_bad.json';
    // Write invalid JSON contents deliberately
    cy.writeFile(badPath, '{invalid json');
    cy.get('#script-file').selectFile(badPath, { force: true });

    cy.get('#load-status').should('have.class', 'error');
    cy.contains('#load-status', 'Invalid JSON file').should('exist');
  });

  it('shows an error for invalid script format (object instead of array)', () => {
    cy.reload();
    const objPath = '/tmp/cy_obj.json';
    const invalidScript = { name: 'Object Script', characters: ['chef', 'librarian'] };
    cy.writeFile(objPath, invalidScript);
    cy.get('#script-file').selectFile(objPath, { force: true });

    cy.get('#load-status').should('have.class', 'error');
    cy.contains('#load-status', 'Invalid script file').should('exist');
  });

  it('loads all characters successfully', () => {
    cy.get('#load-all-chars').click();
    cy.get('#character-sheet .role').should('have.length.greaterThan', 50);
    cy.contains('#setup-info', 'All Characters').should('exist');
  });

  it('background selection applies and persists across reloads (class based)', () => {
    // Initial default should be dark
    cy.get('#background-select').should('have.value', 'dark');
    cy.get('#center').should('have.class', 'bg-dark');

    // Switch to red gradient
    cy.get('#background-select').select('red-gradient');
    cy.get('#center')
      .should('have.class', 'bg-red-gradient')
      .and('not.have.class', 'bg-dark')
      .and('not.have.class', 'bg-dark-purple');

    // Switch to wood texture
    cy.get('#background-select').select('wood');
    cy.get('#center')
      .should('have.class', 'bg-wood')
      .and('not.have.class', 'bg-red-gradient');

    // Reload and ensure persistence of last choice (wood)
    cy.reload();
    cy.get('#background-select').should('have.value', 'wood');
    cy.get('#center').should('have.class', 'bg-wood');

    // Change to cosmic and verify
    cy.get('#background-select').select('cosmic');
    cy.get('#center')
      .should('have.class', 'bg-cosmic')
      .and('not.have.class', 'bg-wood');
  });
});

