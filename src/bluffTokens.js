import { resolveAssetPath } from '../utils.js';
import { createCurvedLabelSvg } from './ui/svg.js';
import { positionTooltip, showTouchAbilityPopup } from './ui/tooltip.js';
import { populateCharacterGrid } from './character.js';
import { saveAppState } from './app.js';
import { isTouchDevice } from './constants.js';

export function createBluffTokensContainer({ grimoireState }) {
  // Create container for bluff tokens
  const container = document.createElement('div');
  container.id = 'bluff-tokens-container';
  container.className = 'bluff-tokens-container';
  
  // Create 3 bluff token slots
  for (let i = 0; i < 3; i++) {
    const bluffToken = createBluffToken({ grimoireState, index: i });
    container.appendChild(bluffToken);
  }
  
  return container;
}

export function createBluffToken({ grimoireState, index }) {
  const token = document.createElement('div');
  token.className = 'bluff-token empty';
  token.dataset.bluffIndex = index;
  
  // Set background image (empty token by default)
  token.style.backgroundImage = `url('./assets/img/token-BqDQdWeO.webp')`;
  token.style.backgroundSize = 'cover';
  token.style.backgroundPosition = 'center';
  token.style.backgroundRepeat = 'no-repeat';
  token.style.position = 'relative';
  token.style.overflow = 'visible';
  
  // Add label
  const label = document.createElement('div');
  label.className = 'bluff-label';
  label.textContent = `Bluff ${index + 1}`;
  token.appendChild(label);
  
  // Track if a touch event has occurred to prevent click after touch
  let touchOccurred = false;
  
  // Click handler
  token.addEventListener('click', (e) => {
    // Don't handle if clicking on info icon
    if (e.target.closest('.ability-info-icon')) {
      return;
    }
    // Ignore click if it was triggered by a touch event
    if (touchOccurred) {
      touchOccurred = false;
      return;
    }
    e.stopPropagation();
    openBluffCharacterModal({ grimoireState, bluffIndex: index });
  });
  
  // Hover handler for tooltips
  token.addEventListener('mouseenter', (e) => {
    const character = grimoireState.bluffs?.[index];
    if (character) {
      const role = grimoireState.allRoles[character];
      if (role) {
        const abilityTooltip = document.getElementById('ability-tooltip');
        if (abilityTooltip) {
          abilityTooltip.innerHTML = `
            <div class="role-name">${role.name}</div>
            <div class="role-ability">${role.ability || ''}</div>
          `;
          abilityTooltip.classList.add('show');
          positionTooltip(token, abilityTooltip);
        }
      }
    }
  });
  
  token.addEventListener('mouseleave', () => {
    const abilityTooltip = document.getElementById('ability-tooltip');
    if (abilityTooltip) {
      abilityTooltip.classList.remove('show');
    }
  });
  
  // Simple touch handling - just prevent double click
  if (isTouchDevice) {
    token.addEventListener('touchstart', (e) => {
      // Don't handle if clicking on info icon
      if (e.target.closest('.ability-info-icon')) {
        return;
      }
      // Mark that a touch occurred to prevent click event
      touchOccurred = true;
    });
    
    token.addEventListener('touchend', (e) => {
      // Don't handle if clicking on info icon
      if (e.target.closest('.ability-info-icon')) {
        return;
      }
      
      e.preventDefault();
      
      // Trigger the modal opening
      openBluffCharacterModal({ grimoireState, bluffIndex: index });
      
      // Reset touch flag after a delay to handle any delayed click events
      setTimeout(() => {
        touchOccurred = false;
      }, 300);
    });
  }
  
  // Add info icon for touch mode (initially hidden)
  if (isTouchDevice) {
    const infoIcon = document.createElement('div');
    infoIcon.className = 'ability-info-icon bluff-info-icon';
    infoIcon.innerHTML = '<i class="fas fa-info-circle"></i>';
    infoIcon.dataset.bluffIndex = index;
    infoIcon.style.display = 'none'; // Initially hidden
    
    // Handle both click and touch events
    const handleInfoClick = (e) => {
      e.stopPropagation();
      e.preventDefault();
      const character = grimoireState.bluffs?.[index];
      if (character) {
        const role = grimoireState.allRoles[character];
        if (role && role.ability) {
          showTouchAbilityPopup(infoIcon, role.ability);
        }
      }
    };
    
    infoIcon.onclick = handleInfoClick;
    infoIcon.addEventListener('touchstart', (e) => {
      e.stopPropagation();
      e.preventDefault();
      handleInfoClick(e);
    });
    
    token.appendChild(infoIcon);
  }
  
  return token;
}

