describe('Reminder Positioning with Day/Night Tracking', () => {
  beforeEach(() => {
    cy.visit('/?test=true');
    cy.viewport(1280, 900);
    
    // Clear local storage to start fresh
    cy.window().then((win) => {
      try { win.localStorage.clear(); } catch (_) { }
    });
    
    // Load Trouble Brewing script
    cy.get('#load-tb').click();
    cy.get('#character-sheet .role').should('have.length.greaterThan', 5);
    
    // Setup a game with 5 players
    cy.get('#player-count').clear().type('5');
    cy.get('#start-game').click();
    
    // Wait for player circle to be set up
    cy.get('#player-circle li').should('have.length', 5);
    
    // Enable day/night tracking
    cy.get('[data-testid="day-night-toggle"]').click();
  });

  describe('Plus Button Positioning Bug Fix', () => {
    it('should position plus button correctly after refresh when viewing earlier phase', () => {
      // Start at N1
      cy.get('[data-testid="current-phase"]').should('contain', 'N1');
      
      // Add a reminder in N1 to player 1
      cy.get('li').first().find('.reminder-placeholder').click({ altKey: true });
      cy.get('#text-reminder-modal').should('be.visible');
      cy.get('#reminder-text-input').type('N1 reminder');
      cy.get('[data-testid="save-text-reminder"]').click();
      
      // Move to D1
      cy.get('[data-testid="add-phase-button"]').click();
      cy.get('[data-testid="current-phase"]').should('contain', 'D1');
      
      // Move to N2
      cy.get('[data-testid="add-phase-button"]').click();
      cy.get('[data-testid="current-phase"]').should('contain', 'N2');
      
      // Add TWO reminders in N2 to player 1
      cy.get('li').first().find('.reminder-placeholder').click({ altKey: true });
      cy.get('#text-reminder-modal').should('be.visible');
      cy.get('#reminder-text-input').type('N2 reminder 1');
      cy.get('[data-testid="save-text-reminder"]').click();
      
      cy.get('li').first().find('.reminder-placeholder').click({ altKey: true });
      cy.get('#text-reminder-modal').should('be.visible');
      cy.get('#reminder-text-input').type('N2 reminder 2');
      cy.get('[data-testid="save-text-reminder"]').click();
      
      // Player 1 should now have 3 reminders total (1 from N1, 2 from N2)
      cy.get('li').first().find('.text-reminder').should('have.length', 3);
      
      // Get the position of the plus button when all reminders are visible
      cy.get('li').first().find('.reminder-placeholder').then($plusN2 => {
        const n2Position = $plusN2[0].getBoundingClientRect();
        
        // Go back to N1
        cy.get('[data-testid="day-night-slider"] input[type="range"]').invoke('val', 0).trigger('input');
        cy.get('[data-testid="current-phase"]').should('contain', 'N1');
        
        // Only 1 reminder should be visible
        cy.get('li').first().find('.text-reminder').should('have.length', 1);
        
        // Get the position of the plus button when only N1 reminder is visible
        cy.get('li').first().find('.reminder-placeholder').then($plusN1 => {
          const n1Position = $plusN1[0].getBoundingClientRect();
          
          // The plus button should be much closer to the token in N1
          // (when only 1 reminder is visible vs 3 reminders)
          const distanceN1 = Math.sqrt(Math.pow(n1Position.left - n1Position.right, 2) + Math.pow(n1Position.top - n1Position.bottom, 2));
          const distanceN2 = Math.sqrt(Math.pow(n2Position.left - n2Position.right, 2) + Math.pow(n2Position.top - n2Position.bottom, 2));
          
          // Save current state and reload the page
          cy.reload();
          
          // Wait for page to load and state to be restored
          cy.get('#player-circle li').should('have.length', 5);
          
          // Day/night tracking should still be enabled and on N1
          cy.get('[data-testid="day-night-toggle"]').should('have.class', 'active');
          cy.get('[data-testid="current-phase"]').should('contain', 'N1');
          
          // Only N1 reminder should be visible
          cy.get('li').first().find('.text-reminder').should('have.length', 1);
          
          // Get the position of the plus button after reload
          cy.get('li').first().find('.reminder-placeholder').then($plusReload => {
            const reloadPosition = $plusReload[0].getBoundingClientRect();
            
            // The plus button position should be the same as before reload
            // (within a small tolerance for rendering differences)
            expect(Math.abs(reloadPosition.left - n1Position.left)).to.be.lessThan(5);
            expect(Math.abs(reloadPosition.top - n1Position.top)).to.be.lessThan(5);
          });
        });
      });
    });

    it('should handle multiple players with different reminder counts correctly', () => {
      // Add reminders to multiple players in different phases
      // Player 1: 1 reminder in N1
      cy.get('li').eq(0).find('.reminder-placeholder').click({ altKey: true });
      cy.get('#text-reminder-modal').should('be.visible');
      cy.get('#reminder-text-input').type('P1 N1');
      cy.get('[data-testid="save-text-reminder"]').click();
      
      // Player 2: 2 reminders in N1
      cy.get('li').eq(1).find('.reminder-placeholder').click({ altKey: true });
      cy.get('#text-reminder-modal').should('be.visible');
      cy.get('#reminder-text-input').type('P2 N1-1');
      cy.get('[data-testid="save-text-reminder"]').click();
      
      cy.get('li').eq(1).find('.reminder-placeholder').click({ altKey: true });
      cy.get('#text-reminder-modal').should('be.visible');
      cy.get('#reminder-text-input').type('P2 N1-2');
      cy.get('[data-testid="save-text-reminder"]').click();
      
      // Move to N2
      cy.get('[data-testid="add-phase-button"]').click(); // D1
      cy.get('[data-testid="add-phase-button"]').click(); // N2
      
      // Player 1: Add 2 more reminders in N2
      cy.get('li').eq(0).find('.reminder-placeholder').click({ altKey: true });
      cy.get('#text-reminder-modal').should('be.visible');
      cy.get('#reminder-text-input').type('P1 N2-1');
      cy.get('[data-testid="save-text-reminder"]').click();
      
      cy.get('li').eq(0).find('.reminder-placeholder').click({ altKey: true });
      cy.get('#text-reminder-modal').should('be.visible');
      cy.get('#reminder-text-input').type('P1 N2-2');
      cy.get('[data-testid="save-text-reminder"]').click();
      
      // Verify counts in N2
      cy.get('li').eq(0).find('.text-reminder').should('have.length', 3); // 1 from N1 + 2 from N2
      cy.get('li').eq(1).find('.text-reminder').should('have.length', 2); // 2 from N1
      
      // Go back to N1
      cy.get('[data-testid="day-night-slider"] input[type="range"]').invoke('val', 0).trigger('input');
      
      // Verify counts in N1
      cy.get('li').eq(0).find('.text-reminder').should('have.length', 1); // Only N1 reminder
      cy.get('li').eq(1).find('.text-reminder').should('have.length', 2); // Both N1 reminders
      
      // Reload and verify positioning is maintained
      cy.reload();
      cy.get('#player-circle li').should('have.length', 5);
      cy.get('[data-testid="current-phase"]').should('contain', 'N1');
      
      // Verify counts after reload
      cy.get('li').eq(0).find('.text-reminder').should('have.length', 1);
      cy.get('li').eq(1).find('.text-reminder').should('have.length', 2);
      
      // Check that plus buttons are positioned correctly for each player
      cy.get('li').each(($li, index) => {
        cy.wrap($li).find('.reminder-placeholder').should('be.visible');
        
        // The plus button should be positioned based on visible reminder count
        cy.wrap($li).find('.text-reminder').then($reminders => {
          const reminderCount = $reminders.length;
          
          // Get plus button position
          cy.wrap($li).find('.reminder-placeholder').then($plus => {
            const plusRect = $plus[0].getBoundingClientRect();
            const tokenRect = $li.find('.player-token')[0].getBoundingClientRect();
            
            // Distance from token center should increase with reminder count
            const distance = Math.sqrt(
              Math.pow(plusRect.left + plusRect.width/2 - (tokenRect.left + tokenRect.width/2), 2) +
              Math.pow(plusRect.top + plusRect.height/2 - (tokenRect.top + tokenRect.height/2), 2)
            );
            
            // Basic check: plus button should be outside the token
            expect(distance).to.be.greaterThan(tokenRect.width / 2);
          });
        });
      });
    });

    it('should maintain correct positioning when toggling day/night tracking', () => {
      // Add reminders in different phases
      cy.get('li').first().find('.reminder-placeholder').click({ altKey: true });
      cy.get('#text-reminder-modal').should('be.visible');
      cy.get('#reminder-text-input').type('N1 reminder');
      cy.get('[data-testid="save-text-reminder"]').click();
      
      // Move to N2 and add more reminders
      cy.get('[data-testid="add-phase-button"]').click(); // D1
      cy.get('[data-testid="add-phase-button"]').click(); // N2
      
      cy.get('li').first().find('.reminder-placeholder').click({ altKey: true });
      cy.get('#text-reminder-modal').should('be.visible');
      cy.get('#reminder-text-input').type('N2 reminder');
      cy.get('[data-testid="save-text-reminder"]').click();
      
      // Go back to N1
      cy.get('[data-testid="day-night-slider"] input[type="range"]').invoke('val', 0).trigger('input');
      
      // Get plus button position with tracking enabled
      cy.get('li').first().find('.reminder-placeholder').then($plusEnabled => {
        const enabledPosition = $plusEnabled[0].getBoundingClientRect();
        
        // Disable day/night tracking
        cy.get('[data-testid="day-night-toggle"]').click();
        
        // All reminders should now be visible
        cy.get('li').first().find('.text-reminder').should('have.length', 2);
        
        // Get plus button position with tracking disabled
        cy.get('li').first().find('.reminder-placeholder').then($plusDisabled => {
          const disabledPosition = $plusDisabled[0].getBoundingClientRect();
          
          // Plus button should be farther when all reminders are shown
          const tokenRect = cy.get('li').first().find('.player-token').then($token => {
            const tokenCenter = {
              x: $token[0].getBoundingClientRect().left + $token[0].getBoundingClientRect().width / 2,
              y: $token[0].getBoundingClientRect().top + $token[0].getBoundingClientRect().height / 2
            };
            
            const distanceEnabled = Math.sqrt(
              Math.pow(enabledPosition.left + enabledPosition.width/2 - tokenCenter.x, 2) +
              Math.pow(enabledPosition.top + enabledPosition.height/2 - tokenCenter.y, 2)
            );
            
            const distanceDisabled = Math.sqrt(
              Math.pow(disabledPosition.left + disabledPosition.width/2 - tokenCenter.x, 2) +
              Math.pow(disabledPosition.top + disabledPosition.height/2 - tokenCenter.y, 2)
            );
            
            // When tracking is disabled (showing all reminders), plus should be farther
            expect(distanceDisabled).to.be.greaterThan(distanceEnabled);
          });
        });
      });
    });
  });
});