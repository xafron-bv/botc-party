// Cypress E2E test - Player setup completion overlay & button disabling

describe('Player setup completion overlay', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.viewport(1280, 900);
    cy.window().then((win) => { try { win.localStorage.clear(); } catch (_) { } });
    // Configure 5 players
    cy.get('#player-count').clear().type('5');
    cy.get('#add-players').click();
    // Load a script so characters exist
    cy.get('#load-tb').click();
    // Open player setup
    cy.get('#open-player-setup').click();
    // Random fill to match player count (or ensure counts match)
    cy.get('#bag-random-fill').click();
    // Guard: ensure Start Number Selection is enabled by verifying no error shown
    cy.get('#bag-count-warning').should('not.be.visible');
    // Start number selection
    cy.get('.start-selection').click();
    // During selection, overlay hidden
    cy.get('body').should('have.class', 'selection-active');
    cy.get('#pre-game-overlay').should('not.be.visible');
  });

  it('restores overlay with handoff message and disables setup button after final reveal, then reset re-enables it', () => {
    // Assign numbers to all players (5). Iterate over overlays or use number picker via token overlay clicks.
    // Click each '?" overlay which triggers number picker, pick first available number each time.
    for (let i = 0; i < 5; i++) {
      cy.get('#player-circle li .number-overlay').eq(i).click();
      // Pick the first enabled number button
      cy.get('#number-picker-grid button.button.number:not(.disabled)').first().click();
      // Reveal modal should appear
      cy.get('#player-reveal-modal').should('be.visible');
      // Confirm (optionally set a name to test input working)
      cy.get('#reveal-name-input').clear().type(`P${i + 1}`);
      cy.get('#reveal-confirm-btn').click();
      // Modal closes
      cy.get('#player-reveal-modal').should('not.be.visible');
    }

    // After last reveal: selection-active removed, overlay visible again with updated message
    cy.get('body').should('not.have.class', 'selection-active');
    cy.get('#pre-game-overlay').should('be.visible');
    cy.get('#pre-game-overlay .overlay-inner').invoke('text').should('contain', 'Number Selection Complete');
    cy.get('#pre-game-overlay .overlay-inner').invoke('text').should('contain', 'Hand the device back to the storyteller');

    // Start Player Setup button disabled
    cy.get('#open-player-setup').should('be.disabled');

    // Reset grimoire should re-enable the button
    // Use force click because sidebar toggle may visually overlap in some layouts
    cy.get('#reset-grimoire').click({ force: true });
    // Confirm overlay still (pre-game) and button enabled again
    cy.get('#open-player-setup').should('not.be.disabled');
  });
});
