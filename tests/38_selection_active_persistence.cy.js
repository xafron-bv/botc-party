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
    cy.fillBag();
    cy.get('#player-setup-panel .start-selection').click();
    cy.get('body').should('have.class', 'selection-active');
    cy.get('#player-circle li .number-overlay', { timeout: 8000 }).should('have.length', 5);

    cy.get('#number-picker-overlay').should('be.visible');
    cy.get('#selection-reveal-btn').click();
    cy.get('body').then(($body) => {
      const modal = $body.find('#player-reveal-modal:visible');
      if (modal.length) {
        const confirmBtn = modal.find('#confirm-player-reveal');
        if (confirmBtn.length) {
          cy.wrap(confirmBtn).click();
        }
      }
    });
    // Close next prompt so we can reload without an overlay up
    cy.get('#number-picker-overlay').should('be.visible');
    cy.get('#close-number-picker').click({ force: true });
    cy.get('#number-picker-overlay').should('not.be.visible');
    cy.get('#player-circle li').eq(0).find('.number-overlay').should('contain', '✓');

    // Reload mid-selection
    cy.reload();
    cy.get('body').should('have.class', 'selection-active');
    cy.get('#player-circle li', { timeout: 8000 }).should('have.length', 5);
    cy.get('#player-circle li .number-overlay', { timeout: 8000 }).should('have.length', 5);

    // Assigned player retains number and cannot reopen picker to change selection
    cy.get('#player-circle li').eq(0).find('.number-overlay')
      .should('contain', '✓');
    cy.get('#player-circle li').eq(0).find('.number-overlay').click({ force: true });
    cy.get('#number-picker-overlay').should('not.be.visible');

    // Unassigned player remains interactive
    cy.get('body').then(($body) => {
      if (!$body.find('#number-picker-overlay:visible').length) {
        cy.get('#player-circle li').eq(1).find('.number-overlay').click();
      }
    });
    cy.get('#number-picker-overlay').should('be.visible');
    cy.get('#selection-reveal-btn').click();
    cy.get('body').then(($body) => {
      const modal = $body.find('#player-reveal-modal:visible');
      if (modal.length) {
        const confirmBtn = modal.find('#confirm-player-reveal');
        if (confirmBtn.length) {
          cy.wrap(confirmBtn).click();
        }
      }
    });
    cy.get('body').then(($body) => {
      if (!$body.find('#number-picker-overlay:visible').length) {
        cy.get('#player-circle li').eq(2).find('.number-overlay').click({ force: true });
      }
    });
    cy.get('#number-picker-overlay').should('be.visible');
    cy.get('#close-number-picker').click({ force: true });
    cy.get('#number-picker-overlay').should('not.be.visible');
    cy.get('#player-circle li').eq(1).find('.number-overlay').should('contain', '✓');
  });
});
