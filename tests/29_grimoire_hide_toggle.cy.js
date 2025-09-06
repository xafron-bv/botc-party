describe('Grimoire Hide/Show Toggle', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.viewport(1280, 900);
    cy.window().then((win) => { try { win.localStorage.clear(); } catch (_) { } });
    // Ensure storyteller mode
    cy.get('#mode-storyteller').should('exist').and('be.checked');
    // Start game with 5 players
    cy.get('#player-count').clear().type('5');
    cy.get('#start-game').click();
    cy.get('#player-circle li').should('have.length', 5);
  });

  it('hides and shows tokens, reminders, and bluffs while keeping blank circles', () => {
    // Verify baseline visible elements
    cy.get('#player-circle li .player-token').should('have.length', 5);
    cy.get('#player-circle li .reminder-placeholder').should('be.visible');
    cy.get('#bluff-tokens-container').should('be.visible');

    // Hide grimoire
    cy.get('#reveal-assignments').click();

    // Reminders and plus should be hidden
    cy.get('#player-circle li .reminders').should('not.be.visible');
    cy.get('#player-circle li .reminder-placeholder').should('not.be.visible');
    // Bluff tokens hidden
    cy.get('#bluff-tokens-container').should('not.be.visible');

    // Player token still visible, but only base background (no character overlay)
    cy.get('#player-circle li .player-token').first().should('be.visible')
      .then(($el) => {
        const style = window.getComputedStyle($el[0]);
        // Should contain base token image
        expect(style.backgroundImage).to.contain('token-BqDQdWeO.webp');
      });

    // Show grimoire again
    cy.get('#reveal-assignments').click();
    cy.get('#player-circle li .reminder-placeholder').should('be.visible');
    cy.get('#bluff-tokens-container').should('be.visible');
  });

  it('works in player mode as well', () => {
    // Switch to player mode
    cy.get('#mode-player').click();
    // Toggle hide
    cy.get('#reveal-assignments').click();
    cy.get('#player-circle li .reminder-placeholder').should('not.be.visible');
    cy.get('#bluff-tokens-container').should('not.be.visible');
    // Toggle show
    cy.get('#reveal-assignments').click();
    cy.get('#bluff-tokens-container').should('be.visible');
  });
});


