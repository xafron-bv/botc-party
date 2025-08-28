describe('Player Name Layering Issue - TDD', () => {
  it('should fail when player names appear above other player tokens (reproducing the bug)', () => {
    // This test should FAIL initially, demonstrating the issue where
    // player names like "Brockwell" appear on top of other players' tokens
    // The issue is that without proper z-index stacking contexts on li elements,
    // player names can appear above neighboring player tokens
    
    cy.visit('/');
    cy.get('#modal-bg').should('not.exist');
    
    // Set viewport to iPhone size to match the screenshot
    cy.viewport(375, 667);
    
    // Setup game with many players to reproduce the issue
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
    
    // Create a game with player names matching the screenshot
    const playerNames = [
      'Ben', 'Barrow', 'George', 'Jacqui', 
      'Sabernite', 'Iris', 'Gecko', 'Schnauzer',
      'Brockwell', 'Jen', 'Ivan'
    ];
    
    cy.get('#player-count').clear({ force: true }).type(playerNames.length.toString(), { force: true });
    cy.get('#start-game').click({ force: true });
    
    // Wait for the game to be created
    cy.get('.player-name').should('have.length', playerNames.length);
    
    // Set player names to match the screenshot
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
    
    // Wait for layout to settle
    cy.wait(1000);
    
    // Now check for the specific issue: player names overlapping with other player tokens
    cy.window().then(win => {
      const doc = win.document;
      const issues = [];
      
      // Get all player names and tokens
      const playerNames = doc.querySelectorAll('.player-name');
      const playerTokens = doc.querySelectorAll('.player-token');
      
      // Check each player name to see if it appears above any OTHER player's token
      playerNames.forEach((nameEl, nameIdx) => {
        const nameRect = nameEl.getBoundingClientRect();
        const nameComputedStyle = win.getComputedStyle(nameEl);
        const nameZIndex = parseInt(nameComputedStyle.zIndex || '0');
        
        // Get the parent li element's z-index
        const nameLi = nameEl.closest('li');
        const nameLiStyle = win.getComputedStyle(nameLi);
        const nameLiZIndex = parseInt(nameLiStyle.zIndex || '0');
        
        playerTokens.forEach((tokenEl, tokenIdx) => {
          // Skip if it's the same player
          if (nameIdx === tokenIdx) return;
          
          const tokenRect = tokenEl.getBoundingClientRect();
          const tokenComputedStyle = win.getComputedStyle(tokenEl);
          const tokenZIndex = parseInt(tokenComputedStyle.zIndex || '0');
          
          // Get the token's parent li element's z-index
          const tokenLi = tokenEl.closest('li');
          const tokenLiStyle = win.getComputedStyle(tokenLi);
          const tokenLiZIndex = parseInt(tokenLiStyle.zIndex || '0');
          
          // Check if they overlap
          const overlapping = !(
            nameRect.right < tokenRect.left ||
            nameRect.left > tokenRect.right ||
            nameRect.bottom < tokenRect.top ||
            nameRect.top > tokenRect.bottom
          );
          
          if (overlapping) {
            // Calculate effective z-index (considering parent z-index)
            const effectiveNameZ = nameLiZIndex * 1000 + nameZIndex;
            const effectiveTokenZ = tokenLiZIndex * 1000 + tokenZIndex;
            
            // Check if name appears above token
            if (effectiveNameZ >= effectiveTokenZ) {
              const nameText = nameEl.textContent.trim();
              const tokenPlayerName = tokenEl.closest('li').querySelector('.player-name')?.textContent.trim() || 'Unknown';
              
              issues.push({
                issue: `Player name "${nameText}" appears above ${tokenPlayerName}'s token`,
                nameZ: effectiveNameZ,
                tokenZ: effectiveTokenZ,
                nameText,
                overlappingWith: tokenPlayerName
              });
              
              // Log for debugging
              console.log(`ISSUE FOUND: "${nameText}" (z: ${effectiveNameZ}) is above "${tokenPlayerName}"'s token (z: ${effectiveTokenZ})`);
            }
          }
        });
      });
      
      // Log all issues found
      if (issues.length > 0) {
        console.log('Total issues found:', issues.length);
        issues.forEach(issue => console.log(issue));
      }
      
      // Log diagnostic info
      console.log('=== Z-INDEX DIAGNOSTIC INFO ===');
      const firstNameEl = playerNames[0];
      const firstTokenEl = playerTokens[0];
      console.log('First player name z-index:', win.getComputedStyle(firstNameEl).zIndex);
      console.log('First player token z-index:', win.getComputedStyle(firstTokenEl).zIndex);
      console.log('First player li z-index:', win.getComputedStyle(firstNameEl.closest('li')).zIndex);
      
      // Additional check: if z-index of names is >= tokens, that's also an issue
      if (issues.length === 0) {
        // Check if player names have z-index that would make them appear above tokens
        const nameZ = parseInt(win.getComputedStyle(playerNames[0]).zIndex || '0');
        const tokenZ = parseInt(win.getComputedStyle(playerTokens[0]).zIndex || '0');
        
        console.log('Name z-index:', nameZ, 'Token z-index:', tokenZ);
        
        // On touch devices, names should have lower z-index than tokens
        if (nameZ >= tokenZ) {
          issues.push({
            issue: 'Player names have same or higher z-index as tokens',
            nameZ,
            tokenZ
          });
        }
      }
      
      // This assertion should now PASS after the fix
      // No player names should appear above other players' tokens
      expect(issues.length).to.equal(0);
    });
  });
});