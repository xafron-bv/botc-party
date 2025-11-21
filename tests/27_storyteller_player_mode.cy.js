// Cypress E2E tests - Storyteller/Player mode toggle and behaviors (TDD-first)

// startGameWithPlayers replaced by cy.setupGame helper (handles pre-game gating and Start Game click)

describe('Storyteller / Player Mode', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.viewport(1280, 900);
    cy.window().then((win) => { try { win.localStorage.clear(); } catch (_) { } });
    cy.ensureStorytellerMode();
    // Start game with script load for deterministic reminders/characters
    cy.setupGame({ players: 5, loadScript: true });
    // Ensure script roles populated before tests proceed
    cy.get('#character-sheet .role').should('have.length.greaterThan', 5);
    cy.ensureStorytellerMode();
  });

  it('shows mode toggle and hides day/night toggle in player mode', () => {
    // Toggle inputs next to player count
    cy.get('#mode-storyteller').should('exist').and('be.checked');
    cy.get('#mode-player').should('exist').and('not.be.checked');

    // Day/Night toggle visible by default in storyteller mode
    cy.get('#day-night-toggle').should('exist').and('not.have.css', 'display', 'none');

    // Switch to player mode and ensure day/night toggle is hidden
    cy.get('#mode-player').click({ force: true });
    cy.get('#mode-player').should('be.checked');
    cy.get('#mode-storyteller').should('not.be.checked');
    cy.get('#day-night-toggle').should('not.be.visible');

    // Switch back to storyteller mode and ensure visibility returns
    cy.get('#mode-storyteller').click({ force: true });
    // Use force: true to bypass visibility check since element may be covered
    cy.get('#day-night-toggle').should('exist').and('not.have.css', 'display', 'none');
  });

  it('storyteller and player both show character-specific reminders', () => {
    // First assign a character to the first player so character-specific reminders are available
    cy.get('#player-circle li').first().find('.player-token').click({ force: true });
    cy.get('#character-modal').should('be.visible');
    cy.get('#character-search').clear().type('librarian');
    cy.get('#character-grid .token').first().click();
    cy.get('#character-modal').should('not.be.visible');

    // Open reminder token modal in storyteller mode
    cy.window().its('grimoireState.gameStarted').should('eq', true);
    cy.get('#player-circle li .reminder-placeholder').first().should('be.visible').click({ force: true });
    cy.get('#reminder-token-modal').then($m => { if ($m.css('display') === 'none') { cy.window().then(win => { if (win.openReminderTokenModal) win.openReminderTokenModal({ grimoireState: win.grimoireState, playerIndex: 0 }); }); } });
    cy.get('#reminder-token-modal', { timeout: 8000 }).should('be.visible');

    // Librarian has a character-specific reminder "Outsider" in TB
    cy.get('#reminder-token-grid .token[title="Outsider"]').should('have.length.greaterThan', 0);

    // Close modal
    cy.get('#reminder-token-modal').click('topLeft', { force: true });
    cy.get('#reminder-token-modal').should('not.be.visible');

    // Switch to player mode
    cy.get('#mode-player').click({ force: true });

    // Open modal again (player mode)
    cy.get('#player-circle li .reminder-placeholder').first().should('be.visible').click({ force: true });
    cy.get('#reminder-token-modal').then($m => { if ($m.css('display') === 'none') { cy.window().then(win => { if (win.openReminderTokenModal) win.openReminderTokenModal({ grimoireState: win.grimoireState, playerIndex: 0 }); }); } });
    cy.get('#reminder-token-modal', { timeout: 8000 }).should('be.visible');

    // Character-specific reminder tokens should still be available in player mode
    cy.get('#reminder-token-grid .token[title="Outsider"]').should('have.length.greaterThan', 0);

    // Close
    cy.get('#reminder-token-modal').click('topLeft', { force: true });
    cy.get('#reminder-token-modal').should('not.be.visible');
  });

  it('player mode shows character tokens (by name) in reminder selection', () => {
    // Assign a character first (for consistency)
    cy.get('#player-circle li').first().find('.player-token').click({ force: true });
    cy.get('#character-modal').should('be.visible');
    cy.get('#character-search').clear().type('librarian');
    cy.get('#character-grid .token').first().click();
    cy.get('#character-modal').should('not.be.visible');

    // Ensure storyteller mode does not show character tokens by name
    cy.get('#player-circle li .reminder-placeholder').first().should('be.visible').click({ force: true });
    cy.get('#reminder-token-modal').then($m => { if ($m.css('display') === 'none') { cy.window().then(win => { if (win.openReminderTokenModal) win.openReminderTokenModal({ grimoireState: win.grimoireState, playerIndex: 0 }); }); } });
    cy.get('#reminder-token-modal', { timeout: 8000 }).should('be.visible');
    cy.get('#reminder-token-search').clear().type('washerwoman');
    cy.get('#reminder-token-grid .token[title="Washerwoman"]').should('have.length', 0);
    cy.get('#reminder-token-modal').click('topLeft', { force: true });

    // Switch to player mode
    cy.get('#mode-player').click({ force: true });

    // Open modal and search for a TB character
    cy.get('#player-circle li .reminder-placeholder').first().should('be.visible').click({ force: true });
    cy.get('#reminder-token-modal').then($m => { if ($m.css('display') === 'none') { cy.window().then(win => { if (win.openReminderTokenModal) win.openReminderTokenModal({ grimoireState: win.grimoireState, playerIndex: 0 }); }); } });
    cy.get('#reminder-token-modal', { timeout: 8000 }).should('be.visible');
    cy.get('#reminder-token-search').clear().type('washerwoman');

    // In player mode, there should be a token labeled with the character's name
    cy.get('#reminder-token-grid .token[title="Washerwoman"]').should('have.length.greaterThan', 0);

    // Selecting it should add an icon reminder to the player
    cy.get('#reminder-token-grid .token[title="Washerwoman"]').first().click({ force: true });
    cy.get('#reminder-token-modal').should('not.be.visible');
    cy.get('#player-circle li').first().find('.icon-reminder').should('have.length.greaterThan', 0);
  });

  it('collapses night slider and disables tracking when switching to player', () => {
    // Ensure slider is closed initially
    cy.get('#day-night-slider').should('not.be.visible');

    // Enable tracking (storyteller mode)
    cy.get('#day-night-toggle').should('exist').and('not.have.css', 'display', 'none');
    cy.get('#day-night-toggle').click({ force: true });
    cy.get('#day-night-slider').should('be.visible');
    cy.get('#day-night-slider').should('have.class', 'open');

    // Switch to player mode
    cy.get('#mode-player').click({ force: true });

    // Slider should be collapsed/hidden and tracking disabled
    cy.get('#day-night-slider').should('not.be.visible');
    cy.get('#day-night-slider').should('not.have.class', 'open');
    cy.window().then((win) => {
      expect(win.grimoireState.dayNightTracking.enabled).to.eq(false);
    });
  });
});
