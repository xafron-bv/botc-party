// Cypress E2E tests - Player context menu: add/remove via right-click and long-press

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

describe('Player context menu - desktop right-click', () => {
  beforeEach(() => {
    cy.visit('/');
    cy.window().then((win) => { try { win.localStorage.clear(); } catch (_) {} });
    cy.get('#load-tb').click();
    cy.get('#character-sheet .role').should('have.length.greaterThan', 5);
    startGameWithPlayers(7);
  });

  it('adds player before/after and removes without creating history entries', () => {
    // Right-click first player to add before
    cy.get('#player-circle li').eq(0).rightclick();
    cy.get('#player-context-menu').should('have.css', 'display', 'block');
    cy.get('#player-menu-add-before').click({ force: true });
    cy.get('#player-context-menu').should('have.css', 'display', 'none');
    cy.get('#player-circle li', { timeout: 8000 }).should('have.length', 8);
    // The player count input should reflect 8
    cy.get('#player-count').should(($el) => { expect($el.val()).to.eq('8'); });

    // Right-click last player to add after
    cy.get('#player-circle li').last().rightclick();
    cy.get('#player-menu-add-after').click({ force: true });
    cy.get('#player-circle li', { timeout: 8000 }).should('have.length', 9);
    cy.get('#player-count').should(($el) => { expect($el.val()).to.eq('9'); });

    // Remove a middle player
    cy.get('#player-circle li').eq(4).rightclick();
    cy.get('#player-menu-remove').click({ force: true });
    cy.get('#player-circle li', { timeout: 8000 }).should('have.length', 8);
    cy.get('#player-count').should(($el) => { expect($el.val()).to.eq('8'); });

    // No grimoire history should have been created by these inline edits
    cy.get('#grimoire-history-list .history-item').should('have.length', 0);
  });

  it('creates a history snapshot only when a new game is created', () => {
    // Perform some inline add/remove first
    cy.get('#player-circle li').eq(1).rightclick();
    cy.get('#player-menu-add-after').click({ force: true }); // 8
    cy.get('#player-circle li').eq(2).rightclick();
    cy.get('#player-menu-remove').click({ force: true }); // back to 7
    cy.get('#grimoire-history-list .history-item').should('have.length', 0);

    // Now change the count via Start Game (this should snapshot the previous 7-player state)
    cy.get('#player-count').then(($el) => {
      const el = $el[0];
      el.value = '6';
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
    cy.get('#start-game').click();
    cy.get('#player-circle li').should('have.length', 6);
    cy.get('#grimoire-history-list .history-item').should('have.length.greaterThan', 0);
  });

  it('closes context menu when clicking outside', () => {
    // Right-click to open context menu
    cy.get('#player-circle li').eq(0).rightclick();
    cy.get('#player-context-menu').should('have.css', 'display', 'block');
    
    // Wait a bit to ensure any grace period has passed
    cy.wait(150);
    
    // Click on the center element (grimoire area) outside the menu
    cy.get('#center').click({ force: true });
    
    // Menu should be hidden
    cy.get('#player-context-menu').should('have.css', 'display', 'none');
  });
});

describe('Player context menu - touch long-press', () => {
  beforeEach(() => {
    cy.visit('/', {
      onBeforeLoad(win) {
        Object.defineProperty(win, 'ontouchstart', { value: true, configurable: true });
        Object.defineProperty(win.navigator, 'maxTouchPoints', { value: 1, configurable: true });
      }
    });
    cy.window().then((win) => { try { win.localStorage.clear(); } catch (_) {} });
    cy.get('#load-tb').click();
    cy.get('#character-sheet .role').should('have.length.greaterThan', 5);
    startGameWithPlayers(5);
  });

  it('opens context menu via long-press and performs actions', () => {
    cy.viewport('iphone-6');
    // Long-press first player's token to open context menu
    cy.get('#player-circle li .player-token').first()
      .trigger('pointerdown', { force: true, clientX: 100, clientY: 100 })
      .wait(650)
      .trigger('pointerup', { force: true, clientX: 100, clientY: 100 });
    // Assert no selection occurred (window.getSelection empty)
    cy.window().then((win) => {
      const sel = win.getSelection && win.getSelection();
      const selectedText = sel && typeof sel.toString === 'function' ? sel.toString() : '';
      expect(selectedText).to.eq('');
    });
    cy.get('#player-context-menu').should('have.css', 'display', 'block');
    cy.get('#player-menu-add-after').click();
    cy.get('#player-circle li').should('have.length', 6);
    // Remove it back to 5 via long-press on the newly added last player
    cy.get('#player-circle li').last().find('.player-token')
      .trigger('pointerdown', { force: true })
      .wait(650)
      .trigger('pointerup', { force: true });
    cy.get('#player-menu-remove').click();
    cy.get('#player-circle li').should('have.length', 5);
    cy.get('#grimoire-history-list .history-item').should('have.length', 0);
  });

  it('closes context menu when touching outside', () => {
    cy.viewport('iphone-6');
    // Long-press first player's token to open context menu
    cy.get('#player-circle li .player-token').first()
      .trigger('pointerdown', { force: true, clientX: 100, clientY: 100 })
      .wait(650)
      .trigger('pointerup', { force: true, clientX: 100, clientY: 100 });
    
    cy.get('#player-context-menu').should('have.css', 'display', 'block');
    
    // Wait a bit to ensure the grace period has passed
    cy.wait(150);
    
    // Touch outside the menu (on the body or another element)
    cy.get('body').trigger('touchstart', { force: true, clientX: 10, clientY: 10 });
    
    // Menu should now be hidden
    cy.get('#player-context-menu').should('have.css', 'display', 'none');
  });

  it('does not close context menu immediately after opening', () => {
    cy.viewport('iphone-6');
    // Long-press first player's token to open context menu
    cy.get('#player-circle li .player-token').first()
      .trigger('pointerdown', { force: true, clientX: 100, clientY: 100 })
      .wait(650)
      .trigger('pointerup', { force: true, clientX: 100, clientY: 100 });
    
    cy.get('#player-context-menu').should('have.css', 'display', 'block');
    
    // Immediately touch outside (within grace period)
    cy.get('body').trigger('touchstart', { force: true, clientX: 10, clientY: 10 });
    
    // Menu should still be visible due to grace period
    cy.get('#player-context-menu').should('have.css', 'display', 'block');
    
    // Wait for grace period to expire
    cy.wait(150);
    
    // Touch outside again
    cy.get('body').trigger('touchstart', { force: true, clientX: 10, clientY: 10 });
    
    // Now menu should be hidden
    cy.get('#player-context-menu').should('have.css', 'display', 'none');
  });
});

