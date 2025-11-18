// Ensures number selection session (selectionActive) persists across page reload

describe('Selection session persistence', () => {
  beforeEach(() => {
    // Ensure deterministic state (no previously persisted session)
    cy.visit('./index.html');
    cy.clearLocalStorage();
    // Reload once more after clearing to start from a blank slate
    cy.reload();
    cy.ensureStorytellerMode();
  });

  it('restores selection state and keeps remaining players interactive after reload', () => {
    cy.get('#load-tb').click();
    cy.get('#player-count').clear().type('5');
    cy.get('#reset-grimoire').click();
    cy.get('#player-circle li', { timeout: 8000 }).should('have.length', 5);
    cy.get('#open-player-setup').click();
    cy.get('#bag-random-fill').click();
    cy.get('#player-setup-panel .start-selection').click();
    cy.get('body').should('have.class', 'selection-active');
    cy.get('#player-circle li .number-overlay', { timeout: 8000 }).should('have.length', 5);

    // Assign a number prior to reload
    cy.get('#player-circle li').eq(0).find('.number-overlay').click();
    cy.get('#number-picker-overlay').should('be.visible');
    cy.get('#number-picker-grid .button.number').filter(':not(.disabled)').first().then(($btn) => {
      const label = ($btn.text() || '').trim();
      cy.wrap(label).as('reservedNumber');
      cy.wrap($btn).click();
    });
    cy.get('body').then(($body) => {
      const modal = $body.find('#player-reveal-modal:visible');
      if (modal.length) {
        const confirmBtn = modal.find('#close-player-reveal-modal');
        if (confirmBtn.length) {
          cy.wrap(confirmBtn).click();
        }
      }
    });
    cy.get('#number-picker-overlay').should('not.be.visible');
    cy.get('#player-circle li').eq(0).find('.number-overlay')
      .invoke('text')
      .should('match', /^[0-9]+$/);

    // Reload mid-selection
    cy.reload();
    cy.get('body').should('have.class', 'selection-active');
    cy.get('#player-circle li', { timeout: 8000 }).should('have.length', 5);
    cy.get('#player-circle li .number-overlay', { timeout: 8000 }).should('have.length', 5);

    // Assigned player retains number and cannot reopen picker to change selection
    cy.get('#player-circle li').eq(0).find('.number-overlay')
      .invoke('text')
      .should('match', /^[0-9]+$/);
    cy.get('#player-circle li').eq(0).find('.number-overlay').click({ force: true });
    cy.get('#number-picker-overlay').should('not.be.visible');

    // Unassigned player remains interactive
    cy.get('#player-circle li').eq(1).find('.number-overlay').click();
    cy.get('#number-picker-overlay').should('be.visible');
    cy.get('@reservedNumber').then((reserved) => {
      if (reserved) {
        cy.get('#number-picker-grid .button.number').contains(reserved).should('have.class', 'disabled');
      }
    });
    cy.get('#number-picker-grid .button.number').filter(':not(.disabled)').first().click();
    cy.get('body').then(($body) => {
      const modal = $body.find('#player-reveal-modal:visible');
      if (modal.length) {
        const confirmBtn = modal.find('#close-player-reveal-modal');
        if (confirmBtn.length) {
          cy.wrap(confirmBtn).click();
        }
      }
    });
    cy.get('#number-picker-overlay').should('not.be.visible');
    cy.get('#player-circle li').eq(1).find('.number-overlay')
      .invoke('text')
      .should('match', /^[0-9]+$/);
  });
});
