// Cypress E2E tests - Touch ability popup and desktop tooltip edge cases

const startGameWithPlayers = (n) => {
  cy.get('#player-count').then(($el) => {
    const el = $el[0];
    el.value = String(n);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  });
  cy.get('#start-game').click();
  cy.get('#player-circle li').should('have.length', n);
};

describe('Ability UI - Desktop', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.window().then((win) => {
      try { win.localStorage.clear(); } catch (_) {}
    });
    cy.get('#load-tb').click();
    cy.get('#character-sheet .role').should('have.length.greaterThan', 5);
    startGameWithPlayers(5);
  });

  it('tooltip appears on hover; content populated', () => {
    cy.get('#player-circle li .player-token').eq(0).click();
    cy.get('#character-modal').should('be.visible');
    cy.get('#character-search').type('Chef');
    cy.get('#character-grid .token[title="Chef"]').first().click();
    // Hover shows tooltip; just ensure the tooltip element exists and eventually has non-empty text
    cy.get('#player-circle li .player-token').eq(0).trigger('mouseenter');
    cy.get('#ability-tooltip').should('exist');
    cy.get('#ability-tooltip').invoke('text').should('match', /\S/);
  });
});

describe('Ability UI - Touch', () => {
  beforeEach(() => {
    // Simulate touch before app initializes to ensure touch mode code paths are used
    cy.visit('/', {
      onBeforeLoad(win) {
        Object.defineProperty(win, 'ontouchstart', { value: true, configurable: true });
        Object.defineProperty(win.navigator, 'maxTouchPoints', { value: 1, configurable: true });
      }
    });
    cy.window().then((win) => {
      try { win.localStorage.clear(); } catch (_) {}
    });
    cy.get('#load-tb').click();
    cy.get('#character-sheet .role').should('have.length.greaterThan', 5);
    startGameWithPlayers(5);
  });

  it('info icon shows popup and hides when clicking elsewhere', () => {
    cy.viewport('iphone-6');
    // Assign a character so info icon is added
    cy.get('#player-circle li .player-token').eq(1).click({ force: true });
    cy.get('#character-modal').should('be.visible');
    cy.get('#character-search').clear().type('Librarian');
    cy.get('#character-grid .token[title="Librarian"]').first().click();

    // Info icon should exist for that player index
    cy.get('#player-circle li').eq(1).find('.ability-info-icon', { timeout: 8000 }).should('exist').click({ force: true });
    cy.get('#touch-ability-popup').should('have.class', 'show').and('contain', 'particular Outsider');

    // Click outside hides
    cy.get('body').click('topLeft');
    cy.get('#touch-ability-popup').should('not.have.class', 'show');
  });
});

