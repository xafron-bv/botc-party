import { displayScript } from './script.js';
import { resolveAssetPath, normalizeKey } from '../utils.js';
import { createCurvedLabelSvg } from './ui/svg.js';
import { updateGrimoire, rebuildPlayerCircleUiPreserveState, renderSetupInfo } from './grimoire.js';
import { saveAppState } from './app.js';
import { saveCurrentPhaseState } from './dayNightTracking.js';
import { assignBluffCharacter } from './bluffTokens.js';

export function populateCharacterGrid({ grimoireState }) {
  const characterGrid = document.getElementById('character-grid');
  const characterSearch = document.getElementById('character-search');
  characterGrid.innerHTML = '';
  const filter = characterSearch.value.toLowerCase();

  // Add empty token option first if filter is empty or matches "none", "clear", "empty"
  if (!filter || ['none', 'clear', 'empty'].some(term => term.includes(filter))) {
    const emptyToken = document.createElement('div');
    emptyToken.className = 'token empty';
    emptyToken.style.backgroundImage = 'url(\'./assets/img/token-BqDQdWeO.webp\')';
    emptyToken.style.backgroundSize = 'cover';
    emptyToken.style.position = 'relative';
    emptyToken.style.overflow = 'visible';
    emptyToken.title = 'No character';
    emptyToken.onclick = () => assignCharacter({ grimoireState, roleId: null });
    // Add curved bottom text for empty token
    const svg = createCurvedLabelSvg('picker-role-arc-empty', 'None');
    emptyToken.appendChild(svg);
    characterGrid.appendChild(emptyToken);
  }

  const filteredRoles = Object.values(grimoireState.allRoles)
    .filter(role => role.name.toLowerCase().includes(filter));

  console.log(`Showing ${filteredRoles.length} characters for filter: "${filter}"`);

  filteredRoles.forEach(role => {
    const tokenEl = document.createElement('div');
    tokenEl.className = 'token';
    tokenEl.style.backgroundImage = `url('${role.image}'), url('./assets/img/token-BqDQdWeO.webp')`;
    tokenEl.style.backgroundSize = '68% 68%, cover';
    tokenEl.style.position = 'relative';
    tokenEl.style.overflow = 'visible';
    tokenEl.title = role.name;
    tokenEl.onclick = () => assignCharacter({ grimoireState, roleId: role.id });
    // Add curved bottom text on the token preview
    const svg = createCurvedLabelSvg(`picker-role-arc-${role.id}`, role.name);
    tokenEl.appendChild(svg);
    characterGrid.appendChild(tokenEl);
  });
}

export function assignCharacter({ grimoireState, roleId }) {
  const characterModal = document.getElementById('character-modal');

  // Check if this is for a bluff token
  if (grimoireState.selectedBluffIndex !== undefined && grimoireState.selectedBluffIndex > -1) {
    assignBluffCharacter({ grimoireState, roleId });
    return;
  }

  // Original player assignment logic
  if (grimoireState.selectedPlayerIndex > -1) {
    grimoireState.players[grimoireState.selectedPlayerIndex].character = roleId;
    console.log(`Assigned character ${roleId} to player ${grimoireState.selectedPlayerIndex}`);

    // Save phase state if day/night tracking is enabled
    if (grimoireState.dayNightTracking && grimoireState.dayNightTracking.enabled) {
      saveCurrentPhaseState(grimoireState);
    }

    updateGrimoire({ grimoireState });
    renderSetupInfo({ grimoireState });
    characterModal.style.display = 'none';
    saveAppState({ grimoireState });
  }
}

export function applyTravellerToggleAndRefresh({ grimoireState }) {
  const characterModal = document.getElementById('character-modal');
  grimoireState.allRoles = { ...(grimoireState.baseRoles || {}) };
  if (grimoireState.includeTravellers) {
    grimoireState.allRoles = { ...grimoireState.allRoles, ...(grimoireState.extraTravellerRoles || {}) };
  }
  // Re-render character sheet and, if modal is open, the character grid
  if (Array.isArray(grimoireState.scriptData)) displayScript({ data: grimoireState.scriptData, grimoireState }).catch(console.error);
  if (characterModal && characterModal.style.display === 'flex') {
    populateCharacterGrid({ grimoireState });
  }
}

