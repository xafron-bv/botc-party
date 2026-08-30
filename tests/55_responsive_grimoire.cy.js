const collapseSidebar = () => {
  cy.get('body').then(($body) => {
    if (!$body.hasClass('sidebar-collapsed')) {
      cy.get('#sidebar-backdrop').click({ force: true });
    }
  });
  cy.get('body').should('have.class', 'sidebar-collapsed');
};

const captureGeometry = ($circle) => ({
  width: $circle[0].getBoundingClientRect().width,
  seats: [...$circle[0].querySelectorAll('li')].map((seat) => ({
    left: seat.style.left,
    top: seat.style.top
  }))
});

describe('Responsive grimoire reflow', () => {
  it('matches a fresh mobile layout after resizing from desktop', () => {
    cy.viewport(1280, 720);
    cy.visit('/', { onBeforeLoad: (win) => win.localStorage.clear() });
    cy.setupGame({ players: 20, loadScript: false, mode: 'storyteller' });
    collapseSidebar();

    cy.get('#player-circle').should(($circle) => {
      expect($circle[0].getBoundingClientRect().width).to.be.greaterThan(500);
    });

    cy.viewport(320, 568);
    cy.window().then((win) => win.dispatchEvent(new win.Event('resize')));
    cy.get('#player-circle').should(($circle) => {
      const center = $circle[0].ownerDocument.getElementById('center');
      expect($circle[0].getBoundingClientRect().width).to.be.at.most(center.clientWidth);
    });

    let resizedGeometry;
    cy.get('#player-circle').then(($circle) => {
      resizedGeometry = captureGeometry($circle);
    });

    cy.reload();
    collapseSidebar();
    cy.get('#player-circle li').should('have.length', 20);
    cy.get('#player-circle').should(($circle) => {
      const freshGeometry = captureGeometry($circle);
      expect(resizedGeometry.width).to.be.closeTo(freshGeometry.width, 1);
      expect(resizedGeometry.seats).to.deep.equal(freshGeometry.seats);
    });
  });
});
