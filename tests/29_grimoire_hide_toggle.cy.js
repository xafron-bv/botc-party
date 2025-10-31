describe('Grimoire Hide/Show Toggle', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.window().then((win) => { try { win.localStorage.clear(); } catch (_) { } });
    // Use shared helper (after visit)
    cy.setupGame({ players: 5, loadScript: false });
    cy.get('#mode-storyteller').should('be.checked');
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

  it('assigned tokens show no name/curved label and match unassigned in hidden mode', () => {
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
    cy.get('#reveal-assignments').click();

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
  it('works in player mode as well', () => {
    // Switch to player mode
    cy.get('#mode-player').click();
    // Close sidebar to see bluff tokens
    cy.get('#sidebar-close').click();
    // Toggle hide
    cy.get('#reveal-assignments').click({ force: true });
    cy.get('#player-circle li .reminder-placeholder').should('not.be.visible');
    cy.get('#bluff-tokens-container').should('not.be.visible');
    // Toggle show
    cy.get('#reveal-assignments').click({ force: true });
    cy.get('#bluff-tokens-container').should('be.visible');
  });
});


