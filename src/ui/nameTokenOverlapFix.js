// Fix player name overlapping other player tokens by adjusting z-index
export function fixPlayerNameTokenOverlaps() {
  const playerCircle = document.querySelector('#player-circle');
  if (!playerCircle) return;
  
  const listItems = playerCircle.querySelectorAll('li');
  if (listItems.length === 0) return;
  
  // Reset all z-indexes first
  listItems.forEach(li => {
    li.style.zIndex = '';
  });
  
  // Build a list of all player elements with their bounds
  const players = [];
  listItems.forEach((li, index) => {
    const name = li.querySelector('.player-name');
    const token = li.querySelector('.player-token');
    
    if (name && token) {
      players.push({
        li,
        index,
        name,
        token,
        nameRect: name.getBoundingClientRect(),
        tokenRect: token.getBoundingClientRect()
      });
    }
  });
  
  // Check for overlaps and build a dependency graph
  const overlaps = [];
  
  players.forEach((player1, idx1) => {
    players.forEach((player2, idx2) => {
      if (idx1 === idx2) return;
      
      // Check if player1's name overlaps with player2's token
      const nameRect = player1.nameRect;
      const tokenRect = player2.tokenRect;
      
      const overlapping = !(
        nameRect.right < tokenRect.left ||
        nameRect.left > tokenRect.right ||
        nameRect.bottom < tokenRect.top ||
        nameRect.top > tokenRect.bottom
      );
      
      if (overlapping) {
        overlaps.push({
          namePlayer: idx1,
          tokenPlayer: idx2
        });
      }
    });
  });
  
  // Calculate z-index for each player to ensure tokens are above names
  // We need to ensure that if player A's name overlaps player B's token,
  // then player B should have a higher z-index than player A
  
  const zIndexMap = new Map();
  let maxZIndex = 0;
  
  // Initialize all players with z-index 0
  players.forEach((_, idx) => {
    zIndexMap.set(idx, 0);
  });
  
  // Process overlaps with multiple passes to handle transitive dependencies
  let changed = true;
  let passes = 0;
  while (changed && passes < 10) {
    changed = false;
    passes++;
    
    overlaps.forEach(overlap => {
      const namePlayerZ = zIndexMap.get(overlap.namePlayer) || 0;
      const tokenPlayerZ = zIndexMap.get(overlap.tokenPlayer) || 0;
      
      // Token player needs to be above name player
      if (tokenPlayerZ <= namePlayerZ) {
        const newZ = namePlayerZ + 1;
        zIndexMap.set(overlap.tokenPlayer, newZ);
        maxZIndex = Math.max(maxZIndex, newZ);
        changed = true;
      }
    });
  }
  
  // Apply the calculated z-indexes
  players.forEach((player, idx) => {
    const zIndex = zIndexMap.get(idx) || 0;
    // Always set z-index, even if 0, to ensure consistent behavior
    player.li.style.zIndex = zIndex;
  });
  
  // Debug logging
  console.log(`Overlap fix: Found ${overlaps.length} overlaps, max z-index: ${maxZIndex}`);
  if (overlaps.length > 0) {
    overlaps.forEach(overlap => {
      const namePlayer = players[overlap.namePlayer];
      const tokenPlayer = players[overlap.tokenPlayer];
      console.log(`  ${namePlayer.name.textContent.trim()} name overlaps ${tokenPlayer.name.textContent.trim()}'s token`);
    });
  }
}

// Run the fix whenever the layout changes
export function initOverlapFix() {
  // Run immediately
  fixPlayerNameTokenOverlaps();
  
  // Run after layout updates
  const observer = new ResizeObserver(() => {
    fixPlayerNameTokenOverlaps();
  });
  
  const playerCircle = document.querySelector('#player-circle');
  if (playerCircle) {
    observer.observe(playerCircle);
  }
  
  // Also run on window resize
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      fixPlayerNameTokenOverlaps();
    }, 100);
  });
}