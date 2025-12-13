// Cypress E2E tests - Alignment reminder filter hack

describe('Alignment Reminder Token Filters', () => {
  beforeEach(() => {
    cy.visit('/', {
      onBeforeLoad: (win) => {
        try { win.localStorage.clear(); } catch (_) { }
      }
    });
    cy.viewport(1280, 900);
    cy.setupGame({ players: 6, loadScript: true, mode: 'storyteller' });
  });

  function assignCharacterToPlayer({ playerIndex, name }) {
    cy.get('#player-circle li').eq(playerIndex).find('.player-token').click({ force: true });
    cy.get('#character-modal').should('be.visible');
    cy.get('#character-search').clear().type(name);
    cy.get(`#character-grid .token[title="${name}"]`).first().click();
    cy.get('#character-modal').should('not.be.visible');
  }

  function addReminderTokenToPlayer({ playerIndex, tokenTitle }) {
    cy.get('#player-circle li').eq(playerIndex).find('.reminder-placeholder').click({ force: true });
    cy.get('#reminder-token-modal').should('be.visible');
    cy.get(`#reminder-token-grid .token[title="${tokenTitle}"]`).first().click({ force: true });
    cy.get('#reminder-token-modal').should('not.be.visible');
  }

  it('applies a filter when Good role is marked Evil', () => {
    assignCharacterToPlayer({ playerIndex: 0, name: 'Butler' });

    cy.get('#player-circle li').eq(0).find('.player-token > .token-role-art')
      .should(($el) => {
        const f = getComputedStyle($el[0]).filter;
        expect(f === 'none' || f === '').to.be.true;
      });

    addReminderTokenToPlayer({ playerIndex: 0, tokenTitle: 'Evil' });

    cy.get('#player-circle li').eq(0).find('.player-token > .token-role-art')
      .should(($el) => {
        const f = getComputedStyle($el[0]).filter;
        expect(f).to.not.equal('none');
      });
  });

  it('applies a filter when Evil role is marked Good', () => {
    assignCharacterToPlayer({ playerIndex: 1, name: 'Imp' });

    addReminderTokenToPlayer({ playerIndex: 1, tokenTitle: 'Good' });

    cy.get('#player-circle li').eq(1).find('.player-token > .token-role-art')
      .should(($el) => {
        const f = getComputedStyle($el[0]).filter;
        expect(f).to.not.equal('none');
      });
  });
});

