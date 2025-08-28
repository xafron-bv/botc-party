describe('Player Name Z-Index Behavior', () => {
  it('should ensure player names never appear above other players tokens', () => {
    // Visit the page
    cy.visit('/');
    cy.get('#modal-bg').should('not.exist');
    
    // Set viewport to iPhone size
    cy.viewport(375, 667);
    
    // Setup game with 15 players
    cy.get('body').then($body => {
      if ($body.hasClass('sidebar-collapsed')) {
        cy.get('#sidebar-toggle').should('be.visible').click();
      }
    });
    
    cy.get('#load-tb').click();
    
    cy.get('body').then($body => {
      if (!$body.hasClass('sidebar-collapsed')) {
        cy.get('#sidebar-close').click({ force: true });
      }
    });
    
    cy.get('#player-count').clear({ force: true }).type('15', { force: true });
    cy.get('#start-game').click({ force: true });
    
    // Wait for the game to be created
    cy.get('.player-name').should('have.length', 15);
    cy.get('.player-token').should('have.length', 15);
    
    // Check z-index relationships
    cy.window().then(win => {
      const playerNames = win.document.querySelectorAll('.player-name');
      const playerTokens = win.document.querySelectorAll('.player-token');
      const issues = [];
      
      // Check each player name against all other player tokens
      playerNames.forEach((nameEl, nameIdx) => {
        const nameRect = nameEl.getBoundingClientRect();
        const nameZ = win.getComputedStyle(nameEl).zIndex;
        const nameParentZ = win.getComputedStyle(nameEl.closest('li')).zIndex;
        
        playerTokens.forEach((tokenEl, tokenIdx) => {
          if (nameIdx === tokenIdx) return; // Skip checking against own token
          
          const tokenRect = tokenEl.getBoundingClientRect();
          const tokenZ = win.getComputedStyle(tokenEl).zIndex;
          const tokenParentZ = win.getComputedStyle(tokenEl.closest('li')).zIndex;
          
          // Check if name overlaps with this token
          const overlapping = !(
            nameRect.right < tokenRect.left ||
            nameRect.left > tokenRect.right ||
            nameRect.bottom < tokenRect.top ||
            nameRect.top > tokenRect.bottom
          );
          
          if (overlapping) {
            // Compare effective z-index (considering parent z-index)
            const effectiveNameZ = parseInt(nameParentZ || '0') * 1000 + parseInt(nameZ || '0');
            const effectiveTokenZ = parseInt(tokenParentZ || '0') * 1000 + parseInt(tokenZ || '0');
            
            if (effectiveNameZ >= effectiveTokenZ) {
              issues.push({
                namePlayer: nameIdx + 1,
                tokenPlayer: tokenIdx + 1,
                nameZ: effectiveNameZ,
                tokenZ: effectiveTokenZ,
                issue: 'Name appears above another player token'
              });
            }
          }
        });
      });
      
      // This test should pass - no names should be above other player tokens
      cy.wrap(issues).should('have.length', 0);
    });
  });
  
  it('should maintain correct z-index hierarchy for player names', () => {
    cy.visit('/');
    cy.get('#modal-bg').should('not.exist');
    
    // Setup a simple game with 5 players
    cy.get('#load-tb').click();
    cy.get('#player-count').clear().type('5');
    cy.get('#start-game').click();
    
    cy.get('.player-name').should('have.length', 5);
    
    // Test that player names have lower z-index than tokens by default
    cy.get('.player-name').first().then($name => {
      const nameZ = parseInt($name.css('z-index') || '0');
      cy.get('.player-token').first().then($token => {
        const tokenZ = parseInt($token.css('z-index') || '0');
        // Player names should have lower z-index than tokens
        expect(nameZ).to.be.lessThan(tokenZ);
      });
    });
    
    // Test touch behavior on mobile viewport
    cy.viewport(375, 667);
    
    // On touch devices, names should still be below tokens by default
    cy.get('.player-name').first().then($name => {
      const nameZ = parseInt($name.css('z-index') || '0');
      cy.get('.player-token').first().then($token => {
        const tokenZ = parseInt($token.css('z-index') || '0');
        expect(nameZ).to.be.lessThan(tokenZ);
      });
    });
  });
});