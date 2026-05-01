describe('Post-game grimoire editing', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.window().then((win) => { try { win.localStorage.clear(); } catch (_) { } });
    cy.ensureStorytellerMode();
    cy.setupGame({ players: 5, loadScript: true, mode: 'storyteller' });
  });

  it('lets the storyteller edit characters, reminders and deaths after a winner is declared, and persists across reloads', () => {
    // Assign a starter character so a game is in progress
    cy.get('#player-circle li').eq(0).find('.player-token').click({ force: true });
    cy.get('#character-modal').should('be.visible');
    cy.get('#character-grid .token[title="Chef"]').first().click({ force: true });
    cy.get('#character-modal').should('not.be.visible');

    // Declare winner
    cy.get('#end-game').click({ force: true });
    cy.get('#good-wins-btn').click({ force: true });
    cy.get('#winner-message').should('contain.text', 'Good has won');

    // Open Player Setup should NOT be disabled by the winner
    cy.get('#open-player-setup').should('not.be.disabled');

    // Reassign a character on player 1 (post-winner)
    cy.get('#player-circle li').eq(1).find('.player-token').click({ force: true });
    cy.get('#character-modal').should('be.visible');
    cy.get('#character-grid .token[title="Imp"]').first().click({ force: true });
    cy.get('#character-modal').should('not.be.visible');
    cy.get('#player-circle li').eq(1).find('.character-name').should('contain', 'Imp');

    // Add a reminder to player 2 (post-winner) via alt-click on placeholder
    cy.get('#player-circle li').eq(2).find('.reminder-placeholder').click({ altKey: true, force: true });
    cy.get('#text-reminder-modal').should('be.visible');
    cy.get('#reminder-text-input').type('post-winner reminder');
    cy.get('#save-reminder-btn').click({ force: true });
    cy.get('#text-reminder-modal').should('not.be.visible');
    cy.get('#player-circle li').eq(2).find('.text-reminder').should('have.length', 1);

    // Toggle the death ribbon on player 0 (post-winner)
    cy.get('#player-circle li').eq(0).find('.death-ribbon').click({ force: true });
    cy.get('#player-circle li').eq(0).find('.player-token').should('have.class', 'is-dead');

    // Assign a bluff token (post-winner) — pick Empath (not in play)
    cy.get('#bluff-tokens-container .bluff-token').first().click({ force: true });
    cy.get('#character-modal').should('be.visible');
    cy.get('#character-grid .token[title="Empath"]').first().click({ force: true });
    cy.get('#character-modal').should('not.be.visible');

    // Reload — edits must persist
    cy.reload();
    cy.get('#player-circle li').eq(1).find('.character-name').should('contain', 'Imp');
    cy.get('#player-circle li').eq(2).find('.text-reminder').should('have.length', 1);
    cy.get('#player-circle li').eq(0).find('.player-token').should('have.class', 'is-dead');
    cy.get('#bluff-tokens-container .bluff-token').first().should('have.attr', 'data-character', 'empath');
  });
});
