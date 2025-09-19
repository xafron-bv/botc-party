// Cypress test: Travellers explicitly present in a loaded script should always appear,
// even when the Include Travellers checkbox is unchecked. Enabling the checkbox should
// then add additional traveller roles beyond those in the script.

describe('Traveller Visibility From Script', () => {
  beforeEach(() => {
    cy.visit('/?test=true');
    cy.viewport(1280, 900);
    cy.window().then(win => { try { win.localStorage.clear(); } catch (_) {} });
  });

  it('shows script travellers when toggle is off, and more after enabling toggle', () => {
    // Ensure travellers toggle starts unchecked
    cy.get('[data-testid="include-travellers-checkbox"]').should('not.be.checked');

    // Upload the homebrew script containing traveller roles
    const tempPath = '/tmp/high_seas_of_mutiny.json';
    cy.readFile('high-seas-of-mutiny.json').then(contents => {
      cy.writeFile(tempPath, contents);
      cy.get('#script-file').selectFile(tempPath, { force: true });
    });

    cy.contains('#load-status', 'Custom script loaded successfully!', { timeout: 15000 }).should('exist');

    // A few known travellers from the script
    const scriptTravellers = ['Bilge Rat', 'Scurvy Scalawag', 'Commodore', 'Cursed Mutineer', 'Castaway'];

    scriptTravellers.forEach(name => {
      cy.contains('#character-sheet .role .name', name, { timeout: 10000 }).should('exist');
    });

    // Capture count with only script travellers visible (plus all non-travellers)
    cy.get('#character-sheet .role .name').then($before => {
      const beforeNames = [...$before].map(el => el.textContent);
      const beforeTravellerCount = beforeNames.filter(n => scriptTravellers.includes(n)).length;
      expect(beforeTravellerCount).to.be.greaterThan(0);

      // Enable the Include Travellers toggle to load ALL travellers from dataset
      cy.get('[data-testid="include-travellers-checkbox"]').click().should('be.checked');

      // After enabling, more traveller roles (not in script) should appear. We detect by increase in total travellers present.
      cy.get('#character-sheet .role .name').then($after => {
        const afterNames = [...$after].map(el => el.textContent);
        // Count any traveller names we already had
        const afterScriptTravellerCount = afterNames.filter(n => scriptTravellers.includes(n)).length;
        expect(afterScriptTravellerCount).to.eq(beforeTravellerCount); // script travellers remain

        // Heuristic: there should now be at least one additional traveller not in the script
        // Example canonical traveller names: "Amnesiac", "Barber", "Beggar", etc.
        const knownCoreTravellers = ['Barber', 'Bounty Hunter', 'Amnesiac', 'Butcher', 'Huntsman', 'Judge', 'Thief', 'Vagrant'];
        const newlyVisible = knownCoreTravellers.filter(n => afterNames.includes(n) && !beforeNames.includes(n));
        expect(newlyVisible.length, 'at least one extra traveller appears after enabling toggle').to.be.greaterThan(0);
      });
    });
  });
});
