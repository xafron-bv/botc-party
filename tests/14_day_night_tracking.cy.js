describe('Day/Night Tracking Feature', () => {
  beforeEach(() => {
    cy.visit('/?test=true');
    cy.viewport(1280, 900);
    
    // Clear local storage to start fresh
    cy.window().then((win) => {
      try { win.localStorage.clear(); } catch (_) { }
    });
    
    // Load Trouble Brewing script first
    cy.get('#load-tb').click();
    cy.get('#character-sheet .role').should('have.length.greaterThan', 5);
    
    // Setup a game with 5 players
    cy.get('#player-count').clear().type('5');
    cy.get('#start-game').click();
    
    // Wait for player circle to be set up
    cy.get('#player-circle li').should('have.length', 5);
  });

  describe('Toggle Button', () => {
    it('should have a toggle button for day/night tracking', () => {
      // Toggle button should exist
      cy.get('[data-testid="day-night-toggle"]').should('exist');
      
      // Should be off by default
      cy.get('[data-testid="day-night-toggle"]').should('not.have.class', 'active');
      
      // Grimoire should look normal when toggle is off
      cy.get('[data-testid="day-night-slider"]').should('have.css', 'display', 'none');
      cy.get('.reminder-timestamp').should('not.exist');
    });

    it('should enable/disable day/night tracking when clicked', () => {
      // Click toggle to enable
      cy.get('[data-testid="day-night-toggle"]').click();
      cy.get('[data-testid="day-night-toggle"]').should('have.class', 'active');
      
      // Day/night UI elements should appear
      cy.get('[data-testid="day-night-slider"]').should('be.visible');
      
      // Click toggle to disable
      cy.get('[data-testid="day-night-toggle"]').click();
      cy.get('[data-testid="day-night-toggle"]').should('not.have.class', 'active');
      cy.get('[data-testid="day-night-slider"]').should('have.css', 'display', 'none');
    });
  });

  describe('Day/Night Cycle', () => {
    beforeEach(() => {
      // Enable day/night tracking
      cy.get('[data-testid="day-night-toggle"]').click();
    });

    it('should start with Night 1 (N1)', () => {
      // Slider should show N1 as the current phase
      cy.get('[data-testid="current-phase"]').should('contain', 'N1');
      
      // Slider should be at the first position
      cy.get('[data-testid="day-night-slider"] input[type="range"]').should('have.value', '0');
    });

    it('should add day/night phases with + button', () => {
      // Initial state should be N1
      cy.get('[data-testid="current-phase"]').should('contain', 'N1');
      
      // Click + button to add D1
      cy.get('[data-testid="add-phase-button"]').click();
      cy.get('[data-testid="current-phase"]').should('contain', 'D1');
      
      // Click + button to add N2
      cy.get('[data-testid="add-phase-button"]').click();
      cy.get('[data-testid="current-phase"]').should('contain', 'N2');
      
      // Click + button to add D2
      cy.get('[data-testid="add-phase-button"]').click();
      cy.get('[data-testid="current-phase"]').should('contain', 'D2');
      
      // Slider should show all phases
      cy.get('[data-testid="phase-labels"]').should('contain', 'N1');
      cy.get('[data-testid="phase-labels"]').should('contain', 'D1');
      cy.get('[data-testid="phase-labels"]').should('contain', 'N2');
      cy.get('[data-testid="phase-labels"]').should('contain', 'D2');
    });
  });

  describe('Reminder Timestamps', () => {
    beforeEach(() => {
      // Enable day/night tracking
      cy.get('[data-testid="day-night-toggle"]').click();
      
      // Assign a character to first player
      cy.get('.player-token').first().click();
      cy.get('#character-grid .token').should('be.visible');
      cy.get('#character-grid .token').first().click();
      
      // Wait for character to be assigned
      cy.get('li').first().find('.player-token').should('have.attr', 'style').and('include', 'background-image');
    });

    it('should add timestamps to reminder tokens when tracking is enabled', () => {
      // Add a reminder in N1 (Alt+click for text reminder)
      cy.get('li').first().find('.reminder-placeholder').click({ altKey: true });
      cy.get('#text-reminder-modal').should('be.visible');
      cy.get('#reminder-text-input').type('Test reminder N1');
      cy.get('[data-testid="save-text-reminder"]').click();
      
      // Reminder should show N1 timestamp
      cy.get('li').first().find('.text-reminder').should('contain', 'N1');
      
      // Move to D1
      cy.get('[data-testid="add-phase-button"]').click();
      
      // Add another reminder in D1
      cy.get('li').eq(1).find('.reminder-placeholder').click({ altKey: true });
      cy.get('#text-reminder-modal').should('be.visible');
      cy.get('#reminder-text-input').type('Test reminder D1');
      cy.get('[data-testid="save-text-reminder"]').click();
      
      // New reminder should show D1 timestamp
      cy.get('li').eq(1).find('.text-reminder').should('contain', 'D1');
      
      // First reminder should still show N1
      cy.get('li').first().find('.text-reminder').should('contain', 'N1');
    });

    it('should not show timestamps when tracking is disabled', () => {
      // Add a reminder
      cy.get('li').first().find('.reminder-placeholder').click({ altKey: true });
      cy.get('#text-reminder-modal').should('be.visible');
      cy.get('#reminder-text-input').type('Test reminder');
      cy.get('[data-testid="save-text-reminder"]').click();
      
      // Reminder should show timestamp
      cy.get('li').first().find('.text-reminder').should('contain', 'N1');
      
      // Disable tracking
      cy.get('[data-testid="day-night-toggle"]').click();
      
      // Reminder should not show timestamp
      cy.get('li').first().find('.text-reminder').should('not.contain', 'N1');
      cy.get('.reminder-timestamp').should('not.exist');
    });
  });

  describe('History Slider', () => {
    beforeEach(() => {
      // Enable day/night tracking
      cy.get('[data-testid="day-night-toggle"]').click();
      
      // Create multiple phases with reminders
      // N1 reminder
      cy.get('li').first().find('.reminder-placeholder').click({ altKey: true });
      // Wait for modal to be visible
      cy.get('#text-reminder-modal').should('be.visible');
      cy.get('#reminder-text-input').type('Reminder N1');
      cy.get('[data-testid="save-text-reminder"]').click();
      
      // Move to D1 and add reminder
      cy.get('[data-testid="add-phase-button"]').click();
      cy.get('li').eq(1).find('.reminder-placeholder').click({ altKey: true });
      cy.get('#text-reminder-modal').should('be.visible');
      cy.get('#reminder-text-input').type('Reminder D1');
      cy.get('[data-testid="save-text-reminder"]').click();
      
      // Move to N2 and add reminder
      cy.get('[data-testid="add-phase-button"]').click();
      cy.get('li').eq(2).find('.reminder-placeholder').click({ altKey: true });
      cy.get('#text-reminder-modal').should('be.visible');
      cy.get('#reminder-text-input').type('Reminder N2');
      cy.get('[data-testid="save-text-reminder"]').click();
    });

    it('should show slider at bottom of screen when enabled', () => {
      cy.get('[data-testid="day-night-slider"]').should('be.visible');
      cy.get('[data-testid="day-night-slider"]').should('have.css', 'position', 'fixed');
      cy.get('[data-testid="day-night-slider"]').should('have.css', 'bottom', '0px');
    });

    it('should allow navigating through day/night history', () => {
      // Should be at N2 (latest phase)
      cy.get('[data-testid="current-phase"]').should('contain', 'N2');
      
      // Drag slider to D1
      cy.get('[data-testid="day-night-slider"] input[type="range"]').invoke('val', 1).trigger('input');
      cy.get('[data-testid="current-phase"]').should('contain', 'D1');
      
      // Drag slider to N1
      cy.get('[data-testid="day-night-slider"] input[type="range"]').invoke('val', 0).trigger('input');
      cy.get('[data-testid="current-phase"]').should('contain', 'N1');
    });

    it('should filter reminders based on selected time', () => {
      // At N2, all reminders should be visible
      cy.get('.text-reminder').should('have.length', 3);
      
      // Go back to D1
      cy.get('[data-testid="day-night-slider"] input[type="range"]').invoke('val', 1).trigger('input');
      
      // Only reminders from N1 and D1 should be visible
      cy.get('.text-reminder').should('have.length', 2);
      cy.get('.text-reminder').first().should('contain', 'N1');
      cy.get('.text-reminder').eq(1).should('contain', 'D1');
      
      // Go back to N1
      cy.get('[data-testid="day-night-slider"] input[type="range"]').invoke('val', 0).trigger('input');
      
      // Only N1 reminder should be visible
      cy.get('.text-reminder').should('have.length', 1);
      cy.get('.text-reminder').should('contain', 'N1');
    });
  });

  describe('UI Integration', () => {
    it('should position slider at bottom without interfering with grimoire', () => {
      cy.get('[data-testid="day-night-toggle"]').click();
      
      // Slider should be at bottom
      cy.get('[data-testid="day-night-slider"]').should('have.css', 'position', 'fixed');
      cy.get('[data-testid="day-night-slider"]').should('have.css', 'bottom', '0px');
      cy.get('[data-testid="day-night-slider"]').should('have.css', 'left', '0px');
      cy.get('[data-testid="day-night-slider"]').should('have.css', 'right', '0px');
      
      // Player circle should still be visible and not overlapped
      cy.get('#player-circle').should('be.visible');
      cy.get('#center').should('be.visible');
    });

    it('should properly style the phase labels and slider', () => {
      cy.get('[data-testid="day-night-toggle"]').click();
      
      // Add multiple phases
      cy.get('[data-testid="add-phase-button"]').click(); // D1
      cy.get('[data-testid="add-phase-button"]').click(); // N2
      
      // Check slider styling
      cy.get('[data-testid="day-night-slider"]').should('have.css', 'background-color');
      cy.get('[data-testid="phase-labels"]').should('be.visible');
      
      // Phase labels should be evenly distributed
      cy.get('[data-testid="phase-labels"] .phase-label').should('have.length', 3);
    });
  });

  describe('Persistence', () => {
    it('should persist day/night state when reloading', () => {
      // Enable tracking and add phases
      cy.get('[data-testid="day-night-toggle"]').click();
      cy.get('[data-testid="add-phase-button"]').click(); // D1
      cy.get('[data-testid="add-phase-button"]').click(); // N2
      
      // Add reminders at different phases
      cy.get('li').first().find('.reminder-placeholder').click({ altKey: true });
      cy.get('#text-reminder-modal').should('be.visible');
      cy.get('#reminder-text-input').type('Persistent reminder');
      cy.get('[data-testid="save-text-reminder"]').click();
      
      // Reload page
      cy.reload();
      
      // Wait for page to load and state to be restored
      cy.get('#player-circle li').should('have.length', 5);
      
      // Day/night tracking should still be enabled
      cy.get('[data-testid="day-night-toggle"]').should('have.class', 'active');
      cy.get('[data-testid="day-night-slider"]').should('be.visible');
      
      // Phases should be preserved
      cy.get('[data-testid="phase-labels"]').should('contain', 'N1');
      cy.get('[data-testid="phase-labels"]').should('contain', 'D1');
      cy.get('[data-testid="phase-labels"]').should('contain', 'N2');
      
      // Current phase should be N2
      cy.get('[data-testid="current-phase"]').should('contain', 'N2');
      
      // Reminder timestamps should be preserved
      cy.get('.text-reminder').should('contain', 'N2');
    });
  });
});