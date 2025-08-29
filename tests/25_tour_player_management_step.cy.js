// Test for new tutorial step about adding/removing players via right-click or long-touch

describe('Tour - Player Management Step', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.viewport(1280, 900);
    cy.window().then((win) => {
      try { win.localStorage.clear(); } catch (_) {}
    });
  });

  it('should include a player management step in the tour', () => {
    // Start the tour
    cy.get('#start-tour').click();
    
    // Navigate through the existing steps to where the new step should be
    // Current steps: welcome -> open-sidebar -> game-setup -> scripts -> assign-character -> reminders -> day-night-toggle -> offline -> finish
    // The player management step should come after reminders
    
    // Navigate to reminders step (6 next clicks)
    for (let i = 0; i < 5; i++) {
      cy.contains('.tour-popover .actions .button', 'Next').click();
    }
    
    // Verify we're at the reminders step
    cy.get('.tour-popover .title').should('contain', 'Reminders');
    
    // Click next - this should now show the player management step
    cy.contains('.tour-popover .actions .button', 'Next').click();
    
    // Verify the new player management step exists
    cy.get('.tour-popover').should('be.visible');
    cy.get('.tour-popover .title').should('have.text', 'Add/Remove Players');
    cy.get('.tour-popover .body').should('contain', 'Right-click');
    cy.get('.tour-popover .body').should('contain', 'long-press');
    cy.get('.tour-popover .body').should('contain', 'add or remove players');
    
    // The highlight should be on a player token
    cy.get('.tour-highlight').should('exist');
    cy.get('#player-circle li .player-token').first().then(($token) => {
      const tokenRect = $token[0].getBoundingClientRect();
      cy.get('.tour-highlight').then(($highlight) => {
        const highlightRect = $highlight[0].getBoundingClientRect();
        // Highlight should be roughly around the first player token
        expect(Math.abs(highlightRect.left - tokenRect.left)).to.be.lessThan(20);
        expect(Math.abs(highlightRect.top - tokenRect.top)).to.be.lessThan(20);
      });
    });
    
    // Verify navigation still works
    cy.contains('.tour-popover .actions .button', 'Back').click();
    cy.get('.tour-popover .title').should('contain', 'Reminders');
    
    cy.contains('.tour-popover .actions .button', 'Next').click();
    cy.get('.tour-popover .title').should('have.text', 'Add/Remove Players');
    
    // Continue to day/night toggle
    cy.contains('.tour-popover .actions .button', 'Next').click();
    cy.get('.tour-popover .title').should('have.text', 'Day/Night Tracking');
  });

  it('should show correct step numbering with the new step', () => {
    cy.get('#start-tour').click();
    
    // Navigate to the player management step (7 steps now)
    for (let i = 0; i < 6; i++) {
      cy.contains('.tour-popover .actions .button', 'Next').click();
    }
    
    // Check that step numbering is correct
    cy.get('.tour-popover .progress').should('contain', 'Step 7');
    // Total steps should now be 10 (was 9, now +1)
    cy.get('.tour-popover .progress').should('contain', 'of 10');
  });

  it('should properly handle touch device messaging', () => {
    // Simulate touch device
    cy.visit('/', {
      onBeforeLoad(win) {
        Object.defineProperty(win, 'ontouchstart', { value: true, configurable: true });
        Object.defineProperty(win.navigator, 'maxTouchPoints', { value: 1, configurable: true });
      }
    });
    
    cy.get('#start-tour').click();
    
    // Navigate to player management step
    for (let i = 0; i < 6; i++) {
      cy.contains('.tour-popover .actions .button', 'Next').click();
    }
    
    // On touch devices, it should emphasize long-press
    cy.get('.tour-popover .body').should('contain', 'long-press');
    cy.get('.tour-popover .body').should('contain', 'player');
  });

  it('should ensure game is started before showing player management step', () => {
    cy.get('#start-tour').click();
    
    // Navigate through steps
    for (let i = 0; i < 6; i++) {
      cy.contains('.tour-popover .actions .button', 'Next').click();
    }
    
    // At player management step, there should be players in the circle
    cy.get('#player-circle li').should('have.length.greaterThan', 0);
  });
});