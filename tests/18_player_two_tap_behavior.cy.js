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
    // Set a small viewport to ensure overlaps
    cy.viewport(800, 600);
    
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
    cy.get('#load-tb').click({ force: true });
    cy.get('#character-sheet .role').should('have.length.greaterThan', 5);
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
      // Start game with 20 players - guaranteed overlaps on small screen
      startGameWithPlayers(20);
      
      // Find overlapping players
      cy.window().then((win) => {
        const players = win.document.querySelectorAll('#player-circle li');
        let overlappingPair = null;
        
        // Find first pair of overlapping players
        for (let i = 0; i < players.length && !overlappingPair; i++) {
          for (let j = i + 1; j < players.length; j++) {
            const rect1 = players[i].getBoundingClientRect();
            const rect2 = players[j].getBoundingClientRect();
            
            const overlap = !(rect1.right < rect2.left || 
                           rect1.left > rect2.right || 
                           rect1.bottom < rect2.top || 
                           rect1.top > rect2.bottom);
            
            if (overlap) {
              overlappingPair = { first: i, second: j };
              // Log for debugging
              cy.log(`Found overlapping players: ${i} and ${j}`);
              break;
            }
          }
        }
        
        // Should definitely find overlaps with 20 players
        expect(overlappingPair).to.not.be.null;
        win.testOverlappingPair = overlappingPair;
      });
      
      cy.window().its('testOverlappingPair').then((pair) => {
        const secondPlayerLi = cy.get('#player-circle li').eq(pair.second);
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
    });

    it('should open modal immediately if player is not overlapping', () => {
      // Start with few players to minimize overlaps
      startGameWithPlayers(5);
      
      // Find a non-overlapping player (likely at edges)
      cy.window().then((win) => {
        const players = win.document.querySelectorAll('#player-circle li');
        let nonOverlappingIndex = null;
        
        // Check each player for overlaps
        for (let i = 0; i < players.length; i++) {
          const rect1 = players[i].getBoundingClientRect();
          let hasOverlap = false;
          
          for (let j = 0; j < players.length; j++) {
            if (i === j) continue;
            const rect2 = players[j].getBoundingClientRect();
            
            const overlap = !(rect1.right < rect2.left || 
                           rect1.left > rect2.right || 
                           rect1.bottom < rect2.top || 
                           rect1.top > rect2.bottom);
            
            if (overlap) {
              hasOverlap = true;
              break;
            }
          }
          
          if (!hasOverlap) {
            nonOverlappingIndex = i;
            cy.log(`Found non-overlapping player: ${i}`);
            break;
          }
        }
        
        // If all overlap, use the first one
        win.testNonOverlappingIndex = nonOverlappingIndex || 0;
      });
      
      cy.window().its('testNonOverlappingIndex').then((index) => {
        const playerToken = cy.get('#player-circle li').eq(index).find('.player-token');
      
        // Single tap should open modal directly
        playerToken.trigger('touchstart', { force: true, touches: [{ clientX: 10, clientY: 10 }] });
        playerToken.trigger('touchend', { force: true });
      
        // Modal should open immediately
        cy.get('#character-modal').should('be.visible');
        
        // Close modal
        cy.get('#close-character-modal').click();
      });
    });
  });

  describe('Player name', () => {
    it('should bring player to front on first tap when overlapping, rename on second tap', () => {
      // Start game with 20 players - guaranteed overlaps
      startGameWithPlayers(20);
      
      // Find overlapping players
      cy.window().then((win) => {
        const players = win.document.querySelectorAll('#player-circle li');
        let overlappingPair = null;
        
        for (let i = 0; i < players.length && !overlappingPair; i++) {
          for (let j = i + 1; j < players.length; j++) {
            const rect1 = players[i].getBoundingClientRect();
            const rect2 = players[j].getBoundingClientRect();
            
            const overlap = !(rect1.right < rect2.left || 
                           rect1.left > rect2.right || 
                           rect1.bottom < rect2.top || 
                           rect1.top > rect2.bottom);
            
            if (overlap) {
              overlappingPair = { first: i, second: j };
              break;
            }
          }
        }
        
        expect(overlappingPair).to.not.be.null;
        win.testOverlappingPair = overlappingPair;
      });
      
      cy.window().its('testOverlappingPair').then((pair) => {
        const secondPlayerLi = cy.get('#player-circle li').eq(pair.second);
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
  });

  describe('Death ribbon', () => {
    it('should bring player to front on first tap when overlapping, toggle death on second tap', () => {
      // Start game with 20 players
      startGameWithPlayers(20);
      
      // Find overlapping players first
      cy.window().then((win) => {
        const players = win.document.querySelectorAll('#player-circle li');
        let overlappingPair = null;
        
        for (let i = 0; i < players.length && !overlappingPair; i++) {
          for (let j = i + 1; j < players.length; j++) {
            const rect1 = players[i].getBoundingClientRect();
            const rect2 = players[j].getBoundingClientRect();
            
            const overlap = !(rect1.right < rect2.left || 
                           rect1.left > rect2.right || 
                           rect1.bottom < rect2.top || 
                           rect1.top > rect2.bottom);
            
            if (overlap) {
              overlappingPair = { first: i, second: j };
              break;
            }
          }
        }
        
        expect(overlappingPair).to.not.be.null;
        win.testOverlappingPair = overlappingPair;
      });
      
      // Assign characters to the overlapping players
      cy.window().its('testOverlappingPair').then((pair) => {
        cy.get('#player-circle li').eq(pair.first).find('.player-token').click();
        cy.get('#character-modal').should('be.visible');
        cy.get('#character-modal .role').first().click();
        
        cy.get('#player-circle li').eq(pair.second).find('.player-token').click();
        cy.get('#character-modal').should('be.visible');
        cy.get('#character-modal .role').eq(1).click();
      });
      
      cy.window().its('testOverlappingPair').then((pair) => {
        const secondPlayerLi = cy.get('#player-circle li').eq(pair.second);
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
  });

  describe('Global behavior', () => {
    it('should clear raised state when tapping outside any player', () => {
      // Start game with 20 players
      startGameWithPlayers(20);
      
      // Find overlapping players
      cy.window().then((win) => {
        const players = win.document.querySelectorAll('#player-circle li');
        let overlappingPair = null;
        
        for (let i = 0; i < players.length && !overlappingPair; i++) {
          for (let j = i + 1; j < players.length; j++) {
            const rect1 = players[i].getBoundingClientRect();
            const rect2 = players[j].getBoundingClientRect();
            
            const overlap = !(rect1.right < rect2.left || 
                           rect1.left > rect2.right || 
                           rect1.bottom < rect2.top || 
                           rect1.top > rect2.bottom);
            
            if (overlap) {
              overlappingPair = { first: i, second: j };
              break;
            }
          }
        }
        
        expect(overlappingPair).to.not.be.null;
        win.testOverlappingPair = overlappingPair;
      });
      
      cy.window().its('testOverlappingPair').then((pair) => {
        const playerToken = cy.get('#player-circle li').eq(pair.second).find('.player-token');
        
        // Tap to raise player
        playerToken.trigger('touchstart', { force: true, touches: [{ clientX: 10, clientY: 10 }] });
        playerToken.trigger('touchend', { force: true });
        
        // Check player is raised
        cy.get('#player-circle li').eq(pair.second).should('have.attr', 'data-raised', 'true');
        
        // Tap outside (on body)
        cy.get('body').trigger('touchstart', { force: true, touches: [{ clientX: 400, clientY: 400 }] });
        
        // Raised state should be cleared
        cy.get('#player-circle li[data-raised="true"]').should('not.exist');
      });
    });

    it('should only have one player raised at a time', () => {
      // Start game with 20 players
      startGameWithPlayers(20);
      
      // Find at least two overlapping players
      cy.window().then((win) => {
        const players = win.document.querySelectorAll('#player-circle li');
        const overlappingPlayers = [];
        
        for (let i = 0; i < players.length; i++) {
          for (let j = i + 1; j < players.length; j++) {
            const rect1 = players[i].getBoundingClientRect();
            const rect2 = players[j].getBoundingClientRect();
            
            const overlap = !(rect1.right < rect2.left || 
                           rect1.left > rect2.right || 
                           rect1.bottom < rect2.top || 
                           rect1.top > rect2.bottom);
            
            if (overlap) {
              if (overlappingPlayers.indexOf(i) === -1) overlappingPlayers.push(i);
              if (overlappingPlayers.indexOf(j) === -1) overlappingPlayers.push(j);
              if (overlappingPlayers.length >= 2) break;
            }
          }
          if (overlappingPlayers.length >= 2) break;
        }
        
        expect(overlappingPlayers.length).to.be.at.least(2);
        win.testOverlappingPlayers = overlappingPlayers;
      });
      
      cy.window().its('testOverlappingPlayers').then((players) => {
        // Tap first overlapping player
        cy.get('#player-circle li').eq(players[0]).find('.player-token').trigger('touchstart', { force: true, touches: [{ clientX: 10, clientY: 10 }] });
        cy.get('#player-circle li').eq(players[0]).find('.player-token').trigger('touchend', { force: true });
        
        // First player should be raised
        cy.get('#player-circle li').eq(players[0]).should('have.attr', 'data-raised', 'true');
        
        // Tap second overlapping player
        cy.get('#player-circle li').eq(players[1]).find('.player-token').trigger('touchstart', { force: true, touches: [{ clientX: 10, clientY: 10 }] });
        cy.get('#player-circle li').eq(players[1]).find('.player-token').trigger('touchend', { force: true });
        
        // Second player should be raised, first should not
        cy.get('#player-circle li').eq(players[1]).should('have.attr', 'data-raised', 'true');
        cy.get('#player-circle li').eq(players[0]).should('not.have.attr', 'data-raised');
        
        // Only one player should be raised
        cy.get('#player-circle li[data-raised="true"]').should('have.length', 1);
      });
    });
  });
});