export async function processScriptCharacters({ characterIds, grimoireState }) {
  try {
    console.log('Loading characters.json to resolve character IDs...');
    const response = await fetch('./characters.json');
    if (!response.ok) {
      throw new Error(`Failed to load characters.json: ${response.status}`);
    }

    const characters = await response.json();
    console.log('characters.json loaded successfully');

    // Create canonical lookups and a normalization index
    const roleLookup = {};
    const normalizedToCanonicalId = {};
    if (Array.isArray(characters)) {
      characters.forEach(role => {
        if (!role || !role.id) return;
        const image = resolveAssetPath(role.image);
        const canonical = { ...role, image, team: (role.team || '').toLowerCase() };
        roleLookup[role.id] = canonical;
        const normId = normalizeKey(role.id);
        const normName = normalizeKey(role.name);
        if (normId) normalizedToCanonicalId[normId] = role.id;
        if (normName) normalizedToCanonicalId[normName] = role.id;
      });
    }

    console.log('Role lookup created with', Object.keys(roleLookup).length, 'roles');

    // Pre-populate extraTravellerRoles with all traveller roles from the dataset
    Object.values(roleLookup).forEach(role => {
      if ((role.team || '').toLowerCase() === 'traveller') {
        grimoireState.extraTravellerRoles[role.id] = role;
      }
    });

    // Process the character IDs from the script using normalization
    characterIds.forEach((characterItem) => {
      if (typeof characterItem === 'string' && characterItem !== '_meta') {
        const key = normalizeKey(characterItem);
        const canonicalId = normalizedToCanonicalId[key];
        if (canonicalId && roleLookup[canonicalId]) {
          const role = roleLookup[canonicalId];
          if (role.team === 'traveller') {
            grimoireState.extraTravellerRoles[canonicalId] = role;
          } else {
            grimoireState.baseRoles[canonicalId] = role;
          }
          console.log(`Resolved character ${characterItem} -> ${canonicalId} (${roleLookup[canonicalId].name})`);
        } else {
          console.warn(`Character not found: ${characterItem}`);
        }
      } else if (typeof characterItem === 'object' && characterItem !== null && characterItem.id && characterItem.id !== '_meta') {
        const idKey = normalizeKey(characterItem.id);
        const nameKey = normalizeKey(characterItem.name || '');
        const canonicalId = normalizedToCanonicalId[idKey] || normalizedToCanonicalId[nameKey];
        if (canonicalId && roleLookup[canonicalId]) {
          const role = roleLookup[canonicalId];
          if (role.team === 'traveller') {
            grimoireState.extraTravellerRoles[canonicalId] = role;
          } else {
            grimoireState.baseRoles[canonicalId] = role;
          }
          console.log(`Resolved object character ${characterItem.id} -> ${canonicalId} (${roleLookup[canonicalId].name})`);
        } else if (characterItem.name && characterItem.team && characterItem.ability) {
          const customRole = {
            id: characterItem.id,
            name: characterItem.name,
            team: String(characterItem.team || '').toLowerCase(),
            ability: characterItem.ability,
            image: characterItem.image ? resolveAssetPath(characterItem.image) : './assets/img/token-BqDQdWeO.webp'
          };
          if (characterItem.reminders) customRole.reminders = characterItem.reminders;
          if (characterItem.remindersGlobal) customRole.remindersGlobal = characterItem.remindersGlobal;
          if (characterItem.setup !== undefined) customRole.setup = characterItem.setup;
          if (characterItem.jinxes) customRole.jinxes = characterItem.jinxes;
          if (customRole.team === 'traveller') {
            grimoireState.extraTravellerRoles[characterItem.id] = customRole;
          } else {
            grimoireState.baseRoles[characterItem.id] = customRole;
          }
          console.log(`Added custom character ${characterItem.id} (${characterItem.name})`);
        } else {
          console.warn('Invalid custom character object:', characterItem);
        }
      }
    });

    console.log('Script processing completed');

  } catch (error) {
    console.error('Error processing script:', error);
    characterIds.forEach((characterItem) => {
      if (typeof characterItem === 'string' && characterItem !== '_meta') {
        grimoireState.baseRoles[characterItem] = {
          id: characterItem,
          name: characterItem.charAt(0).toUpperCase() + characterItem.slice(1),
          image: './assets/img/token-BqDQdWeO.webp',
          team: 'unknown'
        };
      } else if (typeof characterItem === 'object' && characterItem !== null && characterItem.id && characterItem.id !== '_meta') {
        // Handle custom character objects even in error case
        if (characterItem.name && characterItem.team && characterItem.ability) {
          const customFallback = {
            id: characterItem.id,
            name: characterItem.name,
            team: String(characterItem.team || '').toLowerCase(),
            ability: characterItem.ability,
            image: characterItem.image ? resolveAssetPath(characterItem.image) : './assets/img/token-BqDQdWeO.webp'
          };
          if (customFallback.team === 'traveller') {
            grimoireState.extraTravellerRoles[characterItem.id] = customFallback;
          } else {
            grimoireState.baseRoles[characterItem.id] = customFallback;
          }
        }
      }
    });
  }
}

