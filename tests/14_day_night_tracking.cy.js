describe('Day/Night Tracking Feature', () => {
  beforeEach(() => {
    cy.visit('/?test=true');
    cy.viewport(1280, 900);
    cy.window().then((win) => { try { win.localStorage.clear(); } catch (_) { } });
    cy.setupGame({ players: 5, loadScript: true });
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
      cy.get('[data-testid="day-night-toggle"]').click({ force: true });
      cy.get('[data-testid="day-night-toggle"]').should('have.class', 'active');

      // Day/night UI elements should appear
      cy.get('[data-testid="day-night-slider"]').should('be.visible');

      // Click toggle to disable
      cy.get('[data-testid="day-night-toggle"]').click({ force: true });
      cy.get('[data-testid="day-night-toggle"]').should('not.have.class', 'active');
      cy.get('[data-testid="day-night-slider"]').should('have.css', 'display', 'none');
    });
  });

  describe('Day/Night Cycle', () => {
    beforeEach(() => {
      // Enable day/night tracking
      cy.get('[data-testid="day-night-toggle"]').click({ force: true });
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

    it('should update toggle icon based on current phase', () => {
      // Initially N1 - should show moon icon
      cy.get('[data-testid="day-night-toggle"] i').should('have.class', 'fa-moon');

      // Add D1 - should show sun icon
      cy.get('[data-testid="add-phase-button"]').click();
      cy.get('[data-testid="day-night-toggle"] i').should('have.class', 'fa-sun');

      // Add N2 - should show moon icon
      cy.get('[data-testid="add-phase-button"]').click();
      cy.get('[data-testid="day-night-toggle"] i').should('have.class', 'fa-moon');

      // Navigate back to D1 - should show sun icon
      cy.get('[data-testid="day-night-slider"] input[type="range"]').invoke('val', 1).trigger('input');
      cy.get('[data-testid="day-night-toggle"] i').should('have.class', 'fa-sun');
    });
  });

  describe('Reminder Timestamps', () => {
    beforeEach(() => {
      // Enable day/night tracking
      cy.get('[data-testid="day-night-toggle"]').click({ force: true });

      // Assign a character to first player
      cy.get('.player-token').first().click({ force: true });
      cy.get('#character-grid .token').should('be.visible');
      cy.get('#character-grid .token').first().click();

      // Wait for character to be assigned
      cy.get('li').first().find('.player-token').should('have.attr', 'style').and('include', 'background-image');
    });

    it('should add timestamps to reminder tokens when tracking is enabled', () => {
      // Add a reminder in N1 (Alt+click for text reminder)
      cy.get('li').first().find('.reminder-placeholder').click({ altKey: true, force: true });
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
      cy.get('li').first().find('.reminder-placeholder').click({ altKey: true, force: true });
      cy.get('#text-reminder-modal').should('be.visible');
      cy.get('#reminder-text-input').type('Test reminder');
      cy.get('[data-testid="save-text-reminder"]').click();

      // Reminder should show timestamp
      cy.get('li').first().find('.text-reminder').should('contain', 'N1');

      // Disable tracking
      cy.get('[data-testid="day-night-toggle"]').click({ force: true });

      // Reminder should not show timestamp
      cy.get('li').first().find('.text-reminder').should('not.contain', 'N1');
      cy.get('.reminder-timestamp').should('not.exist');
    });
  });

  describe('History Slider', () => {
    beforeEach(() => {
      // Enable day/night tracking
      cy.get('[data-testid="day-night-toggle"]').click({ force: true });

      // Create multiple phases with reminders
      // N1 reminder
      cy.get('li').first().find('.reminder-placeholder').click({ altKey: true, force: true });
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

    it('should show slider as seamless extension of toggle button when enabled', () => {
      cy.get('[data-testid="day-night-slider"]').should('be.visible');
      cy.get('[data-testid="day-night-slider"]').should('have.css', 'position', 'fixed');
      cy.get('[data-testid="day-night-slider"]').should('have.css', 'bottom', '20px');
      cy.get('[data-testid="day-night-slider"]').should('have.css', 'height', '50px');
      cy.get('[data-testid="day-night-slider"]').should('have.class', 'open');
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
    it('should position slider seamlessly with toggle button without interfering with grimoire', () => {
      cy.get('[data-testid="day-night-toggle"]').click({ force: true });

      // Slider should be positioned at same level as toggle button
      cy.get('[data-testid="day-night-slider"]').should('have.css', 'position', 'fixed');
      cy.get('[data-testid="day-night-slider"]').should('have.css', 'bottom', '20px');
      cy.get('[data-testid="day-night-slider"]').should('have.css', 'right', '75px');
      cy.get('[data-testid="day-night-slider"]').should('have.css', 'height', '50px');

      // Player circle should still be visible and not overlapped
      cy.get('#player-circle').should('be.visible');
      cy.get('#center').should('be.visible');
    });

    it('should properly style the horizontal slider layout', () => {
      cy.get('[data-testid="day-night-toggle"]').click({ force: true });

      // Add multiple phases
      cy.get('[data-testid="add-phase-button"]').click(); // D1
      cy.get('[data-testid="add-phase-button"]').click(); // N2

      // Check slider styling for horizontal layout
      cy.get('[data-testid="day-night-slider"]').should('have.css', 'background-color');
      cy.get('[data-testid="day-night-slider"]').should('have.css', 'height', '50px');
      cy.get('[data-testid="day-night-slider"]').should('have.css', 'border-radius', '25px');

      // Phase labels should be hidden in horizontal layout
      cy.get('[data-testid="phase-labels"]').should('have.css', 'display', 'none');

      // Current phase should be visible
      cy.get('[data-testid="current-phase"]').should('be.visible');
      cy.get('[data-testid="current-phase"]').should('contain', 'N2');
    });
  });

  describe('Reminder Positioning After Reload', () => {
    beforeEach(() => {
      // Enable day/night tracking if not already enabled
      cy.get('[data-testid="day-night-toggle"]').then($toggle => {
        if (!$toggle.hasClass('active')) {
          cy.wrap($toggle).click({ force: true });
        }
      });

      // Ensure the UI is ready
      cy.get('[data-testid="day-night-toggle"]').should('have.class', 'active');
      cy.get('#day-night-slider').should('be.visible');

      // Assign a character to first player to allow reminders
      cy.get('.player-token').first().click({ force: true });
      cy.get('#character-modal').should('be.visible');
      cy.get('#character-grid .token').should('be.visible');
      cy.get('#character-grid .token').first().click();
      cy.get('#character-modal').should('not.be.visible');

      // Wait for character to be assigned
      cy.get('li').first().find('.player-token').should('have.attr', 'style').and('include', 'background-image');
    });

    it('should position plus button correctly based on visible reminders after reload', () => {

      // Add multiple reminders across phases
      cy.get('li').first().find('.reminder-placeholder').click({ altKey: true, force: true });
      cy.get('#text-reminder-modal').should('be.visible');
      cy.get('#reminder-text-input').type('N1 reminder');
      cy.get('[data-testid="save-text-reminder"]').click();

      // Move to N2
      // Click twice to go from N1 -> D1 -> N2
      cy.get('[data-testid="add-phase-button"]').click({ force: true }); // D1
      cy.get('[data-testid="current-phase"]').should('contain', 'D1');
      cy.get('[data-testid="add-phase-button"]').click({ force: true }); // N2
      cy.get('[data-testid="current-phase"]').should('contain', 'N2');

      // Add 2 reminders in N2
      cy.get('li').first().find('.reminder-placeholder').click({ altKey: true, force: true });
      cy.get('#text-reminder-modal').should('be.visible');
      cy.get('#reminder-text-input').type('N2 reminder 1');
      cy.get('[data-testid="save-text-reminder"]').click();

      cy.get('li').first().find('.reminder-placeholder').click({ altKey: true, force: true });
      cy.get('#text-reminder-modal').should('be.visible');
      cy.get('#reminder-text-input').type('N2 reminder 2');
      cy.get('[data-testid="save-text-reminder"]').click();

      // Go back to N1
      cy.get('[data-testid="day-night-slider"] input[type="range"]').invoke('val', 0).trigger('input');

      // Store plus button position before reload
      cy.get('li').first().find('.reminder-placeholder').then($plus => {
        const beforeReload = {
          left: $plus[0].offsetLeft,
          top: $plus[0].offsetTop
        };

        // Reload page
        cy.reload();

        // Wait for restoration
        cy.get('#player-circle li').should('have.length', 5);
        cy.get('[data-testid="current-phase"]').should('contain', 'N1');

        // Only N1 reminder should be visible
        cy.get('li').first().find('.text-reminder').should('have.length', 1);

        // Plus button should be positioned correctly after reload
        cy.get('li').first().find('.reminder-placeholder').then($plusAfter => {
          // Allow tolerance for positioning differences after reload
          expect(Math.abs($plusAfter[0].offsetLeft - beforeReload.left)).to.be.lessThan(150);
          expect(Math.abs($plusAfter[0].offsetTop - beforeReload.top)).to.be.lessThan(150);
        });
      });
    });
  });

  describe('Persistence', () => {
    it('should persist day/night state when reloading', () => {
      // Enable tracking and add phases
      cy.get('[data-testid="day-night-toggle"]').click({ force: true });
      cy.get('[data-testid="add-phase-button"]').click(); // D1
      cy.get('[data-testid="add-phase-button"]').click(); // N2

      // Add reminders at different phases
      cy.get('li').first().find('.reminder-placeholder').click({ altKey: true, force: true });
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
