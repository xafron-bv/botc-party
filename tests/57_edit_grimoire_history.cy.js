const scriptData = [{ id: '_meta', name: 'History editing' }, 'chef', 'imp'];
const makeEntry = (id, name) => ({
  id, name, createdAt: 1000,
  players: Array.from({ length: 5 }, (_, i) => ({
    name: `${name} ${i + 1}`, character: 'chef', reminders: [], dead: i === 1, deathVote: false, nightKilledPhase: null
  })),
  scriptName: 'History editing', scriptData,
  dayNightTracking: null, winner: 'good', gameStarted: false
});
const readHistory = () => cy.window().then(win => JSON.parse(win.localStorage.getItem('botcGrimoireHistoryV1')));
const loadHistory = (id) => {
  cy.ensureSidebarOpen();
  cy.get(`#grimoire-history-list [data-id="${id}"] .history-load`).click();
};
const renamePlayer = () => {
  cy.window().then(win => cy.stub(win, 'prompt').returns('Corrected name'));
  cy.get('#player-circle li').first().find('.player-name').click({ force: true });
  cy.get('#player-circle li').first().should('contain', 'Corrected name');
};

describe('Editing a saved grimoire', () => {
  beforeEach(() => {
    cy.visit('/', { onBeforeLoad(win) {
      win.localStorage.clear();
      win.localStorage.setItem('botcGrimoireHistoryV1', JSON.stringify([makeEntry('a', 'First game'), makeEntry('b', 'Second game')]));
    } });
    cy.ensureStorytellerMode();
    loadHistory('a');
    cy.get('#player-circle li').first().should('contain', 'First game 1');
    cy.window().then(win => cy.stub(win, 'confirm').returns(true).as('saveConfirmation'));
  });

  it('edits characters, reminders and death votes, then updates the same entry after confirmation', () => {
    renamePlayer();
    cy.get('#player-circle li').first().find('.player-token').click({ force: true });
    cy.get('#character-grid .token[title="Imp"]').first().click({ force: true });
    cy.get('#player-circle li').eq(1).find('.death-ribbon').click({ force: true });
    cy.get('#player-circle li').first().find('.reminder-placeholder').click({ altKey: true, force: true });
    cy.get('#reminder-text-input').type('Corrected reminder');
    cy.get('#save-reminder-btn').click();
    readHistory().then(entries => expect(entries[0]).to.deep.equal(makeEntry('a', 'First game')));
    loadHistory('b');
    cy.get('@saveConfirmation').should('have.been.calledOnce');
    cy.get('@saveConfirmation').its('firstCall.args.0').should('include', 'Save changes').and('include', 'Cancel');
    cy.get('#player-circle li').first().should('contain', 'Second game 1');
    readHistory().then(entries => {
      expect(entries).to.have.length(2);
      expect(entries[0]).to.include({ id: 'a', name: 'First game', createdAt: 1000, winner: 'good' });
      expect(entries[0].players[0]).to.include({ name: 'Corrected name', character: 'imp' });
      expect(entries[0].players[0].reminders[0].value).to.equal('Corrected reminder');
      expect(entries[0].players[1].deathVote).to.equal(true);
    });
    loadHistory('a');
    cy.get('#player-circle li').first().should('contain', 'Corrected name').and('contain', 'Imp');
    cy.get('#player-circle li').first().find('.text-reminder').should('contain', 'Corrected reminder');
  });

  [true, false].forEach(save => {
    it(`${save ? 'updates' : 'preserves'} an older history item without changing the newer item`, () => {
      loadHistory('b');
      cy.get('#grimoire-history-list .history-item').last().should('have.attr', 'data-id', 'b');
      renamePlayer();
      cy.get('@saveConfirmation').then(stub => stub.returns(save));
      loadHistory('a');
      cy.get('@saveConfirmation').should('have.been.calledOnce');
      cy.get('#player-circle li').first().should('contain', 'First game 1');
      readHistory().then(entries => {
        expect(entries).to.have.length(2);
        expect(entries[0]).to.deep.equal(makeEntry('a', 'First game'));
        expect(entries[1]).to.include({ id: 'b', name: 'Second game', createdAt: 1000 });
        expect(entries[1].players[0].name).to.equal(save ? 'Corrected name' : 'Second game 1');
      });
      loadHistory('b');
      cy.get('#player-circle li').first().should('contain', save ? 'Corrected name' : 'Second game 1');
      cy.get('@saveConfirmation').should('have.been.calledOnce');
    });

    it(`${save ? 'saves' : 'discards'} edits when loading another history item, even after a reload`, () => {
      renamePlayer();
      cy.reload();
      cy.get('#player-circle li').first().should('contain', 'Corrected name');
      cy.window().then(win => cy.stub(win, 'confirm').returns(save).as('saveAfterReload'));
      loadHistory('b');
      cy.get('@saveAfterReload').should('have.been.calledOnce');
      cy.get('#player-circle li').first().should('contain', 'Second game 1');
      readHistory().then(entries => {
        expect(entries).to.have.length(2);
        expect(entries[0].players[0].name).to.equal(save ? 'Corrected name' : 'First game 1');
      });
      loadHistory('a');
      cy.get('#player-circle li').first().should('contain', save ? 'Corrected name' : 'First game 1');
      cy.get('@saveAfterReload').should('have.been.calledOnce');
    });

    it(`${save ? 'saves' : 'discards'} edits when resetting for another game`, () => {
      renamePlayer();
      cy.get('@saveConfirmation').then(stub => stub.returns(save));
      cy.ensureSidebarOpen();
      cy.get('#reset-grimoire').click();
      cy.get('@saveConfirmation').should('have.been.calledOnce');
      cy.get('#winner-message').should('not.exist');
      cy.get('#player-circle li').first().find('.character-name').should('be.empty');
      loadHistory('a');
      cy.get('#player-circle li').first().should('contain', save ? 'Corrected name' : 'First game 1');
      cy.get('@saveConfirmation').should('have.been.calledOnce');
      readHistory().should('have.length', 2);
    });

    it(`${save ? 'saves' : 'discards'} edits when importing another game`, () => {
      renamePlayer();
      cy.get('@saveConfirmation').then(stub => stub.returns(save));
      cy.get('#import-data-file').selectFile({
        contents: Cypress.Buffer.from(JSON.stringify({ kind: 'botc-current-game', gameState: { ...makeEntry('c', 'Imported game'), winner: null } })),
        fileName: 'game.json', mimeType: 'application/json'
      }, { force: true });
      cy.get('#import-status').should('contain', 'Game imported successfully');
      cy.get('@saveConfirmation').should('have.been.calledOnce');
      cy.get('#player-circle li').first().should('contain', 'Imported game 1');
      cy.get('#winner-message').should('not.exist');
      loadHistory('a');
      cy.get('#player-circle li').first().should('contain', save ? 'Corrected name' : 'First game 1');
      cy.get('@saveConfirmation').should('have.been.calledOnce');
      readHistory().should('have.length', 2);
    });
  });

  [true, false].forEach(save => {
    it(`keeps the newly loaded item after ${save ? 'saving' : 'discarding'} edits and reloading the page`, () => {
      renamePlayer();
      cy.get('@saveConfirmation').then(stub => stub.returns(save));
      loadHistory('b');
      cy.get('#player-circle li').first().should('contain', 'Second game 1');
      cy.reload();
      cy.get('#player-circle li').first().should('contain', 'Second game 1');
      readHistory().then(entries => {
        expect(entries).to.have.length(2);
        expect(entries[0].players[0].name).to.equal(save ? 'Corrected name' : 'First game 1');
      });
    });
  });

  [true, false].forEach(save => {
    it(`${save ? 'saves' : 'discards'} a corrected winner on an older ended game`, () => {
      cy.viewport(1280, 720);
      loadHistory('b');
      cy.get('#end-game').scrollIntoView().should('be.visible').and('have.text', 'Change Winner').click();
      cy.get('#end-game-modal').should('be.visible');
      cy.get('@saveConfirmation').then(stub => stub.returns(save));
      cy.get('#evil-wins-btn').click();
      cy.get('@saveConfirmation').should('have.been.calledOnce');
      cy.get('#winner-message').should('contain', save ? 'Evil has won' : 'Good has won');
      readHistory().then(entries => {
        expect(entries).to.have.length(2);
        expect(entries[0]).to.deep.equal(makeEntry('a', 'First game'));
        expect(entries[1]).to.include({ id: 'b', name: 'Second game', winner: save ? 'evil' : 'good', gameStarted: false });
      });
      cy.reload();
      cy.get('#winner-message').should('contain', save ? 'Evil has won' : 'Good has won');
      cy.ensureSidebarOpen();
      cy.get('#end-game').scrollIntoView().should('be.visible').and('have.text', 'Change Winner');
      cy.window().then(win => cy.stub(win, 'confirm').returns(true).as('afterReloadConfirm'));
      loadHistory('a');
      cy.get('@afterReloadConfirm').should('not.have.been.called');
      loadHistory('b');
      cy.get('#end-game').click();
      cy.get('#good-wins-btn').click();
      cy.get('#winner-message').should('contain', 'Good has won');
      readHistory().then(entries => expect(entries[1].winner).to.equal('good'));
      cy.get('@afterReloadConfirm').should('have.callCount', save ? 1 : 0);
      cy.get('#reset-grimoire').click();
      cy.get('#end-game').scrollIntoView().should('be.visible').and('have.text', 'End Game');
    });
  });

  it('leaves the result unchanged when closing the winner dialog', () => {
    cy.get('#end-game').should('have.text', 'Change Winner').click();
    cy.get('#close-end-game-modal').click();
    cy.get('#end-game-modal').should('not.be.visible');
    cy.get('#winner-message').should('contain', 'Good has won');
    cy.get('@saveConfirmation').should('not.have.been.called');
    readHistory().should('deep.equal', [makeEntry('a', 'First game'), makeEntry('b', 'Second game')]);
  });

  it('detects a death-vote correction without any other edits', () => {
    cy.get('#player-circle li').eq(1).find('.death-ribbon').click({ force: true });
    loadHistory('b');
    cy.get('@saveConfirmation').should('have.been.calledOnce');
    readHistory().then(entries => expect(entries[0].players[1].deathVote).to.equal(true));
  });

  it('does not prompt or change history when viewing unchanged entries', () => {
    loadHistory('b');
    loadHistory('a');
    cy.get('#reset-grimoire').click();
    cy.get('@saveConfirmation').should('not.have.been.called');
    readHistory().should('deep.equal', [makeEntry('a', 'First game'), makeEntry('b', 'Second game')]);
  });
});

