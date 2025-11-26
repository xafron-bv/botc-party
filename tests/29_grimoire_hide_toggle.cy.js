describe('Grimoire visibility & locking controls', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.window().then((win) => { try { win.localStorage.clear(); } catch (_) { } });
    cy.ensureStorytellerMode();
    cy.setupGame({ players: 5, loadScript: false });
  });

  it('shows hide/show control only in player mode and lock control only in storyteller mode', () => {
    cy.get('#grimoire-lock-toggle').should('be.visible').and('contain', 'Lock Grimoire');
    cy.get('#reveal-assignments').should('not.be.visible');

    cy.get('#mode-player').click({ force: true });
    cy.get('#grimoire-lock-toggle').should('not.be.visible');
    cy.get('#reveal-assignments').should('be.visible').and('contain', 'Hide Grimoire');

    cy.get('#mode-storyteller').click({ force: true });
    cy.get('#grimoire-lock-toggle').should('be.visible').and('contain', 'Lock Grimoire');
    cy.get('#reveal-assignments').should('not.be.visible');
  });

  it('hides and shows tokens, reminders, and bluffs while keeping blank circles in player mode', () => {
    // Switch to player mode to expose hide/show button
    cy.get('#mode-player').click({ force: true });
    cy.startGame();
    cy.get('#sidebar-backdrop').click({ force: true });
    cy.get('#reveal-assignments').should('contain', 'Hide Grimoire');

    // Verify baseline visible elements
    cy.get('#player-circle li .player-token').should('have.length', 5);
    cy.get('#player-circle li .reminder-placeholder').should('be.visible');
    cy.get('#bluff-tokens-container').should('be.visible');

    // Hide grimoire
    cy.get('#reveal-assignments').click({ force: true });

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
        expect(style.backgroundImage).to.contain('token.png');
      });

    // Show grimoire again
    cy.get('#reveal-assignments').click({ force: true });
    cy.get('#player-circle li .reminder-placeholder').should('be.visible');
    cy.get('#bluff-tokens-container').should('be.visible');
  });

  it('assigned tokens show no name/curved label and match unassigned in player hidden mode', () => {
    cy.get('#mode-player').click({ force: true });
    cy.startGame();
    cy.get('#reveal-assignments').should('contain', 'Hide Grimoire');

    // Load a base script (if not already loaded by helper) so character modal has content
    cy.get('body').then($b => {
      if (!$b.find('#character-sheet .role').length) {
        cy.get('#load-tb').click({ force: true });
        cy.get('#character-sheet .role').should('have.length.greaterThan', 5);
      }
    });
    // Assign a character to first player - force click to bypass any transient overlay
    cy.get('#player-circle li').eq(0).find('.player-token').click({ force: true });
    cy.get('#character-modal', { timeout: 6000 }).should('be.visible');
    cy.get('#character-grid .token').first().click({ force: true });
    cy.get('#character-modal').should('not.be.visible');

    // Hide grimoire
    cy.get('#reveal-assignments').click({ force: true });

    // No curved label
    cy.get('#player-circle li').eq(0).find('.icon-reminder-svg').should('not.exist');
    // Character name should be hidden/empty
    cy.get('#player-circle li').eq(0).find('.character-name').invoke('text').should('equal', '');

    // Visual parity: first (assigned) and second (unassigned) tokens should have identical backgroundImage
    cy.get('#player-circle li .player-token').then(($els) => {
      const s0 = window.getComputedStyle($els[0]);
      const s1 = window.getComputedStyle($els[1]);
      expect(s0.backgroundImage).to.equal(s1.backgroundImage);
    });

    // Show back
    cy.get('#reveal-assignments').click();
  });

  it('locks grimoire actions in storyteller mode until unlocked', () => {
    // Add a reminder to attempt to delete later
    cy.get('#player-circle li .reminder-placeholder').first().click({ altKey: true, force: true });
    cy.get('#text-reminder-modal').should('be.visible');
    cy.get('#reminder-text-input').type('Locked reminder');
    cy.get('#save-reminder-btn').click({ force: true });
    cy.get('#text-reminder-modal').should('not.be.visible');
    cy.get('#player-circle li').first().find('.text-reminder').should('have.length', 1);

    // Lock the grimoire
    cy.get('#grimoire-lock-toggle').should('contain', 'Lock Grimoire').click();
    cy.get('#grimoire-lock-toggle').should('contain', 'Unlock Grimoire');
    cy.get('body').should('have.class', 'grimoire-locked');

    // Attempting to delete reminders should be blocked
    cy.get('#player-circle li').first().find('.text-reminder').first().trigger('contextmenu', { force: true });
    cy.get('body').find('#reminder-context-menu').should('have.length', 0);
    cy.get('#player-circle li').first().find('.text-reminder').should('have.length', 1);

    // Unlock and verify deletion works again
    cy.get('#grimoire-lock-toggle').click();
    cy.get('#grimoire-lock-toggle').should('contain', 'Lock Grimoire');
    cy.get('body').should('not.have.class', 'grimoire-locked');
    cy.get('#player-circle li').first().find('.text-reminder').first().trigger('contextmenu', { force: true });
    cy.get('#reminder-context-menu').should('be.visible');
    cy.get('#reminder-menu-delete').click({ force: true });
    cy.get('#player-circle li').first().find('.text-reminder').should('have.length', 0);
  });
});
