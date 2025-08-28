// Test that player names stay within viewport in landscape mode

describe('Landscape Mode Player Names', () => {
  beforeEach(() => {
    cy.visit('/');
    // Disable service worker
    cy.intercept('GET', '/service-worker.js', { statusCode: 404, body: '' });
  });

  it('should keep all player names within viewport bounds in landscape mode', () => {
    // Set viewport to landscape orientation (wider than tall)
    cy.viewport(1366, 768);
    
    // Load script
    cy.get('#load-tb').click();
    cy.get('#character-sheet .role').should('have.length.greaterThan', 5);

    // Start a game with maximum players to test edge case
    cy.get('#player-count').clear().type('20');
    cy.get('#start-game').click();
    cy.get('#player-circle li').should('have.length', 20);

    // Wait for repositioning to complete
    cy.wait(100);

    // Check that all player names are within viewport bounds
    cy.get('#player-circle li .player-name').each(($name, index) => {
      // Get the name element's position and dimensions
      const nameRect = $name[0].getBoundingClientRect();
      
      // Check that player name is within viewport horizontally
      cy.wrap(nameRect.left).should('be.at.least', 0, `Player ${index + 1} name should not overflow left`);
      cy.wrap(nameRect.right).should('be.at.most', 1366, `Player ${index + 1} name should not overflow right`);
      
      // Check that player name is within viewport vertically
      cy.wrap(nameRect.top).should('be.at.least', 0, `Player ${index + 1} name should not overflow top`);
      cy.wrap(nameRect.bottom).should('be.at.most', 768, `Player ${index + 1} name should not overflow bottom`);
    });
  });

  it('should handle extreme landscape aspect ratios', () => {
    // Ultra-wide landscape viewport
    cy.viewport(1920, 600);
    
    // Load script
    cy.get('#load-tb').click();
    cy.get('#character-sheet .role').should('have.length.greaterThan', 5);

    // Start a game with many players
    cy.get('#player-count').clear().type('15');
    cy.get('#start-game').click();
    cy.get('#player-circle li').should('have.length', 15);

    // Wait for repositioning
    cy.wait(100);

    // Check grimoire size is constrained appropriately
    cy.get('#player-circle').then(($circle) => {
      const circleRect = $circle[0].getBoundingClientRect();
      const circleHeight = circleRect.height;
      
      // In extreme landscape, grimoire height should be limited to prevent overflow
      // Account for player names above/below tokens (approximately 80px total)
      const maxAllowedHeight = 600 - 80; // viewport height minus space for names
      cy.wrap(circleHeight).should('be.at.most', maxAllowedHeight);
    });

    // Verify all player names are still visible
    cy.get('#player-circle li .player-name').each(($name, index) => {
      const nameRect = $name[0].getBoundingClientRect();
      
      // All names should be within viewport
      cy.wrap(nameRect.top).should('be.at.least', 0, `Player ${index + 1} name should not overflow top`);
      cy.wrap(nameRect.bottom).should('be.at.most', 600, `Player ${index + 1} name should not overflow bottom`);
    });
  });

  it('should keep player names within viewport when resizing to smaller landscape', () => {
    // Standard landscape viewport
    cy.viewport(1280, 720);
    
    // Load script and start game
    cy.get('#load-tb').click();
    cy.get('#player-count').clear().type('12');
    cy.get('#start-game').click();

    // Switch to a shorter landscape viewport
    cy.viewport(1280, 500);
    
    // Force window resize event for browsers that don't trigger ResizeObserver
    cy.window().then((win) => {
      win.dispatchEvent(new Event('resize'));
    });
    
    cy.wait(300); // Wait longer for resize handler (has 250ms debounce)
    
    // The critical test: all player names must be within viewport bounds
    cy.get('#player-circle li .player-name').each(($name, index) => {
      const nameRect = $name[0].getBoundingClientRect();
      cy.wrap(nameRect.top).should('be.at.least', 0, `Player ${index + 1} name should not overflow top`);
      cy.wrap(nameRect.bottom).should('be.at.most', 500, `Player ${index + 1} name should not overflow bottom`);
    });
  });

  it('should handle player names correctly when tokens are at extreme positions', () => {
    cy.viewport(1600, 700);
    
    // Load script
    cy.get('#load-tb').click();
    
    // Start game with enough players to have tokens at all positions
    cy.get('#player-count').clear().type('8');
    cy.get('#start-game').click();
    
    // Find the topmost and bottommost players
    let topmostPlayer = null;
    let bottommostPlayer = null;
    let topmostY = Infinity;
    let bottommostY = -Infinity;
    
    cy.get('#player-circle li').each(($li) => {
      const token = $li.find('.player-token')[0];
      const tokenRect = token.getBoundingClientRect();
      const tokenCenterY = tokenRect.top + tokenRect.height / 2;
      
      if (tokenCenterY < topmostY) {
        topmostY = tokenCenterY;
        topmostPlayer = $li;
      }
      if (tokenCenterY > bottommostY) {
        bottommostY = tokenCenterY;
        bottommostPlayer = $li;
      }
    }).then(() => {
      // Check topmost player's name is within viewport
      const topName = topmostPlayer.find('.player-name')[0];
      const topNameRect = topName.getBoundingClientRect();
      cy.wrap(topNameRect.top).should('be.at.least', 0, 'Topmost player name should not overflow top');
      
      // Check bottommost player's name is within viewport
      const bottomName = bottommostPlayer.find('.player-name')[0];
      const bottomNameRect = bottomName.getBoundingClientRect();
      cy.wrap(bottomNameRect.bottom).should('be.at.most', 700, 'Bottommost player name should not overflow bottom');
    });
  });
});