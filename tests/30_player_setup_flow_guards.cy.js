describe('Player Setup - Guards and Resets', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.viewport(1280, 900);
    cy.window().then((win) => { try { win.localStorage.clear(); } catch (_) { } });
    cy.ensureStorytellerMode();
    cy.get('#load-tb').click();
    cy.get('#character-sheet .role').should('have.length.greaterThan', 5);
    // Use 5 players for faster loops
    cy.get('#player-count').clear().type('5');
    cy.get('#reset-grimoire').click();
    cy.get('#player-circle li').should('have.length', 5);
  });

  it('blocks Start Number Selection unless bag size equals player count', () => {
    cy.get('#open-player-setup').click();
    cy.get('#player-setup-panel').should('be.visible');
    // Fill then uncheck one to make count mismatch
    cy.fillBag();
    cy.get('#bag-count-warning').should('not.be.visible');
    cy.get('#player-setup-character-list input[type="checkbox"]').filter(':checked').first().click({ force: true });
    cy.get('#bag-count-warning').should('be.visible');
    // Attempt to start selection should be blocked with error text
    cy.get('#player-setup-panel .start-selection').click();
    cy.get('body').should('not.have.class', 'grimoire-hidden');
    cy.get('#number-picker-overlay').should('not.be.visible');
    cy.get('#player-setup-panel').should('be.visible');
    cy.get('#bag-count-warning')
      .should('be.visible')
      .and('have.class', 'error')
      .invoke('text')
      .should('match', /Error: You need exactly 5 characters in the bag \(current count: 4\)/);
  });

  it('shows expected composition when team counts mismatch', () => {
    cy.get('#open-player-setup').click();
    cy.fillBag();
    cy.get('#bag-count-warning').should('not.be.visible');
    // Force count mismatch first
    cy.get('#player-setup-character-list input[type="checkbox"]').filter(':checked').first().then($cb => {
      cy.wrap($cb).click({ force: true });
      cy.get('#bag-count-warning').should('be.visible').invoke('text').should('match', /Error: You need exactly 5 characters in the bag/);

      // Restore count by checking a role from a different team to break composition
      cy.wrap($cb).parents('.team-grid').then($originGrid => {
        cy.get('#player-setup-character-list .team-grid').then($grids => {
          const originIdx = $grids.index($originGrid[0]);
          const targetIdx = originIdx === 0 ? 1 : 0;
          cy.wrap($grids.eq(targetIdx))
            .find('input[type="checkbox"]')
            .then($inputs => {
              const $candidate = $inputs.filter((_, el) => !el.checked && !el.disabled).first();
              if ($candidate.length) {
                cy.wrap($candidate).click({ force: true });
              } else {
                // As a final fallback, try any unchecked enabled checkbox globally
                cy.get('#player-setup-character-list input[type="checkbox"]').then($all => {
                  const $fallback = $all.filter((_, el) => !el.checked && !el.disabled).first();
                  if ($fallback.length) cy.wrap($fallback).click({ force: true });
                });
              }
            });
        });
      });
    });
    cy.get('#bag-count-warning').should('be.visible').invoke('text')
      .should('match', /Warning: Expected Townsfolk \d+, Outsiders \d+, Minions \d+, Demons \d+ for \d+ non-traveller players?\./);
  });

  it('resets previously selected numbers when Start Number Selection is clicked again', () => {
    cy.get('#open-player-setup').click();
    cy.fillBag();
    cy.get('#bag-count-warning').should('not.be.visible');
    cy.get('#player-setup-panel .start-selection').click();
    // Pick a number for Player 1
    cy.get('#player-circle li').eq(0).find('.number-overlay').should('contain', '?').click();
    cy.get('#number-picker-overlay .number').contains('1').click();
    cy.get('body').then($body => {
      const modal = $body.find('#player-reveal-modal');
      if (modal.length && modal.is(':visible')) {
        const confirmBtn = modal.find('#close-player-reveal-modal');
        if (confirmBtn.length) {
          cy.wrap(confirmBtn).click();
        }
      }
    });
    cy.get('#player-circle li').eq(0).find('.number-overlay').should('contain', '1');
    // Re-open sidebar if needed, then player setup and start selection again
    cy.get('#sidebar-toggle').should('be.visible').click();
    cy.get('#open-player-setup').click();
    // Model B: opening player setup resets grimoire & clears bag; refill before starting selection again
    cy.fillBag();
    cy.get('#bag-count-warning').should('not.be.visible');
    cy.get('#player-setup-panel .start-selection').click();
    // Overlays should reset to '?'
    cy.get('#player-circle li').eq(0).find('.number-overlay').should('be.visible').and('not.have.class', 'disabled').and('contain', '?');
  });

  it('forgets previously selected numbers after Start Game (requires reset after winner)', () => {
    cy.get('#open-player-setup').click();
    cy.fillBag();
    cy.get('#bag-count-warning').should('not.be.visible');
    cy.get('#player-setup-panel .start-selection').click();
    // Assign all players 1..N
    cy.get('#player-circle li').should('have.length', 5).then(() => {
      for (let i = 0; i < 5; i++) {
        cy.get('#player-circle li').eq(i).find('.number-overlay').click();
        cy.get('#number-picker-overlay .number').contains(String(i + 1)).click();
        cy.get('body').then($body => {
          const modal = $body.find('#player-reveal-modal');
          if (modal.length && modal.is(':visible')) {
            const confirmBtn = modal.find('#close-player-reveal-modal');
            if (confirmBtn.length) {
              cy.wrap(confirmBtn).click();
            }
          }
        });
      }
    });
    cy.get('#sidebar-toggle').should('be.visible').click();
    cy.get('#reveal-selected-characters').should('be.visible').click();
    // End current game declaring a winner (winner gating engages)
    cy.get('#end-game').click();
    cy.get('#end-game-modal').should('be.visible');
    cy.get('#good-wins-btn').click();
    // After winner, Open Player Setup should be disabled until reset
    cy.get('#open-player-setup').should('be.disabled');
    // Reset grimoire (no confirmation expected because gameStarted is false and winner set)
    cy.get('#reset-grimoire').click();
    cy.get('#open-player-setup').should('not.be.disabled').click();
    // Re-fill bag and start selection again after reset to regenerate overlays
    cy.fillBag();
    cy.get('#bag-count-warning').should('not.be.visible');
    cy.get('#player-setup-panel .start-selection').click();
    cy.get('#player-circle li .number-overlay').should('have.length', 5);
    cy.get('#player-circle li').each(($li) => {
      cy.wrap($li).find('.number-overlay').should('contain', '?');
    });
  });

  it('checkbox click toggles selection like clicking the token', () => {
    cy.get('#open-player-setup').click();
    cy.fillBag();
    cy.get('#player-setup-character-list input[type="checkbox"]').first().then(($cb) => {
      const wasChecked = $cb.prop('checked');
      cy.wrap($cb).click({ force: true });
      cy.wrap($cb).should(wasChecked ? 'not.be.checked' : 'be.checked');
    });
  });
});
