// Cypress E2E test - Two-tap behavior for player elements in touch mode
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

describe('Player two-tap behavior in touch mode', () => {
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

  describe('Player token (character circle)', () => {
    it('should bring player to front on first tap when partially covered, open modal on second tap', () => {
      // Simulate player 2's token being below player 1's name by setting z-indices
      cy.get('#player-circle li').first().then($li => {
        $li[0].style.zIndex = '60';
        const name = $li.find('.player-name')[0];
        name.style.opacity = '1';
        name.style.zIndex = '10';
      });
      
      const secondPlayerLi = cy.get('#player-circle li').eq(1);
      const secondPlayerToken = secondPlayerLi.find('.player-token');
      
      // First tap should bring to front
      secondPlayerToken.trigger('touchstart', { touches: [{ clientX: 10, clientY: 10 }] });
      secondPlayerToken.trigger('touchend');
      
      // Verify player is raised
      secondPlayerLi.should($li => {
        expect($li[0].dataset.raised).to.equal('true');
        const zIndex = parseInt($li[0].style.zIndex || window.getComputedStyle($li[0]).zIndex, 10);
        expect(zIndex).to.be.greaterThan(100);
      });
      
      // Character modal should NOT open on first tap
      cy.get('#character-modal').should('not.be.visible');
      
      // Second tap should open character modal
      secondPlayerToken.trigger('touchstart', { touches: [{ clientX: 10, clientY: 10 }] });
      secondPlayerToken.trigger('touchend');
      
      // Character modal should open
      cy.get('#character-modal').should('be.visible');
      
      // Close modal
      cy.get('#close-character-modal').click();
    });

    it('should open modal immediately if player is not covered', () => {
      // Ensure no overlapping by default positioning
      const firstPlayerToken = cy.get('#player-circle li').first().find('.player-token');
      
      // Single tap should open modal immediately
      firstPlayerToken.trigger('touchstart', { touches: [{ clientX: 10, clientY: 10 }] });
      firstPlayerToken.trigger('touchend');
      
      // Character modal should open
      cy.get('#character-modal').should('be.visible');
      
      // Close modal
      cy.get('#close-character-modal').click();
    });
  });

  describe('Player name', () => {
    it('should bring player to front on first tap when covered, rename on second tap', () => {
      // Make player 2's name partially covered
      cy.get('#player-circle li').eq(1).find('.player-name').then($name => {
        $name[0].style.opacity = '1';
        $name[0].style.zIndex = '0'; // Behind tokens
      });
      
      const secondPlayerLi = cy.get('#player-circle li').eq(1);
      const secondPlayerName = secondPlayerLi.find('.player-name');
      
      // First tap should bring to front
      secondPlayerName.trigger('touchstart', { touches: [{ clientX: 5, clientY: 5 }] });
      secondPlayerName.trigger('touchend');
      
      // Verify player is raised
      secondPlayerLi.should($li => {
        expect($li[0].dataset.raised).to.equal('true');
      });
      
      // Stub prompt for rename
      cy.window().then(win => {
        cy.stub(win, 'prompt').returns('New Name');
      });
      
      // Second tap should trigger rename
      secondPlayerName.trigger('touchstart', { touches: [{ clientX: 5, clientY: 5 }] });
      secondPlayerName.trigger('touchend');
      
      // Verify prompt was called
      cy.window().its('prompt').should('have.been.called');
      
      // Verify name was updated
      secondPlayerName.should('contain', 'New Name');
    });
  });

  describe('Death ribbon', () => {
    it('should bring player to front on first tap when covered, toggle death on second tap', () => {
      // Assign a character first
      const firstPlayerToken = cy.get('#player-circle li').first().find('.player-token');
      firstPlayerToken.click();
      cy.get('#character-modal .role').first().click();
      
      // Make player partially covered
      cy.get('#player-circle li').first().then($li => {
        $li[0].style.zIndex = '1';
      });
      
      const firstPlayerLi = cy.get('#player-circle li').first();
      
      // Wait for death ribbon to appear
      cy.get('#player-circle li').first().find('.death-ribbon').should('exist');
      const deathRibbon = cy.get('#player-circle li').first().find('.death-ribbon');
      
      // First tap should bring to front
      deathRibbon.trigger('touchstart', { touches: [{ clientX: 10, clientY: 10 }] });
      deathRibbon.trigger('touchend');
      
      // Verify player is raised
      firstPlayerLi.should($li => {
        expect($li[0].dataset.raised).to.equal('true');
      });
      
      // Player should not be dead yet
      firstPlayerLi.should('not.have.class', 'dead');
      
      // Second tap should toggle death
      deathRibbon.trigger('touchstart', { touches: [{ clientX: 10, clientY: 10 }] });
      deathRibbon.trigger('touchend');
      
      // Player should now be dead
      firstPlayerLi.should('have.class', 'dead');
    });
  });

  describe('Global behavior', () => {
    it('should clear raised state when tapping outside any player', () => {
      // Make player 2 covered and raise it
      const secondPlayerLi = cy.get('#player-circle li').eq(1);
      secondPlayerLi.then($li => {
        $li[0].style.zIndex = '1';
      });
      
      const secondPlayerToken = secondPlayerLi.find('.player-token');
      
      // First tap to raise
      secondPlayerToken.trigger('touchstart', { touches: [{ clientX: 10, clientY: 10 }] });
      secondPlayerToken.trigger('touchend');
      
      // Verify raised
      secondPlayerLi.should($li => {
        expect($li[0].dataset.raised).to.equal('true');
      });
      
      // Tap outside
      cy.get('body').trigger('touchstart', { touches: [{ clientX: 0, clientY: 0 }] });
      
      // Verify no longer raised
      secondPlayerLi.should($li => {
        expect($li[0].dataset.raised).to.not.exist;
        const zIndex = parseInt($li[0].style.zIndex, 10) || 0;
        expect(zIndex).to.be.lessThan(10);
      });
    });

    it('should only have one player raised at a time', () => {
      // Make both players covered
      cy.get('#player-circle li').eq(1).then($li => {
        $li[0].style.zIndex = '1';
      });
      cy.get('#player-circle li').eq(2).then($li => {
        $li[0].style.zIndex = '1';
      });
      
      const secondPlayerToken = cy.get('#player-circle li').eq(1).find('.player-token');
      const thirdPlayerToken = cy.get('#player-circle li').eq(2).find('.player-token');
      
      // Raise second player
      secondPlayerToken.trigger('touchstart', { touches: [{ clientX: 10, clientY: 10 }] });
      secondPlayerToken.trigger('touchend');
      
      // Verify second is raised
      cy.get('#player-circle li').eq(1).should($li => {
        expect($li[0].dataset.raised).to.equal('true');
      });
      
      // Raise third player
      thirdPlayerToken.trigger('touchstart', { touches: [{ clientX: 20, clientY: 20 }] });
      thirdPlayerToken.trigger('touchend');
      
      // Verify third is raised and second is not
      cy.get('#player-circle li').eq(2).should($li => {
        expect($li[0].dataset.raised).to.equal('true');
      });
      cy.get('#player-circle li').eq(1).should($li => {
        expect($li[0].dataset.raised).to.not.exist;
      });
    });
  });
});