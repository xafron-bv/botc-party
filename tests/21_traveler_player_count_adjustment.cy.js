// Cypress E2E tests - Traveler player count adjustment

// Use shared cy.setupGame helper for initializing player counts (handles Start Game gating)
const startGameWithPlayers = (n) => cy.setupGame({ players: n, loadScript: false });

const assignCharacterToPlayer = (playerIndex, characterName) => {
  cy.get('#player-circle li .player-token').eq(playerIndex).click({ force: true });
  cy.get('#character-modal').should('be.visible');
  cy.get('#character-search').clear().type(characterName);
  cy.get(`#character-grid .token[title="${characterName}"]`).first().click();
  cy.get('#character-modal').should('not.be.visible');
};

describe('Traveler Player Count Adjustment', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.viewport(1280, 900);
    cy.window().then((win) => {
      try { win.localStorage.clear(); } catch (_) { }
    });
    cy.get('#load-tb').click({ force: true });
    cy.get('#character-sheet .role').should('have.length.greaterThan', 5);
    // Enable travelers
    cy.get('#include-travellers').check({ force: true }).should('be.checked');
    // Default start with a baseline set (some tests will override)
    cy.setupGame({ players: 12, loadScript: false });
  });

  it('should show normal setup for 12 players without travelers', () => {
    startGameWithPlayers(12);
    // 12 player game should show 7/2/2/1 setup
    cy.get('#setup-info').should('contain', '7/2/2/1');
  });

  it('should adjust setup to 11 players when one traveler is assigned', () => {
    startGameWithPlayers(12);

    // Initially should show 12 player setup
    cy.get('#setup-info').should('contain', '7/2/2/1');

    // Assign a traveler to first player
    assignCharacterToPlayer(0, 'Beggar');

    // Setup should now show 11 player setup (7/1/2/1)
    cy.get('#setup-info').should('contain', '7/1/2/1');
  });

  it('should adjust setup to 10 players when two travelers are assigned', () => {
    startGameWithPlayers(12);

    // Initially should show 12 player setup
    cy.get('#setup-info').should('contain', '7/2/2/1');

    // Assign travelers to first two players
    assignCharacterToPlayer(0, 'Beggar');
    assignCharacterToPlayer(1, 'Bureaucrat');

    // Setup should now show 10 player setup (7/0/2/1)
    cy.get('#setup-info').should('contain', '7/0/2/1');
  });

  it('should handle mixed regular characters and travelers correctly', () => {
    startGameWithPlayers(12);

    // Assign regular character
    assignCharacterToPlayer(0, 'Washerwoman');
    cy.get('#setup-info').should('contain', '7/2/2/1');

    // Assign traveler
    assignCharacterToPlayer(1, 'Beggar');
    cy.get('#setup-info').should('contain', '7/1/2/1');

    // Assign another regular character
    assignCharacterToPlayer(2, 'Chef');
    cy.get('#setup-info').should('contain', '7/1/2/1');

    // Assign another traveler
    assignCharacterToPlayer(3, 'Bureaucrat');
    cy.get('#setup-info').should('contain', '7/0/2/1');
  });

  it('should update when traveler is removed', () => {
    startGameWithPlayers(12);

    // Assign a traveler
    assignCharacterToPlayer(0, 'Beggar');
    cy.get('#setup-info').should('contain', '7/1/2/1');

    // Remove the traveler by assigning nothing
    cy.get('#player-circle li .player-token').eq(0).click({ force: true });
    cy.get('#character-modal').should('be.visible');
    cy.get('#character-search').clear();
    // Manually trigger the input event
    cy.get('#character-search').then($el => {
      const el = $el[0];
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    cy.get('#character-grid .token.empty').should('exist').first().click();
    cy.get('#character-modal').should('not.be.visible');

    // Setup should return to 12 player setup
    cy.get('#setup-info').should('contain', '7/2/2/1');
  });

  it('should handle edge cases with very small games', () => {
    startGameWithPlayers(5);

    // 5 player game normally shows 3/0/1/1
    cy.get('#setup-info').should('contain', '3/0/1/1');

    // Assign one traveler - should show 4 player setup which doesn't exist
    // So it should show no setup numbers
    assignCharacterToPlayer(0, 'Beggar');
    cy.get('#setup-info').should('not.contain', '/');
    cy.get('#setup-info').should('contain', 'Trouble Brewing');
  });

  it('should work correctly after character changes', () => {
    startGameWithPlayers(10);

    // 10 player game shows 7/0/2/1
    cy.get('#setup-info').should('contain', '7/0/2/1');

    // Change first player from regular to traveler
    assignCharacterToPlayer(0, 'Washerwoman');
    cy.get('#setup-info').should('contain', '7/0/2/1');

    // Change same player to traveler
    assignCharacterToPlayer(0, 'Beggar');
    cy.get('#setup-info').should('contain', '5/2/1/1'); // 9 player setup

    // Change back to regular
    assignCharacterToPlayer(0, 'Chef');
    cy.get('#setup-info').should('contain', '7/0/2/1'); // Back to 10 player
  });

  it('updates player setup bag expectations when travelers are present', () => {
    startGameWithPlayers(12);

    // Open player setup and auto-fill bag for 12 players
    cy.get('#open-player-setup').click({ force: true });
    cy.get('#player-setup-panel').should('be.visible');
    cy.get('#bag-random-fill').click({ force: true });

    // Verify initial fill selects 12 roles with no warning
    cy.get('#player-setup-character-list input[type="checkbox"]:checked')
      .should('have.length', 12);
    cy.get('#bag-count-warning').should('not.be.visible');

    // Close setup so we can assign travelers on the circle
    cy.get('#close-player-setup').click({ force: true });
    cy.get('#player-setup-panel').should('not.be.visible');

    // Assign two travelers to the grimoire
    assignCharacterToPlayer(0, 'Beggar');
    assignCharacterToPlayer(1, 'Bureaucrat');

    // Reopen player setup; warning should reflect traveler-adjusted count (10)
    cy.get('#open-player-setup').click({ force: true });
    cy.get('#player-setup-panel').should('be.visible');
    cy.get('#bag-count-warning')
      .should('be.visible')
      .should('contain', '10 characters in the bag');

    // Remove both outsiders from the bag (12-player setup contains exactly two)
    cy.contains('#player-setup-character-list .team-header', 'Outsiders')
      .next('.team-grid')
      .find('input[type="checkbox"]:checked')
      .should('have.length', 2)
      .each(($checkbox) => {
        cy.wrap($checkbox).uncheck({ force: true });
      });

    // Bag should now hold 10 roles and warning should clear
    cy.get('#player-setup-character-list input[type="checkbox"]:checked')
      .should('have.length', 10);
    cy.get('#bag-count-warning').should('not.be.visible');

    // Close panel to clean up
    cy.get('#close-player-setup').click({ force: true });
    cy.get('#player-setup-panel').should('not.be.visible');
  });
});