export function openCharacterModal({ grimoireState, playerIndex }) {
  const characterModalPlayerName = document.getElementById('character-modal-player-name');
  const characterSearch = document.getElementById('character-search');
  const characterModal = document.getElementById('character-modal');
  if (!grimoireState.scriptData) {
    alert('Please load a script first.');
    return;
  }
  grimoireState.selectedPlayerIndex = playerIndex;

  // Update modal title back to player selection
  const modalTitle = characterModal.querySelector('h3');
  if (modalTitle && characterModalPlayerName) {
    modalTitle.textContent = 'Select Character for ';
    characterModalPlayerName.textContent = grimoireState.players[playerIndex].name;
  }

  populateCharacterGrid({ grimoireState });
  characterModal.style.display = 'flex';
  characterSearch.value = '';
  characterSearch.focus();
}

export function onIncludeTravellersChange({ grimoireState, includeTravellersCheckbox }) {
  grimoireState.includeTravellers = !!includeTravellersCheckbox.checked;
  applyTravellerToggleAndRefresh({ grimoireState });
  saveAppState({ grimoireState });
}

export async function loadAllCharacters({ grimoireState }) {
  const loadStatus = document.getElementById('load-status');
  try {
    loadStatus.textContent = 'Loading all characters...';
    loadStatus.className = 'status';

    // Load characters.json directly
    const response = await fetch('./characters.json');
    if (!response.ok) {
      throw new Error(`Failed to load characters.json: ${response.status}`);
    }

    const characters = await response.json();
    console.log('Loading all characters from characters.json');

    // Reset role maps
    grimoireState.allRoles = {};
    grimoireState.baseRoles = {};
    grimoireState.extraTravellerRoles = {};
    const roleLookup = {};

    // Process flat characters array (includes townsfolk, outsider, minion, demon, traveller, fabled)
    const characterIds = [];
    if (Array.isArray(characters)) {
      characters.forEach(role => {
        if (!role || !role.id) return;
        const image = resolveAssetPath(role.image);
        const teamName = (role.team || '').toLowerCase();
        const canonical = { ...role, image, team: teamName };
        roleLookup[role.id] = canonical;
        if (teamName === 'traveller') {
          grimoireState.extraTravellerRoles[role.id] = canonical;
        } else {
          grimoireState.baseRoles[role.id] = canonical;
        }
        characterIds.push(role.id);
      });
    }

    console.log(`Loaded ${Object.keys(grimoireState.allRoles).length} characters from all teams`);

    // Create a pseudo-script data array with all character IDs
    grimoireState.scriptData = [{ id: '_meta', name: 'All Characters', author: 'System' }, ...characterIds];
    // Apply traveller toggle to compute allRoles and render
    applyTravellerToggleAndRefresh({ grimoireState });
    saveAppState({ grimoireState });

    loadStatus.textContent = `Loaded ${Object.keys(grimoireState.allRoles).length} characters successfully`;
    loadStatus.className = 'status';

  } catch (error) {
    console.error('Failed to load all characters:', error);
    loadStatus.textContent = `Failed to load all characters: ${error.message}`;
    loadStatus.className = 'error';
  }
}

export function showPlayerContextMenu({ grimoireState, x, y, playerIndex }) {
  const menu = ensurePlayerContextMenu({ grimoireState });
  grimoireState.contextMenuTargetIndex = playerIndex;
  // Set a flag to indicate the menu was just opened
  grimoireState.menuJustOpened = true;
  setTimeout(() => {
    grimoireState.menuJustOpened = false;
  }, 500); // Give 500ms grace period after opening
  
  // Enable/disable buttons based on limits
  const canAdd = grimoireState.players.length < 20;
  const canRemove = grimoireState.players.length > 5;
  const addBeforeBtn = menu.querySelector('#player-menu-add-before');
  const addAfterBtn = menu.querySelector('#player-menu-add-after');
  const removeBtn = menu.querySelector('#player-menu-remove');
  [addBeforeBtn, addAfterBtn, removeBtn].forEach(btn => {
    btn.disabled = false;
    btn.classList.remove('disabled');
  });
  if (!canAdd) { addBeforeBtn.disabled = true; addAfterBtn.disabled = true; addBeforeBtn.classList.add('disabled'); addAfterBtn.classList.add('disabled'); }
  if (!canRemove) { removeBtn.disabled = true; removeBtn.classList.add('disabled'); }
  menu.style.display = 'block';
  // Position within viewport bounds
  const margin = 6;
  requestAnimationFrame(() => {
    const rect = menu.getBoundingClientRect();
    let left = x;
    let top = y;
    if (left + rect.width > window.innerWidth - margin) left = Math.max(margin, window.innerWidth - rect.width - margin);
    if (top + rect.height > window.innerHeight - margin) top = Math.max(margin, window.innerHeight - rect.height - margin);
    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
  });
}

