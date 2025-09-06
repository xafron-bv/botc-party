// Cypress E2E tests - Travellers toggle

const startGameWithPlayers = (n) => {
  cy.get('#player-count').then(($el) => {
    const el = $el[0];
    el.value = String(n);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  });
  cy.get('#reset-grimoire').click();
  cy.get('#player-circle li').should('have.length', n);
};

describe('Travellers Toggle', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.viewport(1280, 900);
    cy.window().then((win) => {
      try { win.localStorage.clear(); } catch (_) { }
    });
    cy.get('#load-tb').click();
    cy.get('#character-sheet .role').should('have.length.greaterThan', 5);
  });

  it('is unchecked by default and hides Travellers from sheet and modal', () => {
    cy.get('#include-travellers').should('exist').and('not.be.checked');
    cy.get('#character-sheet h3.team-travellers').should('not.exist');

    startGameWithPlayers(5);
    cy.get('#player-circle li .player-token').first().click();
    cy.get('#character-modal').should('be.visible');
    cy.get('#character-search').clear().type('Beggar');
    cy.get('#character-grid .token[title="Beggar"]').should('not.exist');
    cy.get('#close-character-modal').click();
    cy.get('#character-modal').should('not.be.visible');
  });

  it('shows Travellers in sheet and modal when enabled; persists across reload', () => {
    cy.get('#include-travellers').check({ force: true }).should('be.checked');
    // Travellers header should appear and include at least one known traveller
    cy.get('#character-sheet h3.team-travellers').should('exist');
    cy.contains('#character-sheet .role .name', 'Beggar').should('exist');

    // Modal search should find Beggar
    startGameWithPlayers(5);
    cy.get('#player-circle li .player-token').eq(0).click();
    cy.get('#character-modal').should('be.visible');
    cy.get('#character-search').clear().type('Beggar');
    cy.get('#character-grid .token[title="Beggar"]').first().should('exist');
    cy.get('#close-character-modal').click();
    cy.get('#character-modal').should('not.be.visible');

    // Persist across reload
    cy.reload();
    cy.get('#include-travellers').should('be.checked');
    cy.get('#character-sheet h3.team-travellers').should('exist');
  });

  it('assigned Traveller remains visible on player token even when disabled later', () => {
    // Enable travellers and assign one
    cy.get('#include-travellers').check({ force: true }).should('be.checked');
    startGameWithPlayers(5);
    cy.get('#player-circle li .player-token').eq(0).click();
    cy.get('#character-modal').should('be.visible');
    cy.get('#character-search').clear().type('Beggar');
    cy.get('#character-grid .token[title="Beggar"]').first().click();
    cy.get('#character-modal').should('not.be.visible');
    cy.get('#player-circle li .character-name').eq(0).should('contain', 'Beggar');

    // Now disable travellers
    cy.get('#include-travellers').uncheck({ force: true }).should('not.be.checked');
    // Character sheet travellers header should disappear
    cy.get('#character-sheet h3.team-travellers').should('not.exist');
    // Assigned role remains visible on token
    cy.get('#player-circle li .character-name').eq(0).should('contain', 'Beggar');
  });
});

