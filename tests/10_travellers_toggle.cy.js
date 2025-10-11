// Cypress E2E tests - Travellers toggle

const startGameWithPlayers = (n) => cy.setupGame({ players: n, loadScript: false });

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

  it('sidebar checkbox is unchecked by default and hides Travellers from sheet only', () => {
    cy.get('#include-travellers').should('exist').and('not.be.checked');
    cy.get('#character-sheet h3.team-travellers').should('not.exist');
  });

  it('modal checkbox is independent and defaults to unchecked, hiding Travellers from character grid', () => {
    startGameWithPlayers(5);
    cy.get('#player-circle li .player-token').first().click({ force: true });
    cy.get('#character-modal').should('be.visible');
    cy.get('#include-travellers-in-modal').should('exist').and('not.be.checked');
    cy.get('#character-search').clear().type('Beggar');
    cy.get('#character-grid .token[title="Beggar"]').should('not.exist');
    cy.get('#close-character-modal').click({ force: true });
    cy.get('#character-modal').should('not.be.visible');
  });

  it('sidebar checkbox shows Travellers in sheet only, not in modal', () => {
    cy.get('#include-travellers').check({ force: true }).should('be.checked');
    // Travellers header should appear in character sheet
    cy.get('#character-sheet h3.team-travellers').should('exist');
    cy.contains('#character-sheet .role .name', 'Beggar').should('exist');

    // Modal should still NOT show Beggar unless modal checkbox is checked
    startGameWithPlayers(5);
    cy.get('#player-circle li .player-token').eq(0).click({ force: true });
    cy.get('#character-modal').should('be.visible');
    cy.get('#include-travellers-in-modal').should('not.be.checked');
    cy.get('#character-search').clear().type('Beggar');
    cy.get('#character-grid .token[title="Beggar"]').should('not.exist');
    cy.get('#close-character-modal').click({ force: true });
  });

  it('modal checkbox shows Travellers in character grid when enabled; persists across modal opens', () => {
    startGameWithPlayers(5);
    cy.get('#player-circle li .player-token').eq(0).click({ force: true });
    cy.get('#character-modal').should('be.visible');

    // Enable modal travellers checkbox
    cy.get('#include-travellers-in-modal').check({ force: true }).should('be.checked');
    cy.get('#character-search').clear().type('Beggar');
    cy.get('#character-grid .token[title="Beggar"]').first().should('exist');
    cy.get('#close-character-modal').click({ force: true });

    // Reopen modal and verify checkbox state persists
    cy.get('#player-circle li .player-token').eq(1).click({ force: true });
    cy.get('#character-modal').should('be.visible');
    cy.get('#include-travellers-in-modal').should('be.checked');
    cy.get('#character-search').clear().type('Beggar');
    cy.get('#character-grid .token[title="Beggar"]').first().should('exist');
    cy.get('#close-character-modal').click({ force: true });
  });

  it('sidebar checkbox state persists across reload', () => {
    cy.get('#include-travellers').check({ force: true }).should('be.checked');
    cy.get('#character-sheet h3.team-travellers').should('exist');

    // Persist across reload
    cy.reload();
    cy.get('#include-travellers').should('be.checked');
    cy.get('#character-sheet h3.team-travellers').should('exist');
  });

  it('assigned Traveller remains visible on player token regardless of checkboxes', () => {
    // Enable modal checkbox and assign traveller
    startGameWithPlayers(5);
    cy.get('#player-circle li .player-token').eq(0).click({ force: true });
    cy.get('#character-modal').should('be.visible');
    cy.get('#include-travellers-in-modal').check({ force: true }).should('be.checked');
    cy.get('#character-search').clear().type('Beggar');
    cy.get('#character-grid .token[title="Beggar"]').first().click({ force: true });
    cy.get('#character-modal').should('not.be.visible');
    cy.get('#player-circle li .character-name').eq(0).should('contain', 'Beggar');

    // Disable sidebar travellers - assigned role still visible
    cy.get('#include-travellers').should('not.be.checked');
    cy.get('#character-sheet h3.team-travellers').should('not.exist');
    cy.get('#player-circle li .character-name').eq(0).should('contain', 'Beggar');
  });
});
