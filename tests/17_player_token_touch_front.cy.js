// Cypress E2E test - Touch mode player token should be brought to front when touched
/// <reference types="cypress" />

describe('Player token touch brings to front', () => {
  beforeEach(() => {
    // Visit the app
    cy.visit('/');
    
    // Force touch mode by setting ontouchstart
    cy.window().then((win) => {
      Object.defineProperty(win, 'ontouchstart', { value: true, configurable: true });
    });
    
    // Reload to ensure touch mode is active
    cy.reload();
    
    // Add multiple players with overlapping positions
    cy.addPlayer('Alice');
    cy.addPlayer('Bob');
    cy.addPlayer('Charlie');
  });

  it('should bring player token to front when touched in touch mode', () => {
    // Get the player tokens
    const aliceToken = cy.get('#player-circle li').contains('Alice').parent().find('.player-token');
    const bobToken = cy.get('#player-circle li').contains('Bob').parent().find('.player-token');
    
    // Get initial z-index values
    aliceToken.then($token => {
      const initialZIndex = $token[0].style.zIndex || window.getComputedStyle($token[0]).zIndex || '5';
      cy.wrap(initialZIndex).as('aliceInitialZIndex');
    });
    
    bobToken.then($token => {
      const initialZIndex = $token[0].style.zIndex || window.getComputedStyle($token[0]).zIndex || '5';
      cy.wrap(initialZIndex).as('bobInitialZIndex');
    });
    
    // Touch Bob's token to bring it to front
    bobToken.trigger('touchstart', { touches: [{ clientX: 10, clientY: 10 }], force: true });
    
    // Verify Bob's token is brought to front (higher z-index)
    bobToken.should($token => {
      const currentZIndex = parseInt($token[0].style.zIndex || window.getComputedStyle($token[0]).zIndex, 10);
      expect(currentZIndex).to.be.greaterThan(50); // Should be raised significantly
    });
    
    // Verify Bob's parent li is also raised
    cy.get('#player-circle li').contains('Bob').parent().should($li => {
      const currentZIndex = parseInt($li[0].style.zIndex || window.getComputedStyle($li[0]).zIndex, 10);
      expect(currentZIndex).to.be.greaterThan(100); // Parent should be raised even higher
    });
  });

  it('should maintain front position until another token is touched', () => {
    const aliceToken = cy.get('#player-circle li').contains('Alice').parent().find('.player-token');
    const bobToken = cy.get('#player-circle li').contains('Bob').parent().find('.player-token');
    const charlieToken = cy.get('#player-circle li').contains('Charlie').parent().find('.player-token');
    
    // Touch Bob's token first
    bobToken.trigger('touchstart', { touches: [{ clientX: 10, clientY: 10 }], force: true });
    
    // Verify Bob is raised
    bobToken.should($token => {
      const currentZIndex = parseInt($token[0].style.zIndex || window.getComputedStyle($token[0]).zIndex, 10);
      expect(currentZIndex).to.be.greaterThan(50);
    });
    
    // Touch Charlie's token
    charlieToken.trigger('touchstart', { touches: [{ clientX: 20, clientY: 20 }], force: true });
    
    // Verify Charlie is now raised
    charlieToken.should($token => {
      const currentZIndex = parseInt($token[0].style.zIndex || window.getComputedStyle($token[0]).zIndex, 10);
      expect(currentZIndex).to.be.greaterThan(50);
    });
    
    // Verify Bob is back to normal z-index
    bobToken.should($token => {
      const currentZIndex = parseInt($token[0].style.zIndex || window.getComputedStyle($token[0]).zIndex, 10);
      expect(currentZIndex).to.be.lessThan(10); // Should be back to normal
    });
  });

  it('should bring token above overlapping player names', () => {
    // Simulate a scenario where player 2's token is below player 1's name
    const player1Name = cy.get('#player-circle li').first().find('.player-name');
    const player2Token = cy.get('#player-circle li').eq(1).find('.player-token');
    
    // Set player 1's name to be visible and have high z-index (simulating hover)
    player1Name.then($name => {
      $name[0].style.opacity = '1';
      $name[0].style.zIndex = '60';
    });
    
    // Touch player 2's token
    player2Token.trigger('touchstart', { touches: [{ clientX: 15, clientY: 15 }], force: true });
    
    // Verify player 2's token is now above player 1's name
    player2Token.then($token => {
      const tokenZIndex = parseInt($token[0].style.zIndex || window.getComputedStyle($token[0]).zIndex, 10);
      cy.get('@player1Name').then($name => {
        const nameZIndex = parseInt($name[0].style.zIndex || window.getComputedStyle($name[0]).zIndex, 10);
        expect(tokenZIndex).to.be.greaterThan(nameZIndex);
      });
    });
    
    // Also verify the parent li is raised appropriately
    cy.get('#player-circle li').eq(1).should($li => {
      const currentZIndex = parseInt($li[0].style.zIndex || window.getComputedStyle($li[0]).zIndex, 10);
      expect(currentZIndex).to.be.greaterThan(100);
    });
  });

  it('should not interfere with character assignment when touching token', () => {
    const aliceToken = cy.get('#player-circle li').contains('Alice').parent().find('.player-token');
    
    // Touch the token
    aliceToken.trigger('touchstart', { touches: [{ clientX: 10, clientY: 10 }], force: true });
    aliceToken.trigger('touchend', { force: true });
    
    // Verify character assignment modal still opens
    cy.get('.modal').should('be.visible');
    cy.get('.character-select').should('be.visible');
    
    // Close the modal
    cy.get('.modal-close-btn').click();
  });

  it('should reset z-index when touching outside any player', () => {
    const bobToken = cy.get('#player-circle li').contains('Bob').parent().find('.player-token');
    
    // Touch Bob's token to raise it
    bobToken.trigger('touchstart', { touches: [{ clientX: 10, clientY: 10 }], force: true });
    
    // Verify it's raised
    bobToken.should($token => {
      const currentZIndex = parseInt($token[0].style.zIndex || window.getComputedStyle($token[0]).zIndex, 10);
      expect(currentZIndex).to.be.greaterThan(50);
    });
    
    // Touch outside (on body)
    cy.get('body').trigger('touchstart', { touches: [{ clientX: 0, clientY: 0 }] });
    
    // Verify Bob's token is back to normal
    bobToken.should($token => {
      const currentZIndex = parseInt($token[0].style.zIndex || window.getComputedStyle($token[0]).zIndex, 10);
      expect(currentZIndex).to.be.lessThan(10);
    });
  });
});