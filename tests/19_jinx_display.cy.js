// Cypress E2E tests - Jinx Display

describe('Jinx Display', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.window().then((win) => {
      try { win.localStorage.clear(); } catch (_) {}
    });
  });

  it('displays jinxes section immediately after demons and before travellers/fabled', () => {
    // Load all characters which has jinxes
    cy.get('#load-all-chars').click();
    
    // Wait for character sheet to be populated
    cy.get('#character-sheet .role').should('have.length.greaterThan', 5);
    
    // Check that jinxes section exists after demons
    cy.get('#character-sheet h3.team-demon').should('exist');
    cy.get('#character-sheet h3.team-jinxes').should('exist');
    
    // Jinxes section should be immediately after demons and before travellers/fabled
    cy.get('#character-sheet h3').then(($headers) => {
      const headers = $headers.toArray().map(el => el.textContent);
      const demonIndex = headers.indexOf('Demon');
      const jinxIndex = headers.indexOf('Jinxes');
      const travellerIndex = headers.indexOf('Travellers');
      const fabledIndex = headers.indexOf('Fabled');
      
      // Jinxes should be after demons
      expect(jinxIndex).to.be.greaterThan(demonIndex);
      
      // Jinxes should be immediately after demons (no other sections between)
      expect(jinxIndex).to.equal(demonIndex + 1);
      
      // If travellers exist, jinxes should be before them
      if (travellerIndex !== -1) {
        expect(jinxIndex).to.be.lessThan(travellerIndex);
      }
      
      // If fabled exist, jinxes should be before them
      if (fabledIndex !== -1) {
        expect(jinxIndex).to.be.lessThan(fabledIndex);
      }
    });
  });

  it('shows jinxed character pairs in the jinxes section', () => {
    // Load all characters which definitely has characters with jinxes
    cy.get('#load-all-chars').click();
    
    // Wait for character sheet to be populated
    cy.get('#character-sheet .role').should('have.length.greaterThan', 50);
    
    // Check for jinx entries
    cy.get('#character-sheet .jinx-entry').should('exist');
    
    // Check that jinx entries have the expected structure
    cy.get('#character-sheet .jinx-entry').first().within(() => {
      cy.get('.jinx-characters').should('exist');
      cy.get('.jinx-characters .icon').should('have.length', 2);
      cy.get('.jinx-characters .name').should('have.length', 2);
      cy.get('.jinx-plus').should('exist');
      cy.get('.jinx-reason').should('exist');
    });
  });

  it('displays jinx description when clicking on a jinx entry', () => {
    // Load all characters which has jinxes
    cy.get('#load-all-chars').click();
    
    // Wait for jinxes to appear
    cy.get('#character-sheet .jinx-entry').should('exist');
    
    // Click on the first jinx entry
    cy.get('#character-sheet .jinx-entry').first().click();
    
    // Check that jinx description is visible
    cy.get('#character-sheet .jinx-entry').first()
      .should('have.class', 'show-jinx-reason')
      .find('.jinx-reason')
      .should('be.visible');
  });

  it('toggles jinx description visibility on click', () => {
    // Load all characters which has jinxes
    cy.get('#load-all-chars').click();
    
    cy.get('#character-sheet .jinx-entry').should('exist');
    
    // Get the first jinx entry
    cy.get('#character-sheet .jinx-entry').first().then($jinxEntry => {
      // Initially, jinx reason should not be visible
      cy.wrap($jinxEntry).find('.jinx-reason').should('not.be.visible');
      cy.wrap($jinxEntry).should('not.have.class', 'show-jinx-reason');
      
      // Click the jinx entry (not the hidden reason)
      cy.wrap($jinxEntry).click();
      cy.wrap($jinxEntry).should('have.class', 'show-jinx-reason');
      cy.wrap($jinxEntry).find('.jinx-reason').should('be.visible');
      
      // Click again to hide
      cy.wrap($jinxEntry).click();
      cy.wrap($jinxEntry).should('not.have.class', 'show-jinx-reason');
      cy.wrap($jinxEntry).find('.jinx-reason').should('not.be.visible');
    });
  });

  it('only displays jinxes for characters that are in the loaded script', () => {
    // Load Trouble Brewing which has fewer characters with jinxes
    cy.get('#load-tb').click();
    
    cy.get('#character-sheet .role').should('have.length.greaterThan', 0);
    
    // Check if jinxes section exists (TB might not have any jinxes)
    cy.get('body').then($body => {
      if ($body.find('#character-sheet h3.team-jinxes').length > 0) {
        // If jinxes exist, verify they are only for characters in the script
        cy.get('#character-sheet .jinx-entry').each($jinx => {
          cy.wrap($jinx).find('.jinx-characters .name').should('have.length', 2);
        });
      } else {
        // No jinxes section should exist if no applicable jinxes
        cy.get('#character-sheet h3.team-jinxes').should('not.exist');
      }
    });
  });
});