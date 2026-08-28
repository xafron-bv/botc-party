// Cypress E2E tests - Day/Night slider resets when starting a new game

const startGameWithPlayers = (n) => {
  cy.setupGame({ players: n, loadScript: false });
};

describe('Day/Night slider resets when starting a new game', () => {
  beforeEach(() => {
    cy.resetApp({ mode: 'storyteller', loadScript: true });
  });

  it('resets tracking to N1 for a new game (tracking only available in-game)', () => {
    startGameWithPlayers(5);

    // Expand the action cluster so the day-night-toggle is reachable.
    cy.get('#action-cluster-toggle').click({ force: true });

    // Toggle is interactive immediately
    cy.get('#day-night-toggle').should('have.css', 'pointer-events', 'auto').click({ force: true });
    cy.get('#day-night-slider').should('have.class', 'open');
    cy.get('#add-phase-button').click({ force: true }).click({ force: true });
    cy.get('#current-phase').invoke('text').should('not.equal', 'N1');

    // Reset grimoire (confirm any prompt)
    cy.window().then((win) => { cy.stub(win, 'confirm').returns(true); });
    cy.get('#reset-grimoire').click();

    // Tracking should be reset
    cy.get('#day-night-slider').should('not.have.class', 'open');
    cy.get('#current-phase').should('have.text', 'N1');
  });
});
