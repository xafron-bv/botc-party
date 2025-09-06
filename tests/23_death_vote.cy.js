// Cypress E2E tests - Death vote indicator functionality

const startGameWithPlayers = (n) => {
  cy.get('#player-count').then(($el) => {
    const el = $el[0];
    el.value = String(n);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  });
  cy.get('#reset-grimoire').click();
  cy.get('#player-circle li').should('have.length', n);
};

describe('Death Vote Indicator', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.viewport(1280, 900);
    cy.window().then((win) => {
      try { win.localStorage.clear(); } catch (_) { }
    });
    cy.get('#load-tb').click();
    cy.get('#character-sheet .role').should('have.length.greaterThan', 5);
  });

  it('shows alive count display even before game starts', () => {
    // Before starting game, setup info should exist
    cy.get('#setup-info').should('exist');

    // Start game
    startGameWithPlayers(8);

    // Now it should show 8/8 alive in setup info with script name
    cy.get('#setup-info').should('contain', 'Trouble Brewing');
    cy.get('#setup-info').should('contain', '8/8');
  });

  it('shows alive count in the grimoire center setup info', () => {
    startGameWithPlayers(8);

    // Alive count should be in the setup info with script name and role counts
    cy.get('#setup-info').should('exist');
    cy.get('#setup-info').should('contain', 'Trouble Brewing');
    cy.get('#setup-info').should('contain', '8/8');

    // Check that role counts have appropriate colors
    cy.get('#setup-info .townsfolk-count').should('exist').should('have.css', 'color', 'rgb(93, 173, 226)');
    cy.get('#setup-info .outsider-count').should('exist').should('have.css', 'color', 'rgb(189, 195, 199)');
    cy.get('#setup-info .minion-count').should('exist').should('have.css', 'color', 'rgb(243, 156, 18)');
    cy.get('#setup-info .demon-count').should('exist').should('have.css', 'color', 'rgb(231, 76, 60)');

    // Mark first player as dead
    cy.get('#player-circle li .player-token .death-ribbon').first().within(() => {
      cy.get('rect, path').first().click({ force: true });
    });

    // Alive count should update
    cy.get('#setup-info').should('contain', '7/8');

    // Mark second player as dead
    cy.get('#player-circle li .player-token .death-ribbon').eq(1).within(() => {
      cy.get('rect, path').first().click({ force: true });
    });

    // Alive count should update again
    cy.get('#setup-info').should('contain', '6/8');
  });

  it('shows death vote indicator for dead players', () => {
    startGameWithPlayers(8);
    // Mark first player as dead
    cy.get('#player-circle li .player-token .death-ribbon').first().within(() => {
      cy.get('rect, path').first().click({ force: true });
    });
    cy.get('#player-circle li .player-token').first().should('have.class', 'is-dead');

    // Death vote indicator should appear
    cy.get('#player-circle li .player-token').first().find('.death-vote-indicator').should('exist');
    cy.get('#player-circle li .player-token').first().find('.death-vote-indicator').should('be.visible');
  });

  it('removes death vote indicator when clicked (uses death vote)', () => {
    startGameWithPlayers(8);

    // Mark first player as dead
    cy.get('#player-circle li .player-token .death-ribbon').first().within(() => {
      cy.get('rect, path').first().click({ force: true });
    });

    // Death vote indicator should appear
    cy.get('#player-circle li .player-token').first().find('.death-vote-indicator').should('exist');

    // Click death vote indicator to use the vote
    cy.get('#player-circle li .player-token').first().find('.death-vote-indicator').click({ force: true });

    // Death vote indicator should disappear (vote used)
    cy.get('#player-circle li .player-token').first().find('.death-vote-indicator').should('not.exist');

    // Player should still be dead
    cy.get('#player-circle li .player-token').first().should('have.class', 'is-dead');
  });

  it('revives player when clicking death ribbon after death vote is used', () => {
    startGameWithPlayers(8);

    // Mark first player as dead
    cy.get('#player-circle li .player-token .death-ribbon').first().within(() => {
      cy.get('rect, path').first().click({ force: true });
    });
    cy.get('#player-circle li .player-token').first().should('have.class', 'is-dead');

    // Use death vote
    cy.get('#player-circle li .player-token').first().find('.death-vote-indicator').click({ force: true });
    cy.get('#player-circle li .player-token').first().find('.death-vote-indicator').should('not.exist');

    // Click death ribbon again - should revive player
    cy.get('#player-circle li .player-token .death-ribbon').first().within(() => {
      cy.get('rect, path').first().click({ force: true });
    });

    // Player should now be alive
    cy.get('#player-circle li .player-token').first().should('not.have.class', 'is-dead');

    // Alive count should update
    cy.get('#setup-info').should('contain', '8/8');
  });

  it('persists death vote state across page reload', () => {
    startGameWithPlayers(8);

    // Mark first player as dead
    cy.get('#player-circle li .player-token .death-ribbon').first().within(() => {
      cy.get('rect, path').first().click({ force: true });
    });

    // Use death vote
    cy.get('#player-circle li .player-token').first().find('.death-vote-indicator').click({ force: true });

    // Reload page
    cy.reload();

    // Player should still be dead
    cy.get('#player-circle li .player-token').first().should('have.class', 'is-dead');

    // Death vote indicator should not be present (already used)
    cy.get('#player-circle li .player-token').first().find('.death-vote-indicator').should('not.exist');

    // Alive count should be correct
    cy.get('#setup-info').should('contain', '7/8');
  });

  it('resets death vote when player is marked alive without using vote', () => {
    startGameWithPlayers(8);

    // Mark first player as dead
    cy.get('#player-circle li .player-token .death-ribbon').first().within(() => {
      cy.get('rect, path').first().click({ force: true });
    });

    // Death vote indicator should appear
    cy.get('#player-circle li .player-token').first().find('.death-vote-indicator').should('exist');

    // Toggle back to alive without using death vote
    cy.get('#player-circle li .player-token .death-ribbon').first().within(() => {
      cy.get('rect, path').first().click({ force: true });
    });

    // Player should be alive
    cy.get('#player-circle li .player-token').first().should('not.have.class', 'is-dead');

    // Mark dead again
    cy.get('#player-circle li .player-token .death-ribbon').first().within(() => {
      cy.get('rect, path').first().click({ force: true });
    });

    // Death vote indicator should appear again (vote was reset)
    cy.get('#player-circle li .player-token').first().find('.death-vote-indicator').should('exist');
  });

  it('handles multiple dead players with independent death votes', () => {
    startGameWithPlayers(8);

    // Mark first three players as dead
    for (let i = 0; i < 3; i++) {
      cy.get('#player-circle li .player-token .death-ribbon').eq(i).within(() => {
        cy.get('rect, path').first().click({ force: true });
      });
    }

    // All three should have death vote indicators
    for (let i = 0; i < 3; i++) {
      cy.get('#player-circle li .player-token').eq(i).find('.death-vote-indicator').should('exist');
    }

    // Alive count should show 5/8
    cy.get('#setup-info').should('contain', '5/8');

    // Use death vote for player 1 only
    cy.get('#player-circle li .player-token').eq(0).find('.death-vote-indicator').click({ force: true });

    // Player 1 should not have indicator, but players 2 and 3 should
    cy.get('#player-circle li .player-token').eq(0).find('.death-vote-indicator').should('not.exist');
    cy.get('#player-circle li .player-token').eq(1).find('.death-vote-indicator').should('exist');
    cy.get('#player-circle li .player-token').eq(2).find('.death-vote-indicator').should('exist');

    // Revive player 1 using death ribbon
    cy.get('#player-circle li .player-token .death-ribbon').eq(0).within(() => {
      cy.get('rect, path').first().click({ force: true });
    });

    // Player 1 should be alive, others still dead
    cy.get('#player-circle li .player-token').eq(0).should('not.have.class', 'is-dead');
    cy.get('#player-circle li .player-token').eq(1).should('have.class', 'is-dead');
    cy.get('#player-circle li .player-token').eq(2).should('have.class', 'is-dead');

    // Alive count should update to 6/8
    cy.get('#setup-info').should('contain', '6/8');
  });
});
