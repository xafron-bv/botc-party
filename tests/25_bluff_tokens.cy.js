describe('Bluff Tokens', () => {
  beforeEach(() => {
    cy.clearAllSessionStorage();
    cy.clearAllLocalStorage();
    cy.clearAllCookies();
    cy.visit('/');
    // Load Trouble Brewing and start game with 10 players via helper (handles pre-game gating)
    cy.get('#load-tb').click({ force: true });
    cy.get('#load-status', { timeout: 10000 }).should('contain', 'successfully');
    cy.setupGame({ players: 10, loadScript: false });
  });

  it('should display three empty bluff token slots at bottom left', () => {
    // Check that bluff tokens container exists
    cy.get('#bluff-tokens-container').should('be.visible');

    // Verify it's positioned at bottom left
    cy.get('#bluff-tokens-container').should('have.css', 'position', 'absolute');
    cy.get('#bluff-tokens-container').should('have.css', 'bottom');
    cy.get('#bluff-tokens-container').should('have.css', 'left');

    // Check for exactly 3 bluff token slots
    cy.get('#bluff-tokens-container .bluff-token').should('have.length', 3);

    // Each bluff token should have empty appearance initially
    cy.get('#bluff-tokens-container .bluff-token').each(($token) => {
      cy.wrap($token).should('have.class', 'empty');
      cy.wrap($token).should('have.css', 'background-image');
    });
  });

  it('should open character selection modal when clicking a bluff token', () => {
    // Click the first bluff token
    cy.get('#bluff-tokens-container .bluff-token').first().click({ force: true });

    // Verify character modal opens
    cy.get('#character-modal').should('be.visible');

    // Verify modal title indicates it's for bluff selection
    cy.get('#character-modal h3').should('contain', 'Select Bluff');

    // Character grid should be populated
    cy.get('#character-grid .token').should('have.length.greaterThan', 0);
  });

  it('should assign a character to bluff token when selected', () => {
    // Click first bluff token
    cy.get('#bluff-tokens-container .bluff-token').first().click({ force: true });

    // Select a specific character (e.g., Washerwoman - a townsfolk)
    cy.get('#character-search').type('washerwoman');
    cy.get('#character-grid .token').first().click();

    // Verify modal closes
    cy.get('#character-modal').should('not.be.visible');

    // Verify bluff token now shows the selected character
    cy.get('#bluff-tokens-container .bluff-token').first()
      .should('not.have.class', 'empty')
      .should('have.class', 'has-character');

    // Check that the Washerwoman's image is displayed
    cy.get('#bluff-tokens-container .bluff-token').first()
      .should('have.attr', 'data-character', 'washerwoman');
  });

  it('should allow clearing a bluff token by selecting "None"', () => {
    // First assign a character
    cy.get('#bluff-tokens-container .bluff-token').first().click({ force: true });
    cy.get('#character-search').type('washerwoman');
    cy.get('#character-grid .token').first().click();

    // Verify character is assigned
    cy.get('#bluff-tokens-container .bluff-token').first()
      .should('have.class', 'has-character');

    // Click the bluff token again to change it
    cy.get('#bluff-tokens-container .bluff-token').first().click();

    // Select "None" option
    cy.get('#character-search').clear().type('none');
    cy.get('#character-grid .token.empty').click();

    // Verify bluff token is cleared
    cy.get('#bluff-tokens-container .bluff-token').first()
      .should('have.class', 'empty')
      .should('not.have.class', 'has-character');
  });

  it('should maintain independent state for each bluff token', () => {
    // Assign different townsfolk/outsider characters to each bluff token
    const characters = ['washerwoman', 'librarian', 'butler'];

    characters.forEach((character, index) => {
      cy.get('#bluff-tokens-container .bluff-token').eq(index).click({ force: true });
      cy.get('#character-search').clear().type(character);
      cy.get('#character-grid .token').first().click();

      // Verify assignment
      cy.get('#bluff-tokens-container .bluff-token').eq(index)
        .should('have.attr', 'data-character', character);
    });

    // Verify all three have different characters
    cy.get('#bluff-tokens-container .bluff-token[data-character="washerwoman"]').should('exist');
    cy.get('#bluff-tokens-container .bluff-token[data-character="librarian"]').should('exist');
    cy.get('#bluff-tokens-container .bluff-token[data-character="butler"]').should('exist');
  });

  it('should only show townsfolk and outsiders when selecting bluffs', () => {
    // Open bluff selector
    cy.get('#bluff-tokens-container .bluff-token').first().click({ force: true });
    cy.get('#character-modal').should('be.visible');

    // Search for a demon character (should not appear)
    cy.get('#character-search').clear().type('imp');
    cy.get('#character-grid .token[data-token-id="imp"]').should('not.exist');

    // Search for a minion character (should not appear)
    cy.get('#character-search').clear().type('baron');
    cy.get('#character-grid .token[data-token-id="baron"]').should('not.exist');

    // Search for a traveller character (should not appear)
    cy.get('#character-search').clear().type('scapegoat');
    cy.get('#character-grid .token[data-token-id="scapegoat"]').should('not.exist');

    // Search for a townsfolk character (should appear)
    cy.get('#character-search').clear().type('washerwoman');
    cy.get('#character-grid .token[data-token-id="washerwoman"]').should('exist');

    // Search for an outsider character (should appear)
    cy.get('#character-search').clear().type('butler');
    cy.get('#character-grid .token[data-token-id="butler"]').should('exist');
  });

  it('should allow hiding in-play characters when selecting bluffs', () => {
    // Assign washerwoman to first player
    cy.get('#player-circle li').first().find('.player-token').click({ force: true });
    cy.get('#character-search').clear().type('washerwoman');
    cy.get('#character-grid .token[data-token-id="washerwoman"]').first().click();

    // Open bluff selector
    cy.get('#bluff-tokens-container .bluff-token').first().click({ force: true });
    cy.get('#character-modal').should('be.visible');

    // Hide-in-play checkbox should be visible and checked by default
    cy.get('#hide-in-play').should('be.visible').and('be.checked');

    // Washerwoman should be filtered out
    cy.get('#character-search').clear().type('washerwoman');
    cy.get('#character-grid .token[data-token-id="washerwoman"]').should('not.exist');

    // Uncheck to show in-play characters
    cy.get('#hide-in-play').uncheck();
    cy.get('#character-grid .token[data-token-id="washerwoman"]').should('exist');

    // Check again to hide
    cy.get('#hide-in-play').check();
    cy.get('#character-grid .token[data-token-id="washerwoman"]').should('not.exist');
  });

  it('should show ability info via bluff token info icon', () => {
    // Assign a character first
    cy.get('#bluff-tokens-container .bluff-token').first().click({ force: true });
    cy.get('#character-search').type('washerwoman');
    cy.get('#character-grid .token').first().click();

    // Info icon should display the ability popup
    cy.get('#bluff-tokens-container .bluff-token').first().find('.ability-info-icon').should('exist').click({ force: true });
    cy.get('#touch-ability-popup').should('have.class', 'show')
      .and('contain', 'You start knowing that 1 of 2 players is a particular Townsfolk');
    cy.get('body').click('topLeft');
    cy.get('#touch-ability-popup').should('not.have.class', 'show');
  });

  it('should persist bluff tokens when saving and loading grimoire state', () => {
    // Assign townsfolk/outsider characters to bluff tokens
    const characters = ['washerwoman', 'librarian', 'butler'];

    characters.forEach((character, index) => {
      cy.get('#bluff-tokens-container .bluff-token').eq(index).click({ force: true });
      cy.get('#character-search').clear().type(character);
      cy.get('#character-grid .token').first().click();
    });

    // Reload the page (state should be auto-saved)
    cy.reload();

    // Wait for grimoire to load
    cy.get('#player-circle', { timeout: 10000 }).should('be.visible');

    // Verify bluff tokens are restored
    characters.forEach((character, index) => {
      cy.get('#bluff-tokens-container .bluff-token').eq(index)
        .should('have.attr', 'data-character', character);
    });
  });

  it('should reset bluff tokens when starting a new game', () => {
    // Assign a character to a bluff token
    cy.get('#bluff-tokens-container .bluff-token').first().click({ force: true });
    cy.get('#character-search').type('washerwoman');
    cy.get('#character-grid .token').first().click();

    // Start a new game - sidebar should already be visible
    cy.setupGame({ players: 12, loadScript: false });

    // Verify bluff tokens are reset
    cy.get('#bluff-tokens-container .bluff-token').each(($token) => {
      cy.wrap($token).should('have.class', 'empty');
      cy.wrap($token).should('not.have.attr', 'data-character');
    });
  });

  it('should handle touch interactions on mobile', () => {
    // Set mobile viewport
    cy.viewport('iphone-x');

    // On mobile, the regular click should still work due to our touch handler
    cy.get('#bluff-tokens-container .bluff-token').first().click({ force: true });

    // Verify character modal opens
    cy.get('#character-modal').should('be.visible');

    // Select a character
    cy.get('#character-search').type('washerwoman');
    cy.get('#character-grid .token').first().click();

    // Verify assignment works on mobile
    cy.get('#bluff-tokens-container .bluff-token').first()
      .should('have.attr', 'data-character', 'washerwoman');
  });

  it('should not interfere with player token interactions', () => {
    // Assign a character to a player
    cy.get('#player-circle li').first().find('.player-token').click({ force: true });
    cy.get('#character-modal').should('be.visible');
    cy.get('#character-search').should('be.visible').type('washerwoman', { force: true });
    cy.get('#character-grid .token').first().click();

    // Assign a character to a bluff token (must be townsfolk/outsider)
    cy.get('#bluff-tokens-container .bluff-token').first().click({ force: true });
    cy.get('#character-modal').should('be.visible');
    cy.get('#character-search').should('be.visible').clear().type('librarian', { force: true });
    cy.get('#character-grid .token').first().click();

    // Verify both assignments are independent
    cy.get('#player-circle li').first().find('.player-token')
      .should('have.css', 'background-image')
      .and('include', 'washerwoman');

    cy.get('#bluff-tokens-container .bluff-token').first()
      .should('have.attr', 'data-character', 'librarian');
  });

  it('should work with different scripts', () => {
    // Load a different script - sidebar should already be visible from beforeEach
    cy.get('#load-bmr').click();
    cy.get('#load-status', { timeout: 10000 }).should('contain', 'successfully');

    // Close sidebar to interact with bluff tokens
    cy.get('#sidebar-close').click();

    // Verify bluff tokens still work
    cy.get('#bluff-tokens-container .bluff-token').first().click({ force: true });
    cy.get('#character-modal').should('be.visible');

    // Character grid should show Bad Moon Rising townsfolk/outsiders only (not demons like Zombuul)
    cy.get('#character-search').type('chambermaid');
    cy.get('#character-grid .token').should('have.length.greaterThan', 0);
  });
});
