// Cypress E2E tests - Game

const startGameWithPlayers = (n) => {
  cy.get('#player-count').clear().type(String(n));
  cy.get('#start-game').click();
  cy.get('#player-circle li').should('have.length', n);
};

describe('Game', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.viewport(1280, 900);
    cy.window().then((win) => {
      try { win.localStorage.clear(); } catch (_) {}
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
    // Ensure tokens have size and do not overlap (allow 1px tolerance)
    cy.get('#player-circle li .player-token').then(($els) => {
      const rects = Array.from($els, (el) => el.getBoundingClientRect());
      rects.forEach((r) => {
        expect(r.width).to.be.greaterThan(0);
        expect(r.height).to.be.greaterThan(0);
      });
      const overlaps = (a, b) => !(a.right <= b.left + 1 || a.left >= b.right - 1 || a.bottom <= b.top + 1 || a.top >= b.bottom - 1);
      for (let i = 0; i < rects.length; i += 1) {
        for (let j = i + 1; j < rects.length; j += 1) {
          expect(overlaps(rects[i], rects[j]), `tokens ${i} and ${j} overlap`).to.eq(false);
        }
      }
    });
  });

  it('rename players, assign characters, reminders add/collapse/expand/delete/custom', () => {
    startGameWithPlayers(7);

    // Rename player 1 via prompt
    cy.window().then((win) => {
      cy.stub(win, 'prompt').returns('Alice');
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

    // Add 2 reminder tokens to player 1
    cy.get('#player-circle li .reminder-placeholder').eq(0).click();
    cy.get('#reminder-token-modal').should('be.visible');
    cy.get('#reminder-token-grid .token[title="Townsfolk"]').first().click();
    cy.get('#reminder-token-modal').should('not.be.visible');

    cy.get('#player-circle li .reminder-placeholder').eq(0).click();
    cy.get('#reminder-token-modal').should('be.visible');
    cy.get('#reminder-token-grid .token[title="Wrong"]').first().click();

    // Expand/collapse reminders stack using hover events
    cy.get('#player-circle li').eq(0).trigger('mouseenter');
    cy.get('#player-circle li').eq(0).should('have.attr', 'data-expanded', '1');

    // Delete one reminder
    cy.get('#player-circle li').eq(0).within(() => {
      cy.get('.reminders .reminder-delete-btn').first().click({ force: true });
    });

    // Collapse stack
    cy.get('#player-circle li').eq(0).trigger('mouseleave');
    cy.get('#player-circle li').eq(0).should('have.attr', 'data-expanded', '0');

    // Add custom text reminder via reminder token modal custom option
    cy.get('#player-circle li .reminder-placeholder').eq(0).click();
    cy.get('#reminder-token-modal').should('be.visible');
    cy.window().then((win) => {
      cy.stub(win, 'prompt').returns('Custom note example');
    });
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
    // Perform a few actions to ensure a snapshot will exist when count changes
    cy.get('#player-circle li .player-token').eq(0).click();
    cy.get('#character-modal').should('be.visible');
    cy.get('#character-search').type('Chef');
    cy.get('#character-grid .token').first().click();

    // Changing player count snapshots previous grimoire
    startGameWithPlayers(7); // triggers snapshot of the 6-player state

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

