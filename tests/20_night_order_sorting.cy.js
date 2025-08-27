describe('Night Order Sorting', () => {
  beforeEach(() => {
    cy.visit('/?test=true');
    cy.viewport(1280, 900);

    // Clear local storage to start fresh
    cy.window().then((win) => {
      try { win.localStorage.clear(); } catch (_) { }
    });

    // Load Trouble Brewing script
    cy.get('#load-tb').click();
    cy.get('#character-sheet .role').should('have.length.greaterThan', 5);
  });

  describe('Night Order Checkbox', () => {
    it('should have a checkbox for night order sorting', () => {
      // The checkbox should exist
      cy.get('[data-testid="night-order-sort-checkbox"]').should('exist');
      cy.get('[data-testid="night-order-sort-checkbox"]').should('not.be.checked');

      // Should have a label
      cy.get('[data-testid="night-order-sort-label"]').should('contain', 'Sort by night order');
    });

    it('should toggle between team sorting and night order sorting', () => {
      // Initially should show team headers
      cy.get('#character-sheet h3.team-townsfolk').should('exist');
      cy.get('#character-sheet h3.team-outsider').should('exist');
      cy.get('#character-sheet h3.team-minion').should('exist');
      cy.get('#character-sheet h3.team-demon').should('exist');

      // Check the checkbox
      cy.get('[data-testid="night-order-sort-checkbox"]').click();

      // Team headers should not exist
      cy.get('#character-sheet h3.team-townsfolk').should('not.exist');
      cy.get('#character-sheet h3.team-outsider').should('not.exist');
      cy.get('#character-sheet h3.team-minion').should('not.exist');
      cy.get('#character-sheet h3.team-demon').should('not.exist');

      // Uncheck the checkbox
      cy.get('[data-testid="night-order-sort-checkbox"]').click();

      // Team headers should exist again
      cy.get('#character-sheet h3.team-townsfolk').should('exist');
      cy.get('#character-sheet h3.team-outsider').should('exist');
      cy.get('#character-sheet h3.team-minion').should('exist');
      cy.get('#character-sheet h3.team-demon').should('exist');
    });
  });

  describe('First Night Order Sorting', () => {
    beforeEach(() => {
      // Enable night order sorting
      cy.get('[data-testid="night-order-sort-checkbox"]').click();

      // Select first night
      cy.get('[data-testid="night-phase-selector"]').select('first-night');
    });

    it('should display characters sorted by first night order', () => {
      // Characters should be ordered by their firstNight values
      // Based on Trouble Brewing characters:
      // Poisoner (firstNight: 17) should appear before Chef (firstNight: 35)
      // Chef (firstNight: 35) should appear before Empath (firstNight: 36)
      // Empath (firstNight: 36) should appear before Fortune Teller (firstNight: 37)

      cy.get('#character-sheet .role .name').then($names => {
        const names = [...$names].map(el => el.textContent);

        const poisonerIndex = names.indexOf('Poisoner');
        const chefIndex = names.indexOf('Chef');
        const empathIndex = names.indexOf('Empath');
        const fortuneTellerIndex = names.indexOf('Fortune Teller');

        expect(poisonerIndex).to.be.lessThan(chefIndex);
        expect(chefIndex).to.be.lessThan(empathIndex);
        expect(empathIndex).to.be.lessThan(fortuneTellerIndex);
      });
    });

    it('should place characters with firstNight: 0 at the end of night order characters', () => {
      cy.get('#character-sheet .role .name').then($names => {
        const names = [...$names].map(el => el.textContent);

        // Characters with night orders should appear before those without
        const poisonerIndex = names.indexOf('Poisoner'); // has firstNight > 0
        const soldierIndex = names.indexOf('Soldier'); // has firstNight: 0
        const virginIndex = names.indexOf('Virgin'); // has firstNight: 0

        expect(poisonerIndex).to.be.lessThan(soldierIndex);
        expect(poisonerIndex).to.be.lessThan(virginIndex);
      });
    });

    it('should display jinxes, fabled, and travellers after night order characters', () => {
      // Load a script with travellers and jinxes
      cy.get('[data-testid="include-travellers-checkbox"]').click();

      cy.get('#character-sheet .role .name').then($names => {
        const names = [...$names].map(el => el.textContent);

        // Night order characters
        const chefIndex = names.indexOf('Chef');
        // Characters with no night order
        const soldierIndex = names.indexOf('Soldier');
        // Travellers
        const beggarIndex = names.indexOf('Beggar');

        // Night order characters < No night order characters < Travellers
        expect(chefIndex).to.be.lessThan(soldierIndex);
        expect(soldierIndex).to.be.lessThan(beggarIndex);
      });

      // Check if jinxes section appears after regular characters (if any exist)
      cy.get('#character-sheet').then($sheet => {
        const $jinxes = $sheet.find('h3.team-jinxes');
        if ($jinxes.length > 0) {
          // Jinxes should be after all character roles
          cy.get('#character-sheet .role').last().should('exist').then($lastRole => {
            cy.get('#character-sheet h3.team-jinxes').should('exist').then($jinxHeader => {
              const lastRoleTop = $lastRole[0].getBoundingClientRect().top;
              const jinxHeaderTop = $jinxHeader[0].getBoundingClientRect().top;
              expect(jinxHeaderTop).to.be.greaterThan(lastRoleTop);
            });
          });
        }
      });
    });
  });

  describe('Other Nights Order Sorting', () => {
    beforeEach(() => {
      // Enable night order sorting
      cy.get('[data-testid="night-order-sort-checkbox"]').click();

      // Select other nights
      cy.get('[data-testid="night-phase-selector"]').select('other-nights');
    });

    it('should display characters sorted by other night order', () => {
      // Characters should be ordered by their otherNight values
      // Poisoner (otherNight: 7) should appear before Monk (otherNight: 12)
      // Monk (otherNight: 12) should appear before Imp (otherNight: 24)

      cy.get('#character-sheet .role .name').then($names => {
        const names = [...$names].map(el => el.textContent);

        const poisonerIndex = names.indexOf('Poisoner');
        const monkIndex = names.indexOf('Monk');
        const impIndex = names.indexOf('Imp');

        expect(poisonerIndex).to.be.lessThan(monkIndex);
        expect(monkIndex).to.be.lessThan(impIndex);
      });
    });

    it('should place characters with otherNight: 0 at the end of night order characters', () => {
      cy.get('#character-sheet .role .name').then($names => {
        const names = [...$names].map(el => el.textContent);

        // Characters with night orders should appear before those without
        const poisonerIndex = names.indexOf('Poisoner'); // has otherNight > 0
        const chefIndex = names.indexOf('Chef'); // has otherNight: 0
        const empathIndex = names.indexOf('Empath'); // has otherNight: 0

        expect(poisonerIndex).to.be.lessThan(chefIndex);
        expect(poisonerIndex).to.be.lessThan(empathIndex);
      });
    });
  });

  describe('Night Phase Selector', () => {
    it('should show night phase selector only when night order sorting is enabled', () => {
      // Initially hidden
      cy.get('[data-testid="night-phase-selector"]').should('not.be.visible');

      // Enable night order sorting
      cy.get('[data-testid="night-order-sort-checkbox"]').click();

      // Should now be visible
      cy.get('[data-testid="night-phase-selector"]').should('exist');
      cy.get('[data-testid="night-phase-selector"]').should('be.visible');

      // Should have first night and other nights options
      cy.get('[data-testid="night-phase-selector"] option[value="first-night"]').should('exist');
      cy.get('[data-testid="night-phase-selector"] option[value="other-nights"]').should('exist');

      // Default to first night
      cy.get('[data-testid="night-phase-selector"]').should('have.value', 'first-night');

            // Disable night order sorting
      cy.get('[data-testid="night-order-sort-checkbox"]').click();
      
      // Should be hidden again
      cy.get('[data-testid="night-phase-selector"]').should('not.be.visible');
    });
  });

  describe('State Persistence', () => {
    it('should remember night order sorting preference across page reloads', () => {
      // Enable night order sorting
      cy.get('[data-testid="night-order-sort-checkbox"]').click();
      cy.get('[data-testid="night-phase-selector"]').select('other-nights');

      // Reload the page
      cy.reload();

      // Load script again
      cy.get('#load-tb').click();

      // Should still be in night order mode
      cy.get('[data-testid="night-order-sort-checkbox"]').should('be.checked');
      cy.get('[data-testid="night-phase-selector"]').should('have.value', 'other-nights');

      // Team headers should not exist
      cy.get('#character-sheet h3.team-townsfolk').should('not.exist');
    });
  });
});
