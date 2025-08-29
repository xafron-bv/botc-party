// Test for iPad Air landscape mode player name overflow issue
// When in landscape mode (1180x820), player names should not overflow off the screen

describe('iPad Air landscape mode - player name overflow', () => {
  beforeEach(() => {
    cy.visit('/');
    // iPad Air landscape dimensions
    cy.viewport(1180, 820);
    // Disable service worker
    cy.intercept('GET', '/service-worker.js', { statusCode: 404, body: '' });
    // Load a script and start game
    cy.get('#load-tb').click();
    cy.get('#character-sheet .role').should('have.length.greaterThan', 5);
  });

  it('should not overflow player names on iPad Air landscape with 15 players', () => {
    // Set up a game with 15 players (common player count)
    cy.get('#player-count').clear().type('15');
    cy.get('#start-game').click();
    cy.get('#player-circle li').should('have.length', 15);

    // Wait for layout to stabilize
    cy.wait(500);

    // Check that all player names are within viewport bounds
    cy.get('#player-circle li .player-name').each(($playerName) => {
      const rect = $playerName[0].getBoundingClientRect();
      
      // Player names should be fully visible within the viewport
      // Allow a small margin for border/shadow effects
      const margin = 5;
      
      // Check horizontal bounds
      expect(rect.left).to.be.at.least(-margin, 'Player name should not overflow left side');
      expect(rect.right).to.be.at.most(1180 + margin, 'Player name should not overflow right side');
      
      // Check vertical bounds - this is where the issue is
      expect(rect.top).to.be.at.least(-margin, 'Player name should not overflow top');
      expect(rect.bottom).to.be.at.most(820 + margin, 'Player name should not overflow bottom');
    });

    // Also check that the grimoire circle itself fits within bounds
    cy.get('#player-circle').then(($circle) => {
      const circleRect = $circle[0].getBoundingClientRect();
      
      // The circle should leave enough room for player names
      // Get the actual token size from the first token
      cy.get('#player-circle li .player-token').first().then(($token) => {
        const tokenSize = $token[0].offsetWidth;
        const nameOffset = tokenSize * 0.8 + 40; // 0.8 * token size + name height
        
        // Check that circle + name offset fits in viewport
        expect(circleRect.top - nameOffset).to.be.at.least(0, 'Grimoire should leave room for top player names');
        expect(circleRect.bottom + nameOffset).to.be.at.most(820, 'Grimoire should leave room for bottom player names');
      });
    });
  });

  it('should not overflow player names with maximum player count (20)', () => {
    // Test with maximum typical player count
    cy.get('#player-count').clear().type('20');
    cy.get('#start-game').click();
    cy.get('#player-circle li').should('have.length', 20);

    // Wait for layout to stabilize
    cy.wait(500);

    // Check that all player names are within viewport bounds
    cy.get('#player-circle li .player-name').each(($playerName) => {
      const rect = $playerName[0].getBoundingClientRect();
      const margin = 5;
      
      // This test should fail initially, demonstrating the overflow issue
      expect(rect.top).to.be.at.least(-margin, 'Player name should not overflow top');
      expect(rect.bottom).to.be.at.most(820 + margin, 'Player name should not overflow bottom');
    });
  });

  it('should scale grimoire appropriately for available space', () => {
    cy.get('#player-count').clear().type('15');
    cy.get('#start-game').click();
    
    // Get the grimoire circle dimensions
    cy.get('#player-circle').then(($circle) => {
      const circleRect = $circle[0].getBoundingClientRect();
      const viewportHeight = 820;
      const viewportWidth = 1180;
      
      // Get actual token size and calculate name space
      cy.get('#player-circle li .player-token').first().then(($token) => {
        const tokenSize = $token[0].offsetWidth;
        const nameOffset = tokenSize * 0.8 + 40; // 0.8 * token size + name height
        const requiredNameSpace = nameOffset * 2; // top + bottom
        const maxCircleHeight = viewportHeight - requiredNameSpace - 40; // with safety margin
        
        // The circle should not exceed the available space (with small tolerance)
        expect(circleRect.height).to.be.at.most(maxCircleHeight + 10, 
          'Grimoire circle should be small enough to accommodate player names');
        
        // The circle should use most of the available space (at least 80%)
        expect(circleRect.height).to.be.at.least(maxCircleHeight * 0.8, 
          'Grimoire circle should use most of the available space');
        
        // The circle should still be reasonably sized (not too small)
        expect(circleRect.height).to.be.at.least(400, 
          'Grimoire circle should not be too small');
      });
    });
  });
});