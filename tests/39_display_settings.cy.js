// Cypress test: verifies display settings sliders adjust grimoire visuals and persist

describe('Display Settings Controls', () => {
  const SETTINGS_STORAGE_KEY = 'botcDisplaySettingsV1';

  beforeEach(() => {
    cy.visit('/');
    cy.viewport(1280, 900);
    cy.window().then((win) => { try { win.localStorage.clear(); } catch (_) { /* ignore */ } });
    cy.setupGame({ players: 5, loadScript: true });
    cy.get('#player-circle li').should('have.length', 5);
  });

  it('adjusts sizes through sliders and persists across reload', () => {
    let baseTokenWidth;
    let baseNameFontSize;
    let baseCircleWidth;

    cy.get('#player-circle').then(($circle) => {
      baseCircleWidth = $circle[0].getBoundingClientRect().width;
    });

    cy.get('#player-circle li').first().find('.player-token').then(($token) => {
      baseTokenWidth = $token[0].getBoundingClientRect().width;
    });

    cy.get('#player-circle li').first().find('.player-name').then(($name) => {
      baseNameFontSize = parseFloat(getComputedStyle($name[0]).fontSize);
    });

    cy.get('[data-testid="display-settings-toggle"]').should('be.visible').click();
    cy.get('[data-testid="display-settings-panel"]').should('be.visible');

    cy.get('[data-testid="token-size-slider"]').should('have.value', '100')
      .invoke('val', 150).trigger('input');
    cy.get('[data-testid="player-name-slider"]').should('have.value', '100')
      .invoke('val', 120).trigger('input');

    cy.get('#player-circle li').first().find('.player-token').should(($token) => {
      const width = $token[0].getBoundingClientRect().width;
      expect(width).to.be.greaterThan(baseTokenWidth * 1.35);
    });

    cy.get('#player-circle').should(($circle) => {
      const width = $circle[0].getBoundingClientRect().width;
      expect(width).to.be.closeTo(baseCircleWidth, baseCircleWidth * 0.03);
    });

    cy.get('[data-testid="circle-size-slider"]').should('have.value', '100')
      .invoke('val', 140).trigger('input');

    cy.get('#player-circle').should(($circle) => {
      const width = $circle[0].getBoundingClientRect().width;
      expect(width).to.be.greaterThan(baseCircleWidth * 1.25);
    });

    cy.get('#player-circle li').first().find('.player-name').should(($name) => {
      const fontSize = parseFloat(getComputedStyle($name[0]).fontSize);
      expect(fontSize).to.be.greaterThan(baseNameFontSize * 1.15);
    });

    cy.window().then((win) => {
      const stored = win.localStorage.getItem(SETTINGS_STORAGE_KEY);
      expect(stored, 'stored settings').to.be.a('string');
      const parsed = JSON.parse(stored);
      expect(parsed.tokenScale).to.be.closeTo(1.5, 0.01);
      expect(parsed.playerNameScale).to.be.closeTo(1.2, 0.01);
      expect(parsed.circleScale).to.be.closeTo(1.4, 0.01);
    });

    cy.reload();
    cy.viewport(1280, 900);
    cy.setupGame({ players: 5, loadScript: true });
    cy.get('#player-circle li').should('have.length', 5);

    cy.get('#player-circle').should(($circle) => {
      const width = $circle[0].getBoundingClientRect().width;
      expect(width).to.be.greaterThan(baseCircleWidth * 1.2);
    });

    cy.get('#player-circle li').first().find('.player-token').should(($token) => {
      const width = $token[0].getBoundingClientRect().width;
      expect(width).to.be.greaterThan(baseTokenWidth * 1.2);
    });

    cy.get('[data-testid="display-settings-toggle"]').click();
    cy.get('[data-testid="token-size-slider"]').should('have.value', '150');
    cy.get('[data-testid="player-name-slider"]').should('have.value', '120');
    cy.get('[data-testid="circle-size-slider"]').should('have.value', '140');
  });

  it('is accessible from player mode', () => {
    cy.get('#mode-player').click({ force: true });
    cy.get('#mode-player').should('be.checked');

    cy.get('[data-testid="display-settings-toggle"]').should('be.visible').click();
    cy.get('[data-testid="display-settings-panel"]').should('be.visible');
  });
});
