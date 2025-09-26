// Cypress E2E tests - Layout Toggle (Circle vs Toilet Bowl)

describe('Layout Toggle', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.viewport(1280, 900);
    cy.window().then((win) => {
      try { win.localStorage.clear(); } catch (_) { }
    });
    // Load a script and add players for testing
    cy.get('#load-tb').click();
    cy.get('#player-count').clear().type('8');
    cy.get('#add-players').click();
  });

  it('layout toggle button exists and shows initial state', () => {
    cy.get('#layout-toggle')
      .should('exist')
      .should('contain', 'Layout: Circle');
  });

  it('toggles between circle and toilet bowl layouts', () => {
    // Initially should be Circle
    cy.get('#layout-toggle').should('contain', 'Layout: Circle');

    // Click to switch to Toilet Bowl
    cy.get('#layout-toggle').click();
    cy.get('#layout-toggle').should('contain', 'Layout: Toilet Bowl');

    // Click again to switch back to Circle
    cy.get('#layout-toggle').click();
    cy.get('#layout-toggle').should('contain', 'Layout: Circle');
  });

  it('layout preference persists across page reloads', () => {
    // Switch to toilet bowl layout
    cy.get('#layout-toggle').click();
    cy.get('#layout-toggle').should('contain', 'Layout: Toilet Bowl');

    // Reload page
    cy.reload();

    // Load script and players again (since page reloaded)
    cy.get('#load-tb').click();
    cy.get('#player-count').clear().type('8');
    cy.get('#add-players').click();

    // Should remember toilet bowl setting
    cy.get('#layout-toggle').should('contain', 'Layout: Toilet Bowl');

    // Switch back to circle
    cy.get('#layout-toggle').click();
    cy.get('#layout-toggle').should('contain', 'Layout: Circle');

    // Reload again
    cy.reload();
    cy.get('#load-tb').click();
    cy.get('#player-count').clear().type('8');
    cy.get('#add-players').click();

    // Should remember circle setting
    cy.get('#layout-toggle').should('contain', 'Layout: Circle');
  });

  it('layout switching repositions players correctly', () => {
    // Get initial player positions (circle layout)
    cy.get('#player-circle li').first().then($player => {
      const initialPosition = {
        left: $player.css('left'),
        top: $player.css('top')
      };

      // Switch to toilet bowl layout
      cy.get('#layout-toggle').click();

      // Verify player position changed
      cy.get('#player-circle li').first().then($playerAfter => {
        const newPosition = {
          left: $playerAfter.css('left'),
          top: $playerAfter.css('top')
        };

        // Position should be different after layout change
        expect(newPosition.left).to.not.equal(initialPosition.left);
        expect(newPosition.top).to.not.equal(initialPosition.top);
      });
    });
  });

  it('works correctly with different player counts', () => {
    // Test with 6 players
    cy.get('#player-count').clear().type('6');
    cy.get('#player-circle li').should('have.length', 6);

    cy.get('#layout-toggle').click();
    cy.get('#layout-toggle').should('contain', 'Layout: Toilet Bowl');
    cy.get('#player-circle li').should('have.length', 6);

    // Test with 12 players
    cy.get('#player-count').clear().type('12');
    cy.get('#player-circle li').should('have.length', 12);

    cy.get('#layout-toggle').click();
    cy.get('#layout-toggle').should('contain', 'Layout: Circle');
    cy.get('#player-circle li').should('have.length', 12);
  });

  it('layout toggle works on mobile viewport', () => {
    cy.viewport(375, 812); // iPhone X dimensions

    // Open sidebar to access layout button
    cy.get('#sidebar-toggle').click();

    // Test layout toggle on mobile
    cy.get('#layout-toggle')
      .should('be.visible')
      .should('contain', 'Layout: Circle')
      .click();

    cy.get('#layout-toggle').should('contain', 'Layout: Toilet Bowl');

    // Close sidebar and verify layout still works
    cy.get('#sidebar-close').click();

    // Players should still be positioned correctly
    cy.get('#player-circle li').should('have.length', 8);
  });

  it('maintains existing player interaction functionality in both layouts', () => {
    // Test circle layout first
    cy.get('#player-circle li').first().find('.player-name').should('exist');
    cy.get('#player-circle li').first().find('.player-token').should('exist');

    // Switch to toilet bowl layout
    cy.get('#layout-toggle').click();

    // Verify same elements exist and are interactive
    cy.get('#player-circle li').first().find('.player-name').should('exist');
    cy.get('#player-circle li').first().find('.player-token').should('exist');

    // Test that player names are still editable
    cy.get('#player-circle li').first().find('.player-name').click();
    // Player name should be editable (this would normally open an edit dialog)
  });
});