export function hidePlayerContextMenu({ grimoireState }) {
  if (grimoireState.playerContextMenu) grimoireState.playerContextMenu.style.display = 'none';
  grimoireState.contextMenuTargetIndex = -1;
  clearTimeout(grimoireState.longPressTimer);
}

export function ensurePlayerContextMenu({ grimoireState }) {
  if (grimoireState.playerContextMenu) return grimoireState.playerContextMenu;
  const menu = document.createElement('div');
  menu.id = 'player-context-menu';
  const addBeforeBtn = document.createElement('button');
  addBeforeBtn.id = 'player-menu-add-before';
  addBeforeBtn.textContent = 'Add Player Before';
  const addAfterBtn = document.createElement('button');
  addAfterBtn.id = 'player-menu-add-after';
  addAfterBtn.textContent = 'Add Player After';
  const removeBtn = document.createElement('button');
  removeBtn.id = 'player-menu-remove';
  removeBtn.textContent = 'Remove Player';

  // Helper function to handle button actions only on proper tap/click
  const addButtonHandler = (button, action) => {
    let touchMoved = false;
    
    button.addEventListener('touchstart', (e) => {
      touchMoved = false;
      e.stopPropagation();
    });
    
    button.addEventListener('touchmove', (e) => {
      touchMoved = true;
      e.stopPropagation();
    });
    
    button.addEventListener('touchend', (e) => {
      e.stopPropagation();
      e.preventDefault();
      if (!touchMoved) {
        action();
      }
    });
    
    button.addEventListener('click', (e) => {
      e.stopPropagation();
      // Only handle click if it's not from a touch event
      if (!('ontouchstart' in window)) {
        action();
      }
    });
  };

  addButtonHandler(addBeforeBtn, () => {
    const idx = grimoireState.contextMenuTargetIndex;
    hidePlayerContextMenu({ grimoireState });
    if (idx < 0) return;
    if (grimoireState.players.length >= 20) return; // clamp to max
    const newName = `Player ${grimoireState.players.length + 1}`;
    const newPlayer = { name: newName, character: null, reminders: [], dead: false, deathVote: false };
    grimoireState.players.splice(idx, 0, newPlayer);
    rebuildPlayerCircleUiPreserveState({ grimoireState });
  });
  
  addButtonHandler(addAfterBtn, () => {
    const idx = grimoireState.contextMenuTargetIndex;
    hidePlayerContextMenu({ grimoireState });
    if (idx < 0) return;
    if (grimoireState.players.length >= 20) return; // clamp to max
    const newName = `Player ${grimoireState.players.length + 1}`;
    const newPlayer = { name: newName, character: null, reminders: [], dead: false, deathVote: false };
    grimoireState.players.splice(idx + 1, 0, newPlayer);
    rebuildPlayerCircleUiPreserveState({ grimoireState });
  });
  
  addButtonHandler(removeBtn, () => {
    const idx = grimoireState.contextMenuTargetIndex;
    hidePlayerContextMenu({ grimoireState });
    if (idx < 0) return;
    if (grimoireState.players.length <= 5) return; // keep within 5..20
    grimoireState.players.splice(idx, 1);
    rebuildPlayerCircleUiPreserveState({ grimoireState });
  });

  menu.appendChild(addBeforeBtn);
  menu.appendChild(addAfterBtn);
  menu.appendChild(removeBtn);
  document.body.appendChild(menu);

  // Hide menu when clicking elsewhere or pressing Escape
  document.addEventListener('click', (e) => {
    if (!menu.contains(e.target) && !grimoireState.menuJustOpened) {
      hidePlayerContextMenu({ grimoireState });
    }
  }, true);
  
  // Also hide menu on touch events outside the menu
  document.addEventListener('touchstart', (e) => {
    if (!menu.contains(e.target) && !grimoireState.menuJustOpened) {
      hidePlayerContextMenu({ grimoireState });
    }
  }, true);
  
  // Don't hide on touchend to prevent menu from disappearing on release
  document.addEventListener('touchend', (e) => {
    if (menu.contains(e.target)) {
      e.stopPropagation();
    }
  }, true);
  
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hidePlayerContextMenu({ grimoireState });
  });
  grimoireState.playerContextMenu = menu;
  return menu;
}
