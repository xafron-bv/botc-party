// Cypress E2E test - Player setup completion overlay & button disabling

const completeTokenSelection = (playerCount) => {
  for (let i = 0; i < playerCount; i += 1) {
    cy.get('#number-picker-overlay').should('be.visible');
    cy.get('#selection-reveal-btn').click();
    cy.get('#player-reveal-modal').should('be.visible');
    cy.get('#confirm-player-reveal').click();
    cy.get('#player-reveal-modal').should('not.be.visible');
    if (i < playerCount - 1) {
      cy.get('#number-picker-overlay').should('be.visible');
    }
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
    // Start token selection
    cy.get('.start-selection').click({ force: true });
    cy.get('body', { timeout: 10000 }).should('have.class', 'selection-active');
    cy.get('#number-picker-overlay', { timeout: 10000 }).should('be.visible');
  });

  it('restores overlay with handoff message and disables setup button after final reveal, then reset re-enables it', () => {
    completeTokenSelection(5);

    // After last reveal: selection-active removed, setup button disabled, reveal button shown
    cy.get('body').should('not.have.class', 'selection-active');
    cy.get('#open-player-setup').should('be.disabled');
    cy.ensureSidebarOpen();
    cy.get('#reveal-selected-characters').should('be.visible');

    // Reset grimoire should re-enable the button
    // Use force click because sidebar toggle may visually overlap in some layouts
    cy.get('#reset-grimoire').click({ force: true });
    cy.get('#open-player-setup').should('not.be.disabled');
    cy.get('#reveal-selected-characters').should('not.be.visible');
  });

  it('prevents death ribbon toggles until the game starts after token selection completes', () => {
    completeTokenSelection(5);

    cy.get('body').should('not.have.class', 'selection-active');

    cy.get('#player-circle li .player-token').first().as('firstToken');
    cy.get('@firstToken').should('not.have.class', 'is-dead');
    cy.get('@firstToken').find('.death-ribbon [data-part="mouth-fill"]').should('exist');

    cy.get('#player-circle li .player-token .death-ribbon').first().should('be.visible').within(() => {
      cy.root().click({ force: true });
    });

    cy.get('@firstToken').should('not.have.class', 'is-dead');
    cy.get('@firstToken').find('.death-ribbon [data-part="mouth-fill"]').should('exist');

    // Reset state so subsequent specs are not affected by selectionComplete handoff
    cy.window().then((win) => {
      cy.stub(win, 'confirm').returns(true);
    });
    cy.get('#reset-grimoire').click({ force: true });
  });
});
