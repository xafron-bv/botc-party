describe('Player Name Overlap Detection', () => {
  it('should detect overlapping player names on small screen with 15 players', () => {
    // Visit the page
    cy.visit('/');
    cy.get('#modal-bg').should('not.exist');
    
    // Set viewport to iPhone size FIRST before interacting with UI
    cy.viewport(375, 667);
    
    // On mobile, sidebar might be open by default or collapsed
    // Just ensure we can interact with the sidebar
    cy.get('body').then($body => {
      if ($body.hasClass('sidebar-collapsed')) {
        cy.get('#sidebar-toggle').should('be.visible').click();
      }
    });
    
    // Setup game with 15 players
    cy.get('#load-tb').click(); // Load Trouble Brewing script
    
    // Close sidebar if it's obscuring the controls
    cy.get('body').then($body => {
      if (!$body.hasClass('sidebar-collapsed')) {
        cy.get('#sidebar-close').click({ force: true });
      }
    });
    
    cy.get('#player-count').clear({ force: true }).type('15', { force: true });
    cy.get('#start-game').click({ force: true });
    
    // Wait for the game to be created and check for overlaps
    cy.get('.player-name').should('have.length', 15);
    
    // Now check for overlaps after names are positioned
    cy.window().then(win => {
      const playerNames = win.document.querySelectorAll('.player-name');
      const overlaps = [];
      
      for (let i = 0; i < playerNames.length; i++) {
        const rect1 = playerNames[i].getBoundingClientRect();
        
        for (let j = i + 1; j < playerNames.length; j++) {
          const rect2 = playerNames[j].getBoundingClientRect();
          
          // Check if rectangles overlap
          const overlapping = !(
            rect1.right < rect2.left ||
            rect1.left > rect2.right ||
            rect1.bottom < rect2.top ||
            rect1.top > rect2.bottom
          );
          
          if (overlapping) {
            overlaps.push({
              player1: i + 1,
              player2: j + 1,
              distance: {
                horizontal: Math.abs((rect1.left + rect1.right) / 2 - (rect2.left + rect2.right) / 2),
                vertical: Math.abs((rect1.top + rect1.bottom) / 2 - (rect2.top + rect2.bottom) / 2)
              }
            });
          }
        }
      }
      
      // This test SHOULD FAIL showing the overlap issue
      cy.wrap(overlaps).should('have.length', 0);
    });
  });
});