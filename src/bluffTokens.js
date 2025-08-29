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
  token.style.position = 'relative';
  token.style.overflow = 'visible';
  
  // Add label
  const label = document.createElement('div');
  label.className = 'bluff-label';
  label.textContent = `Bluff ${index + 1}`;
  token.appendChild(label);
  
  // Click handler
  token.addEventListener('click', (e) => {
    e.stopPropagation();
    openBluffCharacterModal({ grimoireState, bluffIndex: index });
  });
  
  // Touch handler
  if (isTouchDevice()) {
    token.addEventListener('touchstart', (e) => {
      e.stopPropagation();
      e.preventDefault();
      openBluffCharacterModal({ grimoireState, bluffIndex: index });
    });
  }
  
  // Hover handler for tooltips
  token.addEventListener('mouseenter', (e) => {
    const character = grimoireState.bluffs?.[index];
    if (character) {
      const role = grimoireState.allRoles[character];
      if (role) {
        const tooltipContent = `
          <div class="role-name">${role.name}</div>
          <div class="role-ability">${role.ability || ''}</div>
        `;
        positionTooltip({ x: e.pageX, y: e.pageY, visible: true, content: tooltipContent });
      }
    }
  });
  
  token.addEventListener('mouseleave', () => {
    positionTooltip({ visible: false });
  });
  
  // Touch ability popup
  if (isTouchDevice()) {
    let touchTimer;
    token.addEventListener('touchstart', (e) => {
      const character = grimoireState.bluffs?.[index];
      if (character) {
        touchTimer = setTimeout(() => {
          const role = grimoireState.allRoles[character];
          if (role) {
            const touch = e.touches[0];
            showTouchAbilityPopup({
              x: touch.pageX,
              y: touch.pageY,
              role,
              visible: true
            });
          }
        }, 700);
      }
    });
    
    token.addEventListener('touchend', () => {
      clearTimeout(touchTimer);
    });
    
    token.addEventListener('touchmove', () => {
      clearTimeout(touchTimer);
    });
  }
  
  return token;
}

export function updateBluffToken({ grimoireState, index }) {
  const token = document.querySelector(`[data-bluff-index="${index}"]`);
  if (!token) return;
  
  const character = grimoireState.bluffs?.[index];
  
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
  grimoireState.selectedPlayerIndex = -1; // Indicate this is for bluff, not player
  
  // Update modal title
  const modalTitle = characterModal.querySelector('h3');
  modalTitle.textContent = `Select Bluff ${bluffIndex + 1}`;
  characterModalPlayerName.textContent = '';
  
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
    
    // Clear selection
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