const trackedEntry = {
  ...makeEntry('older', 'Older tracked game'),
  winner: null,
  gameStarted: true,
  dayNightTracking: {
    enabled: true, phases: ['N1', 'D1'], currentPhaseIndex: 1,
    reminderTimestamps: {}, phaseSnapshots: {}
  }
};

describe('History review regressions', () => {
  beforeEach(() => {
    cy.visit('/', { onBeforeLoad(win) {
      win.localStorage.clear();
      win.localStorage.setItem('botcGrimoireHistoryV1', JSON.stringify([makeEntry('newer', 'Newer game'), trackedEntry]));
    } });
    cy.ensurePlayerMode();
    loadHistory('older');
    cy.get('#player-circle li').first().should('contain', 'Older tracked game 1');
  });

  ['reset', 'load'].forEach(action => {
    it(`does not treat player-mode normalization as an edit on ${action} after reload`, () => {
      cy.reload();
      cy.window().then(win => cy.stub(win, 'confirm').returns(true).as('confirm'));
      cy.ensureSidebarOpen();
      if (action === 'reset') cy.get('#reset-grimoire').click(); else loadHistory('newer');
      cy.get('@confirm').should('not.have.been.called');
      readHistory().then(entries => expect(entries[1]).to.deep.equal(trackedEntry));
    });
  });

  it('preserves the saved tracking setting when saving an actual player-mode edit', () => {
    cy.reload();
    renamePlayer();
    cy.window().then(win => cy.stub(win, 'confirm').returns(true).as('confirm'));
    loadHistory('newer');
    cy.get('@confirm').should('have.been.calledOnce');
    readHistory().then(entries => {
      expect(entries[1].players[0].name).to.equal('Corrected name');
      expect(entries[1].dayNightTracking).to.deep.equal(trackedEntry.dayNightTracking);
    });
  });

  [true, false].forEach(save => {
    it(`${save ? 'saves' : 'discards'} the winner and edits when ending a restored game`, () => {
      cy.reload();
      renamePlayer();
      cy.window().then(win => cy.stub(win, 'confirm').returns(save).as('confirm'));
      cy.ensureSidebarOpen();
      cy.get('#end-game').click();
      cy.get('#good-wins-btn').click();
      cy.get('#end-game-modal').should('not.be.visible');
      cy.get('@confirm').should('have.been.calledOnce');
      cy.get('#player-circle li').first().should('contain', save ? 'Corrected name' : 'Older tracked game 1');
      if (save) cy.get('#winner-message').should('contain', 'Good has won'); else cy.get('#winner-message').should('not.exist');
      cy.get('#day-night-slider').should('not.be.visible');
      cy.window().its('grimoireState.dayNightTracking.enabled').should('equal', false);
      readHistory().then(entries => {
        expect(entries).to.have.length(2);
        expect(entries[0]).to.deep.equal(makeEntry('newer', 'Newer game'));
        if (save) {
          expect(entries[1]).to.include({ winner: 'good', gameStarted: false });
          expect(entries[1].players[0].name).to.equal('Corrected name');
        } else expect(entries[1]).to.deep.equal(trackedEntry);
      });
      cy.reload();
      cy.get('#player-circle li').first().should('contain', save ? 'Corrected name' : 'Older tracked game 1');
      if (save) cy.get('#winner-message').should('contain', 'Good has won'); else cy.get('#winner-message').should('not.exist');
      cy.window().then(win => cy.stub(win, 'confirm').returns(true).as('afterReloadConfirm'));
      loadHistory('newer');
      cy.get('@afterReloadConfirm').should('not.have.been.called');
    });
  });
});
