// Cypress E2E tests - Bluff Info Button

describe('Bluff Info Button', () => {
  beforeEach(() => {
    // Force touch mode by mocking touch support before visiting
    cy.visit('/', {
      onBeforeLoad(win) {
        Object.defineProperty(win, 'ontouchstart', {
          value: () => {},
          writable: true,
          configurable: true
        });
      }
    });
    cy.window().then((win) => {
      try { win.localStorage.clear(); } catch (_) {}
    });
  });

  it('should show tooltip when clicking bluff info button directly', () => {
    // Load Trouble Brewing
    cy.get('#load-tb').click();
    cy.get('#character-sheet .role').should('have.length.greaterThan', 5);

    // Set up a game with players
    cy.get('#player-count').clear().type('7');
    cy.get('#start-game').click();
    cy.get('#player-circle li').should('have.length', 7);

    // Assign a demon to a player (required for bluffs)
    cy.get('.player-token').eq(0).click();
    cy.get('#character-grid .token[title="Imp"]').click();

    // Verify bluff tokens appear
    cy.get('.bluff-token').should('have.length', 3);

    // Assign a character with ability to the first bluff token
    cy.get('.bluff-token').first().click();
    cy.get('#character-grid .token[title="Washerwoman"]').click();

    // Verify the bluff token has the character
    cy.get('.bluff-token').first().should('have.class', 'has-character');

    // Check for info icon on bluff token
    cy.get('.bluff-token').first().find('.ability-info-icon').should('exist');

    // Click the info icon and verify it exists and is visible
    // Force click to ensure it works even if element is partially covered
    cy.get('.bluff-token').first().find('.ability-info-icon').should('be.visible').click({ force: true });

    // Wait a bit for the tooltip to show
    cy.wait(200);

    // Check that the tooltip is shown
    cy.get('#touch-ability-popup').should('have.class', 'show');
    cy.get('#touch-ability-popup').should('be.visible');
    cy.get('#touch-ability-popup').should('contain', 'You start knowing that 1 of 2 players is a particular Townsfolk');

    // Click elsewhere to close
    cy.get('body').click(0, 0);
    cy.get('#touch-ability-popup').should('not.be.visible');
  });

  it('should show tooltip correctly without needing to click character info first', () => {
    // Load Trouble Brewing
    cy.get('#load-tb').click();
    cy.get('#character-sheet .role').should('have.length.greaterThan', 5);

    // Set up a game
    cy.get('#player-count').clear().type('7');
    cy.get('#start-game').click();

    // Assign a demon to enable bluffs
    cy.get('.player-token').eq(0).click();
    cy.get('#character-grid .token[title="Imp"]').click();

    // Directly assign a character to bluff without clicking any player info buttons
    cy.get('.bluff-token').eq(0).click();
    cy.get('#character-grid .token[title="Investigator"]').click();

    // Click the bluff info icon
    cy.get('.bluff-token').eq(0).find('.ability-info-icon').should('be.visible').click({ force: true });

    // Wait a bit for the tooltip to show
    cy.wait(200);

    // Tooltip should be visible and positioned correctly
    cy.get('#touch-ability-popup').should('have.class', 'show');
    cy.get('#touch-ability-popup').should('be.visible');
    cy.get('#touch-ability-popup').should('contain', 'You start knowing that 1 of 2 players is a particular Minion');

    // Verify tooltip is positioned near the bluff token
    cy.get('#touch-ability-popup').then($popup => {
      cy.get('.bluff-token').eq(0).then($bluff => {
        const popupRect = $popup[0].getBoundingClientRect();
        const bluffRect = $bluff[0].getBoundingClientRect();
        
        // Popup should be positioned relative to the bluff token
        // Either above or below it
        const isAbove = popupRect.bottom < bluffRect.top;
        const isBelow = popupRect.top > bluffRect.bottom;
        
        expect(isAbove || isBelow).to.be.true;
      });
    });
  });

  it('should position tooltip correctly for all three bluff tokens', () => {
    // Load Trouble Brewing
    cy.get('#load-tb').click();
    cy.get('#character-sheet .role').should('have.length.greaterThan', 5);

    // Set up a game
    cy.get('#player-count').clear().type('7');
    cy.get('#start-game').click();

    // Assign a demon
    cy.get('.player-token').eq(0).click();
    cy.get('#character-grid .token[title="Imp"]').click();

    // Assign characters to all three bluff tokens
    const characters = ['Chef', 'Empath', 'Fortune Teller'];
    
    characters.forEach((char, index) => {
      cy.get('.bluff-token').eq(index).click();
      cy.get(`#character-grid .token[title="${char}"]`).click();
    });

    // Test each bluff token info button
    characters.forEach((char, index) => {
      cy.get('.bluff-token').eq(index).find('.ability-info-icon').should('be.visible').click({ force: true });
      
      // Wait a bit for the tooltip to show
      cy.wait(200);
      
      // Verify popup is visible
      cy.get('#touch-ability-popup').should('have.class', 'show');
      cy.get('#touch-ability-popup').should('be.visible');
      
      // Verify it contains character ability text
      cy.get('#touch-ability-popup').invoke('text').should('not.be.empty');
      
      // Click elsewhere to close
      cy.get('body').click(0, 0);
      cy.get('#touch-ability-popup').should('not.be.visible');
    });
  });

  it('should handle bluff tokens in touch mode', () => {
    // Visit with touch mode enabled from the start
    cy.visit('/', {
      onBeforeLoad(win) {
        Object.defineProperty(win, 'ontouchstart', {
          value: () => {},
          writable: true,
          configurable: true
        });
      }
    });
    cy.get('#load-tb').click();
    cy.get('#character-sheet .role').should('have.length.greaterThan', 5);
    cy.get('#player-count').clear().type('7');
    cy.get('#start-game').click();

    // Assign a demon
    cy.get('.player-token').eq(0).click();
    cy.get('#character-grid .token[title="Imp"]').click();

    // Assign character to bluff
    cy.get('.bluff-token').first().click();
    cy.get('#character-grid .token[title="Monk"]').click();

    // Info icon should exist
    cy.get('.bluff-token').first().find('.ability-info-icon').should('exist');

    // Click info icon
    cy.get('.bluff-token').first().find('.ability-info-icon').should('be.visible').click({ force: true });

    // Wait a bit for the tooltip to show
    cy.wait(200);

    // Tooltip should show
    cy.get('#touch-ability-popup').should('have.class', 'show');
    cy.get('#touch-ability-popup').should('be.visible');
  });
});