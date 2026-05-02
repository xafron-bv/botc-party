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

  it('clears any active snapshot when importing a game without one', () => {
    // Take a snapshot so tempSnapshot is non-null in memory + localStorage
    cy.get('#grimoire-snapshot-toggle').click({ force: true });
    cy.get('#grimoire-snapshot-toggle').should('have.attr', 'aria-pressed', 'true');
    cy.get('body').should('have.class', 'grimoire-snapshot-active');

    // Import a fresh game whose payload explicitly has tempSnapshot: null
    const importData = {
      version: 1,
      exportDate: new Date().toISOString(),
      gameState: {
        scriptData: [{ id: '_meta', name: 'Imported Script', author: 'cypress' }, 'butler'],
        scriptMetaName: 'Imported Script',
        includeTravellers: false,
        players: [
          { name: 'Alice', character: 'butler', reminders: [], dead: false, deathVote: false, nightKilledPhase: null },
          { name: 'Bob', character: null, reminders: [], dead: false, deathVote: false, nightKilledPhase: null },
          { name: 'Cara', character: null, reminders: [], dead: false, deathVote: false, nightKilledPhase: null },
          { name: 'Dan', character: null, reminders: [], dead: false, deathVote: false, nightKilledPhase: null },
          { name: 'Eve', character: null, reminders: [], dead: false, deathVote: false, nightKilledPhase: null }
        ],
        dayNightTracking: { enabled: false, phases: ['N1'], currentPhaseIndex: 0, reminderTimestamps: {} },
        bluffs: [null, null, null],
        mode: 'storyteller',
        grimoireHidden: false,
        playerSetup: { bag: [], assignments: [], revealed: false },
        gameStarted: true,
        winner: null,
        tempSnapshot: null
      }
    };
    cy.get('#import-data-file').selectFile({
      contents: Cypress.Buffer.from(JSON.stringify(importData)),
      fileName: 'botc-game.json',
      mimeType: 'application/json'
    }, { force: true });
    cy.get('#import-status').should('contain', 'Game imported successfully');

    // The previously-active snapshot must not leak into the newly imported game
    cy.get('body').should('not.have.class', 'grimoire-snapshot-active');
    cy.get('#grimoire-snapshot-toggle').should('have.attr', 'aria-pressed', 'false');
    cy.window().its('grimoireState.tempSnapshot').should('be.null');
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

  it('positions the snapshot button next to the other action buttons on small screens', () => {
    cy.viewport('iphone-6'); // 375 x 667
    cy.reload();
    cy.ensureStorytellerMode();
    cy.get('#grimoire-snapshot-toggle').should('exist');

    cy.window().then((win) => {
      const snap = win.document.getElementById('grimoire-snapshot-toggle').getBoundingClientRect();
      const print = win.document.getElementById('export-grimoire-print').getBoundingClientRect();
      const moon = win.document.getElementById('day-night-toggle').getBoundingClientRect();
      const settings = win.document.getElementById('display-settings-toggle').getBoundingClientRect();
      const debug = `snap=L${snap.left}R${snap.right} print=L${print.left}R${print.right} moon=L${moon.left}R${moon.right} settings=L${settings.left}R${settings.right}`;

      // Snapshot button should sit immediately to the left of the print button,
      // forming a tight cluster with the other bottom-right action buttons rather
      // than floating in the middle of the screen over the character ability cards.
      const gap = print.left - snap.right;
      expect(gap, `gap snap→print (${debug})`).to.be.within(0, 16);
      expect(moon.left - print.right, `gap print→moon (${debug})`).to.be.within(0, 16);
      expect(settings.left - moon.right, `gap moon→settings (${debug})`).to.be.within(0, 16);
    });
  });
});
