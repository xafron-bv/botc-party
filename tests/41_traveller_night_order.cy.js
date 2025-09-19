// Verifies travellers with night order values are properly interleaved instead of forced last.
// Uses High Seas of Mutiny script where Scurvy Scalawag (firstNight 2) should appear before Old Seadog (25).

describe('Traveller Night Order Integration', () => {
  beforeEach(() => {
    cy.visit('/?test=true');
    cy.viewport(1280, 900);
    cy.window().then(win => { try { win.localStorage.clear(); } catch (_) { } });
  });

  it('interleaves script travellers with firstNight ordering', () => {
    const tempPath = '/tmp/high_seas_of_mutiny.json';
    cy.readFile('high-seas-of-mutiny.json').then(contents => {
      cy.writeFile(tempPath, contents);
      cy.get('#script-file').selectFile(tempPath, { force: true });
    });

    cy.contains('#load-status', 'Custom script loaded successfully!', { timeout: 15000 }).should('exist');

    // Enable night order sort (first night phase by default)
    cy.get('[data-testid="night-order-sort-checkbox"]').click();
    cy.get('#first-night-btn').should('be.checked');

    // Ensure both traveller (Scurvy Scalawag) and later townsfolk (Old Seadog) appear
    cy.contains('#character-sheet .role .name', 'Scurvy Scalawag', { timeout: 15000 }).should('exist');
    cy.contains('#character-sheet .role .name', 'Old Seadog', { timeout: 15000 }).should('exist');

    cy.get('#character-sheet .role .name').then($names => {
      const names = [...$names].map(el => el.textContent);
      const scalawagIndex = names.indexOf('Scurvy Scalawag'); // firstNight 2
      const oldSeadogIndex = names.indexOf('Old Seadog'); // firstNight 25
      expect(scalawagIndex).to.be.greaterThan(-1);
      expect(oldSeadogIndex).to.be.greaterThan(-1);
      expect(scalawagIndex, 'traveller with earlier night order comes first').to.be.lessThan(oldSeadogIndex);
    });
  });

  it('interleaves travellers in otherNight ordering (Buccaneer (5) before Kraken (7))', () => {
    const tempPath = '/tmp/high_seas_of_mutiny.json';
    cy.readFile('high-seas-of-mutiny.json').then(contents => {
      cy.writeFile(tempPath, contents);
      cy.get('#script-file').selectFile(tempPath, { force: true });
    });
    cy.contains('#load-status', 'Custom script loaded successfully!', { timeout: 15000 }).should('exist');

    cy.get('[data-testid="night-order-sort-checkbox"]').click();
    cy.get('#night-phase-toggle').should('contain', 'First Night');
    cy.get('#night-phase-toggle').click();
    cy.get('#night-phase-toggle').should('contain', 'Other Nights');

    cy.contains('#character-sheet .role .name', 'Buccaneer', { timeout: 15000 }).should('exist');
    cy.contains('#character-sheet .role .name', 'Kraken', { timeout: 15000 }).should('exist');

    cy.get('#character-sheet .role .name').then($names => {
      const names = [...$names].map(el => el.textContent);
      const buccaneer = names.indexOf('Buccaneer'); // otherNight 5
      const kraken = names.indexOf('Kraken'); // otherNight 7
      expect(buccaneer).to.be.greaterThan(-1);
      expect(kraken).to.be.greaterThan(-1);
      expect(buccaneer).to.be.lessThan(kraken);
    });
  });
});
