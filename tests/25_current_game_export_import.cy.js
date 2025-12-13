// Cypress E2E tests - Current Game Export/Import

describe('Current Game Export/Import', () => {
  beforeEach(() => {
    cy.visit('/', {
      onBeforeLoad: (win) => {
        try { win.localStorage.clear(); } catch (_) { }
      }
    });
    cy.viewport(1280, 900);
  });

  it('should show export and import game buttons in the UI', () => {
    cy.contains('h3', 'Export your data').scrollIntoView();
    cy.get('#export-data-btn').should('exist').and('be.visible').and('contain', 'Export');
    cy.get('#export-type-select').should('exist').and('be.visible');
    cy.get('#import-data-btn').should('exist').and('be.visible').and('contain', 'Import');
    cy.get('#import-data-file').should('exist');
  });

  it('should export the current game state including script data', () => {
    cy.setupGame({ players: 6, loadScript: true, mode: 'storyteller' });

    // Assign a character so export includes player state
    cy.get('#player-circle li .player-token').first().click({ force: true });
    cy.get('#character-modal').should('be.visible');
    cy.get('#character-search').type('Chef');
    cy.get('#character-grid .token[title="Chef"]').first().click();
    cy.get('#character-modal').should('not.be.visible');

    cy.get('#export-type-select').select('current-game');
    cy.get('#export-data-btn').click();

    cy.window().then((win) => {
      expect(win.lastDownloadedGameFile).to.exist;
      expect(win.lastDownloadedGameFile.filename).to.match(/botc-game-\d{4}-\d{2}-\d{2}\.json/);

      const content = JSON.parse(win.lastDownloadedGameFile.content);
      expect(content.version).to.equal(1);
      expect(content.gameState).to.exist;
      expect(content.gameState.players).to.have.length(6);
      expect(content.gameState.players[0].character).to.equal('chef');
      expect(content.gameState.scriptData).to.be.an('array');
      expect(content.gameState.scriptData).to.include('chef');
    });
  });

  it('should import a game export file and replace the current grimoire state', () => {
    cy.setupGame({ players: 5, loadScript: true, mode: 'storyteller' });

    // Confirm starting state differs from imported state
    cy.get('#player-circle li').should('have.length', 5);
    cy.get('#character-sheet .role').should('have.length.greaterThan', 5);

    const importData = {
      version: 1,
      exportDate: new Date().toISOString(),
      gameState: {
        scriptData: [{ id: '_meta', name: 'Imported Script', author: 'cypress' }, 'butler', 'investigator'],
        scriptMetaName: 'Imported Script',
        includeTravellers: false,
        players: [
          { name: 'Alice', character: 'butler', reminders: [], dead: false, deathVote: false, nightKilledPhase: null },
          { name: 'Bob', character: 'investigator', reminders: [], dead: false, deathVote: false, nightKilledPhase: null },
          { name: 'Cara', character: null, reminders: [], dead: false, deathVote: false, nightKilledPhase: null },
          { name: 'Dan', character: null, reminders: [], dead: false, deathVote: false, nightKilledPhase: null },
          { name: 'Eve', character: null, reminders: [], dead: false, deathVote: false, nightKilledPhase: null },
          { name: 'Finn', character: null, reminders: [], dead: false, deathVote: false, nightKilledPhase: null },
          { name: 'Gio', character: null, reminders: [], dead: false, deathVote: false, nightKilledPhase: null }
        ],
        dayNightTracking: { enabled: false, phases: ['N1'], currentPhaseIndex: 0, reminderTimestamps: {} },
        bluffs: [null, null, null],
        mode: 'storyteller',
        grimoireHidden: false,
        grimoireLocked: false,
        playerSetup: { bag: [], assignments: [], revealed: false },
        gameStarted: true,
        winner: null
      }
    };

    cy.get('#import-data-file').selectFile({
      contents: Cypress.Buffer.from(JSON.stringify(importData)),
      fileName: 'botc-game.json',
      mimeType: 'application/json'
    }, { force: true });

    cy.get('#import-status').should('have.class', 'status');
    cy.get('#import-status').should('contain', 'Game imported successfully');

    // Verify players + script were replaced
    cy.get('#player-circle li').should('have.length', 7);
    cy.get('#player-circle li .character-name').first().should('contain', 'Butler');
    cy.get('#character-sheet .role').should('have.length', 2);
  });
});
