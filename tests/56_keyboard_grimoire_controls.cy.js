const focusStyle = ($element) => {
  const style = $element[0].ownerDocument.defaultView.getComputedStyle($element[0]);
  return {
    indicator: `${style.outlineStyle}|${style.outlineWidth}|${style.outlineColor}|${style.boxShadow}`,
    boxShadow: style.boxShadow
  };
};

const focusWithVisibleIndicator = ($element) => {
  const document = $element[0].ownerDocument;
  const alternateControl = Array.from(document.querySelectorAll('button, input'))
    .find((control) => control !== $element[0] && control.offsetParent !== null);
  if (alternateControl) alternateControl.focus({ preventScroll: true });
  const unfocusedStyle = focusStyle($element);
  return cy.wrap($element)
    .focus()
    .should('have.focus')
    .should(($focused) => {
      const style = $focused[0].ownerDocument.defaultView.getComputedStyle($focused[0]);
      const hasOutline = style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0;
      const focusedStyle = focusStyle($focused);
      const hasFocusShadow = focusedStyle.boxShadow !== unfocusedStyle.boxShadow;
      expect(hasOutline || hasFocusShadow, `${$focused[0].className} focused indicator`).to.equal(true);
      expect(focusedStyle.indicator, `${$focused[0].className} focus-specific style`).not.to.equal(unfocusedStyle.indicator);
    });
};

const createPlayers = (count) => Array.from({ length: count }, (_, index) => ({
  name: `History Player ${index + 1}`,
  character: null,
  reminders: [],
  dead: false,
  deathVote: false,
  nightKilledPhase: null
}));

const clickHistoryRowBackground = ($row) => {
  const MouseEvent = $row[0].ownerDocument.defaultView.MouseEvent;
  const eventOptions = { bubbles: true, cancelable: true };
  $row[0].dispatchEvent(new MouseEvent('pointerdown', eventOptions));
  expect($row).to.have.class('pressed');
  $row[0].dispatchEvent(new MouseEvent('click', eventOptions));
  $row[0].dispatchEvent(new MouseEvent('pointerup', eventOptions));
  expect($row).not.to.have.class('pressed');
};

