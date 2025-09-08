// Cypress E2E tests - Game

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

describe('Game', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.viewport(1280, 900);
    cy.window().then((win) => {
      try { win.localStorage.clear(); } catch (_) { }
    });
    cy.get('#load-tb').click();
    cy.get('#character-sheet .role').should('have.length.greaterThan', 5);
  });

  it('starts a game with 5 and 20 players (tokens rendered, no overlap)', () => {
    // 5 players
    startGameWithPlayers(5);
    // sanity: tokens present
    cy.get('#player-circle li .player-token').should('have.length', 5);

    // 20 players
    startGameWithPlayers(20);
    cy.get('#player-circle li .player-token').should('have.length', 20);
    // Ensure tokens have size and are reasonably separated (center-to-center distance)
    cy.get('#player-circle li .player-token').then(($els) => {
      const rects = Array.from($els, (el) => el.getBoundingClientRect());
      rects.forEach((r) => {
        expect(r.width).to.be.greaterThan(0);
        expect(r.height).to.be.greaterThan(0);
      });
      const diameter = rects[0].width || 80;
      const minDistance = diameter * 0.7; // lenient threshold
      const centers = rects.map((r) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 }));
      for (let i = 0; i < centers.length; i += 1) {
        for (let j = i + 1; j < centers.length; j += 1) {
          const dx = centers[i].x - centers[j].x;
          const dy = centers[i].y - centers[j].y;
          const dist = Math.hypot(dx, dy);
          expect(dist, `tokens ${i} and ${j} too close`).to.be.greaterThan(minDistance);
        }
      }
    });
  });

  it('rename players, assign characters, reminders add/collapse/expand/delete/custom', () => {
    startGameWithPlayers(7);

    // Stub prompt once for both rename and custom reminder flows
    cy.window().then((win) => {
      const stub = cy.stub(win, 'prompt');
      stub.onFirstCall().returns('Alice');
      stub.onSecondCall().returns('Custom note example');
    });
    cy.get('#player-circle li .player-name').first().click();
    cy.get('#player-circle li .player-name').first().should('contain', 'Alice');

    // Assign characters to two players
    cy.get('#player-circle li .player-token').eq(0).click();
    cy.get('#character-modal').should('be.visible');
    cy.get('#character-search').type('Chef');
    cy.get('#character-grid .token[title="Chef"]').first().click();
    cy.get('#character-modal').should('not.be.visible');

    cy.get('#player-circle li .player-token').eq(1).click();
    cy.get('#character-modal').should('be.visible');
    cy.get('#character-search').clear().type('Librarian');
    cy.get('#character-grid .token[title="Librarian"]').first().click();

    // Add 2 reminder tokens to player 1 (generic tokens should always be present)
    // Ensure no other stack is expanded
    cy.get('#player-circle li').should('have.attr', 'data-expanded', '0');
    cy.get('#player-circle li .reminder-placeholder').eq(0).click();
    cy.get('#reminder-token-modal').should('be.visible');
    cy.get('#reminder-token-grid .token[title="Townsfolk"]').first().click();
    cy.get('#reminder-token-modal').should('not.be.visible');

    cy.get('#player-circle li .reminder-placeholder').eq(0).click();
    cy.get('#reminder-token-modal').should('be.visible');
    cy.get('#reminder-token-grid .token[title="Wrong"]').first().click();

    // If Balloonist is in the script, its per-character reminders should also be available
    // Open and search for "Seen Townsfolk" as a sanity check
    cy.get('#player-circle li .reminder-placeholder').eq(0).click();
    cy.get('#reminder-token-modal').should('be.visible');
    cy.get('#reminder-token-search').clear().type('seen towns');
    cy.get('#reminder-token-grid .token').should('have.length.greaterThan', 0);
    cy.get('#reminder-token-modal').click('topLeft', { force: true });
    cy.get('#reminder-token-modal').should('not.be.visible');

    // Expand/collapse reminders stack using hover events (hover reminders region only)
    cy.get('#player-circle li').eq(0).find('.reminders').trigger('mouseenter', { force: true });
    cy.get('#player-circle li').eq(0).should('have.attr', 'data-expanded', '1');

    // Delete one reminder via hover delete icon (no confirmation expected)
    cy.get('#player-circle li').eq(0).find('.reminders .icon-reminder, .reminders .text-reminder').first().trigger('mouseenter');
    cy.window().then((win) => { cy.stub(win, 'confirm').as('confirmStubGame'); });
    cy.get('@confirmStubGame').its('callCount').then((before) => {
      cy.get('#player-circle li').eq(0).find('.reminders .reminder-action.delete').first().click({ force: true });
      cy.get('@confirmStubGame').its('callCount').should('eq', before);
    });

    // Collapse stack
    cy.get('#player-circle li').eq(0).find('.reminders').trigger('mouseleave', { force: true });
    cy.get('#player-circle li').eq(0).should('have.attr', 'data-expanded', '0');

    // Add custom text reminder via reminder token modal custom option
    cy.get('#player-circle li .reminder-placeholder').eq(0).click();
    cy.get('#reminder-token-modal').should('be.visible');
    cy.get('#reminder-token-grid .token[title*="Custom"]').first().click();
    cy.get('#reminder-token-modal').should('not.be.visible');
    // Ensure custom reminder visible (straight text content)
    cy.get('#player-circle li').eq(0).find('.icon-reminder-content').contains('Custom note example').should('exist');

    // Add a reminder to a second player as well
    cy.get('#player-circle li .reminder-placeholder').eq(1).click();
    cy.get('#reminder-token-modal').should('be.visible');
    cy.get('#reminder-token-grid .token[title="Wrong"]').first().click();
    cy.get('#reminder-token-modal').should('not.be.visible');
  });

  it('character selection search, names under tokens, tooltips on grimoire tokens', () => {
    startGameWithPlayers(5);

    // Open selector for player 1 and search
    cy.get('#player-circle li .player-token').eq(0).click();
    cy.get('#character-modal').should('be.visible');
    cy.get('#character-search').type('Chef');
    cy.contains('#character-grid .token', 'Chef').should('exist');
    cy.contains('#character-grid .token', 'Chef').click();

    // Name below token should be visible
    cy.get('#player-circle li .character-name').eq(0).should('contain', 'Chef');

    // Tooltip should appear for non-touch simulation: mouseenter/mouseleave
    cy.get('#player-circle li .player-token').eq(0).trigger('mouseenter');
    cy.get('#ability-tooltip').should('have.class', 'show');
    cy.get('#ability-tooltip').should('contain', 'pairs of evil players');
    cy.get('#player-circle li .player-token').eq(0).trigger('mouseleave');
    cy.get('#ability-tooltip').should('not.have.class', 'show');
  });

  it('grimoire history create/rename/load/delete', () => {
    startGameWithPlayers(6);
    // Start & end a game to create an initial snapshot for 6-player state
    cy.get('#mode-player').check({ force: true });
    cy.get('#start-game').click();
    cy.get('#end-game').click();
    cy.get('#end-game-modal').should('be.visible');
    cy.get('#good-wins-btn').click();
    // Perform a few actions to ensure a snapshot will exist when count changes
    cy.get('#player-circle li .player-token').eq(0).click();
    cy.get('#character-modal').should('be.visible');
    cy.get('#character-search').type('Chef');
    cy.get('#character-grid .token').first().click();

    // Changing player count snapshots previous grimoire
    // Changing player count while a game is ended should not snapshot yet
    // Confirm reset prompt if shown
    cy.window().then((win) => { cy.stub(win, 'confirm').returns(true); });
    startGameWithPlayers(7); // restore 7 players (no snapshot yet)
    // Start game so loading 6-player history snapshots the current 7-player state
    cy.get('#mode-player').check({ force: true });
    cy.get('#start-game').click();

    // There should be at least one grimoire history entry
    cy.get('#grimoire-history-list .history-item').should('have.length.greaterThan', 0);

    // Rename first
    cy.get('#grimoire-history-list .history-item').first().within(() => {
      cy.get('.icon-btn.rename').click();
      cy.get('.history-edit-input').clear().type('Day 1');
      cy.get('.icon-btn.save').click();
    });
    cy.contains('#grimoire-history-list .history-item .history-name', 'Day 1').should('exist');

    // Load it
    cy.contains('#grimoire-history-list .history-item .history-name', 'Day 1')
      .parents('li.history-item')
      .click();
    // Expect grimoire to reflect loaded state: 6 players
    cy.get('#player-circle li').should('have.length', 6);

    // Delete it
    cy.on('window:confirm', (msg) => /Delete this grimoire snapshot/i.test(msg));
    cy.contains('#grimoire-history-list .history-item .history-name', 'Day 1')
      .parents('li.history-item')
      .within(() => {
        cy.get('.icon-btn.delete').click();
      });
    cy.contains('#grimoire-history-list .history-item .history-name', 'Day 1').should('not.exist');
  });
});
