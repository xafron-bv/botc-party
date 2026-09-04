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
