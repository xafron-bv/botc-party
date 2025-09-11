describe('Storyteller Messages', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.viewport(1280, 900);
    cy.window().then((win) => { try { win.localStorage.clear(); } catch (_) { } });
    cy.get('#mode-storyteller').should('exist').and('be.checked');
    cy.get('#load-tb').click();
    cy.get('#character-sheet .role').should('have.length.greaterThan', 5);
  });

  it('opens edit popup after choosing a message from list', () => {
    cy.get('#open-storyteller-message').click();
    cy.get('#storyteller-message-modal').should('be.visible');
    cy.contains('#storyteller-message-picker .button', 'YOU ARE').click();
    cy.get('#storyteller-message-modal').should('not.be.visible');
    cy.get('#storyteller-message-edit').should('be.visible');
    cy.get('#storyteller-message-input').should('be.visible').and('have.value', 'YOU ARE');
    cy.get('#storyteller-message-slots').should('be.visible');
  });

  it('clicking placeholder token opens character selection and returns to edit popup', () => {
    cy.get('#open-storyteller-message').click();
    cy.contains('#storyteller-message-picker .button', 'YOU ARE').click();
    cy.get('#storyteller-message-slots .token').first().click({ force: true });
    cy.get('#character-modal').should('be.visible');
    // Pick a non-empty role
    cy.get('#character-grid .token').eq(1).click();
    // Character modal closes and edit stays open
    cy.get('#character-modal').should('not.be.visible');
    cy.get('#storyteller-message-edit').should('be.visible');
    // Curved label under slot should not be 'None'
    cy.get('#storyteller-message-slots .token svg textPath').invoke('text').should('not.eq', 'None');
  });

  it('show message hides grimoire and shows fullscreen modal; dismiss returns', () => {
    cy.get('#open-storyteller-message').click();
    cy.contains('#storyteller-message-picker .button', 'YOU ARE GOOD').click();
    cy.get('#show-storyteller-message').click();
    cy.get('#storyteller-message-display').should('be.visible');
    cy.get('body').should('have.class', 'grimoire-hidden');
    cy.get('#close-storyteller-message-display').click();
    cy.get('#storyteller-message-display').should('not.be.visible');
  });

  it('closes edit message popup via X and by clicking outside', () => {
    cy.get('#open-storyteller-message').click();
    cy.contains('#storyteller-message-picker .button', 'YOU ARE').click();
    cy.get('#storyteller-message-edit').should('be.visible');
    // Close via X
    cy.get('#close-storyteller-message-edit').click();
    cy.get('#storyteller-message-edit').should('not.be.visible');

    // Reopen and close by clicking outside
    cy.get('#open-storyteller-message').click();
    cy.contains('#storyteller-message-picker .button', 'YOU ARE').click();
    cy.get('#storyteller-message-edit').should('be.visible');
    cy.get('#storyteller-message-edit').click('topLeft');
    cy.get('#storyteller-message-edit').should('not.be.visible');
  });

  it('placeholder and display tokens match character/bluff token styling', () => {
    cy.get('#open-storyteller-message').click();
    cy.contains('#storyteller-message-picker .button', 'YOU ARE').click();
    cy.get('#storyteller-message-slots .token').should('have.length', 1)
      .and('be.visible')
      .and(($el) => {
        const bg = getComputedStyle($el[0]).backgroundImage;
        expect(bg).to.contain('token-BqDQdWeO.webp');
      });
    cy.get('#show-storyteller-message').click();
    cy.get('#storyteller-message-display').should('be.visible');
    cy.get('#storyteller-slots-display .token').should('have.length', 1)
      .and('be.visible')
      .and(($el) => {
        const bg = getComputedStyle($el[0]).backgroundImage;
        expect(bg).to.contain('token-BqDQdWeO.webp');
      });
    cy.get('#close-storyteller-message-display').click();
  });

  it('clears previous slots when switching to a message without slots', () => {
    // First show a message with a slot and assign something
    cy.get('#open-storyteller-message').click();
    cy.contains('#storyteller-message-picker .button', 'YOU ARE').click();
    // Open character picker for the slot and pick first role
    cy.get('#storyteller-message-slots .token').first().click();
    cy.get('#character-modal').should('be.visible');
    cy.get('#character-grid .token').eq(1).click();
    cy.get('#character-modal').should('not.be.visible');
    cy.get('#show-storyteller-message').click();
    cy.get('#storyteller-message-display').should('be.visible');
    cy.get('#close-storyteller-message-display').click();

    // Now open a message without slots and ensure no token is displayed
    cy.get('#open-storyteller-message').click({ force: true });
    // Close the edit modal if still open over the list
    cy.get('#storyteller-message-edit').then(($el) => {
      if ($el.is(':visible')) {
        cy.get('#close-storyteller-message-edit').click();
      }
    });
    cy.contains('#storyteller-message-picker .button', 'SELECT A PLAYER').click({ force: true });
    cy.get('#storyteller-message-slots').should('not.be.visible');
    cy.get('#show-storyteller-message').click();
    cy.get('#storyteller-message-display').should('be.visible');
    cy.get('#storyteller-slots-display .token').should('have.length', 0);
  });

  it('placeholder slot size matches grimoire token size', () => {
    let tokenSizePx = 0;
    let borderWidthPx = 0;
    cy.document().then((doc) => {
      const temp = doc.createElement('div');
      temp.style.width = 'calc(var(--token-size) * 1.5)';
      temp.style.position = 'absolute';
      temp.style.left = '-9999px';
      doc.body.appendChild(temp);
      tokenSizePx = parseFloat(getComputedStyle(temp).width);
      borderWidthPx = 4; // Grimoire token border width
      temp.remove();
    });
    cy.get('#open-storyteller-message').click();
    cy.contains('#storyteller-message-picker .button', 'YOU ARE').click();
    cy.get('#storyteller-message-slots .token').first().then(($slot) => {
      const cs = getComputedStyle($slot[0]);
      const w = parseFloat(cs.width);
      expect(Math.abs(w - tokenSizePx)).to.be.lte(2);
      expect(cs.borderTopStyle).to.eq('solid');
      expect(parseFloat(cs.borderTopWidth)).to.be.closeTo(borderWidthPx, 1);
      expect(cs.borderRadius).to.match(/50%|9999px/);
    });
  });

  it('displayed slot size matches grimoire token size', () => {
    let tokenSizePx = 0;
    cy.document().then((doc) => {
      const temp = doc.createElement('div');
      temp.style.width = 'calc(var(--token-size) * 1.5)';
      temp.style.position = 'absolute';
      temp.style.left = '-9999px';
      doc.body.appendChild(temp);
      tokenSizePx = parseFloat(getComputedStyle(temp).width);
      temp.remove();
    });
    cy.get('#open-storyteller-message').click();
    cy.contains('#storyteller-message-picker .button', 'YOU ARE').click();
    cy.get('#show-storyteller-message').click();
    cy.get('#storyteller-slots-display .token').first().then(($slot) => {
      const cs = getComputedStyle($slot[0]);
      const w = parseFloat(cs.width);
      expect(Math.abs(w - tokenSizePx)).to.be.lte(2);
      expect(cs.borderTopStyle).to.eq('solid');
      expect(parseFloat(cs.borderTopWidth)).to.be.greaterThan(2);
    });
    cy.get('#close-storyteller-message-display').click();
  });

  it('display modal shows chosen character name, not "None"', () => {
    cy.get('#open-storyteller-message').click();
    cy.contains('#storyteller-message-picker .button', 'YOU ARE').click();
    cy.get('#storyteller-message-slots .token').first().click({ force: true });
    cy.get('#character-modal').should('be.visible');
    cy.get('#character-grid .token').eq(1).click();
    cy.get('#character-modal').should('not.be.visible');
    cy.get('#show-storyteller-message').click();
    cy.get('#storyteller-slots-display .token svg textPath')
      .invoke('text')
      .should('not.eq', 'None');
    cy.get('#close-storyteller-message-display').click();
  });
});


