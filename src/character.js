import { displayScript } from './script.js';
import { resolveAssetPath, normalizeKey } from '../utils.js';
import { createCurvedLabelSvg } from './ui/svg.js';
import { createTokenGridItem } from './ui/tokenGridItem.js';
import { updateGrimoire, renderSetupInfo } from './grimoire.js';
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
    const emptyToken = createTokenGridItem({
      id: 'empty',
      image: '',
      baseImage: 'assets/img/token-BqDQdWeO.webp',
      label: 'None',
      title: 'No character',
      curvedId: 'picker-role-arc-empty',
      extraClasses: ['empty'],
      onClick: () => assignCharacter({ grimoireState, roleId: null })
    });
    characterGrid.appendChild(emptyToken);
  }

  // Get roles for character modal - controlled by modal checkbox instead of sidebar checkbox
  const includeModalTravellers = document.getElementById('include-travellers-in-modal')?.checked || false;
  let rolesToShow = { ...(grimoireState.baseRoles || {}) };

  // Always include travellers explicitly present in the script
  if (grimoireState.scriptTravellerRoles) {
    rolesToShow = { ...rolesToShow, ...grimoireState.scriptTravellerRoles };
  }

  // Include all travellers from the dataset only if the modal checkbox is on
  if (includeModalTravellers) {
    rolesToShow = { ...rolesToShow, ...(grimoireState.extraTravellerRoles || {}) };
  }

  const filteredRoles = Object.values(rolesToShow)
    .filter(role => role.name.toLowerCase().includes(filter));

  console.log(`Showing ${filteredRoles.length} characters for filter: "${filter}"`);

  filteredRoles.forEach(role => {
    const tokenEl = createTokenGridItem({
      id: role.id,
      image: role.image,
      baseImage: 'assets/img/token-BqDQdWeO.webp',
      label: role.name,
      title: role.name,
      curvedId: `picker-role-arc-${role.id}`,
      onClick: () => assignCharacter({ grimoireState, roleId: role.id })
    });
    characterGrid.appendChild(tokenEl);
  });
}

export function hideCharacterModal({ grimoireState, clearBluffSelection = false }) {
  const characterModal = document.getElementById('character-modal');
  if (!characterModal) return;
  characterModal.style.display = 'none';
  try {
    characterModal.dispatchEvent(new CustomEvent('botc:character-modal-hidden'));
  } catch (_) { /* ignore */ }
  if (clearBluffSelection && grimoireState) {
    delete grimoireState.selectedBluffIndex;
  }
}

export function assignCharacter({ grimoireState, roleId }) {

  // Intercept temporary storyteller slot selection (from storyteller messages)
  if (grimoireState._tempStorytellerSlotIndex !== undefined) {
    const slotIndex = grimoireState._tempStorytellerSlotIndex;
    try {
      if (!Array.isArray(grimoireState.storytellerTempSlots)) {
        grimoireState.storytellerTempSlots = [];
      }
      grimoireState.storytellerTempSlots[slotIndex] = roleId;
      const slotsEl = document.getElementById('storyteller-message-slots');
      if (slotsEl && slotsEl.children && slotsEl.children[slotIndex]) {
        const slotEl = slotsEl.children[slotIndex];
        const role = roleId ? (grimoireState.allRoles[roleId] || {}) : null;
        // Clear any existing curved label
        const existingSvg = slotEl.querySelector('svg');
        if (existingSvg) existingSvg.remove();
        if (role && role.image) {
          // Match character/bluff token layering
          slotEl.classList.remove('empty');
          slotEl.classList.add('has-character');
          slotEl.style.backgroundImage = `url('${role.image}'), url('./assets/img/token-BqDQdWeO.webp')`;
          slotEl.style.backgroundSize = '68% 68%, cover';
          slotEl.style.backgroundPosition = 'center, center';
          slotEl.style.backgroundRepeat = 'no-repeat, no-repeat';
          const svg = createCurvedLabelSvg(`story-slot-${role.id}-${Date.now()}`, role.name);
          slotEl.appendChild(svg);
        } else {
          slotEl.classList.add('empty');
          slotEl.classList.remove('has-character');
          slotEl.style.backgroundImage = "url('./assets/img/token-BqDQdWeO.webp')";
          slotEl.style.backgroundSize = 'cover';
          slotEl.style.backgroundPosition = 'center';
          slotEl.style.backgroundRepeat = 'no-repeat';
          const svg = createCurvedLabelSvg('story-slot-empty', 'None');
          slotEl.appendChild(svg);
        }
      }
    } catch (_) { }
    hideCharacterModal({ grimoireState });
    delete grimoireState._tempStorytellerSlotIndex;
    saveAppState({ grimoireState });
    return;
  }

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
    try {
      const startGameBtn = document.getElementById('start-game');
      if (startGameBtn) {
        const players = grimoireState.players || [];
        const allAssigned = players.length > 0 && players.every(p => !!p.character);
        startGameBtn.disabled = !allAssigned;
      }
    } catch (_) { }
    renderSetupInfo({ grimoireState });
    hideCharacterModal({ grimoireState });
    saveAppState({ grimoireState });
  }
}