export function updateBluffToken({ grimoireState, index }) {
  const token = document.querySelector(`[data-bluff-index="${index}"]`);
  if (!token) return;
  
  const character = grimoireState.bluffs?.[index];
  const infoIcon = token.querySelector('.ability-info-icon');
  
  if (character && grimoireState.allRoles[character]) {
    const role = grimoireState.allRoles[character];
    
    // Update appearance
    token.classList.remove('empty');
    token.classList.add('has-character');
    token.dataset.character = character;
    
    // Set character image with fallback
    const characterImage = role.image || './assets/img/token-BqDQdWeO.webp';
    token.style.backgroundImage = `url('${characterImage}'), url('./assets/img/token-BqDQdWeO.webp')`;
    token.style.backgroundSize = '68% 68%, cover';
    token.style.backgroundPosition = 'center, center';
    token.style.backgroundRepeat = 'no-repeat, no-repeat';
    token.style.backgroundColor = 'transparent';
    
    // Update or create curved label
    let svg = token.querySelector('svg');
    if (svg) {
      svg.remove();
    }
    svg = createCurvedLabelSvg(`bluff-role-arc-${character}`, role.name);
    token.appendChild(svg);
    
    // Remove the default label when character is assigned
    const label = token.querySelector('.bluff-label');
    if (label) {
      label.style.display = 'none';
    }
    
    // Show/hide info icon based on whether role has ability
    if (infoIcon) {
      infoIcon.style.display = (isTouchDevice && role.ability) ? 'flex' : 'none';
    }
  } else {
    // Clear the token
    token.classList.add('empty');
    token.classList.remove('has-character');
    delete token.dataset.character;
    
    // Reset to empty token appearance
    token.style.backgroundImage = `url('./assets/img/token-BqDQdWeO.webp')`;
    token.style.backgroundSize = 'cover';
    
    // Remove any curved label
    const svg = token.querySelector('svg');
    if (svg) {
      svg.remove();
    }
    
    // Show the default label
    const label = token.querySelector('.bluff-label');
    if (label) {
      label.style.display = 'block';
    }
    
    // Hide info icon when no character
    if (infoIcon) {
      infoIcon.style.display = 'none';
    }
  }
}

export function openBluffCharacterModal({ grimoireState, bluffIndex }) {
  const characterModal = document.getElementById('character-modal');
  const characterModalPlayerName = document.getElementById('character-modal-player-name');
  const characterSearch = document.getElementById('character-search');
  
  if (!grimoireState.scriptData) {
    alert('Please load a script first.');
    return;
  }
  
  // Store the bluff index in grimoire state temporarily
  grimoireState.selectedBluffIndex = bluffIndex;
  // Don't modify selectedPlayerIndex - it should remain as is
  
  // Update modal title
  const modalTitle = characterModal.querySelector('h3');
  if (modalTitle) {
    modalTitle.textContent = `Select Bluff ${bluffIndex + 1}`;
  }
  if (characterModalPlayerName) {
    characterModalPlayerName.textContent = '';
  }
  
  populateCharacterGrid({ grimoireState });
  characterModal.style.display = 'flex';
  characterSearch.value = '';
  characterSearch.focus();
}

export function assignBluffCharacter({ grimoireState, roleId }) {
  const characterModal = document.getElementById('character-modal');
  
  if (grimoireState.selectedBluffIndex !== undefined && grimoireState.selectedBluffIndex > -1) {
    // Initialize bluffs array if it doesn't exist
    if (!grimoireState.bluffs) {
      grimoireState.bluffs = [null, null, null];
    }
    
    // Assign the character to the bluff slot
    grimoireState.bluffs[grimoireState.selectedBluffIndex] = roleId;
    
    // Update the bluff token display
    updateBluffToken({ grimoireState, index: grimoireState.selectedBluffIndex });
    
    // Hide the modal
    characterModal.style.display = 'none';
    
    // Clear bluff selection
    delete grimoireState.selectedBluffIndex;
    
    // Save state
    saveAppState({ grimoireState });
  }
}

export function updateAllBluffTokens({ grimoireState }) {
  for (let i = 0; i < 3; i++) {
    updateBluffToken({ grimoireState, index: i });
  }
}

export function resetBluffTokens({ grimoireState }) {
  grimoireState.bluffs = [null, null, null];
  updateAllBluffTokens({ grimoireState });
}