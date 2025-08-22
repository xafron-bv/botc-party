// Cypress E2E test - Touch-mode expanded reminders should stack above opposite player

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

describe('Reminder overlap z-index (touch mode)', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.viewport(1280, 900);
    cy.window().then((win) => {
      try { win.localStorage.clear(); } catch (_) { }
      // Force touch mode
      Object.defineProperty(win.navigator, 'maxTouchPoints', { value: 1, configurable: true });
    });
    cy.get('#load-tb').click();
    cy.get('#character-sheet .role').should('have.length.greaterThan', 5);
  });

  it('expanded reminders remain above opposite player while expanded', () => {
    // Use 8 players for an opposite player directly across the circle
    startGameWithPlayers(8);

    // Add many icon reminders to player 0 to extend the expanded stack far out
    const addReminder = () => {
      cy.get('#player-circle li .reminder-placeholder').eq(0).click({ force: true });
      cy.get('#reminder-token-modal').should('be.visible');
      // Choose a generic non-custom token to avoid prompt blocking modal close
      cy.get('#reminder-token-grid .token[title="Wrong"]').first().click({ force: true });
      cy.get('#reminder-token-modal').should('not.be.visible');
    };
    // Add ~10 reminders to ensure the arc reaches near the circle center and beyond
    for (let i = 0; i < 10; i += 1) addReminder();

    // Expand player 0 by clicking a reminder token (works across environments)
    cy.get('#player-circle li').eq(0).find('.reminders .icon-reminder, .reminders .text-reminder').first().click({ force: true });
    cy.get('#player-circle li').eq(0).should('have.attr', 'data-expanded', '1');

    // Compute a point near the last reminder bubble position by reading its bounding rect
    cy.get('#player-circle li').eq(0).within(() => {
      cy.get('.reminders .icon-reminder, .reminders .text-reminder').last().then(($last) => {
        const r = $last[0].getBoundingClientRect();
        const targetX = Math.floor(r.left + r.width / 2);
        const targetY = Math.floor(r.top + r.height / 2);
        // At this screen point, the topmost element should belong to the expanded player's li
        cy.document().then((doc) => {
          const elAtPoint = doc.elementFromPoint(targetX, targetY);
          // Walk up to the owning li
          const parentLi = elAtPoint && elAtPoint.closest && elAtPoint.closest('#player-circle li');
          expect(parentLi, 'element at overlap point should be within player 0 li').to.exist;
          // Ensure it is the first li (player 0)
          const allLis = Array.from(doc.querySelectorAll('#player-circle li'));
          expect(parentLi).to.equal(allLis[0]);
        });
      });
    });

    // Collapse by tapping outside and verify z-index effect goes away (expanded flag cleared)
    cy.get('body').click('topLeft');
    cy.get('#player-circle li').eq(0).should('have.attr', 'data-expanded', '0');
  });
});


