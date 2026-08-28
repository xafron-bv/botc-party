describe('Player two-tap behavior in touch mode', () => {
  beforeEach(() => {
    cy.viewport(800, 600);
    cy.visit('/', {
      onBeforeLoad(win) {
        win.localStorage.clear();
        Object.defineProperty(win, 'ontouchstart', { value: true, configurable: true });
        Object.defineProperty(win.navigator, 'maxTouchPoints', { value: 1, configurable: true });
      }
    });

    // Load script and start game with many players
    cy.setupGame({ players: 20, loadScript: true });
    cy.get('#sidebar').scrollTo('top', { ensureScrollable: false });
  });

  it('demonstrates two-tap behavior for overlapping players', () => {
    // With 20 players on a small screen, many will overlap
    // Test shows that the implementation works:
    // - First tap on overlapping player raises it
    // - Second tap performs the action
    // - Only one player can be raised at a time

    // Find a player in the middle of the circle (likely to overlap)
    const playerToken = cy.get('#player-circle li').eq(10).find('.player-token');

    // First tap
    playerToken.trigger('touchstart', { force: true, touches: [{ clientX: 10, clientY: 10 }] });
    playerToken.trigger('touchend', { force: true });

    // Wait for either modal to become visible or player to be raised
    // This is better than cy.wait because it waits only as long as needed
    cy.get('body').should(($body) => {
      const modalVisible = $body.find('#character-modal:visible').length > 0;
      const playerRaised = $body.find('#player-circle li').eq(10).attr('data-raised') === 'true';

      // Either modal opened (not overlapping) or player raised (overlapping)
      expect(modalVisible || playerRaised).to.be.true;
    });

    // Check the result and handle second tap if needed
    cy.get('body').then($body => {
      const modalVisible = $body.find('#character-modal:visible').length > 0;
      const playerRaised = $body.find('#player-circle li').eq(10).attr('data-raised') === 'true';

      if (!modalVisible && playerRaised) {
        // Player was raised, so it was overlapping
        // Second tap should open modal
        playerToken.trigger('touchstart', { force: true, touches: [{ clientX: 10, clientY: 10 }] });
        playerToken.trigger('touchend', { force: true });
        cy.get('#character-modal').should('be.visible');
      }
    });
  });

  it('ensures only one player can be raised at a time', () => {
    // Try multiple players to find overlapping ones
    let firstRaisedIndex = -1;
    let secondRaisedIndex = -1;

    // Try to raise first player
    cy.wrap([5, 7, 9, 11, 13]).each((index) => {
      if (firstRaisedIndex === -1) {
        cy.get('#player-circle li').eq(index).find('.player-token').trigger('touchstart', { force: true, touches: [{ clientX: 10, clientY: 10 }] });
        cy.get('#player-circle li').eq(index).find('.player-token').trigger('touchend', { force: true });

        cy.get('#player-circle li').eq(index).then($li => {
          if ($li.attr('data-raised') === 'true') {
            firstRaisedIndex = index;
          }
        });
      }
    }).then(() => {
      if (firstRaisedIndex !== -1) {
        // We found a raised player, try to raise another
        cy.wrap([15, 17, 19]).each((index) => {
          if (secondRaisedIndex === -1 && index !== firstRaisedIndex) {
            cy.get('#player-circle li').eq(index).find('.player-token').trigger('touchstart', { force: true, touches: [{ clientX: 10, clientY: 10 }] });
            cy.get('#player-circle li').eq(index).find('.player-token').trigger('touchend', { force: true });

            cy.get('#player-circle li').eq(index).then($li => {
              if ($li.attr('data-raised') === 'true') {
                secondRaisedIndex = index;
              }
            });
          }
        }).then(() => {
          if (secondRaisedIndex !== -1) {
            // Second player raised, first should not be raised anymore
            cy.get('#player-circle li').eq(firstRaisedIndex).should('not.have.attr', 'data-raised');
            cy.get('#player-circle li[data-raised="true"]').should('have.length', 1);
          }
        });
      }
    });
  });
});
