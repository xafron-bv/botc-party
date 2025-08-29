describe('player raised state persistence', () => {
  function startGameWithPlayers(playerCount) {
    cy.get('input[type="number"]').clear().type(playerCount.toString());
    cy.get('#start-game').click();
  }

  beforeEach(() => {
    cy.visit('/');
    // Enable touch support globally
    cy.window().then((win) => {
      win.ontouchstart = () => {};
    });
  });

  it('demonstrates the issue when player should stay raised after action', () => {
    startGameWithPlayers(20);
    cy.viewport(800, 600);
    
    // Wait for game to initialize
    cy.wait(1000);
    
    // We need to manually set overlapping positions to ensure consistent test
    cy.window().then((win) => {
      const { document } = win;
      const players = document.querySelectorAll('#player-circle li');
      
      // Force first two players to overlap by setting their positions
      if (players[0] && players[1]) {
        // Set both to same position to guarantee overlap
        players[0].style.position = 'absolute';
        players[0].style.left = '300px';
        players[0].style.top = '300px';
        players[0].style.zIndex = '10';
        
        players[1].style.position = 'absolute';
        players[1].style.left = '320px'; // Slightly offset but overlapping
        players[1].style.top = '320px';
        players[1].style.zIndex = '20'; // Player 1 is on top
      }
    });
    
    // Now test the death ribbon interaction
    // First tap should raise player 0
    cy.get('#player-circle li').eq(0).find('.death-ribbon')
      .trigger('touchstart', { force: true });
    cy.get('#player-circle li').eq(0).find('.death-ribbon')  
      .trigger('touchend', { force: true });
    
    // Check that player is raised
    cy.get('#player-circle li').eq(0).should(($li) => {
      expect($li.attr('data-raised')).to.equal('true');
      const zIndex = parseInt($li[0].style.zIndex, 10);
      expect(zIndex).to.be.greaterThan(100); // Should be raised to 200
    });
    
    // Second tap should toggle death
    cy.get('#player-circle li').eq(0).find('.death-ribbon')
      .trigger('touchstart', { force: true });
    cy.get('#player-circle li').eq(0).find('.death-ribbon')
      .trigger('touchend', { force: true });
    
    // Player should be dead
    cy.get('#player-circle li').eq(0).should('have.class', 'dead');
    
    // BUT player should STILL be raised
    cy.get('#player-circle li').eq(0).should(($li) => {
      expect($li.attr('data-raised')).to.equal('true');
      const zIndex = parseInt($li[0].style.zIndex, 10);
      expect(zIndex).to.be.greaterThan(100); // Should still be raised
    });
    
    // Now tap on death vote indicator (it should exist since player is dead)
    cy.get('#player-circle li').eq(0).find('.death-vote-indicator')
      .trigger('touchstart', { force: true });
    cy.get('#player-circle li').eq(0).find('.death-vote-indicator')
      .trigger('touchend', { force: true });
    
    // Death vote should be removed
    cy.get('#player-circle li').eq(0).find('.death-vote-indicator').should('not.exist');
    
    // BUT player should STILL be raised
    cy.get('#player-circle li').eq(0).should(($li) => {
      expect($li.attr('data-raised')).to.equal('true');
      const zIndex = parseInt($li[0].style.zIndex, 10);
      expect(zIndex).to.be.greaterThan(100); // Should still be raised
    });
    
    // Only when clicking outside should it lose raised state
    cy.get('body').trigger('touchstart', { clientX: 10, clientY: 10 });
    
    cy.get('#player-circle li').eq(0).should(($li) => {
      expect($li.attr('data-raised')).to.be.undefined;
      const zIndex = parseInt($li[0].style.zIndex, 10);
      expect(zIndex).to.be.lessThan(50); // Should be back to normal
    });
  });
});