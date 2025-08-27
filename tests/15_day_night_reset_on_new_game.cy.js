// Cypress E2E tests - Day/Night slider resets on new game

const startGameWithPlayers = (n) => {
  cy.get('#player-count').then(($el) => {
    const el = $el[0];
    el.value = String(n);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  });
  cy.get('#start-game').click();
  cy.get('#player-circle li').should('have.length', n);
};

describe('Day/Night slider resets when starting a new game', () => {
  beforeEach(() => {
    cy.visit('/?test=true');
    cy.viewport(1280, 900);
    cy.window().then((win) => { try { win.localStorage.clear(); } catch (_) {} });
    cy.get('#load-tb').click();
    cy.get('#character-sheet .role').should('have.length.greaterThan', 5);
    startGameWithPlayers(5);
  });

  it('disables tracking and resets phases to N1 after starting new game', () => {
    // Enable tracking and add phases up to N2
    cy.get('[data-testid="day-night-toggle"]').click();
    cy.get('[data-testid="add-phase-button"]').click(); // D1
    cy.get('[data-testid="add-phase-button"]').click(); // N2

    // Verify we advanced to N2
    cy.get('[data-testid="current-phase"]').should('contain', 'N2');
    cy.get('[data-testid="day-night-slider"] input[type="range"]').should('have.value', '2');

    // Start a new game (same player count)
    cy.get('#start-game').click();

    // Feedback shown
    cy.contains('#game-status', 'New game started').should('exist');

    // Tracking is disabled and slider hidden
    cy.get('[data-testid="day-night-toggle"]').should('not.have.class', 'active');
    cy.get('[data-testid="day-night-slider"]').should('have.css', 'display', 'none');

    // Re-enable tracking: phases should be reset to just N1 at index 0
    cy.get('[data-testid="day-night-toggle"]').click();
    cy.get('[data-testid="current-phase"]').should('contain', 'N1');
    cy.get('[data-testid="day-night-slider"] input[type="range"]').should('have.value', '0');
    cy.get('[data-testid="day-night-slider"] input[type="range"]').should(($el) => {
      expect($el[0].max).to.eq('0');
    });
  });
});

