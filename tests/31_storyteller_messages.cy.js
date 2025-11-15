describe('Storyteller Messages (viewer-only, inline edit)', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.viewport(1280, 900);
    cy.window().then((win) => { try { win.localStorage.clear(); } catch (_) { } });
    cy.ensureStorytellerMode();
    cy.get('#load-tb').click();
    cy.get('#character-sheet .role').should('have.length.greaterThan', 5);
  });

  it('opens viewer after choosing a message from list', () => {
    cy.get('#open-storyteller-message').click();
    cy.get('#storyteller-message-modal').should('be.visible');
    cy.contains('#storyteller-message-picker .button', 'YOU ARE').click();
    cy.get('#storyteller-message-modal').should('not.be.visible');
    cy.get('#storyteller-message-display').should('be.visible');
    cy.get('#storyteller-message-display .message-text').invoke('text').should('eq', 'YOU ARE');
    cy.get('#storyteller-message-display .message-text')
      .should('have.css', 'text-align', 'center');
    cy.get('#storyteller-slots-display').should('be.visible');
  });

  it('clicking slot token opens character selection and returns to viewer', () => {
    cy.get('#open-storyteller-message').click();
    cy.contains('#storyteller-message-picker .button', 'YOU ARE').click();
    cy.get('#storyteller-slots-display .token').first().click({ force: true });
    cy.get('#character-modal').should('be.visible');
    // Pick a non-empty role
    cy.get('#character-grid .token').eq(1).click();
    // Character modal closes and viewer stays open
    cy.get('#character-modal').should('not.be.visible');
    cy.get('#storyteller-message-display').should('be.visible');
    // Curved label under slot should not be 'None'
    cy.get('#storyteller-slots-display .token svg textPath').invoke('text').should('not.eq', 'None');
  });

  it('viewer does not auto-hide the grimoire; dismiss closes viewer', () => {
    cy.get('#open-storyteller-message').click();
    cy.contains('#storyteller-message-picker .button', 'THIS IS THE DEMON').click();
    cy.get('#storyteller-message-display').should('be.visible');
    cy.get('body').should('not.have.class', 'grimoire-hidden');
    cy.get('#close-storyteller-message-display').click();
    cy.get('#storyteller-message-display').should('not.be.visible');
  });

  it('closes viewer via X and by clicking outside', () => {
    cy.get('#open-storyteller-message').click();
    cy.contains('#storyteller-message-picker .button', 'YOU ARE').click();
    cy.get('#storyteller-message-display').should('be.visible');
    // Close via X
    cy.get('#close-storyteller-message-display').click();
    cy.get('#storyteller-message-display').should('not.be.visible');

    // Reopen and close by clicking outside
    cy.get('#open-storyteller-message').click();
    cy.contains('#storyteller-message-picker .button', 'YOU ARE').click();
    cy.get('#storyteller-message-display').should('be.visible');
    cy.get('#storyteller-message-display').click('topLeft');
    cy.get('#storyteller-message-display').should('not.be.visible');
  });

  it('display tokens match character/bluff token styling', () => {
    cy.get('#open-storyteller-message').click();
    cy.contains('#storyteller-message-picker .button', 'YOU ARE').click();
    cy.get('#storyteller-slots-display .token').should('have.length', 1)
      .and('be.visible')
      .and(($el) => {
        const bg = getComputedStyle($el[0]).backgroundImage;
        expect(bg).to.contain('token.png');
      });
    cy.get('#close-storyteller-message-display').click();
  });

  it('clears previous slots when switching to a message without slots', () => {
    // First show a message with a slot and assign something
    cy.get('#open-storyteller-message').click();
    cy.contains('#storyteller-message-picker .button', 'YOU ARE').click();
    // Open character picker for the slot and pick first role
    cy.get('#storyteller-slots-display .token').first().click();
    cy.get('#character-modal').should('be.visible');
    cy.get('#character-grid .token').eq(1).click();
    cy.get('#character-modal').should('not.be.visible');
    cy.get('#storyteller-message-display').should('be.visible');
    cy.get('#close-storyteller-message-display').click();

    // Now open a message without slots and ensure no token is displayed
    cy.get('#open-storyteller-message').click({ force: true });
    cy.contains('#storyteller-message-picker .button', 'THIS IS THE DEMON').click({ force: true });
    cy.get('#storyteller-message-display').should('be.visible');
    cy.get('#storyteller-slots-display .token').should('have.length', 0);
  });

  it('displayed slot size matches grimoire token size', () => {
    let tokenSizePx = 0;
    let borderWidthPx = 0;
    cy.document().then((doc) => {
      const temp = doc.createElement('div');
      temp.style.width = 'calc(var(--token-size-base) * 1.5)';
      temp.style.position = 'absolute';
      temp.style.left = '-9999px';
      doc.body.appendChild(temp);
      tokenSizePx = parseFloat(getComputedStyle(temp).width);
      borderWidthPx = 4; // Grimoire token border width
      temp.remove();
    });
    cy.get('#open-storyteller-message').click();
    cy.contains('#storyteller-message-picker .button', 'YOU ARE').click();
    cy.get('#storyteller-slots-display .token').first().then(($slot) => {
      const cs = getComputedStyle($slot[0]);
      const w = parseFloat(cs.width);
      expect(Math.abs(w - tokenSizePx)).to.be.lte(2);
      expect(cs.borderTopStyle).to.eq('solid');
      expect(parseFloat(cs.borderTopWidth)).to.be.closeTo(borderWidthPx, 1);
      expect(cs.borderRadius).to.match(/50%|9999px/);
    });
  });

  it('chosen character name appears in display', () => {
    cy.get('#open-storyteller-message').click();
    cy.contains('#storyteller-message-picker .button', 'YOU ARE').click();
    cy.get('#storyteller-slots-display .token').first().click({ force: true });
    cy.get('#character-modal').should('be.visible');
    cy.get('#character-grid .token').eq(1).click();
    cy.get('#character-modal').should('not.be.visible');
    cy.get('#storyteller-slots-display .token svg textPath')
      .invoke('text')
      .should('not.eq', 'None');
    cy.get('#close-storyteller-message-display').click();
  });

  it('inline message text is editable in viewer', () => {
    cy.get('#open-storyteller-message').click();
    cy.contains('#storyteller-message-picker .button', 'YOU ARE').click();
    cy.get('#storyteller-message-display').should('be.visible');
    cy.get('#storyteller-message-display .message-text')
      .click()
      .type('{selectall}YOU ARE GREAT', { delay: 0 })
      .invoke('text')
      .should('eq', 'YOU ARE GREAT');
    cy.get('#close-storyteller-message-display').click();
  });
});
