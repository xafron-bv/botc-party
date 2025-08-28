// Name positioning algorithm to prevent overlaps (browser-native ES module)

export function adjustPlayerNamePositions(playerCircle) {
  const listItems = playerCircle.querySelectorAll('li');
  if (listItems.length === 0) return;
  
  // Skip async in test environment to avoid timing issues
  if (window.Cypress) {
    adjustNamesImmediate(playerCircle, listItems);
  } else {
    // Add a small delay to ensure DOM is ready
    requestAnimationFrame(() => {
      adjustNamesImmediate(playerCircle, listItems);
    });
  }
}

function adjustNamesImmediate(playerCircle, listItems) {
  // Prevent re-entry
  if (playerCircle.dataset.adjustingNames === 'true') return;
  playerCircle.dataset.adjustingNames = 'true';
  
  const nameElements = [];
  const tokenElements = [];
  
  // Collect all name and token elements with their angles
  listItems.forEach((li, index) => {
    const nameEl = li.querySelector('.player-name');
    const tokenEl = li.querySelector('.player-token');
    if (nameEl && tokenEl) {
      const angle = parseFloat(li.dataset.angle || '0');
      nameElements.push({
        element: nameEl,
        angle,
        index,
        li
      });
      tokenElements.push({
        element: tokenEl,
        angle,
        index,
        li
      });
    }
  });
  
  // Sort by angle for easier neighbor detection
  nameElements.sort((a, b) => a.angle - b.angle);
  
  // Calculate dynamic spacing based on player count
  const playerCount = nameElements.length;
  const baseDistance = 0.8; // Base distance multiplier
  const minDistance = 0.9; // Minimum distance to prevent overlap with token
  const maxDistance = 2.0; // Maximum distance for readability
  
  // For many players, increase the distance more aggressively
  let distanceMultiplier = baseDistance;
  if (playerCount > 10) {
    // More aggressive scaling for small screens
    distanceMultiplier = Math.min(maxDistance, baseDistance + (playerCount - 10) * 0.1);
  }
  
  // Apply alternating distances for very crowded circles
  const useAlternating = playerCount > 10; // Start alternating earlier
  const useSpiral = playerCount > 14; // Use spiral pattern for extreme crowding
  
  nameElements.forEach((nameData, idx) => {
    const { element: nameEl, angle, li } = nameData;
    const tokenSize = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--token-size'));
    
    // Calculate base position
    let distance = distanceMultiplier;
    
    // For alternating pattern, push every other name further out
    if (useSpiral) {
      // Spiral pattern: gradually increase distance for each name
      const spiralIncrement = 0.25;
      distance = distanceMultiplier + (idx * spiralIncrement);
      
      // Also alternate for better distribution
      const isEven = idx % 2 === 0;
      distance += isEven ? 0 : 0.4;
    } else if (useAlternating) {
      const isEven = idx % 2 === 0;
      distance = isEven ? distanceMultiplier : distanceMultiplier + 0.6;
    }
    
    // Adjust distance based on quadrant to utilize space better
    const yv = Math.sin(angle);
    const xv = Math.cos(angle);
    const isNorthQuadrant = yv < 0;
    
    // Apply position
    const offset = tokenSize * distance;
    
    // For side positions (near 3 and 9 o'clock), push names further out
    const absX = Math.abs(xv);
    if (absX > 0.8) { // Near horizontal
      distance += 0.2;
    }
    
    // Update CSS custom property for this specific name
    nameEl.style.setProperty('--name-distance', distance);
    
    // Reapply top/bottom positioning
    if (isNorthQuadrant) {
      nameEl.style.top = `calc(50% - var(--token-size) * ${distance})`;
    } else {
      nameEl.style.top = `calc(50% + var(--token-size) * ${distance})`;
    }
    
    // For very crowded scenarios, slightly rotate names to follow the circle
    if (playerCount > 12) {
      const rotationAngle = angle * (180 / Math.PI);
      // Only rotate slightly to maintain readability
      const maxRotation = 20; // degrees
      const rotation = Math.max(-maxRotation, Math.min(maxRotation, rotationAngle * 0.15));
      nameEl.style.transform = `translate(-50%, -50%) rotate(${rotation}deg)`;
    } else {
      nameEl.style.transform = 'translate(-50%, -50%)';
    }
    
    // Adjust font size for many players
    if (playerCount > 12) {
      const scaleFactor = Math.max(0.8, 1 - (playerCount - 12) * 0.03);
      nameEl.style.fontSize = `calc(clamp(12px, 2.2vmin, 18px) * ${scaleFactor})`;
    }
  });
  
  // Fine-tune positions to prevent overlaps
  const tokenSizeValue = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--token-size'));
  preventNameOverlaps(nameElements, tokenSizeValue);
  
  // Clear the flag after completion
  playerCircle.dataset.adjustingNames = 'false';
}

function preventNameOverlaps(nameElements, tokenSize) {
  const maxIterations = 8;
  const minGap = 10; // Minimum pixels between name elements
  
  for (let iteration = 0; iteration < maxIterations; iteration++) {
    let hasOverlap = false;
    
    // Check all pairs of elements, not just neighbors
    for (let i = 0; i < nameElements.length; i++) {
      for (let j = i + 1; j < nameElements.length; j++) {
        const elem1 = nameElements[i];
        const elem2 = nameElements[j];
        
        const rect1 = elem1.element.getBoundingClientRect();
        const rect2 = elem2.element.getBoundingClientRect();
        
        // Check for overlap with gap
        const overlap = !(
          rect1.right + minGap < rect2.left ||
          rect1.left > rect2.right + minGap ||
          rect1.bottom + minGap < rect2.top ||
          rect1.top > rect2.bottom + minGap
        );
        
        if (overlap) {
          hasOverlap = true;
          
          // Move both elements outward more aggressively
          [elem1, elem2].forEach(elem => {
            const currentDistance = parseFloat(elem.element.style.getPropertyValue('--name-distance') || '0.8');
            const newDistance = currentDistance + 0.25;
            elem.element.style.setProperty('--name-distance', newDistance);
            
            // Update position
            const yv = Math.sin(elem.angle);
            const isNorthQuadrant = yv < 0;
            if (isNorthQuadrant) {
              elem.element.style.top = `calc(50% - var(--token-size) * ${newDistance})`;
            } else {
              elem.element.style.top = `calc(50% + var(--token-size) * ${newDistance})`;
            }
          });
        }
      }
    }
    
    if (!hasOverlap) break;
  }
}