describe('Keyboard grimoire controls', () => {
  it('exposes native player controls and character picker buttons', () => {
    cy.resetApp({ mode: 'storyteller', loadScript: true });

    cy.get('#player-circle li').first().find('.player-token')
      .should('match', 'button[type="button"]')
      .and('have.attr', 'aria-label', 'Assign character to Player 1')
      .then(focusWithVisibleIndicator)
      .type('{enter}');
    cy.get('#character-modal').should('be.visible');

    cy.get('#character-grid .token[aria-label="Chef"]')
      .should('match', 'button[type="button"]')
      .then(focusWithVisibleIndicator)
      .type(' ');
    cy.get('#character-modal').should('not.be.visible');
    cy.get('#player-circle li').first().find('.character-name').should('contain', 'Chef');

    cy.window().then((win) => {
      cy.stub(win, 'prompt').as('renamePrompt').returns('Alice');
    });
    cy.get('#player-circle li').first().find('.player-name')
      .should('match', 'button[type="button"]')
      .and('have.attr', 'aria-label', 'Edit name for Player 1')
      .then(focusWithVisibleIndicator)
      .type(' ');
    cy.get('@renamePrompt').should('have.been.calledOnce');
    cy.get('#player-circle li').first().find('.player-name')
      .should('contain', 'Alice')
      .and('have.attr', 'aria-label', 'Edit name for Alice');
    cy.get('#player-circle li').eq(1).find('.player-name').click();
    cy.get('@renamePrompt').should('have.been.calledTwice');
    cy.get('#player-circle li').eq(1).find('.player-name').should('contain', 'Alice');

    cy.get('#player-circle li').first().find('.reminder-placeholder')
      .should('match', 'button[type="button"]')
      .and('have.attr', 'aria-label', 'Add reminder for Alice')
      .then(focusWithVisibleIndicator)
      .type('{enter}');
    cy.get('#reminder-token-modal').should('be.visible');
  });

  it('keeps night reminder actions outside the player token control', () => {
    cy.resetApp({ mode: 'storyteller', loadScript: true });
    cy.setupGame({ players: 7, loadScript: true });
    cy.get('[data-testid="day-night-toggle"]').click({ force: true });
    cy.get('#player-circle li').eq(0).find('.player-token').click({ force: true });
    cy.get('#character-grid .token[title="Imp"]').click();

    cy.get('#player-circle li').eq(0).as('player');
    cy.get('@player').find('[data-testid="night-reminder-bluffs"]')
      .should('have.attr', 'role', 'button')
      .and('have.attr', 'tabindex', '0')
      .and('have.attr', 'aria-label', 'Show bluffs storyteller message')
      .then(($reminder) => {
        expect($reminder.parent()[0]).to.equal($reminder.closest('li')[0]);
        expect($reminder.closest('.player-token')).to.have.length(0);
        return focusWithVisibleIndicator($reminder);
      });
    let scrollBeforeSpace;
    cy.window().then((win) => {
      win.document.documentElement.style.overflow = 'auto';
      win.document.body.style.minHeight = '200vh';
      win.scrollTo(0, 120);
    });
    cy.get('@player').find('[data-testid="night-reminder-bluffs"]')
      .trigger('keydown', { key: ' ', repeat: true });
    cy.get('#storyteller-message-display').should('not.be.visible');
    cy.get('@player').find('[data-testid="night-reminder-bluffs"]').then(($reminder) => {
      $reminder[0].focus({ preventScroll: true });
      scrollBeforeSpace = $reminder[0].ownerDocument.defaultView.scrollY;
      cy.wrap($reminder).type(' ', { scrollBehavior: false });
    });
    cy.window().should((win) => {
      expect(win.scrollY, 'Space keeps the viewport stationary').to.equal(scrollBeforeSpace);
    });
    cy.get('#storyteller-message-display .message-text')
      .should('be.visible')
      .and('have.text', 'THESE CHARACTERS ARE NOT IN PLAY');
  });

  it('loads script history once without hijacking nested keyboard controls', () => {
    const entry = {
      id: 'keyboard-script',
      name: 'Keyboard Script',
      data: [{ id: '_meta', name: 'Keyboard Script', author: 'cypress' }, 'chef', 'librarian'],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    const deleteEntry = {
      ...entry,
      id: 'keyboard-script-delete',
      name: 'Delete Without Loading'
    };
    cy.visit('/', {
      onBeforeLoad(win) {
        win.localStorage.clear();
        win.localStorage.setItem('botcScriptHistoryV1', JSON.stringify([entry, deleteEntry]));
      }
    });
    cy.get('#load-all-chars').click();
    cy.get('#character-sheet .role').should('have.length.greaterThan', 10);

    cy.contains('#script-history-list .history-name', 'Keyboard Script').parents('li.history-item').as('row').should(($row) => {
      expect($row).not.to.have.attr('role');
      expect($row).not.to.have.attr('tabindex');
    });
    cy.get('@row').find('.history-load')
      .should('match', 'button[type="button"]')
      .and('have.attr', 'aria-label', 'Load script Keyboard Script')
      .then(focusWithVisibleIndicator);

    cy.get('@row').find('.icon-btn.rename')
      .should('match', 'button')
      .focus()
      .type('{enter}');
    cy.get('@row').find('.history-edit-input')
      .should('be.visible')
      .clear()
      .type('Renamed Keyboard Script ');
    cy.get('#character-sheet .role').should('have.length.greaterThan', 10);
    cy.get('@row').find('.icon-btn.save')
      .should('match', 'button')
      .focus()
      .type(' ');
    cy.contains('#script-history-list .history-name', 'Renamed Keyboard Script').should('exist');
    cy.get('#character-sheet .role').should('have.length.greaterThan', 10);

    cy.contains('#script-history-list .history-name', 'Renamed Keyboard Script').parents('li.history-item').as('renamedRow');
    cy.get('@renamedRow').find('.icon-btn.download').focus().type('{enter}');
    cy.get('#character-sheet .role').should('have.length.greaterThan', 10);
    cy.window().then((win) => {
      if (win.navigator.clipboard?.writeText) cy.stub(win.navigator.clipboard, 'writeText').resolves();
      else cy.stub(win, 'prompt');
    });
    cy.get('@renamedRow').find('.icon-btn.share').focus().type(' ');
    cy.get('#character-sheet .role').should('have.length.greaterThan', 10);
    cy.window().then((win) => {
      cy.stub(win, 'confirm').returns(true);
    });
    cy.contains('#script-history-list .history-name', 'Delete Without Loading')
      .parents('li.history-item')
      .find('.icon-btn.delete')
      .focus()
      .type(' ');
    cy.contains('#script-history-list .history-name', 'Delete Without Loading').should('not.exist');
    cy.get('#character-sheet .role').should('have.length.greaterThan', 10);

    cy.contains('#script-history-list .history-name', 'Renamed Keyboard Script').parents('.history-load').then(($load) => {
      let loadActivations = 0;
      $load[0].addEventListener('click', () => {
        loadActivations += 1;
      });
      $load[0].focus();
      cy.wrap($load).type(' ').then(() => {
        expect(loadActivations).to.equal(1);
      });
    });
    cy.get('#character-sheet .role').should('have.length', 2);
    cy.contains('#character-sheet .role .name', 'Chef').should('exist');

    cy.get('#load-all-chars').click();
    cy.get('#character-sheet .role').should('have.length.greaterThan', 10);
    cy.get('@renamedRow').then(clickHistoryRowBackground);
    cy.get('#character-sheet .role').should('have.length', 2);
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

    cy.get('#grimoire-history-list .history-item').as('row')
      .should(($row) => {
        expect($row).not.to.have.attr('role');
        expect($row).not.to.have.attr('tabindex');
      })
      .find('.history-load')
      .should('match', 'button[type="button"]')
      .and('have.attr', 'aria-label', 'Load grimoire Keyboard Grimoire')
      .then(focusWithVisibleIndicator);
    cy.get('@row').find('.icon-btn.rename').focus().type('{enter}');
    cy.get('@row').find('.history-edit-input')
      .should('be.visible')
      .clear()
      .type('Renamed Keyboard Grimoire ');
    cy.get('#player-circle li').should('have.length', 5);
    cy.get('@row').find('.icon-btn.save').focus().type(' ');
    cy.get('#player-circle li').should('have.length', 5);

    cy.contains('#grimoire-history-list .history-name', 'Renamed Keyboard Grimoire')
      .parents('.history-load')
      .then(($load) => {
        let loadActivations = 0;
        $load[0].addEventListener('click', () => {
          loadActivations += 1;
        });
        cy.wrap($load).focus().type('{enter}')
          .then(() => {
            expect(loadActivations).to.equal(1);
          });
      });

    cy.get('#player-circle li').should('have.length', 6);
    cy.get('#player-circle li').first().find('.player-name').should('contain', 'History Player 1');

    cy.window().then((win) => {
      const backgroundEntry = {
        ...entry,
        id: 'pointer-grimoire',
        name: 'Pointer Grimoire',
        players: createPlayers(7)
      };
      win.localStorage.setItem('botcGrimoireHistoryV1', JSON.stringify([entry, backgroundEntry]));
    });
    cy.reload();
    cy.contains('#grimoire-history-list .history-name', 'Pointer Grimoire')
      .parents('li.history-item')
      .then(clickHistoryRowBackground);
    cy.get('#player-circle li').should('have.length', 7);
  });
});
