// Test for sidebar organization - background selection should come after character sheet

describe('Sidebar - Background Selection Order', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.viewport(1280, 900);
    cy.window().then((win) => {
      try { win.localStorage.clear(); } catch (_) {}
    });
    // Ensure sidebar is open
    cy.get('body').then(($body) => {
      if ($body.hasClass('sidebar-collapsed')) {
        cy.get('#sidebar-toggle').click();
      }
    });
  });

  it('should display background selection after character sheet section', () => {
    // Find the character sheet section
    cy.get('#character-sheet').should('exist');
    
    // Find the background selection section by looking for the Background heading
    cy.contains('.section h3', 'Background').parent('.section').should('exist');
    
    // Get their positions in the DOM
    cy.get('#character-sheet').then(($charSheet) => {
      cy.contains('.section h3', 'Background').parent('.section').then(($bgSection) => {
        const charSheetRect = $charSheet[0].getBoundingClientRect();
        const bgRect = $bgSection[0].getBoundingClientRect();
        
        // Background selection should appear below character sheet
        expect(bgRect.top).to.be.greaterThan(charSheetRect.bottom,
          'Background selection should appear after character sheet');
      });
    });
  });

  it('should maintain correct order in the sidebar DOM structure', () => {
    // Check the actual DOM order
    cy.get('#sidebar').within(() => {
      // Get all major sections in order
      const expectedOrder = [
        'h2:contains("Game Setup")',
        '#game-setup',
        'h2:contains("Script")',
        '.script-buttons',
        'h2:contains("Character Sheet")',
        '#character-sheet',
        'h2:contains("Background")', // This should come after character sheet
        '.section:has(h3:contains("Background"))'
      ];
      
      let lastElement = null;
      expectedOrder.forEach((selector, index) => {
        cy.get(selector).should('exist').then(($el) => {
          if (lastElement) {
            const lastRect = lastElement[0].getBoundingClientRect();
            const currentRect = $el[0].getBoundingClientRect();
            expect(currentRect.top).to.be.at.least(lastRect.top,
              `${selector} should appear after previous element`);
          }
          lastElement = $el;
        });
      });
    });
  });

  it('should show background section header after character sheet header', () => {
    // Find the character sheet header
    cy.contains('#sidebar h2', 'Character Sheet').then(($charHeader) => {
      // Find the background header - it might be "Upload Background" or similar
      cy.get('#sidebar h2').contains(/background|upload/i).then(($bgHeader) => {
        const charHeaderRect = $charHeader[0].getBoundingClientRect();
        const bgHeaderRect = $bgHeader[0].getBoundingClientRect();
        
        // Background header should be below character sheet header
        expect(bgHeaderRect.top).to.be.greaterThan(charHeaderRect.bottom,
          'Background header should appear after Character Sheet header');
      });
    });
  });

  it('should maintain order after loading a script', () => {
    // Load a script to populate character sheet
    cy.get('#load-tb').click();
    cy.get('#character-sheet .role').should('have.length.greaterThan', 5);
    
    // Verify order is still correct with populated character sheet
    cy.get('#character-sheet').then(($charSheet) => {
      cy.contains('.section h3', 'Background').parent('.section').then(($bgSection) => {
        const charSheetRect = $charSheet[0].getBoundingClientRect();
        const bgRect = $bgSection[0].getBoundingClientRect();
        
        expect(bgRect.top).to.be.greaterThan(charSheetRect.bottom,
          'Background selection should still appear after populated character sheet');
      });
    });
  });

  it('should keep background controls together', () => {
    // All background-related controls should be in the same section
    cy.contains('.section h3', 'Background').parent('.section').within(() => {
      // Should contain background select dropdown
      cy.get('#background-select').should('exist');
      
      // Should have background options
      cy.get('option').should('have.length.greaterThan', 1);
    });
    
    // Background controls should not be scattered in other sections
    cy.get('#game-setup').within(() => {
      cy.get('#background-select').should('not.exist');
    });
  });
});