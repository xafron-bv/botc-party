describe('Player Name Token Overlap - JavaScript Solution', () => {
  it('should ensure no player names appear above other player tokens via dynamic z-index', () => {
    cy.visit('/');
    cy.get('#modal-bg').should('not.exist');
    
    // Set viewport to iPhone size
    cy.viewport(375, 667);
    
    // Setup game with 11 players
    cy.get('body').then($body => {
      if ($body.hasClass('sidebar-collapsed')) {
        cy.get('#sidebar-toggle').should('be.visible').click();
      }
    });
    
    cy.get('#load-tb').click();
    
    cy.get('body').then($body => {
      if (!$body.hasClass('sidebar-collapsed')) {
        cy.get('#sidebar-close').click({ force: true });
      }
    });
    
    const playerNames = [
      'Ben', 'Barrow', 'George', 'Jacqui', 
      'Sabernite', 'Iris', 'Gecko', 'Schnauzer',
      'Brockwell', 'Jen', 'Ivan'
    ];
    
    cy.get('#player-count').clear({ force: true }).type(playerNames.length.toString(), { force: true });
    cy.get('#start-game').click({ force: true });
    
    // Wait for the game to be created
    cy.get('.player-name').should('have.length', playerNames.length);
    
    // Set player names
    cy.window().then((win) => {
      const stub = cy.stub(win, 'prompt');
      playerNames.forEach((name, index) => {
        stub.onCall(index).returns(name);
      });
    });
    
    cy.get('.player-name').each(($el, index) => {
      if (index < playerNames.length) {
        cy.wrap($el).click();
        cy.wrap($el).should('contain', playerNames[index]);
      }
    });
    
    // Wait for layout to settle and overlap fix to run
    cy.wait(2000);
    
    // Check that the JavaScript fix has been applied correctly
    cy.window().then(win => {
      const doc = win.document;
      const listItems = doc.querySelectorAll('#player-circle li');
      const players = [];
      
      // Gather all player data
      listItems.forEach((li, index) => {
        const name = li.querySelector('.player-name');
        const token = li.querySelector('.player-token');
        
        if (name && token) {
          players.push({
            li,
            index,
            name,
            token,
            nameText: name.textContent.trim(),
            liZIndex: parseInt(li.style.zIndex || '0'),
            nameRect: name.getBoundingClientRect(),
            tokenRect: token.getBoundingClientRect()
          });
        }
      });
      
      // Log the z-index assignments
      console.log('Z-index assignments:');
      players.forEach(p => {
        console.log(`  ${p.nameText}: z-index ${p.liZIndex}`);
      });
      
      // Check for overlaps and verify z-index ordering
      const issues = [];
      
      players.forEach((player1, idx1) => {
        players.forEach((player2, idx2) => {
          if (idx1 === idx2) return;
          
          const nameRect = player1.nameRect;
          const tokenRect = player2.tokenRect;
          
          // Check if player1's name overlaps with player2's token
          const overlapping = !(
            nameRect.right < tokenRect.left ||
            nameRect.left > tokenRect.right ||
            nameRect.bottom < tokenRect.top ||
            nameRect.top > tokenRect.bottom
          );
          
          if (overlapping) {
            console.log(`Overlap: ${player1.nameText}'s name overlaps ${player2.nameText}'s token`);
            console.log(`  ${player1.nameText} li z-index: ${player1.liZIndex}`);
            console.log(`  ${player2.nameText} li z-index: ${player2.liZIndex}`);
            
            // The player whose token is overlapped should have higher z-index
            if (player2.liZIndex <= player1.liZIndex) {
              issues.push({
                problem: `${player1.nameText}'s name overlaps ${player2.nameText}'s token, but z-indexes are not correct`,
                namePlayer: player1.nameText,
                tokenPlayer: player2.nameText,
                namePlayerZ: player1.liZIndex,
                tokenPlayerZ: player2.liZIndex
              });
            }
          }
        });
      });
      
      // Log any issues found
      if (issues.length > 0) {
        console.log('Z-index issues found:');
        issues.forEach(issue => {
          console.log(`  ${issue.problem}`);
          console.log(`    ${issue.namePlayer} z: ${issue.namePlayerZ}, ${issue.tokenPlayer} z: ${issue.tokenPlayerZ}`);
        });
      } else {
        console.log('No z-index issues found - all overlapping tokens have correct z-index!');
      }
      
      // The test passes if there are no z-index ordering issues
      expect(issues.length).to.equal(0);
    });
  });
});