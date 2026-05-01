describe('Temporary grimoire snapshot/restore', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.window().then((win) => { try { win.localStorage.clear(); } catch (_) { } });
    cy.ensureStorytellerMode();
    cy.setupGame({ players: 5, loadScript: true, mode: 'storyteller' });
  });

  it('shows the snapshot toggle only in storyteller mode', () => {
    cy.get('#grimoire-snapshot-toggle').should('be.visible');
    cy.get('#mode-player').click({ force: true });
    cy.get('#grimoire-snapshot-toggle').should('not.be.visible');
    cy.get('#mode-storyteller').click({ force: true });
    cy.get('#grimoire-snapshot-toggle').should('be.visible');
  });

  it('snapshots state on click and restores it on second click, persisting across reloads', () => {
    // Establish baseline: assign Chef to player 0, add a reminder to player 1
    cy.get('#player-circle li').eq(0).find('.player-token').click({ force: true });
    cy.get('#character-modal').should('be.visible');
    cy.get('#character-grid .token[title="Chef"]').first().click({ force: true });
    cy.get('#character-modal').should('not.be.visible');
    cy.get('#player-circle li').eq(0).find('.character-name').should('contain', 'Chef');

    cy.get('#player-circle li').eq(1).find('.reminder-placeholder').click({ altKey: true, force: true });
    cy.get('#text-reminder-modal').should('be.visible');
    cy.get('#reminder-text-input').type('original reminder');
    cy.get('#save-reminder-btn').click({ force: true });
    cy.get('#text-reminder-modal').should('not.be.visible');
    cy.get('#player-circle li').eq(1).find('.text-reminder').should('have.length', 1);

    // Take snapshot
    cy.get('#grimoire-snapshot-toggle')
      .should('have.attr', 'aria-pressed', 'false')
      .click({ force: true });
    cy.get('#grimoire-snapshot-toggle').should('have.attr', 'aria-pressed', 'true');
    cy.get('#grimoire-snapshot-toggle').invoke('attr', 'title').should('match', /Restore/i);
    cy.get('body').should('have.class', 'grimoire-snapshot-active');

    // Make temporary changes: reassign player 0 to Imp, delete reminder on player 1
    cy.get('#player-circle li').eq(0).find('.player-token').click({ force: true });
    cy.get('#character-modal').should('be.visible');
    cy.get('#character-grid .token[title="Imp"]').first().click({ force: true });
    cy.get('#character-modal').should('not.be.visible');
    cy.get('#player-circle li').eq(0).find('.character-name').should('contain', 'Imp');

    cy.get('#player-circle li').eq(1).find('.text-reminder').first().trigger('contextmenu', { force: true });
    cy.get('#reminder-context-menu').should('be.visible');
    cy.get('#reminder-menu-delete').click({ force: true });
    cy.get('#player-circle li').eq(1).find('.text-reminder').should('have.length', 0);

    // Reload — temporary state and toggle state must persist
    cy.reload();
    cy.get('#player-circle li').eq(0).find('.character-name').should('contain', 'Imp');
    cy.get('#player-circle li').eq(1).find('.text-reminder').should('have.length', 0);
    cy.get('#grimoire-snapshot-toggle').should('have.attr', 'aria-pressed', 'true');
    cy.get('body').should('have.class', 'grimoire-snapshot-active');

    // Restore
    cy.get('#grimoire-snapshot-toggle').click({ force: true });
    cy.get('#grimoire-snapshot-toggle').should('have.attr', 'aria-pressed', 'false');
    cy.get('#grimoire-snapshot-toggle').invoke('attr', 'title').should('match', /Make temporary/i);
    cy.get('body').should('not.have.class', 'grimoire-snapshot-active');
    cy.get('#player-circle li').eq(0).find('.character-name').should('contain', 'Chef');
    cy.get('#player-circle li').eq(1).find('.text-reminder').should('have.length', 1);
  });
});
