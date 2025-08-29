// Cypress E2E test - Touch mode player token should be brought to front when touched
/// <reference types="cypress" />

const startGameWithPlayers = (n) => {
  cy.get('#player-count').then(($el) => {
    const el = $el[0];
    el.value = String(n);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  });
  cy.get('#start-game').click();
  cy.get('#player-circle li').should('have.length', n);
};

describe('Player token touch brings to front', () => {
  beforeEach(() => {
    // Visit the app
    cy.visit('/');
    
    // Clear localStorage to ensure fresh start
    cy.window().then((win) => { 
      try { win.localStorage.clear(); } catch (_) {} 
    });
    
    // Reload first
    cy.reload();
    
    // Force touch mode by setting ontouchstart after reload
    cy.window().then((win) => {
      Object.defineProperty(win, 'ontouchstart', { value: true, configurable: true });
    });
    
    // Verify touch mode is active
    cy.window().should('have.property', 'ontouchstart');
    
    // Load a script to have content
    cy.get('#load-tb').click();
    cy.get('#character-sheet .role').should('have.length.greaterThan', 5);
    
    // Start game with multiple players
    startGameWithPlayers(8);
  });

  it('should bring player token to front when touched in touch mode', () => {
    // Get the player tokens by index
    cy.get('#player-circle li').eq(0).find('.player-token').as('firstToken');
    cy.get('#player-circle li').eq(1).find('.player-token').as('secondToken');
    
    // Get initial z-index values
    cy.get('@firstToken').then($token => {
      const initialZIndex = $token[0].style.zIndex || window.getComputedStyle($token[0]).zIndex || '5';
      cy.wrap(initialZIndex).as('firstInitialZIndex');
    });
    
    cy.get('@secondToken').then($token => {
      const initialZIndex = $token[0].style.zIndex || window.getComputedStyle($token[0]).zIndex || '5';
      cy.wrap(initialZIndex).as('secondInitialZIndex');
    });
    
    // Touch second player's token to bring it to front
    cy.get('@secondToken').trigger('touchstart', { touches: [{ clientX: 10, clientY: 10 }], force: true });
    
    // Verify second player's token is brought to front (higher z-index)
    cy.get('@secondToken').should($token => {
      const currentZIndex = parseInt($token[0].style.zIndex || window.getComputedStyle($token[0]).zIndex, 10);
      expect(currentZIndex).to.be.greaterThan(50); // Should be raised significantly
    });
    
    // Verify second player's parent li is also raised
    cy.get('#player-circle li').eq(1).should($li => {
      const currentZIndex = parseInt($li[0].style.zIndex || window.getComputedStyle($li[0]).zIndex, 10);
      expect(currentZIndex).to.be.greaterThan(100); // Parent should be raised even higher
    });
  });

  it('should maintain front position until another token is touched', () => {
    cy.get('#player-circle li').eq(0).find('.player-token').as('firstToken');
    cy.get('#player-circle li').eq(1).find('.player-token').as('secondToken');
    cy.get('#player-circle li').eq(2).find('.player-token').as('thirdToken');
    
    // Touch second player's token first
    cy.get('@secondToken').trigger('touchstart', { touches: [{ clientX: 10, clientY: 10 }], force: true });
    
    // Verify second is raised
    cy.get('@secondToken').should($token => {
      const currentZIndex = parseInt($token[0].style.zIndex || window.getComputedStyle($token[0]).zIndex, 10);
      expect(currentZIndex).to.be.greaterThan(50);
    });
    
    // Touch third player's token
    cy.get('@thirdToken').trigger('touchstart', { touches: [{ clientX: 20, clientY: 20 }], force: true });
    
    // Verify third is now raised
    cy.get('@thirdToken').should($token => {
      const currentZIndex = parseInt($token[0].style.zIndex || window.getComputedStyle($token[0]).zIndex, 10);
      expect(currentZIndex).to.be.greaterThan(50);
    });
    
    // Verify second is back to normal z-index
    cy.get('@secondToken').should($token => {
      const currentZIndex = parseInt($token[0].style.zIndex || window.getComputedStyle($token[0]).zIndex, 10);
      expect(currentZIndex).to.be.lessThan(10); // Should be back to normal
    });
  });

  it('should bring token above overlapping player names', () => {
    // Simulate a scenario where player 2's token is below player 1's name
    cy.get('#player-circle li').first().find('.player-name').as('player1Name');
    cy.get('#player-circle li').eq(1).find('.player-token').as('player2Token');
    
    // Set player 1's name to be visible and have high z-index (simulating hover)
    cy.get('@player1Name').then($name => {
      $name[0].style.opacity = '1';
      $name[0].style.zIndex = '60';
    });
    
    // Touch player 2's token
    cy.get('@player2Token').trigger('touchstart', { touches: [{ clientX: 15, clientY: 15 }], force: true });
    
    // Verify player 2's token is now above player 1's name
    cy.get('@player2Token').then($token => {
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
    cy.get('#player-circle li').eq(0).find('.player-token').as('firstToken');
    
    // Touch the token
    cy.get('@firstToken').trigger('touchstart', { touches: [{ clientX: 10, clientY: 10 }], force: true });
    cy.get('@firstToken').trigger('touchend', { force: true });
    
    // Verify character assignment modal still opens
    cy.get('.modal').should('be.visible');
    cy.get('.character-select').should('be.visible');
    
    // Close the modal
    cy.get('.modal-close-btn').click();
  });

  it('should reset z-index when touching outside any player', () => {
    cy.get('#player-circle li').eq(1).find('.player-token').as('secondToken');
    
    // Touch second player's token to raise it
    cy.get('@secondToken').trigger('touchstart', { touches: [{ clientX: 10, clientY: 10 }], force: true });
    
    // Verify it's raised
    cy.get('@secondToken').should($token => {
      const currentZIndex = parseInt($token[0].style.zIndex || window.getComputedStyle($token[0]).zIndex, 10);
      expect(currentZIndex).to.be.greaterThan(50);
    });
    
    // Touch outside (on body)
    cy.get('body').trigger('touchstart', { touches: [{ clientX: 0, clientY: 0 }] });
    
    // Verify second player's token is back to normal
    cy.get('@secondToken').should($token => {
      const currentZIndex = parseInt($token[0].style.zIndex || window.getComputedStyle($token[0]).zIndex, 10);
      expect(currentZIndex).to.be.lessThan(10);
    });
  });
});