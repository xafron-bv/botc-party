// Cypress E2E test - Player setup completion overlay & button disabling

const completeNumberSelection = (playerCount) => {
  for (let i = 0; i < playerCount; i += 1) {
    cy.get('#player-circle li .number-overlay').eq(i).click();
    cy.get('#number-picker-grid button.button.number:not(.disabled)').first().click();
    cy.get('#player-reveal-modal').should('be.visible');
    cy.get('#reveal-name-input').clear().type(`P${i + 1}`);
    cy.get('#close-player-reveal-modal').click();
    cy.get('#player-reveal-modal').should('not.be.visible');
  }
};

describe('Player setup completion overlay', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.viewport(1280, 900);
    cy.window().then((win) => { try { win.localStorage.clear(); } catch (_) { } });
    cy.ensureStorytellerMode();
    // Configure 5 players
    cy.get('#player-count').clear().type('5');
    cy.get('#reset-grimoire').click();
    // Load a script so characters exist
    cy.get('#load-tb').click();
    // Open player setup
    cy.get('#open-player-setup').click();
    // Fill the bag to match player count
    cy.fillBag();
    // Start number selection
    cy.get('.start-selection').click();
    // During selection, overlay hidden
    cy.get('body').should('have.class', 'selection-active');
    cy.get('#pre-game-overlay').should('not.be.visible');
  });

  it('restores overlay with handoff message and disables setup button after final reveal, then reset re-enables it', () => {
    completeNumberSelection(5);

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

  it('prevents death ribbon toggles until the game starts after number selection completes', () => {
    completeNumberSelection(5);

    cy.get('body').should('not.have.class', 'selection-active');

    cy.get('#player-circle li .player-token').first().as('firstToken');
    cy.get('@firstToken').should('not.have.class', 'is-dead');
    cy.get('@firstToken').find('.death-vote-indicator').should('not.exist');

    cy.get('#player-circle li .player-token .death-ribbon').first().should('be.visible').within(() => {
      cy.get('rect, path').first().click({ force: true });
    });

    cy.get('@firstToken').should('not.have.class', 'is-dead');
    cy.get('@firstToken').find('.death-vote-indicator').should('not.exist');

    // Reset state so subsequent specs are not affected by selectionComplete handoff
    cy.window().then((win) => {
      cy.stub(win, 'confirm').returns(true);
    });
    cy.get('#reset-grimoire').click({ force: true });
  });
});
