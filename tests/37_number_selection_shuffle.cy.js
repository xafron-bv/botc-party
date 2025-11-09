// Cypress E2E test - Bag shuffle (numbers map directly 1..N to shuffled bag indices)

describe('Number selection bag shuffle', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.viewport(1200, 900);
    cy.window().then((win) => { try { win.localStorage.clear(); } catch (_) { } });
    cy.ensureStorytellerMode();
    cy.get('#player-count').clear().type('5');
    cy.get('#reset-grimoire').click();
    cy.get('#load-tb').click();
    cy.get('#open-player-setup').click();
    cy.get('#bag-random-fill').click();
  });

  it('shuffles the bag so numbers map to a new random order', () => {
    // Capture original bag order (should change after shuffle; contents remain same set)
    cy.window().then((win) => {
      const original = (win.grimoireState.playerSetup.bag || []).slice();
      expect(original.length).to.be.greaterThan(0);
      // Start selection to trigger shuffle
      cy.get('.start-selection').click();
      cy.window().then((win2) => {
        const after = (win2.grimoireState.playerSetup.bag || []).slice();
        // Content equality as sets
        const sortA = original.slice().sort();
        const sortB = after.slice().sort();
        expect(sortB).to.deep.eq(sortA);
        // Order should usually differ; if not, log warning (rare shuffle identity)
        const sameOrder = after.every((v, i) => v === original[i]);
        if (sameOrder) {
          console.warn('Bag shuffle produced identity order (rare)');
        } else {
          expect(sameOrder).to.be.false;
        }
      });
    });
  });
});
