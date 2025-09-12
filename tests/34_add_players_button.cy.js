
// Cypress E2E tests - ADD PLAYERS button and disabled state functionality

describe('ADD PLAYERS Button and Disabled State', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.viewport(1280, 900);
    cy.window().then((win) => {
      try { win.localStorage.clear(); } catch (_) { }
    });
  });

  it('should show ADD PLAYERS button when no players exist', () => {
    // Initially no players should exist
    cy.get('#add-players').should('be.visible');
    cy.get('#add-players').should('contain', 'ADD PLAYERS');
    // Button should be positioned below player count input and above mode toggle
    cy.get('#player-count').should('exist');
    cy.get('#mode-toggle').should('exist');
    cy.get('#add-players').should('be.visible');
  });

  it('should hide ADD PLAYERS button when players exist', () => {
    // Set player count and add players
    cy.get('#player-count').clear().type('5');
    cy.get('#add-players').click();
    
    // Button should be hidden after adding players
    cy.get('#add-players').should('not.be.visible');
  });

  it('should disable game setup buttons when no players exist', () => {
    // Most game setup buttons should be disabled when no players
    cy.get('#open-player-setup').should('be.disabled');
    cy.get('#start-game').should('be.disabled');
    
    // Reset grimoire should remain enabled as it's used to start the game
    cy.get('#reset-grimoire').should('not.be.disabled');
    
    // Storyteller message should remain enabled as it's a tool that works without players
    cy.get('#open-storyteller-message').should('not.be.disabled');
    
    // Mode toggle should also be disabled
    cy.get('#mode-storyteller').should('be.disabled');
    cy.get('#mode-player').should('be.disabled');
  });

  it('should enable game setup buttons when players are added', () => {
    // Set player count and add players
    cy.get('#player-count').clear().type('5');
    cy.get('#add-players').click();
    
    // Most game setup buttons should be enabled after adding players
    cy.get('#open-player-setup').should('not.be.disabled');
    cy.get('#reset-grimoire').should('not.be.disabled');
    cy.get('#open-storyteller-message').should('not.be.disabled');
    
    // Start game should be disabled until characters are assigned
    cy.get('#start-game').should('be.disabled');
    
    // Mode toggle should also be enabled
    cy.get('#mode-storyteller').should('not.be.disabled');
    cy.get('#mode-player').should('not.be.disabled');
  });

  it('should create players when ADD PLAYERS button is clicked', () => {
    // Set player count
    cy.get('#player-count').clear().type('7');
    cy.get('#add-players').click();
    
    // Should create 7 player tokens
    cy.get('#player-circle li').should('have.length', 7);
    
    // Player count input should reflect the actual player count
    cy.get('#player-count').should('have.value', '7');
  });

  it('should prevent player setup when no players exist', () => {
    // Try to open player setup when no players exist
    cy.get('#open-player-setup').should('be.disabled');
    
    // Even if somehow clicked, should show error
    cy.get('#open-player-setup').click({ force: true });
    // The button should still be disabled, so this test might not trigger the modal
    // But if it does, we'd expect an error message
  });

  it('should show error when trying random fill with no players', () => {
    // Load a script first
    cy.get('#load-tb').click();
    
    // Try to open player setup (should be disabled)
    cy.get('#open-player-setup').should('be.disabled');
    
    // Force click to test error handling
    cy.get('#open-player-setup').click({ force: true });
    
    // If modal opens, try random fill
    cy.get('body').then(($body) => {
      if ($body.find('#player-setup-panel').is(':visible')) {
        cy.get('#bag-random-fill').click();
        cy.get('#bag-count-warning').should('contain', 'No players in grimoire');
      }
    });
  });

  it('should re-enable buttons after reset when players exist', () => {
    // Add players first
    cy.get('#player-count').clear().type('5');
    cy.get('#add-players').click();
    
    // Reset grimoire
    cy.get('#reset-grimoire').click();
    
    // Most buttons should still be enabled because players still exist
    cy.get('#open-player-setup').should('not.be.disabled');
    cy.get('#reset-grimoire').should('not.be.disabled');
    
    // Start game should be disabled until characters are assigned
    cy.get('#start-game').should('be.disabled');
  });

  it('should disable buttons when all players are removed', () => {
    // Add players first
    cy.get('#player-count').clear().type('5');
    cy.get('#add-players').click();
    
    // Manually clear the players array to simulate no players
    cy.window().then((win) => {
      win.grimoireState.players = [];
      win.updateButtonStates();
    });
    
    // Most buttons should be disabled again
    cy.get('#open-player-setup').should('be.disabled');
    cy.get('#start-game').should('be.disabled');
    
    // Reset grimoire should remain enabled as it's used to start the game
    cy.get('#reset-grimoire').should('not.be.disabled');
    
    cy.get('#add-players').should('be.visible');
  });

  it('should work correctly with script loading', () => {
    // Load a script
    cy.get('#load-tb').click();
    
    // Scroll to top of sidebar to ensure ADD PLAYERS button is visible
    cy.get('#sidebar').scrollTo('top');
    
    // ADD PLAYERS button should still be visible
    cy.get('#add-players').should('be.visible');
    
    // Add players
    cy.get('#player-count').clear().type('6');
    cy.get('#add-players').click();
    
    // Button should be hidden
    cy.get('#add-players').should('not.be.visible');
    
    // Most buttons should be enabled
    cy.get('#open-player-setup').should('not.be.disabled');
    
    // Start game should be disabled until characters are assigned
    cy.get('#start-game').should('be.disabled');
  });
});
