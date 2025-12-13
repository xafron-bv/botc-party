// Cypress E2E test - Number selection displays player name in handoff button

describe('Number selection player name display', () => {
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
    cy.get('.start-selection').click({ force: true });
    cy.get('body', { timeout: 10000 }).should('have.class', 'selection-active');
    cy.get('#number-picker-overlay', { timeout: 10000 }).should('be.visible');
  });

  it('displays player name in handoff button text when custom names are set', () => {
    // First player reveals their character
    cy.get('#selection-reveal-btn').click();
    cy.get('#player-reveal-modal').should('be.visible');

    // Set first player's name to "Alice"
    cy.get('#reveal-name-input').clear().type('Alice');

    // The confirm button should show the next player's name
    // Since we haven't set custom names for other players yet, it should show "Player 2"
    cy.get('#confirm-player-reveal').should('contain.text', 'Close and hand to Player 2');

    // Click to proceed
    cy.get('#confirm-player-reveal').click();
    cy.get('#player-reveal-modal').should('not.be.visible');

    // Second player reveals their character
    cy.get('#number-picker-overlay').should('be.visible');
    cy.get('#selection-reveal-btn').click();
    cy.get('#player-reveal-modal').should('be.visible');

    // Set second player's name to "Bob"
    cy.get('#reveal-name-input').clear().type('Bob');

    // The confirm button should show "Player 3" (third player hasn't been named yet)
    cy.get('#confirm-player-reveal').should('contain.text', 'Close and hand to Player 3');

    cy.get('#confirm-player-reveal').click();
    cy.get('#player-reveal-modal').should('not.be.visible');

    // Third player reveals their character
    cy.get('#number-picker-overlay').should('be.visible');
    cy.get('#selection-reveal-btn').click();
    cy.get('#player-reveal-modal').should('be.visible');

    // Set third player's name to "Charlie"
    cy.get('#reveal-name-input').clear().type('Charlie');

    // The confirm button should show "Player 4"
    cy.get('#confirm-player-reveal').should('contain.text', 'Close and hand to Player 4');

    cy.get('#confirm-player-reveal').click();
    cy.get('#player-reveal-modal').should('not.be.visible');

    // Fourth player reveals their character
    cy.get('#number-picker-overlay').should('be.visible');
    cy.get('#selection-reveal-btn').click();
    cy.get('#player-reveal-modal').should('be.visible');

    // Set fourth player's name to "Diana"
    cy.get('#reveal-name-input').clear().type('Diana');

    // The confirm button should show "Player 5"
    cy.get('#confirm-player-reveal').should('contain.text', 'Close and hand to Player 5');

    cy.get('#confirm-player-reveal').click();
    cy.get('#player-reveal-modal').should('not.be.visible');

    // Last player reveals their character
    cy.get('#number-picker-overlay').should('be.visible');
    cy.get('#selection-reveal-btn').click();
    cy.get('#player-reveal-modal').should('be.visible');

    // Set last player's name
    cy.get('#reveal-name-input').clear().type('Eve');

    // The confirm button should show "Close and give to the Storyteller" as this is the last player
    cy.get('#confirm-player-reveal').should('contain.text', 'Close and give to the Storyteller');
  });

  it('displays custom player names if they were set before starting number selection', () => {
    // Cancel the selection process to set up names first
    cy.get('#close-number-picker').click();

    // Set custom names for players before number selection
    cy.window().then((win) => {
      // Set names for players 1-5
      if (win.grimoireState && win.grimoireState.players) {
        win.grimoireState.players[0] = { ...win.grimoireState.players[0], name: 'Alice' };
        win.grimoireState.players[1] = { ...win.grimoireState.players[1], name: 'Bob' };
        win.grimoireState.players[2] = { ...win.grimoireState.players[2], name: 'Charlie' };
        win.grimoireState.players[3] = { ...win.grimoireState.players[3], name: 'Diana' };
        win.grimoireState.players[4] = { ...win.grimoireState.players[4], name: 'Eve' };
      }
    });

    // Open number picker for first player manually
    cy.get('#player-circle li').eq(0).find('.number-overlay').click({ force: true });
    cy.get('#number-picker-overlay').should('be.visible');

    // First player reveals their character
    cy.get('#selection-reveal-btn').click();
    cy.get('#player-reveal-modal').should('be.visible');

    // The confirm button should show "Bob" (the next player's custom name)
    cy.get('#confirm-player-reveal').should('contain.text', 'Close and hand to Bob');

    cy.get('#confirm-player-reveal').click();
    cy.get('#player-reveal-modal').should('not.be.visible');

    // Second player reveals their character
    cy.get('#player-circle li').eq(1).find('.number-overlay').click({ force: true });
    cy.get('#number-picker-overlay').should('be.visible');
    cy.get('#selection-reveal-btn').click();
    cy.get('#player-reveal-modal').should('be.visible');

    // The confirm button should show "Charlie" (the third player's custom name)
    cy.get('#confirm-player-reveal').should('contain.text', 'Close and hand to Charlie');
  });

  it('handles out-of-order selection with custom names correctly', () => {
    // Cancel the selection process
    cy.get('#close-number-picker').click();

    // Set custom names for some players
    cy.window().then((win) => {
      if (win.grimoireState && win.grimoireState.players) {
        win.grimoireState.players[0] = { ...win.grimoireState.players[0], name: 'Alice' };
        win.grimoireState.players[2] = { ...win.grimoireState.players[2], name: 'Charlie' };
        win.grimoireState.players[4] = { ...win.grimoireState.players[4], name: 'Eve' };
      }
    });

    // Player 0 picks first
    cy.get('#player-circle li').eq(0).find('.number-overlay').click({ force: true });
    cy.get('#number-picker-overlay').should('be.visible');
    cy.get('#selection-reveal-btn').click();
    cy.get('#player-reveal-modal').should('be.visible');

    // Should show "Player 2" since player 1 doesn't have a custom name
    cy.get('#confirm-player-reveal').should('contain.text', 'Close and hand to Player 2');
    cy.get('#confirm-player-reveal').click();
    cy.get('#player-reveal-modal').should('not.be.visible');

    // Player 2 picks (out of order)
    cy.get('#player-circle li').eq(2).find('.number-overlay').click({ force: true });
    cy.get('#number-picker-overlay').should('be.visible');
    cy.get('#selection-reveal-btn').click();
    cy.get('#player-reveal-modal').should('be.visible');

    // Should show "Player 4" since player 3 doesn't have a custom name
    cy.get('#confirm-player-reveal').should('contain.text', 'Close and hand to Player 4');
    cy.get('#confirm-player-reveal').click();
    cy.get('#player-reveal-modal').should('not.be.visible');

    // Player 4 picks
    cy.get('#player-circle li').eq(4).find('.number-overlay').click({ force: true });
    cy.get('#number-picker-overlay').should('be.visible');
    cy.get('#selection-reveal-btn').click();
    cy.get('#player-reveal-modal').should('be.visible');

    // Should show "Alice" (wrapping around to player 0, but player 0 is already assigned)
    // Next unassigned is player 1
    cy.get('#confirm-player-reveal').should('contain.text', 'Close and hand to Player 2');
  });
});
