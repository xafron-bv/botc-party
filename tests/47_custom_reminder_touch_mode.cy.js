describe('Custom Reminder Touch Mode', () => {
  const addCustomReminderViaToken = (text) => {
    cy.get('#player-circle li').eq(0).find('.reminder-placeholder').click({ force: true });
    cy.get('#reminder-token-modal').should('be.visible');
    cy.contains('#reminder-token-grid .token', 'Custom note').first().click({ force: true });
    cy.get('#custom-reminder-edit-modal').should('be.visible');
    cy.get('#custom-reminder-text-input')
      .focus()
      .type('{selectall}{backspace}')
      .type(text);
    cy.get('#save-custom-reminder-btn').click();
    cy.get('#custom-reminder-edit-modal').should('not.be.visible');
  };
  beforeEach(() => {
    cy.visit('/', {
      onBeforeLoad(win) {
        try {
          Object.defineProperty(win, 'ontouchstart', {
            value: () => { },
            configurable: true
          });
        } catch (_) { win.ontouchstart = () => { }; }
        try {
          Object.defineProperty(win.navigator, 'maxTouchPoints', {
            value: 1,
            configurable: true
          });
        } catch (_) { win.navigator.maxTouchPoints = 1; }
        const originalMatchMedia = win.matchMedia ? win.matchMedia.bind(win) : null;
        win.matchMedia = (query) => {
          if (/(hover:\s*none).*(pointer:\s*coarse)/i.test(query)) {
            return { matches: true, addListener: () => { }, removeListener: () => { } };
          }
          if (originalMatchMedia) {
            return originalMatchMedia(query);
          }
          return { matches: false, addListener: () => { }, removeListener: () => { } };
        };
      }
    });
    cy.window().then((win) => {
      try { win.localStorage.clear(); } catch (_) { }
    });
    cy.get('#load-tb').click();
    cy.setupGame({ players: 5, loadScript: false });
  });

  it('should expand on first tap in touch mode', () => {
    addCustomReminderViaToken('Test Custom Touch');

    // Wait for reminder to appear
    cy.get('#player-circle li').eq(0).find('.icon-reminder').should('exist');
    cy.get('#player-circle li').eq(0).find('.icon-reminder').first().as('customReminder');

    // Simulate touch interaction
    cy.get('@customReminder').trigger('touchstart', { touches: [{ clientX: 100, clientY: 100 }] }, { force: true });
    cy.wait(50);
    cy.get('@customReminder').trigger('touchend', { changedTouches: [{ clientX: 100, clientY: 100 }] }, { force: true });

    // Should NOT open edit modal on first tap (just expands)
    cy.get('#custom-reminder-edit-modal').should('not.be.visible');
    cy.get('@customReminder').click({ force: true });
    cy.get('#custom-reminder-edit-modal').should('not.be.visible');

    // Should be expanded
    cy.get('#player-circle li').eq(0).should('have.attr', 'data-expanded', '1');
  });

  it('should open edit modal on second tap in touch mode', () => {
    addCustomReminderViaToken('Touch Mode Text');

    // First tap to expand (touch)
    cy.get('#player-circle li').eq(0).find('.icon-reminder').first().as('customReminder');
    cy.get('@customReminder').trigger('touchstart', { touches: [{ clientX: 100, clientY: 100 }] }, { force: true });
    cy.wait(50);
    cy.get('@customReminder').trigger('touchend', { changedTouches: [{ clientX: 100, clientY: 100 }] }, { force: true });

    cy.wait(300); // Wait for suppress window to clear

    // Second tap should now open edit modal in touch mode
    cy.get('@customReminder').trigger('touchstart', { touches: [{ clientX: 100, clientY: 100 }] }, { force: true });
    cy.wait(50);
    cy.get('@customReminder').trigger('touchend', { changedTouches: [{ clientX: 100, clientY: 100 }] }, { force: true });
    cy.wait(50);
    cy.get('#custom-reminder-edit-modal').should('be.visible');
    cy.get('#custom-reminder-text-input').should('contain', 'Touch Mode Text');
  });

  it('should show reminder context menu via long press in touch mode', () => {
    addCustomReminderViaToken('Long Press Test');

    // Expand first
    cy.get('#player-circle li').eq(0).find('.icon-reminder').first().as('customReminder');
    cy.get('@customReminder').trigger('touchstart', { touches: [{ clientX: 100, clientY: 100 }] });
    cy.wait(50);
    cy.get('@customReminder').trigger('touchend', { changedTouches: [{ clientX: 100, clientY: 100 }] });

    cy.wait(300); // Wait for suppress window

    // Long press is difficult to simulate reliably in headless browsers, trigger contextmenu instead
    cy.get('@customReminder').trigger('contextmenu', { clientX: 120, clientY: 120, force: true });
    cy.get('#reminder-context-menu').should('be.visible');
    cy.get('body').then(($body) => {
      const playerMenu = $body.find('#player-context-menu');
      if (playerMenu.length) {
        expect(playerMenu.css('display')).to.not.equal('block');
      }
      expect(playerMenu.length).to.be.lte(1);
    });
    cy.get('#custom-reminder-edit-modal').should('not.be.visible');

    // Selecting edit from context menu still opens the modal
    cy.get('#reminder-context-menu').contains('Edit').click({ force: true });
    cy.get('#custom-reminder-edit-modal').should('be.visible');
    cy.get('#custom-reminder-text-input').should('contain', 'Long Press Test');
  });

  it('should allow desktop click to open modal when expanded', () => {
    addCustomReminderViaToken('Desktop Click');

    // First click to expand (desktop mode - no touch events)
    cy.get('#player-circle li').eq(0).find('.icon-reminder').first().as('customReminder');
    cy.get('@customReminder').click({ force: true });

    cy.wait(300); // Wait for suppress window

    // Second click should open edit modal in desktop mode
    cy.get('@customReminder').click({ force: true });

    // Modal should open
    cy.get('#custom-reminder-edit-modal').should('be.visible');
    cy.get('#custom-reminder-text-input').should('contain', 'Desktop Click');
  });
});