export function applyTravellerToggleAndRefresh({ grimoireState }) {
  // This now only affects the character sheet in the sidebar, not the character modal
  grimoireState.allRoles = { ...(grimoireState.baseRoles || {}) };
  // Always include travellers explicitly present in the script
  if (grimoireState.scriptTravellerRoles) {
    grimoireState.allRoles = { ...grimoireState.allRoles, ...grimoireState.scriptTravellerRoles };
  }
  // Include all travellers from the dataset only if the toggle is on
  if (grimoireState.includeTravellers) {
    grimoireState.allRoles = { ...grimoireState.allRoles, ...(grimoireState.extraTravellerRoles || {}) };
  }
  // Re-render character sheet (sidebar only)
  if (Array.isArray(grimoireState.scriptData)) displayScript({ data: grimoireState.scriptData, grimoireState }).catch(console.error);
}

export async function processScriptCharacters({ characterIds, grimoireState }) {
  try {
    console.log('Loading data.json to resolve character IDs...');
    const response = await fetch('./data.json');
    if (!response.ok) {
      throw new Error(`Failed to load data.json: ${response.status}`);
    }

    const data = await response.json();
    const characters = data.roles;
    console.log('data.json loaded successfully');

    // Create canonical lookups and a normalization index
    const roleLookup = {};
    const normalizedToCanonicalId = {};
    if (Array.isArray(characters)) {
      characters.forEach(role => {
        if (!role || !role.id) return;
        // Generate image path if not present: /build/img/icons/{team}/{id}.webp
        const imagePath = role.image || `/build/img/icons/${role.team}/${role.id}.webp`;
        const image = resolveAssetPath(imagePath);
        const canonical = { ...role, image, team: (role.team || '').toLowerCase() };
        roleLookup[role.id] = canonical;
        const normId = normalizeKey(role.id);
        const normName = normalizeKey(role.name);
        if (normId) normalizedToCanonicalId[normId] = role.id;
        if (normName) normalizedToCanonicalId[normName] = role.id;
      });
    }
    hideCharacterModal({ grimoireState });
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
            grimoireState.extraTravellerRoles[canonicalId] = role; // All travellers (toggle pool)
            grimoireState.scriptTravellerRoles[canonicalId] = role; // Explicitly in script
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
            grimoireState.extraTravellerRoles[canonicalId] = role; // All travellers (toggle pool)
            grimoireState.scriptTravellerRoles[canonicalId] = role; // Explicitly in script
          } else {
            grimoireState.baseRoles[canonicalId] = role;
          }
          console.log(`Resolved object character ${characterItem.id} -> ${canonicalId} (${roleLookup[canonicalId].name})`);
        } else if (characterItem.name && characterItem.team && characterItem.ability) {
          // Support image being an array (common in some homebrew exports). Use the first valid string.
          let img = characterItem.image;
          if (Array.isArray(img)) {
            img = img.find(v => typeof v === 'string' && v.trim().length > 0) || null;
          }
          const customRole = {
            id: characterItem.id,
            name: characterItem.name,
            team: String(characterItem.team || '').toLowerCase(),
            ability: characterItem.ability,
            image: img ? resolveAssetPath(img) : './assets/img/token-BqDQdWeO.webp'
          };
          if (characterItem.reminders) customRole.reminders = characterItem.reminders;
          if (characterItem.remindersGlobal) customRole.remindersGlobal = characterItem.remindersGlobal;
          if (characterItem.setup !== undefined) customRole.setup = characterItem.setup;
          if (characterItem.jinxes) customRole.jinxes = characterItem.jinxes;
          // Preserve night order properties if provided in custom script objects so night order logic works
          if (typeof characterItem.firstNight === 'number') customRole.firstNight = characterItem.firstNight;
          if (typeof characterItem.otherNight === 'number') customRole.otherNight = characterItem.otherNight;
          if (typeof characterItem.firstNightReminder === 'string') customRole.firstNightReminder = characterItem.firstNightReminder;
          if (typeof characterItem.otherNightReminder === 'string') customRole.otherNightReminder = characterItem.otherNightReminder;
          if (customRole.team === 'traveller') {
            grimoireState.extraTravellerRoles[characterItem.id] = customRole; // All travellers (toggle pool)
            grimoireState.scriptTravellerRoles[characterItem.id] = customRole; // Explicitly in script
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
          let img = characterItem.image;
          if (Array.isArray(img)) {
            img = img.find(v => typeof v === 'string' && v.trim().length > 0) || null;
          }
          const customFallback = {
            id: characterItem.id,
            name: characterItem.name,
            team: String(characterItem.team || '').toLowerCase(),
            ability: characterItem.ability,
            image: img ? resolveAssetPath(img) : './assets/img/token-BqDQdWeO.webp'
          };
          if (typeof characterItem.firstNight === 'number') customFallback.firstNight = characterItem.firstNight;
          if (typeof characterItem.otherNight === 'number') customFallback.otherNight = characterItem.otherNight;
          if (typeof characterItem.firstNightReminder === 'string') customFallback.firstNightReminder = characterItem.firstNightReminder;
          if (typeof characterItem.otherNightReminder === 'string') customFallback.otherNightReminder = characterItem.otherNightReminder;
          if (customFallback.team === 'traveller') {
            grimoireState.extraTravellerRoles[characterItem.id] = customFallback;
            if (grimoireState.scriptTravellerRoles) {
              grimoireState.scriptTravellerRoles[characterItem.id] = customFallback;
            }
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
  const includeModalTravellersCheckbox = document.getElementById('include-travellers-in-modal');

  // Do not allow opening the modal when the grimoire is hidden
  if (grimoireState && grimoireState.grimoireHidden) {
    return;
  }
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

  // Restore modal checkbox state from grimoireState
  if (includeModalTravellersCheckbox) {
    includeModalTravellersCheckbox.checked = grimoireState.includeModalTravellers || false;

    // Remove any existing listener before adding a new one
    includeModalTravellersCheckbox.removeEventListener('change', includeModalTravellersCheckbox._modalChangeHandler);

    // Create and store the handler so we can remove it later
    includeModalTravellersCheckbox._modalChangeHandler = () => {
      grimoireState.includeModalTravellers = includeModalTravellersCheckbox.checked;
      populateCharacterGrid({ grimoireState });
      saveAppState({ grimoireState });
    };

    includeModalTravellersCheckbox.addEventListener('change', includeModalTravellersCheckbox._modalChangeHandler);
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

    // Load data.json directly
    const response = await fetch('./data.json');
    if (!response.ok) {
      throw new Error(`Failed to load data.json: ${response.status}`);
    }

    const data = await response.json();
    const characters = data.roles;
    console.log('Loading all characters from data.json');

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
        // Generate image path if not present: /build/img/icons/{team}/{id}.webp
        const imagePath = role.image || `/build/img/icons/${role.team}/${role.id}.webp`;
        const image = resolveAssetPath(imagePath);
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


