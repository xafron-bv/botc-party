// Cypress E2E tests - Day/Night slider resets when starting a new game

const startGameWithPlayers = (n) => {
  cy.get('#player-count').then(($el) => {
    const el = $el[0];
    el.value = String(n);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  });
  // Use native click dispatch to avoid actionability failures if covered by panels
  cy.window().then((win) => {
    try { win.document.body.classList.remove('character-panel-open'); } catch (_) { }
    const btn = win.document.getElementById('reset-grimoire');
    if (btn) btn.dispatchEvent(new Event('click', { bubbles: true }));
  });
  cy.get('#player-circle li').should('have.length', n);
};

describe('Day/Night slider resets when starting a new game', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.viewport(1280, 900);
    cy.window().then((win) => { try { win.localStorage.clear(); } catch (_) { } });
    cy.get('#load-tb').click();
    cy.get('#character-sheet .role').should('have.length.greaterThan', 5);
    cy.ensureStorytellerMode();
  });

  it('resets tracking to N1 for a new game (tracking only available in-game)', () => {
    startGameWithPlayers(5);

    // Toggle is interactive immediately
    cy.get('#day-night-toggle').should('have.css', 'pointer-events', 'auto').click();
    cy.get('#day-night-slider').should('have.class', 'open');
    cy.get('#add-phase-button').click().click();
    cy.get('#current-phase').invoke('text').should('not.equal', 'N1');

    // Reset grimoire (confirm any prompt)
    cy.window().then((win) => { cy.stub(win, 'confirm').returns(true); });
    cy.get('#reset-grimoire').click();

    // Tracking should be reset
    cy.get('#day-night-slider').should('not.have.class', 'open');
    cy.get('#current-phase').should('have.text', 'N1');
  });
});
