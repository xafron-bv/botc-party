describe('Homebrew Script Night Order', () => {
  beforeEach(() => {
    cy.visit('/?test=true');
    cy.viewport(1280, 900);
    cy.window().then(win => { try { win.localStorage.clear(); } catch (_) { } });
  });

  it('uses firstNight values from custom script objects not in characters.json', () => {
    // Upload the bundled High Seas of Mutiny script (treat it like a user upload)
    const tempPath = '/tmp/high_seas_of_mutiny.json';
    cy.readFile('high-seas-of-mutiny.json').then(contents => {
      cy.writeFile(tempPath, contents);
      cy.get('#script-file').selectFile(tempPath, { force: true });
    });

    // Wait for successful custom script load
    cy.contains('#load-status', 'Custom script loaded successfully!', { timeout: 15000 }).should('exist');
    // Ensure a known character from the script is rendered (sanity check)
    cy.contains('#character-sheet .role .name', 'Kraken', { timeout: 15000 }).should('exist');

    // Enable night order sorting, first night phase
    cy.get('[data-testid="night-order-sort-checkbox"]').click();
    cy.get('#first-night-btn').should('be.checked');

    // Collect ordering for a subset of first night characters we know have firstNight > 0
    // From script snippet: Old Seadog (25), Navigator (26), Boatswain (27), Deckhand (28), First Mate (29), Barnacle (30)
    const ordered = ['Old Seadog', 'Navigator', 'Boatswain', 'Deckhand', 'First Mate', 'Barnacle'];

    cy.get('#character-sheet .role .name').then($names => {
      const names = [...$names].map(el => el.textContent);
      const indices = ordered.map(n => names.indexOf(n));
      // All should exist and be in ascending order
      indices.forEach(i => expect(i, 'character present in list').to.be.greaterThan(-1));
      for (let i = 1; i < indices.length; i++) {
        expect(indices[i - 1]).to.be.lessThan(indices[i]);
      }
    });
  });

  it('uses otherNight values (e.g., Captain before Buccaneer, Buccaneer before Kraken)', () => {
    const tempPath = '/tmp/high_seas_of_mutiny.json';
    cy.readFile('high-seas-of-mutiny.json').then(contents => {
      cy.writeFile(tempPath, contents);
      cy.get('#script-file').selectFile(tempPath, { force: true });
    });

    cy.contains('#load-status', 'Custom script loaded successfully!', { timeout: 15000 }).should('exist');
    cy.contains('#character-sheet .role .name', 'Kraken', { timeout: 15000 }).should('exist');

    cy.get('[data-testid="night-order-sort-checkbox"]').click();
    cy.get('label[for="other-nights-btn"]').click();

    cy.get('#character-sheet .role .name').then($names => {
      const names = [...$names].map(el => el.textContent);
      const captain = names.indexOf('Captain'); // otherNight:4
      const buccaneer = names.indexOf('Buccaneer'); // otherNight:5
      const kraken = names.indexOf('Kraken'); // otherNight:7
      expect(captain).to.be.greaterThan(-1);
      expect(buccaneer).to.be.greaterThan(-1);
      expect(kraken).to.be.greaterThan(-1);
      expect(captain).to.be.lessThan(buccaneer);
      expect(buccaneer).to.be.lessThan(kraken);
    });
  });
});
