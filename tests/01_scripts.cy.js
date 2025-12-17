// Cypress E2E tests - Scripts

describe('Scripts', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.window().then((win) => {
      try { win.localStorage.clear(); } catch (_) { }
    });
  });

  it('shows an empty-state hint before a script is loaded and before players are added', () => {
    cy.contains('#setup-info', 'Select a script from the sidebar to get started.').should('exist');
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

  it('script history: load previous, rename, delete', () => {
    // Seed history directly, then reload to render
    cy.window().then((win) => {
      const entry = {
        id: 'script_seed_1',
        name: 'Test Script',
        data: [{ id: '_meta', name: 'Test Script', author: 'cypress' }, 'chef', 'librarian'],
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      win.localStorage.setItem('botcScriptHistoryV1', JSON.stringify([entry]));
      // Ensure character panel starts open for this test so role elements are visible
      win.localStorage.setItem('characterPanelOpen', '1');
    });
    cy.reload();
    cy.contains('#script-history-list .history-item .history-name', 'Test Script', { timeout: 10000 }).should('exist');

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

  it('renders script meta and bootlegger notes when provided', () => {
    const customScript = [
      {
        id: '_meta',
        name: 'Whalebuffet',
        author: 'Ernsty',
        bootlegger: ['Rule one', 'Rule two']
      },
      'chef'
    ];
    cy.get('#script-text-input').clear().type(JSON.stringify(customScript), { parseSpecialCharSequences: false });
    cy.get('#load-script-text').click();

    cy.contains('#character-sheet .script-meta__title', 'Whalebuffet').should('be.visible');
    cy.contains('#character-sheet .script-meta__author', 'Ernsty').should('be.visible');
    cy.get('#character-sheet .script-meta__bootlegger-list li').should('have.length', 2);
    cy.contains('#character-sheet .role .name', 'Chef').should('be.visible');
  });

  it('loads a shared script link via the URL loader input', () => {
    const sharedScript = [{ id: '_meta', name: 'Shared', author: 'Link' }, 'chef'];
    cy.window().then((win) => {
      const json = JSON.stringify(sharedScript);
      const encoded = win.btoa(unescape(encodeURIComponent(json)));
      const url = `https://example.com/?script=${encodeURIComponent(encoded)}`;
      cy.get('#script-url-input').clear().type(url);
      cy.get('#load-script-url').click();
    });

    cy.contains('#character-sheet .script-meta__title', 'Shared').should('be.visible');
    cy.contains('#character-sheet .script-meta__author', 'Link').should('be.visible');
    cy.contains('#character-sheet .role .name', 'Chef').should('be.visible');
  });

  it('keeps game info visible in the print stylesheet', () => {
    cy.request('/styles/print.css')
      .its('body')
      .should((body) => {
        expect(body).not.to.match(/#setup-info\s*\{[^}]*display\s*:\s*none/i);
      });
  });

  it('hides ability info icon in the print stylesheet', () => {
    cy.request('/styles/print.css')
      .its('body')
      .should((body) => {
        // Check that .ability-info-icon is present in the print stylesheet
        // It's part of a comma-separated selector list with display: none !important
        expect(body).to.include('.ability-info-icon');
        expect(body).to.match(/@media\s+print\s*\{[\s\S]*\.ability-info-icon[\s\S]*display\s*:\s*none\s*!important/i);
      });
  });

  it('hides reminder placeholder in the print stylesheet', () => {
    cy.request('/styles/print.css')
      .its('body')
      .should((body) => {
        // Check that .reminder-placeholder is present in the print stylesheet
        // It's part of a comma-separated selector list with display: none !important
        expect(body).to.include('.reminder-placeholder');
        expect(body).to.match(/@media\s+print\s*\{[\s\S]*\.reminder-placeholder[\s\S]*display\s*:\s*none\s*!important/i);
      });
  });
});
