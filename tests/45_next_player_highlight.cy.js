describe('Next Player Highlight During Number Selection', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.viewport(1280, 900);
    cy.window().then((win) => { try { win.localStorage.clear(); } catch (_) { } });
    cy.ensureStorytellerMode();
    // Load a base script
    cy.get('#load-tb').click();
    cy.get('#character-sheet .role').should('have.length.greaterThan', 5);
    // Start with 7 players for easier testing
    cy.get('#player-count').clear().type('7');
    cy.get('#reset-grimoire').click();
    cy.get('#player-circle li').should('have.length', 7);
  });

  it('highlights the first player when starting number selection', () => {
    // Open Player Setup panel and fill bag
    cy.get('#open-player-setup').click();
    cy.get('#player-setup-panel').should('be.visible');
    cy.fillBag();
    cy.get('#bag-count-warning').should('not.be.visible');

    // Start selection
    cy.get('#player-setup-panel .start-selection').click();
    cy.get('#player-setup-panel').should('not.be.visible');

    // First player (index 0) should be highlighted
    cy.get('#player-circle li').eq(0).find('.player-token').should('have.class', 'next-player');

    // Other players should NOT be highlighted
    cy.get('#player-circle li').eq(1).find('.player-token').should('not.have.class', 'next-player');
    cy.get('#player-circle li').eq(2).find('.player-token').should('not.have.class', 'next-player');
  });

  it('moves highlight clockwise after a player draws a character', () => {
    // Setup and start selection
    cy.get('#open-player-setup').click();
    cy.fillBag();
    cy.get('#player-setup-panel .start-selection').click();

    // First player should be highlighted
    cy.get('#player-circle li').eq(0).find('.player-token').should('have.class', 'next-player');

    cy.get('#number-picker-overlay').should('be.visible');
    cy.get('#selection-reveal-btn').click();

    // Close reveal modal
    cy.get('body').then($body => {
      if ($body.find('#player-reveal-modal:visible').length) {
        cy.get('#close-player-reveal-modal').click();
      }
    });

    // Now player 1 should be highlighted (next clockwise)
    cy.get('#player-circle li').eq(0).find('.player-token').should('not.have.class', 'next-player');
    cy.get('#player-circle li').eq(1).find('.player-token').should('have.class', 'next-player');
  });

  it('continues highlighting clockwise as players draw in sequence', () => {
    // Setup and start selection
    cy.get('#open-player-setup').click();
    cy.fillBag();
    cy.get('#player-setup-panel .start-selection').click();

    // Pick numbers for first 3 players
    for (let i = 0; i < 3; i++) {
      // Current player should be highlighted
      cy.get('#player-circle li').eq(i).find('.player-token').should('have.class', 'next-player');

      cy.get('body').then(($body) => {
        if (!$body.find('#number-picker-overlay:visible').length) {
          cy.get('#player-circle li').eq(i).find('.number-overlay').click({ force: true });
        }
      });
      cy.get('#number-picker-overlay').should('be.visible');
      cy.get('#selection-reveal-btn').click();

      // Close reveal modal
      cy.get('body').then($body => {
        if ($body.find('#player-reveal-modal:visible').length) {
          cy.get('#close-player-reveal-modal').click();
        }
      });

      // Previous player should no longer be highlighted
      cy.get('#player-circle li').eq(i).find('.player-token').should('not.have.class', 'next-player');
    }

    // Player 3 should now be highlighted
    cy.get('#player-circle li').eq(3).find('.player-token').should('have.class', 'next-player');
  });

  it('clears highlight when all players have drawn', () => {
    // Setup and start selection
    cy.get('#open-player-setup').click();
    cy.fillBag();
    cy.get('#player-setup-panel .start-selection').click();

    // All 7 players draw
    for (let i = 0; i < 7; i++) {
      cy.get('body').then(($body) => {
        if (!$body.find('#number-picker-overlay:visible').length) {
          cy.get('#player-circle li').eq(i).find('.number-overlay').click({ force: true });
        }
      });
      cy.get('#number-picker-overlay').should('be.visible');
      cy.get('#selection-reveal-btn').click();

      cy.get('body').then($body => {
        if ($body.find('#player-reveal-modal:visible').length) {
          cy.get('#close-player-reveal-modal').click();
        }
      });
    }

    // After all players have picked, no player should be highlighted
    cy.get('#player-circle li .player-token.next-player').should('have.length', 0);
  });

  it('skips travellers when determining next player', () => {
    // Setup with travellers
    cy.get('#open-player-setup').click();
    cy.get('#include-travellers-in-bag').check({ force: true });
    cy.fillBag();

    // Add a traveller to bag
    cy.contains('#player-setup-character-list .team-header', 'Travellers')
      .next('.team-grid')
      .find('input[type="checkbox"]')
      .first()
      .check({ force: true });

    // Remove one townsfolk to keep count at 7
    cy.contains('#player-setup-character-list .team-header', 'Townsfolk')
      .next('.team-grid')
      .find('input[type="checkbox"]:checked')
      .first()
      .uncheck({ force: true });

    // Start selection
    cy.get('#player-setup-panel .start-selection').click();

    // Player 0 should be highlighted first
    cy.get('#player-circle li').eq(0).find('.player-token').should('have.class', 'next-player');

    cy.get('body').then(($body) => {
      if (!$body.find('#number-picker-overlay:visible').length) {
        cy.get('#player-circle li').eq(0).find('.number-overlay').click({ force: true });
      }
    });
    cy.get('#number-picker-overlay').should('be.visible');
    cy.get('#number-picker-overlay .traveller-token').first().click();
    cy.get('body').then($body => {
      if ($body.find('#player-reveal-modal:visible').length) {
        cy.get('#close-player-reveal-modal').click();
      }
    });

    // Player 0 should now show 'T' and NOT be highlighted
    cy.get('#player-circle li').eq(0).find('.number-overlay').should('contain', 'T');
    cy.get('#player-circle li').eq(0).find('.player-token').should('not.have.class', 'next-player');

    // Player 1 should now be highlighted (next non-traveller)
    cy.get('#player-circle li').eq(1).find('.player-token').should('have.class', 'next-player');
  });

  it('highlights correct player when picking out of order', () => {
    // Setup and start selection
    cy.get('#open-player-setup').click();
    cy.fillBag();
    cy.get('#player-setup-panel .start-selection').click();

    // Player 0 is highlighted initially
    cy.get('#player-circle li').eq(0).find('.player-token').should('have.class', 'next-player');

    // Player 0 draws
    cy.get('#number-picker-overlay').should('be.visible');
    cy.get('#selection-reveal-btn').click();
    cy.get('body').then($body => {
      if ($body.find('#player-reveal-modal:visible').length) {
        cy.get('#close-player-reveal-modal').click();
      }
    });

    // Player 1 should be highlighted
    cy.get('#player-circle li').eq(1).find('.player-token').should('have.class', 'next-player');

    // Close the prompted picker, then click player 3 (out of order)
    cy.get('body').then(($body) => {
      if (!$body.find('#number-picker-overlay:visible').length) {
        cy.get('#player-circle li').eq(1).find('.number-overlay').click({ force: true });
      }
    });
    cy.get('#number-picker-overlay').should('be.visible');
    cy.get('#close-number-picker').click({ force: true });
    cy.get('#player-circle li').eq(3).find('.number-overlay').click({ force: true });
    cy.get('#number-picker-overlay').should('be.visible');
    cy.get('#selection-reveal-btn').click();
    cy.get('body').then($body => {
      if ($body.find('#player-reveal-modal:visible').length) {
        cy.get('#close-player-reveal-modal').click();
      }
    });

    // Player 4 should be highlighted (next clockwise from 3)
    cy.get('#player-circle li').eq(4).find('.player-token').should('have.class', 'next-player');

    // Player 1 and 2 should NOT be highlighted even though they haven't picked
    cy.get('#player-circle li').eq(1).find('.player-token').should('not.have.class', 'next-player');
    cy.get('#player-circle li').eq(2).find('.player-token').should('not.have.class', 'next-player');
  });

  it('wraps around to beginning of circle when reaching end', () => {
    // Setup and start selection
    cy.get('#open-player-setup').click();
    cy.fillBag();
    cy.get('#player-setup-panel .start-selection').click();

    // Draw for players 0-5
    for (let i = 0; i < 6; i++) {
      cy.get('body').then(($body) => {
        if (!$body.find('#number-picker-overlay:visible').length) {
          cy.get('#player-circle li').eq(i).find('.number-overlay').click({ force: true });
        }
      });
      cy.get('#number-picker-overlay').should('be.visible');
      cy.get('#selection-reveal-btn').click();
      cy.get('body').then($body => {
        if ($body.find('#player-reveal-modal:visible').length) {
          cy.get('#close-player-reveal-modal').click();
        }
      });
    }

    // Now player 6 (last) should be highlighted
    cy.get('#player-circle li').eq(6).find('.player-token').should('have.class', 'next-player');

    // Player 6 draws last
    cy.get('body').then(($body) => {
      if (!$body.find('#number-picker-overlay:visible').length) {
        cy.get('#player-circle li').eq(6).find('.number-overlay').click({ force: true });
      }
    });
    cy.get('#number-picker-overlay').should('be.visible');
    cy.get('#selection-reveal-btn').click();
    cy.get('body').then($body => {
      if ($body.find('#player-reveal-modal:visible').length) {
        cy.get('#close-player-reveal-modal').click();
      }
    });

    // All players assigned, no highlight
    cy.get('#player-circle li .player-token.next-player').should('have.length', 0);
  });

  it('restores highlight correctly after page reload during selection', () => {
    // Setup and start selection
    cy.get('#open-player-setup').click();
    cy.fillBag();
    cy.get('#player-setup-panel .start-selection').click();

    // Player 0 and 1 draw
    cy.get('body').then(($body) => {
      if (!$body.find('#number-picker-overlay:visible').length) {
        cy.get('#player-circle li').eq(0).find('.number-overlay').click({ force: true });
      }
    });
    cy.get('#number-picker-overlay').should('be.visible');
    cy.get('#selection-reveal-btn').click();
    cy.get('body').then($body => {
      if ($body.find('#player-reveal-modal:visible').length) {
        cy.get('#close-player-reveal-modal').click();
      }
    });

    cy.get('body').then(($body) => {
      if (!$body.find('#number-picker-overlay:visible').length) {
        cy.get('#player-circle li').eq(1).find('.number-overlay').click({ force: true });
      }
    });
    cy.get('#number-picker-overlay').should('be.visible');
    cy.get('#selection-reveal-btn').click();
    cy.get('body').then($body => {
      if ($body.find('#player-reveal-modal:visible').length) {
        cy.get('#close-player-reveal-modal').click();
      }
    });

    // Player 2 should be highlighted
    cy.get('#player-circle li').eq(2).find('.player-token').should('have.class', 'next-player');

    // Reload the page
    cy.reload();

    // After reload, player 2 should still be highlighted
    cy.get('#player-circle li').eq(2).find('.player-token').should('have.class', 'next-player');

    // Players 0 and 1 should not be highlighted
    cy.get('#player-circle li').eq(0).find('.player-token').should('not.have.class', 'next-player');
    cy.get('#player-circle li').eq(1).find('.player-token').should('not.have.class', 'next-player');
  });

  it('pulsing animation is visible on highlighted player', () => {
    // Setup and start selection
    cy.get('#open-player-setup').click();
    cy.fillBag();
    cy.get('#player-setup-panel .start-selection').click();

    // Check that the animation is applied
    cy.get('#player-circle li').eq(0).find('.player-token.next-player')
      .should('have.css', 'animation-name', 'pulse-next-player');
  });

  it('handles complex scenario with multiple travellers interspersed', () => {
    // Setup with more travellers
    cy.get('#open-player-setup').click();
    cy.get('#include-travellers-in-bag').check({ force: true });
    cy.fillBag();

    // Add 2 travellers
    cy.contains('#player-setup-character-list .team-header', 'Travellers')
      .next('.team-grid')
      .find('input[type="checkbox"]')
      .eq(0)
      .check({ force: true });

    cy.contains('#player-setup-character-list .team-header', 'Travellers')
      .next('.team-grid')
      .find('input[type="checkbox"]')
      .eq(1)
      .check({ force: true });

    // Remove two townsfolk
    cy.contains('#player-setup-character-list .team-header', 'Townsfolk')
      .next('.team-grid')
      .find('input[type="checkbox"]:checked')
      .eq(0)
      .uncheck({ force: true });

    cy.contains('#player-setup-character-list .team-header', 'Townsfolk')
      .next('.team-grid')
      .find('input[type="checkbox"]:checked')
      .eq(0)
      .uncheck({ force: true });

    cy.get('#player-setup-panel .start-selection').click();

    // Assign non-traveller to player 0
    cy.get('body').then(($body) => {
      if (!$body.find('#number-picker-overlay:visible').length) {
        cy.get('#player-circle li').eq(0).find('.number-overlay').click({ force: true });
      }
    });
    cy.get('#number-picker-overlay').should('be.visible');
    cy.get('#selection-reveal-btn').click();
    cy.get('body').then($body => {
      if ($body.find('#player-reveal-modal:visible').length) {
        cy.get('#close-player-reveal-modal').click();
      }
    });

    // Player 1 should be highlighted
    cy.get('#player-circle li').eq(1).find('.player-token').should('have.class', 'next-player');

    // Assign traveller to player 1
    cy.get('body').then(($body) => {
      if (!$body.find('#number-picker-overlay:visible').length) {
        cy.get('#player-circle li').eq(1).find('.number-overlay').click({ force: true });
      }
    });
    cy.get('#number-picker-overlay').should('be.visible');
    cy.get('#number-picker-overlay .traveller-token').first().click();
    cy.get('body').then($body => {
      if ($body.find('#player-reveal-modal:visible').length) {
        cy.get('#close-player-reveal-modal').click();
      }
    });

    // Player 2 should be highlighted (skipping traveller at 1)
    cy.get('#player-circle li').eq(2).find('.player-token').should('have.class', 'next-player');

    // Assign non-traveller to player 2
    cy.get('body').then(($body) => {
      if (!$body.find('#number-picker-overlay:visible').length) {
        cy.get('#player-circle li').eq(2).find('.number-overlay').click({ force: true });
      }
    });
    cy.get('#number-picker-overlay').should('be.visible');
    cy.get('#selection-reveal-btn').click();
    cy.get('body').then($body => {
      if ($body.find('#player-reveal-modal:visible').length) {
        cy.get('#close-player-reveal-modal').click();
      }
    });

    cy.get('body').then(($body) => {
      if (!$body.find('#number-picker-overlay:visible').length) {
        cy.get('#player-circle li').eq(3).find('.number-overlay').click({ force: true });
      }
    });
    cy.get('#number-picker-overlay').should('be.visible');
    cy.get('#number-picker-overlay .traveller-token').first().click();
    cy.get('body').then($body => {
      if ($body.find('#player-reveal-modal:visible').length) {
        cy.get('#close-player-reveal-modal').click();
      }
    });

    // Player 4 should be highlighted (skipping traveller at 3)
    cy.get('#player-circle li').eq(4).find('.player-token').should('have.class', 'next-player');
  });
});
