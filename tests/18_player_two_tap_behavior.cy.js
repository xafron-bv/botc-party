describe('Player two-tap behavior in touch mode', () => {
  // Helper to start game with players
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
  
  afterEach(() => {
    // Close any open modals
    cy.get('body').then($body => {
      if ($body.find('#character-modal:visible').length > 0) {
        cy.get('#close-character-modal').click({ force: true });
      }
    });
  });

  describe('Player token (character circle)', () => {
    it('should bring player to front on first tap when overlapping, open modal on second tap', () => {
      // Mark second player as overlapping for test
      cy.get('#player-circle li').eq(1).then($li => {
        $li[0].dataset.testOverlapping = 'true';
      });
      
      const secondPlayerLi = cy.get('#player-circle li').eq(1);
      const secondPlayerToken = secondPlayerLi.find('.player-token');
      
      // First tap should bring to front
      secondPlayerToken.trigger('touchstart', { force: true, touches: [{ clientX: 10, clientY: 10 }] });
      secondPlayerToken.trigger('touchend', { force: true });
      
      // Check that player (li element) is raised
      secondPlayerLi.should('have.attr', 'data-raised', 'true');
      secondPlayerLi.should(($li) => {
        expect(parseInt($li[0].style.zIndex, 10)).to.be.greaterThan(100);
      });
      
      // Character modal should not be open yet
      cy.get('#character-modal').should('not.exist');
      
      // Second tap should open modal
      secondPlayerToken.trigger('touchstart', { force: true, touches: [{ clientX: 10, clientY: 10 }] });
      secondPlayerToken.trigger('touchend', { force: true });
      
      // Now modal should be open
      cy.get('#character-modal').should('be.visible');
      
      // Close modal
      cy.get('#close-character-modal').click();
    });

    it('should open modal immediately if player is not overlapping', () => {
      // Don't mark any player as overlapping - default is non-overlapping
      
      const firstPlayerToken = cy.get('#player-circle li').first().find('.player-token');
      
      // Single tap should open modal directly
      firstPlayerToken.trigger('touchstart', { force: true, touches: [{ clientX: 10, clientY: 10 }] });
      firstPlayerToken.trigger('touchend', { force: true });
      
      // Modal should open immediately
      cy.get('#character-modal').should('be.visible');
      
      // Close modal
      cy.get('#close-character-modal').click();
    });
  });

  describe('Player name', () => {
    it('should bring player to front on first tap when overlapping, rename on second tap', () => {
      // Mark second player as overlapping for test
      cy.get('#player-circle li').eq(1).then($li => {
        $li[0].dataset.testOverlapping = 'true';
      });
      
      const secondPlayerLi = cy.get('#player-circle li').eq(1);
      const secondPlayerName = secondPlayerLi.find('.player-name');
      
      // First tap should bring to front
      secondPlayerName.trigger('touchstart', { force: true, touches: [{ clientX: 5, clientY: 5 }] });
      secondPlayerName.trigger('touchend', { force: true });
      
      // Check that player (li element) is raised
      secondPlayerLi.should('have.attr', 'data-raised', 'true');
      
      // Should not be in rename mode yet
      secondPlayerName.should('not.have.class', 'editing');
      
      // Second tap should start rename
      secondPlayerName.trigger('touchstart', { force: true, touches: [{ clientX: 5, clientY: 5 }] });
      secondPlayerName.trigger('touchend', { force: true });
      
      // Now should be in rename mode
      cy.get('.player-name-input').should('be.visible');
    });
  });

  describe('Death ribbon', () => {
    it('should bring player to front on first tap when overlapping, toggle death on second tap', () => {
      // Assign characters first so death ribbons are visible
      cy.get('#player-circle li').eq(0).find('.player-token').click();
      cy.get('#character-modal').should('be.visible');
      cy.get('#character-modal .role').first().click();
      
      cy.get('#player-circle li').eq(1).find('.player-token').click();
      cy.get('#character-modal').should('be.visible');
      cy.get('#character-modal .role').eq(1).click();
      
      // Mark second player as overlapping for test
      cy.get('#player-circle li').eq(1).then($li => {
        $li[0].dataset.testOverlapping = 'true';
      });
      
      const secondPlayerLi = cy.get('#player-circle li').eq(1);
      const secondPlayerRibbon = secondPlayerLi.find('.death-ribbon');
      
      // Verify ribbon exists and player is not dead
      secondPlayerRibbon.should('exist');
      secondPlayerLi.should('not.have.class', 'dead');
      
      // First tap should bring to front
      secondPlayerRibbon.trigger('touchstart', { force: true, touches: [{ clientX: 5, clientY: 5 }] });
      secondPlayerRibbon.trigger('touchend', { force: true });
      
      // Check that player (li element) is raised
      secondPlayerLi.should('have.attr', 'data-raised', 'true');
      
      // Player should not be dead yet
      secondPlayerLi.should('not.have.class', 'dead');
      
      // Second tap should toggle death
      secondPlayerRibbon.trigger('touchstart', { force: true, touches: [{ clientX: 5, clientY: 5 }] });
      secondPlayerRibbon.trigger('touchend', { force: true });
      
      // Now player should be dead
      secondPlayerLi.should('have.class', 'dead');
    });
  });

  describe('Global behavior', () => {
    it('should clear raised state when tapping outside any player', () => {
      // Position players to overlap
      cy.get('#player-circle li').eq(0).then($li1 => {
        cy.get('#player-circle li').eq(1).then($li2 => {
          $li1[0].style.position = 'absolute';
          $li1[0].style.left = '100px';
          $li1[0].style.top = '100px';
          $li1[0].style.zIndex = '10';
          
          $li2[0].style.position = 'absolute';
          $li2[0].style.left = '110px';
          $li2[0].style.top = '110px';
          $li2[0].style.zIndex = '5';
        });
      });
      
      cy.wait(100);
      
      const firstPlayerToken = cy.get('#player-circle li').eq(1).find('.player-token');
      
      // Tap to raise player
      firstPlayerToken.trigger('touchstart', { force: true, touches: [{ clientX: 10, clientY: 10 }] });
      firstPlayerToken.trigger('touchend', { force: true });
      
      // Check player is raised
      cy.get('#player-circle li').eq(1).should('have.attr', 'data-raised', 'true');
      
      // Tap outside (on body)
      cy.get('body').trigger('touchstart', { force: true, touches: [{ clientX: 400, clientY: 400 }] });
      
      // Raised state should be cleared
      cy.get('#player-circle li[data-raised="true"]').should('not.exist');
    });

    it('should only have one player raised at a time', () => {
      // Position three players to overlap
      cy.get('#player-circle li').eq(0).then($li1 => {
        cy.get('#player-circle li').eq(1).then($li2 => {
          cy.get('#player-circle li').eq(2).then($li3 => {
            $li1[0].style.position = 'absolute';
            $li1[0].style.left = '100px';
            $li1[0].style.top = '100px';
            $li1[0].style.zIndex = '10';
            
            $li2[0].style.position = 'absolute';
            $li2[0].style.left = '110px';
            $li2[0].style.top = '110px';
            $li2[0].style.zIndex = '5';
            
            $li3[0].style.position = 'absolute';
            $li3[0].style.left = '120px';
            $li3[0].style.top = '120px';
            $li3[0].style.zIndex = '3';
          });
        });
      });
      
      cy.wait(100);
      
      // Tap first player
      cy.get('#player-circle li').eq(1).find('.player-token').trigger('touchstart', { force: true, touches: [{ clientX: 10, clientY: 10 }] });
      cy.get('#player-circle li').eq(1).find('.player-token').trigger('touchend', { force: true });
      
      // First player should be raised
      cy.get('#player-circle li').eq(1).should('have.attr', 'data-raised', 'true');
      
      // Tap second player
      cy.get('#player-circle li').eq(2).find('.player-token').trigger('touchstart', { force: true, touches: [{ clientX: 10, clientY: 10 }] });
      cy.get('#player-circle li').eq(2).find('.player-token').trigger('touchend', { force: true });
      
      // Second player should be raised, first should not
      cy.get('#player-circle li').eq(2).should('have.attr', 'data-raised', 'true');
      cy.get('#player-circle li').eq(1).should('not.have.attr', 'data-raised');
      
      // Only one player should be raised
      cy.get('#player-circle li[data-raised="true"]').should('have.length', 1);
    });
  });
});