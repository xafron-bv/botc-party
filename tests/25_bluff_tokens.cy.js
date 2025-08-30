describe('Bluff Tokens', () => {
  beforeEach(() => {
    cy.visit('/');
    // Start a game with 10 players
    cy.get('#player-count').clear().type('10');
    cy.get('#start-game').click();
    // Load Trouble Brewing script
    cy.get('#load-tb').click();
    cy.get('#load-status', { timeout: 10000 }).should('contain', 'successfully');
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
    cy.get('#bluff-tokens-container .bluff-token').first().click();

    // Verify character modal opens
    cy.get('#character-modal').should('be.visible');

    // Verify modal title indicates it's for bluff selection
    cy.get('#character-modal h3').should('contain', 'Select Bluff');

    // Character grid should be populated
    cy.get('#character-grid .token').should('have.length.greaterThan', 0);
  });

  it('should assign a character to bluff token when selected', () => {
    // Click first bluff token
    cy.get('#bluff-tokens-container .bluff-token').first().click();

    // Select a specific character (e.g., Baron)
    cy.get('#character-search').type('baron');
    cy.get('#character-grid .token').first().click();

    // Verify modal closes
    cy.get('#character-modal').should('not.be.visible');

    // Verify bluff token now shows the selected character
    cy.get('#bluff-tokens-container .bluff-token').first()
      .should('not.have.class', 'empty')
      .should('have.class', 'has-character');

    // Check that the Baron's image is displayed
    cy.get('#bluff-tokens-container .bluff-token').first()
      .should('have.attr', 'data-character', 'baron');
  });

  it('should allow clearing a bluff token by selecting "None"', () => {
    // First assign a character
    cy.get('#bluff-tokens-container .bluff-token').first().click();
    cy.get('#character-search').type('baron');
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
    // Assign different characters to each bluff token
    const characters = ['baron', 'poisoner', 'spy'];

    characters.forEach((character, index) => {
      cy.get('#bluff-tokens-container .bluff-token').eq(index).click();
      cy.get('#character-search').clear().type(character);
      cy.get('#character-grid .token').first().click();

      // Verify assignment
      cy.get('#bluff-tokens-container .bluff-token').eq(index)
        .should('have.attr', 'data-character', character);
    });

    // Verify all three have different characters
    cy.get('#bluff-tokens-container .bluff-token[data-character="baron"]').should('exist');
    cy.get('#bluff-tokens-container .bluff-token[data-character="poisoner"]').should('exist');
    cy.get('#bluff-tokens-container .bluff-token[data-character="spy"]').should('exist');
  });

  it('should show tooltips with character info on hover', () => {
    // Assign a character first
    cy.get('#bluff-tokens-container .bluff-token').first().click();
    cy.get('#character-search').type('baron');
    cy.get('#character-grid .token').first().click();

    // Hover over the bluff token
    cy.get('#bluff-tokens-container .bluff-token').first().trigger('mouseenter');

    // Check for tooltip
    cy.get('#ability-tooltip').should('be.visible');
    cy.get('#ability-tooltip').should('contain', 'Baron');
  });

  it('should persist bluff tokens when saving and loading grimoire state', () => {
    // Assign characters to bluff tokens
    const characters = ['baron', 'poisoner', 'spy'];

    characters.forEach((character, index) => {
      cy.get('#bluff-tokens-container .bluff-token').eq(index).click();
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
    cy.get('#bluff-tokens-container .bluff-token').first().click();
    cy.get('#character-search').type('baron');
    cy.get('#character-grid .token').first().click();

    // Start a new game - sidebar should already be visible
    cy.get('#player-count').clear().type('12');
    cy.get('#start-game').click();

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
    cy.get('#character-search').type('baron');
    cy.get('#character-grid .token').first().click();

    // Verify assignment works on mobile
    cy.get('#bluff-tokens-container .bluff-token').first()
      .should('have.attr', 'data-character', 'baron');
  });

  it('should style bluff tokens distinctly from player tokens', () => {
    // Check that bluff tokens have specific styling
    cy.get('#bluff-tokens-container .bluff-token').first().then($token => {
      const styles = window.getComputedStyle($token[0]);

      // Should have a different border or indicator to distinguish from player tokens
      expect(styles.borderStyle).to.not.equal('none');

      // Should be smaller than player tokens - get player token for comparison
      const bluffSize = parseInt(styles.width, 10);

      cy.get('.player-token').first().then($playerToken => {
        const playerSize = parseInt(window.getComputedStyle($playerToken[0]).width, 10);
        expect(bluffSize).to.be.lessThan(playerSize);
      });
    });
  });

  it('should not interfere with player token interactions', () => {
    // Assign a character to a player
    cy.get('#player-circle li').first().find('.player-token').click();
    cy.get('#character-search').type('washerwoman');
    cy.get('#character-grid .token').first().click();

    // Assign a character to a bluff token
    cy.get('#bluff-tokens-container .bluff-token').first().click();
    cy.get('#character-search').type('baron');
    cy.get('#character-grid .token').first().click();

    // Verify both assignments are independent
    cy.get('#player-circle li').first().find('.player-token')
      .should('have.css', 'background-image')
      .and('include', 'washerwoman');

    cy.get('#bluff-tokens-container .bluff-token').first()
      .should('have.attr', 'data-character', 'baron');
  });

  it('should work with different scripts', () => {
    // Load a different script - sidebar should already be visible from beforeEach
    cy.get('#load-bmr').click();
    cy.get('#load-status', { timeout: 10000 }).should('contain', 'successfully');

    // Close sidebar to interact with bluff tokens
    cy.get('#sidebar-close').click();

    // Verify bluff tokens still work
    cy.get('#bluff-tokens-container .bluff-token').first().click();
    cy.get('#character-modal').should('be.visible');

    // Character grid should show Bad Moon Rising characters
    cy.get('#character-search').type('zombuul');
    cy.get('#character-grid .token').should('have.length.greaterThan', 0);
  });
});
