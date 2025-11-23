describe('Night Order Display', () => {
  beforeEach(() => {
    cy.visit('/?test=true');
    cy.viewport(1280, 900);
    cy.window().then((win) => { try { win.localStorage.clear(); } catch (_) { } });
    cy.setupGame({ players: 7, loadScript: true });
  });

  describe('Night Order Numbers', () => {
    beforeEach(() => {
      // Enable day/night tracking
      cy.get('[data-testid="day-night-toggle"]').click({ force: true });

      // Assign characters with different night orders
      // Assign Imp (demon with night order) to player 1
      cy.get('.player-token').eq(0).click({ force: true });
      cy.get('#character-modal').should('be.visible');
      cy.get('#character-grid .token').should('be.visible');
      cy.get('#character-grid .token[title="Imp"]').click();
      cy.get('#character-modal').should('not.be.visible');

      // Assign Empath (townsfolk with first night order) to player 2
      cy.get('.player-token').eq(1).click({ force: true });
      cy.get('#character-grid .token').should('be.visible');
      cy.get('#character-grid .token[title="Empath"]').click();

      // Assign Poisoner (minion with night order) to player 3
      cy.get('.player-token').eq(2).click({ force: true });
      cy.get('#character-grid .token').should('be.visible');
      cy.get('#character-grid .token[title="Poisoner"]').click();

      // Assign Soldier (no night order) to player 4
      cy.get('.player-token').eq(3).click({ force: true });
      cy.get('#character-grid .token').should('be.visible');
      cy.get('#character-grid .token[title="Soldier"]').click();

      // Assign Fortune Teller (townsfolk with night order) to player 5
      cy.get('.player-token').eq(4).click({ force: true });
      cy.get('#character-grid .token').should('be.visible');
      cy.get('#character-grid .token[title="Fortune Teller"]').click();
    });

    it('should not show night order numbers when night slider is closed', () => {
      // Disable day/night tracking to close slider
      cy.get('[data-testid="day-night-toggle"]').click({ force: true });

      // Night order numbers should not be visible
      cy.get('[data-testid="night-order-number"]').should('not.exist');
    });

    it('should show night order numbers when night slider is open during night phase', () => {
      // Should be on N1 (night phase)
      cy.get('[data-testid="current-phase"]').should('contain', 'N1');

      // Night order numbers should be visible for characters that wake at night
      // Check Empath (first night order 36)
      cy.get('.player-token').eq(1).find('[data-testid="night-order-number"]').should('exist');

      // Check Poisoner (first night order 17)
      cy.get('.player-token').eq(2).find('[data-testid="night-order-number"]').should('exist');

      // Check Fortune Teller (first night order 37)
      cy.get('.player-token').eq(4).find('[data-testid="night-order-number"]').should('exist');

      // Soldier should not have a night order number (no night ability)
      cy.get('.player-token').eq(3).find('[data-testid="night-order-number"]').should('not.exist');

      // Imp has no first night order (firstNight: 0)
      // Debug: Check if Imp actually got assigned
      cy.get('.player-token').eq(0).should('have.attr', 'style').and('include', 'imp');
      cy.get('.player-token').eq(0).within(() => {
        cy.get('[data-testid="night-order-number"]').should('not.exist');
      });
    });

    it('should show correct order numbers from 1 to n for characters with night abilities', () => {
      // On N1, check that numbers are sequential from 1 to n
      // Get all night order numbers and check they're sequential
      cy.get('[data-testid="night-order-number"]').then($numbers => {
        const numbers = [];
        $numbers.each((_, el) => {
          numbers.push(parseInt(el.textContent, 10));
        });

        // Sort the numbers to check they're sequential
        numbers.sort((a, b) => a - b);

        // Should start from 1
        expect(numbers[0]).to.equal(1);

        // Should be sequential
        for (let i = 1; i < numbers.length; i++) {
          expect(numbers[i]).to.equal(numbers[i - 1] + 1);
        }
      });
    });

    it('should update night order numbers when moving to other nights', () => {
      // Move to D1
      cy.get('[data-testid="add-phase-button"]').click();
      cy.get('[data-testid="current-phase"]').should('contain', 'D1');

      // No night order numbers during day
      cy.get('[data-testid="night-order-number"]').should('not.exist');

      // Move to N2
      cy.get('[data-testid="add-phase-button"]').click();
      cy.get('[data-testid="current-phase"]').should('contain', 'N2');

      // Now check "other night" orders
      // Empath (other night order 53)
      cy.get('.player-token').eq(1).find('[data-testid="night-order-number"]').should('exist');

      // Poisoner (other night order 8)
      cy.get('.player-token').eq(2).find('[data-testid="night-order-number"]').should('exist');

      // Fortune Teller (other night order 54)
      cy.get('.player-token').eq(4).find('[data-testid="night-order-number"]').should('exist');

      // Imp now has other night order (24)
      cy.get('.player-token').eq(0).find('[data-testid="night-order-number"]').should('exist');

      // Soldier still has no night order
      cy.get('.player-token').eq(3).find('[data-testid="night-order-number"]').should('not.exist');
    });

    it('should not show night order numbers during day phases', () => {
      // Move to D1
      cy.get('[data-testid="add-phase-button"]').click();
      cy.get('[data-testid="current-phase"]').should('contain', 'D1');

      // No night order numbers should be visible
      cy.get('[data-testid="night-order-number"]').should('not.exist');
    });

    it('should hide night order numbers when disabling day/night tracking', () => {
      // Verify numbers are showing
      cy.get('[data-testid="night-order-number"]').should('exist');

      // Disable tracking
      cy.get('[data-testid="day-night-toggle"]').click({ force: true });

      // Numbers should be hidden
      cy.get('[data-testid="night-order-number"]').should('not.exist');
    });

    it('should position night order numbers nicely on the character token', () => {
      // Check that night order numbers are positioned correctly
      cy.get('[data-testid="night-order-number"]').first().then($el => {
        const styles = window.getComputedStyle($el[0]);

        // Should be positioned absolutely within the token
        expect(styles.position).to.equal('absolute');

        // Should be visible and styled appropriately
        expect(styles.display).to.not.equal('none');
        expect(styles.visibility).to.not.equal('hidden');

        // Should have appropriate styling for readability
        expect(styles.backgroundColor).to.exist;
        expect(styles.color).to.exist;
        expect(styles.borderRadius).to.exist;
      });
    });

    it('should position night order numbers to avoid overlap with ability info icons in touch mode', () => {
      // Force touch mode
      cy.window().then(win => {
        // Mock touch support
        Object.defineProperty(win, 'ontouchstart', {
          value: () => { },
          writable: true
        });
      });

      // Reload to apply touch mode
      cy.reload();
      // Use shared helper to reinitialize game post reload
      cy.setupGame({ players: 7, loadScript: true });
      cy.get('[data-testid="day-night-toggle"]').click({ force: true });

      // Assign Fortune Teller (has night order)
      cy.get('.player-token').eq(0).click({ force: true });
      cy.get('#character-modal').should('be.visible');
      cy.get('#character-grid .token[title="Fortune Teller"]').should('be.visible').click();

      // Check that night order number exists
      cy.get('.player-token').eq(0).find('[data-testid="night-order-number"]').should('exist');

      // In touch mode, night order numbers should be positioned dynamically
      // Get the position to ensure it's properly placed
      cy.get('.player-token').eq(0).find('[data-testid="night-order-number"]').then($order => {
        const orderRect = $order[0].getBoundingClientRect();
        const tokenRect = $order.parent()[0].getBoundingClientRect();

        // In touch mode, the positioning is done via JavaScript in positionNightOrderNumbers
        // Check that the element is positioned appropriately
        const styles = window.getComputedStyle($order[0]);

        // The night order should be positioned relative to the token center
        // Either via CSS transform OR via dynamic left/top positioning from JS
        const hasTransform = styles.transform !== 'none';
        const hasDynamicPosition = styles.left !== 'auto' && styles.top !== 'auto';

        expect(hasTransform || hasDynamicPosition).to.be.true;

        // Verify it's positioned outside the token area
        const centerX = tokenRect.left + tokenRect.width / 2;
        const centerY = tokenRect.top + tokenRect.height / 2;
        const orderCenterX = orderRect.left + orderRect.width / 2;
        const orderCenterY = orderRect.top + orderRect.height / 2;

        // Calculate distance from token center
        const distance = Math.sqrt(
          Math.pow(orderCenterX - centerX, 2) +
          Math.pow(orderCenterY - centerY, 2)
        );

        // Should be positioned near the edge of the token
        expect(distance).to.be.greaterThan(tokenRect.width * 0.4);
      });
    });

    it('should show demon and minion reminder buttons for night setup info', () => {
      const bluffs = [
        { id: 'washerwoman', name: 'Washerwoman' },
        { id: 'librarian', name: 'Librarian' },
        { id: 'investigator', name: 'Investigator' }
      ];

      bluffs.forEach((bluff, index) => {
        cy.get('#bluff-tokens-container .bluff-token').eq(index).click({ force: true });
        cy.get('#character-modal').should('be.visible');
        cy.get('#character-search').clear().type(bluff.name);
        cy.get(`#character-grid .token[data-token-id="${bluff.id}"]`).first().click();
        cy.get('#character-modal').should('not.be.visible');
      });

      // Demon should have bluff and minion reminder buttons
      cy.get('.player-token').eq(0).within(() => {
        cy.get('[data-testid="night-reminder-bluffs"]').should('contain', 'B');
        cy.get('[data-testid="night-reminder-minions"]').should('contain', 'M');
      });

      // Other players should not show these demon-specific buttons
      cy.get('.player-token').eq(1).within(() => {
        cy.get('[data-testid="night-reminder-bluffs"]').should('not.exist');
        cy.get('[data-testid="night-reminder-minions"]').should('not.exist');
      });

      // Minion should have demon reminder button
      cy.get('.player-token').eq(2).within(() => {
        cy.get('[data-testid="night-reminder-demon"]').should('contain', 'D');
      });

      // Clicking demon bluff reminder should show bluff names
      cy.get('.player-token').eq(0).find('[data-testid="night-reminder-bluffs"]').click({ force: true });
      cy.get('#storyteller-message-display').should('be.visible');
      cy.get('#storyteller-message-display .message-text').invoke('text').should('eq', 'THESE CHARACTERS ARE NOT IN PLAY');
      cy.get('#storyteller-slots-display .token').should('have.length', 3);
      cy.get('#storyteller-slots-display .token').then(($slots) => {
        const roleIds = Array.from($slots, (el) => el.getAttribute('data-role-id'));
        ['washerwoman', 'librarian', 'investigator'].forEach((id) => {
          expect(roleIds).to.include(id);
        });
      });
      cy.get('#close-storyteller-message-display').click();
      cy.get('#storyteller-message-display').should('not.be.visible');

      // Clicking demon minion reminder should show these are your minions message
      cy.get('.player-token').eq(0).find('[data-testid="night-reminder-minions"]').click({ force: true });
      cy.get('#storyteller-message-display').should('be.visible');
      cy.get('#storyteller-message-display .message-text').invoke('text').should('eq', 'THESE ARE YOUR MINIONS');
      cy.get('#storyteller-slots-display .token').should('have.length', 0);
      cy.get('#close-storyteller-message-display').click();
      cy.get('#storyteller-message-display').should('not.be.visible');

      // Clicking minion demon reminder should show this is the demon message
      cy.get('.player-token').eq(2).find('[data-testid="night-reminder-demon"]').click({ force: true });
      cy.get('#storyteller-message-display').should('be.visible');
      cy.get('#storyteller-message-display .message-text').invoke('text').should('eq', 'THIS IS THE DEMON');
      cy.get('#storyteller-slots-display .token').should('have.length', 0);
      cy.get('#close-storyteller-message-display').click();
      cy.get('#storyteller-message-display').should('not.be.visible');
    });
  });

  describe('Night Order with Different Scripts', () => {
    it('should handle characters from different scripts correctly', () => {
      // Load Sects & Violets script
      cy.get('#load-sav').click();
      cy.get('#character-sheet .role').should('have.length.greaterThan', 5);

      // Enable day/night tracking
      cy.get('[data-testid="day-night-toggle"]').click({ force: true });

      // Assign Vortox (demon with night order) to player 1
      cy.get('.player-token').eq(0).click({ force: true });
      cy.get('#character-grid .token').should('be.visible');
      cy.get('#character-grid .token[title="Vortox"]').click();

      // Assign Dreamer (townsfolk with night order) to player 2
      cy.get('.player-token').eq(1).click({ force: true });
      cy.get('#character-grid .token').should('be.visible');
      cy.get('#character-grid .token[title="Dreamer"]').click();

      // Check that night order numbers appear correctly
      cy.get('[data-testid="current-phase"]').should('contain', 'N1');

      // Vortox has no first night order
      cy.get('.player-token').eq(0).find('[data-testid="night-order-number"]').should('not.exist');

      // Dreamer has first night order
      cy.get('.player-token').eq(1).find('[data-testid="night-order-number"]').should('exist');
    });
  });

  describe('Night Order Calculation', () => {
    beforeEach(() => {
      cy.resetApp({ mode: 'storyteller', loadScript: true });

      // Enable day/night tracking
      cy.get('[data-testid="day-night-toggle"]').click({ force: true });
    });

    it('should correctly calculate sequential night order numbers', () => {
      // This tests that the night order numbers are calculated correctly
      // based on the actual firstNight/otherNight values from characters.json

      // Set up specific characters with known night orders
      // Ensure player tokens are ready
      cy.get('.player-token').should('have.length', 7);

      // Assign characters with specific first night orders:
      // Poisoner (firstNight: 17)
      cy.get('.player-token').eq(0).click({ force: true });
      cy.get('#character-modal').should('be.visible');
      cy.get('#character-grid .token[title="Poisoner"]').click();
      cy.get('#character-modal').should('not.be.visible');

      // Chef (firstNight: 35)
      cy.get('.player-token').eq(1).click({ force: true });
      cy.get('#character-modal').should('be.visible');
      cy.get('#character-grid .token[title="Chef"]').click();
      cy.get('#character-modal').should('not.be.visible');

      // Empath (firstNight: 36)
      cy.get('.player-token').eq(2).click({ force: true });
      cy.get('#character-modal').should('be.visible');
      cy.get('#character-grid .token[title="Empath"]').click();
      cy.get('#character-modal').should('not.be.visible');

      // Fortune Teller (firstNight: 37)
      cy.get('.player-token').eq(3).click({ force: true });
      cy.get('#character-modal').should('be.visible');
      cy.get('#character-grid .token[title="Fortune Teller"]').click();
      cy.get('#character-modal').should('not.be.visible');

      // Night order should be: Poisoner=1, Chef=2, Empath=3, Fortune Teller=4
      cy.get('.player-token').eq(0).find('[data-testid="night-order-number"]').should('contain', '1');
      cy.get('.player-token').eq(1).find('[data-testid="night-order-number"]').should('contain', '2');
      cy.get('.player-token').eq(2).find('[data-testid="night-order-number"]').should('contain', '3');
      cy.get('.player-token').eq(3).find('[data-testid="night-order-number"]').should('contain', '4');
    });
  });
});
