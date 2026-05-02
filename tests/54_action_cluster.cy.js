describe('Bottom-right action cluster collapse/expand', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.window().then((win) => { try { win.localStorage.clear(); } catch (_) { } });
    cy.ensureStorytellerMode();
    cy.setupGame({ players: 5, loadScript: true, mode: 'storyteller' });
  });

  it('hides action buttons by default and reveals them when the trigger is tapped', () => {
    cy.get('#action-cluster').should('have.attr', 'data-state', 'collapsed');
    cy.get('#action-cluster-toggle').should('be.visible');
    cy.get('#display-settings-toggle').should('not.be.visible');
    cy.get('#export-grimoire-print').should('not.be.visible');
    cy.get('#day-night-toggle').should('not.be.visible');
    cy.get('#grimoire-snapshot-toggle').should('not.be.visible');

    cy.get('#action-cluster-toggle').click();
    cy.get('#action-cluster').should('have.attr', 'data-state', 'expanded');
    cy.get('#display-settings-toggle').should('be.visible');
    cy.get('#export-grimoire-print').should('be.visible');
    cy.get('#day-night-toggle').should('be.visible');
    cy.get('#grimoire-snapshot-toggle').should('be.visible');

    cy.get('#action-cluster-toggle').click();
    cy.get('#action-cluster').should('have.attr', 'data-state', 'collapsed');
    cy.get('#display-settings-toggle').should('not.be.visible');
  });

  it('collapses the cluster when the user taps outside', () => {
    cy.get('#action-cluster-toggle').click();
    cy.get('#action-cluster').should('have.attr', 'data-state', 'expanded');

    cy.get('#center').click('topLeft', { force: true });
    cy.get('#action-cluster').should('have.attr', 'data-state', 'collapsed');
  });

  it('keeps action buttons sharing the same right edge with no horizontal offset', () => {
    cy.viewport('iphone-6');
    cy.reload();
    cy.ensureStorytellerMode();
    cy.get('body').then(($b) => {
      if ($b.hasClass('character-panel-open')) {
        cy.get('#character-panel-toggle').click({ force: true });
      }
    });
    cy.get('#action-cluster-toggle').click();

    cy.window().then((win) => {
      const ids = ['display-settings-toggle', 'grimoire-snapshot-toggle', 'export-grimoire-print', 'day-night-toggle'];
      const rects = ids.map((id) => win.document.getElementById(id).getBoundingClientRect());
      const baseRight = rects[0].right;
      rects.forEach((rect, i) => {
        expect(rect.right, `${ids[i]} shares right edge`).to.be.closeTo(baseRight, 1);
      });
    });
  });

  it('opens the day/night slider as a popup to the left of the cluster column', () => {
    cy.get('#action-cluster-toggle').click();
    cy.get('#day-night-toggle').click();
    cy.get('#day-night-slider').should('have.class', 'open');

    cy.window().then((win) => {
      const slider = win.document.getElementById('day-night-slider').getBoundingClientRect();
      const cluster = win.document.getElementById('action-cluster').getBoundingClientRect();
      expect(slider.right, 'slider right edge to the left of cluster').to.be.at.most(cluster.left + 1);
      expect(slider.bottom, 'slider aligned with cluster bottom').to.be.closeTo(cluster.bottom, 4);
    });
  });

  it('closes the day/night slider when clicking outside (matching settings behavior)', () => {
    cy.get('#action-cluster-toggle').click();
    cy.get('#day-night-toggle').click();
    cy.get('#day-night-slider').should('have.class', 'open');

    cy.get('#center').click('topLeft', { force: true });
    cy.get('#day-night-slider').should('not.have.class', 'open');
  });

  it('keeps popups inside the viewport on small screens, sharing space with the cluster', () => {
    cy.viewport('iphone-6');
    cy.reload();
    cy.ensureStorytellerMode();
    cy.get('body').then(($b) => {
      if ($b.hasClass('character-panel-open')) {
        cy.get('#character-panel-toggle').click({ force: true });
      }
    });

    cy.get('#action-cluster-toggle').click();

    cy.get('#day-night-toggle').click();
    cy.window().then((win) => {
      const slider = win.document.getElementById('day-night-slider').getBoundingClientRect();
      const cluster = win.document.getElementById('action-cluster').getBoundingClientRect();
      expect(slider.left, 'slider stays inside viewport on the left').to.be.at.least(0);
      expect(slider.right, 'slider does not overlap cluster').to.be.at.most(cluster.left + 1);
    });

    // Re-open cluster (clicking moon collapses it via cluster's own click-outside guard? no — it's inside)
    cy.get('#display-settings-toggle').click();
    cy.window().then((win) => {
      const panel = win.document.getElementById('display-settings-panel').getBoundingClientRect();
      const cluster = win.document.getElementById('action-cluster').getBoundingClientRect();
      expect(panel.left, 'settings panel stays inside viewport on the left').to.be.at.least(0);
      expect(panel.right, 'settings panel does not overlap cluster').to.be.at.most(cluster.left + 1);
    });
  });
});
