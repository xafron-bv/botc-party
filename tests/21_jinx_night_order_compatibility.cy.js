// Cypress E2E tests - Jinx and Night Order Compatibility

describe('Jinx and Night Order Compatibility', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.window().then((win) => {
      try { win.localStorage.clear(); } catch (_) {}
    });
  });

  it('should display jinxes when night order sorting is enabled', () => {
    // Load all characters which has jinxes
    cy.get('#load-all-chars').click();
    
    // Wait for character sheet to be populated
    cy.get('#character-sheet .role').should('have.length.greaterThan', 50);
    
    // Verify jinxes are initially displayed
    cy.get('#character-sheet h3.team-jinxes').should('exist');
    cy.get('#character-sheet .jinx-entry').should('exist');
    
    // Enable night order sorting
    cy.get('#night-order-sort').click();
    cy.get('#night-order-sort').should('be.checked');
    
    // Jinxes should still be displayed (at the end)
    cy.get('#character-sheet h3.team-jinxes').should('exist');
    cy.get('#character-sheet .jinx-entry').should('exist');
    
    // Verify jinxes are at the end after all characters
    cy.get('#character-sheet').children().last().prev().should('have.class', 'jinx-entry');
  });

  it('should display jinxes after disabling night order sorting', () => {
    // Load all characters which has jinxes
    cy.get('#load-all-chars').click();
    
    // Wait for character sheet to be populated
    cy.get('#character-sheet .role').should('have.length.greaterThan', 50);
    
    // Enable night order sorting
    cy.get('#night-order-sort').click();
    cy.get('#night-order-sort').should('be.checked');
    
    // Verify jinxes are displayed
    cy.get('#character-sheet h3.team-jinxes').should('exist');
    cy.get('#character-sheet .jinx-entry').should('exist');
    
    // Disable night order sorting
    cy.get('#night-order-sort').click();
    cy.get('#night-order-sort').should('not.be.checked');
    
    // Jinxes should still be displayed (after demon team)
    cy.get('#character-sheet h3.team-jinxes').should('exist');
    cy.get('#character-sheet .jinx-entry').should('exist');
    
    // Verify jinxes are positioned after demon section
    cy.get('#character-sheet h3.team-demon').should('exist');
    cy.get('#character-sheet h3').then(($headers) => {
      const headers = $headers.toArray().map(el => el.textContent);
      const demonIndex = headers.indexOf('Demon');
      const jinxIndex = headers.indexOf('Jinxes');
      
      // Jinxes should be immediately after demons
      expect(jinxIndex).to.equal(demonIndex + 1);
    });
  });

  it('should preserve jinx click functionality when toggling night order', () => {
    // Load all characters which has jinxes
    cy.get('#load-all-chars').click();
    
    // Wait for character sheet to be populated
    cy.get('#character-sheet .role').should('have.length.greaterThan', 50);
    
    // Enable night order sorting
    cy.get('#night-order-sort').click();
    
    // Test jinx click functionality
    cy.get('#character-sheet .jinx-entry').first().click();
    cy.get('#character-sheet .jinx-entry').first()
      .should('have.class', 'show-jinx-reason')
      .find('.jinx-reason')
      .should('be.visible');
    
    // Click again to hide
    cy.get('#character-sheet .jinx-entry').first().click();
    cy.get('#character-sheet .jinx-entry').first()
      .should('not.have.class', 'show-jinx-reason');
    
    // Disable night order sorting
    cy.get('#night-order-sort').click();
    
    // Jinx functionality should still work after re-rendering
    // Click to show
    cy.get('#character-sheet .jinx-entry').first().click();
    cy.get('#character-sheet .jinx-entry').first()
      .should('have.class', 'show-jinx-reason');
    
    // Click to hide
    cy.get('#character-sheet .jinx-entry').first().click();
    cy.get('#character-sheet .jinx-entry').first()
      .should('not.have.class', 'show-jinx-reason');
  });

  it('should show jinxes in correct position when switching night phase', () => {
    // Load all characters
    cy.get('#load-all-chars').click();
    
    // Wait for character sheet to be populated
    cy.get('#character-sheet .role').should('have.length.greaterThan', 50);
    
    // Enable night order sorting
    cy.get('#night-order-sort').click();
    cy.get('#night-order-sort').should('be.checked');
    
    // Switch to other nights (use label click since radio button might be styled/hidden)
    cy.get('label[for="other-nights-btn"]').click();
    
    // Jinxes should still be displayed
    cy.get('#character-sheet h3.team-jinxes').should('exist');
    cy.get('#character-sheet .jinx-entry').should('exist');
    
    // Switch back to first night
    cy.get('label[for="first-night-btn"]').click();
    
    // Jinxes should still be displayed
    cy.get('#character-sheet h3.team-jinxes').should('exist');
    cy.get('#character-sheet .jinx-entry').should('exist');
  });

  it('should maintain jinx display across multiple toggles', () => {
    // Load all characters
    cy.get('#load-all-chars').click();
    
    // Wait for character sheet to be populated
    cy.get('#character-sheet .role').should('have.length.greaterThan', 50);
    
    // Count initial jinxes
    cy.get('#character-sheet .jinx-entry').then($jinxes => {
      const initialCount = $jinxes.length;
      expect(initialCount).to.be.greaterThan(0);
      
      // Toggle night order multiple times
      for (let i = 0; i < 3; i++) {
        // Enable night order
        cy.get('#night-order-sort').click();
        cy.get('#night-order-sort').should('be.checked');
        cy.get('#character-sheet .jinx-entry').should('have.length', initialCount);
        
        // Disable night order
        cy.get('#night-order-sort').click();
        cy.get('#night-order-sort').should('not.be.checked');
        cy.get('#character-sheet .jinx-entry').should('have.length', initialCount);
      }
    });
  });

  it('should display jinxes correctly when loading a script with night order already enabled', () => {
    // Enable night order first
    cy.get('#night-order-sort').click();
    cy.get('#night-order-sort').should('be.checked');
    
    // Then load a script with jinxes
    cy.get('#load-all-chars').click();
    
    // Wait for character sheet to be populated
    cy.get('#character-sheet .role').should('have.length.greaterThan', 50);
    
    // Jinxes should be displayed
    cy.get('#character-sheet h3.team-jinxes').should('exist');
    cy.get('#character-sheet .jinx-entry').should('exist');
  });
});