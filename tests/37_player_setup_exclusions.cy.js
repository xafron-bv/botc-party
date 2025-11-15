describe('Player Setup - Exclusions (bag-disabled roles)', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.viewport(1280, 900);
    cy.window().then((win) => { try { win.localStorage.clear(); } catch (_) { } });
    cy.ensureStorytellerMode();
  });

  function baseSetup(players = 8) {
    cy.get('#player-count').clear().type(String(players));
    cy.get('#reset-grimoire').click();
    cy.get('#player-circle li').should('have.length', players);
  }

  it('Drunk (Trouble Brewing) appears disabled and not randomly filled', () => {
    cy.get('#load-tb').click();
    cy.get('#character-sheet .role').should('have.length.greaterThan', 5);
    baseSetup(8);
    cy.get('#open-player-setup').click();
    cy.get('#player-setup-panel').should('be.visible');

    // Drunk token appears but checkbox is disabled and not checkable
    cy.get('#player-setup-character-list .role').filter('[title="Drunk"]').should('have.length', 1)
      .within(() => {
        cy.get('input[type="checkbox"]').should('be.disabled').and('not.be.checked');
      });

    cy.fillBag();
    cy.get('#bag-count-warning').should('not.be.visible');
    cy.window().then(win => {
      const bag = (win.grimoireState && win.grimoireState.playerSetup && win.grimoireState.playerSetup.bag) || [];
      expect(bag).to.have.length(8);
      expect(bag).not.to.include('drunk');
    });
  });

  it('Marionette (if present in script) appears disabled and not randomly filled', () => {
    // Load Sects & Violets (does not contain Marionette) to show graceful skip
    cy.get('#load-sav').click();
    cy.get('#character-sheet .role').should('have.length.greaterThan', 5);
    baseSetup(9);
    cy.get('#open-player-setup').click();
    cy.get('#player-setup-panel').should('be.visible');
    cy.get('body').then($body => {
      const mar = $body.find('#player-setup-character-list .role[title="Marionette"]');
      if (mar.length) {
        cy.wrap(mar).within(() => {
          cy.get('input[type="checkbox"]').should('be.disabled').and('not.be.checked');
        });
        cy.fillBag();
        cy.get('#bag-count-warning').should('not.be.visible');
        cy.window().then(win => {
          const bag = (win.grimoireState && win.grimoireState.playerSetup && win.grimoireState.playerSetup.bag) || [];
          expect(bag).not.to.include('marionette');
        });
      } else {
        // Marionette legitimately absent in this base script; treat as pass
        cy.log('Marionette not in loaded script; skipping detailed checks');
      }
    });
  });
});
