const expectVisibleFocus = ($element) => {
  const style = $element[0].ownerDocument.defaultView.getComputedStyle($element[0]);
  const control = $element[0].className;
  const hasOutline = style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0;
  expect(hasOutline || style.boxShadow !== 'none', `${control} focus indicator`).to.equal(true);
};

const createPlayers = (count) => Array.from({ length: count }, (_, index) => ({
  name: `History Player ${index + 1}`,
  character: null,
  reminders: [],
  dead: false,
  deathVote: false,
  nightKilledPhase: null
}));

describe('Keyboard grimoire controls', () => {
  it('exposes native player controls and character picker buttons', () => {
    cy.resetApp({ mode: 'storyteller', loadScript: true });

    cy.get('#player-circle li').first().find('.player-token')
      .should('match', 'button[type="button"]')
      .and('have.attr', 'aria-label', 'Assign character to Player 1')
      .focus()
      .should('have.focus')
      .and(expectVisibleFocus)
      .type('{enter}');
    cy.get('#character-modal').should('be.visible');

    cy.get('#character-grid .token[aria-label="Chef"]')
      .should('match', 'button[type="button"]')
      .focus()
      .should('have.focus')
      .and(expectVisibleFocus)
      .type(' ');
    cy.get('#character-modal').should('not.be.visible');
    cy.get('#player-circle li').first().find('.character-name').should('contain', 'Chef');

    cy.window().then((win) => {
      cy.stub(win, 'prompt').as('renamePrompt').returns('Alice');
    });
    cy.get('#player-circle li').first().find('.player-name')
      .should('match', 'button[type="button"]')
      .and('have.attr', 'aria-label', 'Edit name for Player 1')
      .focus()
      .should('have.focus')
      .and(expectVisibleFocus)
      .type(' ');
    cy.get('@renamePrompt').should('have.been.calledOnce');
    cy.get('#player-circle li').first().find('.player-name')
      .should('contain', 'Alice')
      .and('have.attr', 'aria-label', 'Edit name for Alice');

    cy.get('#player-circle li').first().find('.reminder-placeholder')
      .should('match', 'button[type="button"]')
      .and('have.attr', 'aria-label', 'Add reminder for Alice')
      .focus()
      .should('have.focus')
      .and(expectVisibleFocus)
      .type('{enter}');
    cy.get('#reminder-token-modal').should('be.visible');
  });

  it('loads script history once without hijacking nested keyboard controls', () => {
    const entry = {
      id: 'keyboard-script',
      name: 'Keyboard Script',
      data: [{ id: '_meta', name: 'Keyboard Script', author: 'cypress' }, 'chef', 'librarian'],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    cy.visit('/', {
      onBeforeLoad(win) {
        win.localStorage.clear();
        win.localStorage.setItem('botcScriptHistoryV1', JSON.stringify([entry]));
      }
    });
    cy.get('#load-all-chars').click();
    cy.get('#character-sheet .role').should('have.length.greaterThan', 10);

    cy.get('#script-history-list .history-item').as('row')
      .should('have.attr', 'role', 'button')
      .and('have.attr', 'tabindex', '0')
      .and('have.attr', 'aria-label', 'Load script Keyboard Script')
      .focus()
      .should('have.focus')
      .and(expectVisibleFocus);

    cy.get('@row').find('.icon-btn.rename')
      .should('match', 'button')
      .focus()
      .click();
    cy.get('@row').find('.history-edit-input')
      .should('be.visible')
      .clear()
      .type('Renamed Keyboard Script');
    cy.get('#character-sheet .role').should('have.length.greaterThan', 10);
    cy.get('@row').find('.icon-btn.save')
      .should('match', 'button')
      .focus()
      .click();
    cy.contains('#script-history-list .history-name', 'Renamed Keyboard Script').should('exist');

    cy.get('#script-history-list .history-item').then(($row) => {
      let rowActivations = 0;
      $row[0].addEventListener('click', (event) => {
        if (event.target === $row[0]) rowActivations += 1;
      });
      cy.wrap($row).focus().type(' ').then(() => {
        expect(rowActivations).to.equal(1);
      });
    });
    cy.get('#character-sheet .role').should('have.length', 2);
    cy.contains('#character-sheet .role .name', 'Chef').should('exist');
  });

  it('restores grimoire history exactly once from a focused row', () => {
    const entry = {
      id: 'keyboard-grimoire',
      name: 'Keyboard Grimoire',
      createdAt: Date.now(),
      players: createPlayers(6),
      scriptName: '',
      scriptData: null,
      dayNightTracking: null,
      winner: null,
      gameStarted: false
    };
    cy.visit('/', {
      onBeforeLoad(win) {
        win.localStorage.clear();
        win.localStorage.setItem('botcGrimoireHistoryV1', JSON.stringify([entry]));
      }
    });
    cy.get('#player-circle li').should('have.length', 5);

    cy.get('#grimoire-history-list .history-item')
      .should('have.attr', 'role', 'button')
      .and('have.attr', 'tabindex', '0')
      .and('have.attr', 'aria-label', 'Load grimoire Keyboard Grimoire')
      .then(($row) => {
        let rowActivations = 0;
        $row[0].addEventListener('click', (event) => {
          if (event.target === $row[0]) rowActivations += 1;
        });
        cy.wrap($row)
          .focus()
          .should('have.focus')
          .and(expectVisibleFocus)
          .type('{enter}')
          .then(() => {
            expect(rowActivations).to.equal(1);
          });
      });

    cy.get('#player-circle li').should('have.length', 6);
    cy.get('#player-circle li').first().find('.player-name').should('contain', 'History Player 1');
  });
});
