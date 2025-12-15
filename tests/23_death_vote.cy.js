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
    cy.get('#player-circle li .player-token .death-ribbon').first().click({ force: true });

    // Alive count should update
    cy.get('#setup-info').should('contain', '7/8');

    // Mark second player as dead
    cy.get('#player-circle li .player-token .death-ribbon').eq(1).click({ force: true });

    // Alive count should update again
    cy.get('#setup-info').should('contain', '6/8');
  });

  it('shows death vote indicator for dead players', () => {
    startGameWithPlayers(8);
    // Mark first player as dead
    cy.get('#player-circle li .player-token .death-ribbon').first().click({ force: true });
    cy.get('#player-circle li .player-token').first().should('have.class', 'is-dead');

    // Death ribbon shows filled ghost vote when available
    cy.get('#player-circle li .player-token').first().find('.death-ribbon [data-part="mouth-fill"]').should('exist');
    cy.get('#player-circle li .player-token').first().find('.death-ribbon').should('be.visible');
  });

  it('removes death vote indicator when clicked (uses death vote)', () => {
    startGameWithPlayers(8);

    // Mark first player as dead
    cy.get('#player-circle li .player-token .death-ribbon').first().click({ force: true });

    // Phase 2: Use ghost vote via ribbon click (filled -> empty)
    cy.get('#player-circle li .player-token .death-ribbon').first().click({ force: true });
    cy.get('#player-circle li .player-token').first().find('.death-ribbon [data-part="mouth-fill"]').should('not.exist');

    // Player should still be dead
    cy.get('#player-circle li .player-token').first().should('have.class', 'is-dead');
  });

  it('revives player when clicking death ribbon after death vote is used', () => {
    startGameWithPlayers(8);

    // Mark first player as dead
    cy.get('#player-circle li .player-token .death-ribbon').first().click({ force: true });
    cy.get('#player-circle li .player-token').first().should('have.class', 'is-dead');

    // Use death vote
    cy.get('#player-circle li .player-token .death-ribbon').first().click({ force: true });
    cy.get('#player-circle li .player-token').first().find('.death-ribbon [data-part="mouth-fill"]').should('not.exist');

    // Click death ribbon again - should revive player
    cy.get('#player-circle li .player-token .death-ribbon').first().click({ force: true });

    // Player should now be alive
    cy.get('#player-circle li .player-token').first().should('not.have.class', 'is-dead');

    // Alive count should update
    cy.get('#setup-info').should('contain', '8/8');
  });

  it('persists death vote state across page reload', () => {
    startGameWithPlayers(8);

    // Mark first player as dead
    cy.get('#player-circle li .player-token .death-ribbon').first().click({ force: true });

    // Use death vote
    cy.get('#player-circle li .player-token .death-ribbon').first().click({ force: true });

    // Reload page
    cy.reload();

    // Player should still be dead
    cy.get('#player-circle li .player-token').first().should('have.class', 'is-dead');

    // Death ribbon shows empty ghost vote (already used)
    cy.get('#player-circle li .player-token').first().find('.death-ribbon [data-part="mouth-fill"]').should('not.exist');

    // Alive count should be correct
    cy.get('#setup-info').should('contain', '7/8');
  });

  it('follows 3-phase sequence (dead, vote used, resurrect)', () => {
    startGameWithPlayers(8);

    // Phase 1: Alive -> Dead
    cy.get('#player-circle li .player-token .death-ribbon').first().click({ force: true });
    cy.get('#player-circle li .player-token').first().should('have.class', 'is-dead');
    cy.get('#player-circle li .player-token').first().find('.death-ribbon [data-part="mouth-fill"]').should('exist');

    // Phase 2: Use ghost vote via ribbon click (indicator disappears)
    cy.get('#player-circle li .player-token .death-ribbon').first().click({ force: true });
    cy.get('#player-circle li .player-token').first().should('have.class', 'is-dead');
    cy.get('#player-circle li .player-token').first().find('.death-ribbon [data-part="mouth-fill"]').should('not.exist');

    // Stub confirm dialog to auto-confirm resurrection
    cy.window().then((win) => { cy.stub(win, 'confirm').returns(true).as('confirmStub'); });

    // Phase 3: Resurrect (with confirmation)
    cy.get('#player-circle li .player-token .death-ribbon').first().click({ force: true });
    cy.get('@confirmStub').should('have.been.called');
    cy.get('#player-circle li .player-token').first().should('not.have.class', 'is-dead');

    // Cycle again to ensure state resets cleanly
    cy.get('#player-circle li .player-token .death-ribbon').first().click({ force: true });
    cy.get('#player-circle li .player-token').first().find('.death-ribbon [data-part="mouth-fill"]').should('exist');
  });

  it('handles multiple dead players with independent death votes', () => {
    startGameWithPlayers(8);

    // Mark first three players as dead
    for (let i = 0; i < 3; i++) {
      cy.get('#player-circle li .player-token .death-ribbon').eq(i).click({ force: true });
    }

    // All three should show ghost vote available
    for (let i = 0; i < 3; i++) {
      cy.get('#player-circle li .player-token').eq(i).find('.death-ribbon [data-part="mouth-fill"]').should('exist');
    }

    // Alive count should show 5/8
    cy.get('#setup-info').should('contain', '5/8');

    // Use death vote for player 1 only
    cy.get('#player-circle li .player-token .death-ribbon').eq(0).click({ force: true });

    // Player 1 should be empty, but players 2 and 3 should still show available
    cy.get('#player-circle li .player-token').eq(0).find('.death-ribbon [data-part="mouth-fill"]').should('not.exist');
    cy.get('#player-circle li .player-token').eq(1).find('.death-ribbon [data-part="mouth-fill"]').should('exist');
    cy.get('#player-circle li .player-token').eq(2).find('.death-ribbon [data-part="mouth-fill"]').should('exist');

    // Revive player 1 using death ribbon
    cy.get('#player-circle li .player-token .death-ribbon').eq(0).click({ force: true });

    // Player 1 should be alive, others still dead
    cy.get('#player-circle li .player-token').eq(0).should('not.have.class', 'is-dead');
    cy.get('#player-circle li .player-token').eq(1).should('have.class', 'is-dead');
    cy.get('#player-circle li .player-token').eq(2).should('have.class', 'is-dead');

    // Alive count should update to 6/8
    cy.get('#setup-info').should('contain', '6/8');
  });

  it('does not open character modal when using death vote indicator on touch', () => {
    cy.visit('/', {
      onBeforeLoad(win) {
        try {
          Object.defineProperty(win, 'ontouchstart', {
            value: () => {},
            configurable: true
          });
        } catch (_) { win.ontouchstart = () => {}; }
        try {
          Object.defineProperty(win.navigator, 'maxTouchPoints', {
            value: 1,
            configurable: true
          });
        } catch (_) { win.navigator.maxTouchPoints = 1; }
        const originalMatchMedia = win.matchMedia ? win.matchMedia.bind(win) : null;
        win.matchMedia = (query) => {
          if (/(hover:\s*none).*(pointer:\s*coarse)/i.test(query)) {
            return { matches: true, addListener: () => {}, removeListener: () => {} };
          }
          if (originalMatchMedia) {
            return originalMatchMedia(query);
          }
          return { matches: false, addListener: () => {}, removeListener: () => {} };
        };
      }
    });
    cy.viewport(1280, 900);
    cy.window().then((win) => {
      try { win.localStorage.clear(); } catch (_) { }
    });
    cy.get('#load-tb').click();
    cy.get('#character-sheet .role').should('have.length.greaterThan', 5);

    startGameWithPlayers(8);
    cy.window().then((win) => {
      win.grimoireState.gameStarted = true;
      win.grimoireState.grimoireHidden = false;
    });

    const ribbonTouch = {
      eventConstructor: 'TouchEvent',
      touches: [{ clientX: 20, clientY: 20, identifier: 1 }],
      changedTouches: [{ clientX: 20, clientY: 20, identifier: 1 }],
      bubbles: true,
      cancelable: true,
      force: true
    };

    cy.get('#player-circle li .player-token .death-ribbon').first()
      .trigger('touchstart', ribbonTouch)
      .trigger('touchend', { ...ribbonTouch, touches: [] });

    cy.get('#player-circle li .player-token').first().should('have.class', 'is-dead');
    cy.get('#player-circle li .player-token').first().find('.death-ribbon [data-part="mouth-fill"]').should('exist');
    cy.get('#character-modal').should('not.be.visible');

    const baseTouch = {
      eventConstructor: 'TouchEvent',
      touches: [{ clientX: 20, clientY: 20, identifier: 1 }],
      changedTouches: [{ clientX: 20, clientY: 20, identifier: 1 }],
      bubbles: true,
      cancelable: true,
      force: true
    };

    cy.get('#player-circle li .player-token .death-ribbon').first()
      .scrollIntoView({ offset: { top: -100, left: 0 } })
      .trigger('touchstart', baseTouch)
      .trigger('touchend', { ...baseTouch, touches: [] });

    cy.wait(50);

    cy.get('#player-circle li .player-token').first().find('.death-ribbon [data-part="mouth-fill"]').should('not.exist');
    cy.get('#character-modal').should('not.be.visible');
  });
});
