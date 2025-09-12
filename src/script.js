import { processScriptCharacters, applyTravellerToggleAndRefresh } from './character.js';
import { resolveAssetPath, isExcludedScriptName } from '../utils.js';
import { saveAppState } from './app.js';
import { renderSetupInfo } from './grimoire.js';
import { addScriptToHistory } from './history/script.js';

export async function displayScript({ data, grimoireState }) {
  const characterSheet = document.getElementById('character-sheet');
  console.log('Displaying script with', data.length, 'characters');
  characterSheet.innerHTML = '';

  // Load jinx data
  let jinxData = [];
  try {
    const jinxResponse = await fetch('./jinx.json');
    if (jinxResponse.ok) {
      jinxData = await jinxResponse.json();
    }
  } catch (e) {
    console.warn('Failed to load jinx data:', e);
  }

  // Check if we should sort by night order
  if (grimoireState.nightOrderSort) {
    // Sort by night order
    const nightOrderKey = grimoireState.nightPhase === 'first-night' ? 'firstNight' : 'otherNight';

    // Separate characters into different categories
    const nightOrderCharacters = [];
    const noNightOrderCharacters = [];
    const travellers = [];
    const fabled = [];

    Object.values(grimoireState.allRoles).forEach(role => {
      if (role.team === 'traveller') {
        travellers.push(role);
      } else if (role.team === 'fabled') {
        fabled.push(role);
      } else if (role[nightOrderKey] && role[nightOrderKey] > 0) {
        nightOrderCharacters.push(role);
      } else {
        noNightOrderCharacters.push(role);
      }
    });

    // Sort night order characters by their order
    nightOrderCharacters.sort((a, b) => a[nightOrderKey] - b[nightOrderKey]);

    // Display all characters in order
    const allCharactersInOrder = [...nightOrderCharacters, ...noNightOrderCharacters, ...travellers, ...fabled];

    allCharactersInOrder.forEach(role => {
      const roleEl = document.createElement('div');
      roleEl.className = 'role';
      roleEl.innerHTML = `
                     <span class="icon" style="background-image: url('${role.image}'), url('./assets/img/token-BqDQdWeO.webp'); background-size: cover, cover;"></span>
                     <span class="name">${role.name}</span>
                     <div class="ability">${role.ability || 'No ability description available'}</div>
                 `;
      // Add click handler to toggle ability display
      roleEl.addEventListener('click', () => {
        roleEl.classList.toggle('show-ability');
      });
      characterSheet.appendChild(roleEl);
    });

    // Display jinxes at the end
    displayJinxes({ jinxData, grimoireState, characterSheet });

  } else {
    // Original team-based display logic
    // Group characters by team if we have resolved role data
    const teamGroups = {};
    Object.values(grimoireState.allRoles).forEach(role => {
      if (!teamGroups[role.team]) {
        teamGroups[role.team] = [];
      }
      teamGroups[role.team].push(role);
    });

    // Display grouped by team if we have team information
    if (Object.keys(teamGroups).length > 0) {
      const teamOrder = ['townsfolk', 'outsider', 'minion', 'demon', 'traveller', 'fabled'];
      teamOrder.forEach(team => {
        if (teamGroups[team] && teamGroups[team].length > 0) {
          const teamHeader = document.createElement('h3');
          let teamLabel = team.charAt(0).toUpperCase() + team.slice(1);
          if (team === 'traveller') teamLabel = 'Travellers';
          teamHeader.textContent = teamLabel;
          teamHeader.className = `team-${team === 'traveller' ? 'travellers' : team}`;
          characterSheet.appendChild(teamHeader);

          teamGroups[team].forEach(role => {
            const roleEl = document.createElement('div');
            roleEl.className = 'role';
            roleEl.innerHTML = `
                           <span class="icon" style="background-image: url('${role.image}'), url('./assets/img/token-BqDQdWeO.webp'); background-size: cover, cover;"></span>
                           <span class="name">${role.name}</span>
                           <div class="ability">${role.ability || 'No ability description available'}</div>
                       `;
            // Add click handler to toggle ability display
            roleEl.addEventListener('click', () => {
              roleEl.classList.toggle('show-ability');
            });
            characterSheet.appendChild(roleEl);
          });
        }

        // Display jinxes section specifically after demon team
        if (team === 'demon') {
          displayJinxes({ jinxData, grimoireState, characterSheet });
        }
      });
    } else {
      // Fallback: show all characters in a single list
      const header = document.createElement('h3');
      header.textContent = 'Characters';
      header.className = 'team-townsfolk';
      characterSheet.appendChild(header);

      data.forEach((characterItem) => {
        if (typeof characterItem === 'string' && characterItem !== '_meta') {
          const roleEl = document.createElement('div');
          roleEl.className = 'role';
          roleEl.innerHTML = `
                       <span class="icon" style="background-image: url('./assets/img/token-BqDQdWeO.webp'); background-size: cover;"></span>
                       <span class="name">${characterItem.charAt(0).toUpperCase() + characterItem.slice(1)}</span>
                   `;
          characterSheet.appendChild(roleEl);
        } else if (typeof characterItem === 'object' && characterItem !== null && characterItem.id && characterItem.id !== '_meta') {
          // Display custom character objects
          const roleEl = document.createElement('div');
          roleEl.className = 'role';
          const image = characterItem.image ? resolveAssetPath(characterItem.image) : './assets/img/token-BqDQdWeO.webp';
          roleEl.innerHTML = `
                      <span class="icon" style="background-image: url('${image}'), url('./assets/img/token-BqDQdWeO.webp'); background-size: cover, cover;"></span>
                      <span class="name">${characterItem.name || characterItem.id}</span>
                      <div class="ability">${characterItem.ability || 'No ability description available'}</div>
                  `;
          // Add click handler to toggle ability display
          roleEl.addEventListener('click', () => {
            roleEl.classList.toggle('show-ability');
          });
          characterSheet.appendChild(roleEl);
        }
      });
    }
  }
}

export async function loadScriptFromFile({ path, grimoireState }) {
  const loadStatus = document.getElementById('load-status');
  try {
    loadStatus.textContent = `Loading script from ${path}...`;
    loadStatus.className = 'status';
    // Pre-set a best-effort name from the filename so UI updates immediately
    try {
      const match = String(path).match(/([^/]+)\.json$/i);
      if (match) {
        const base = match[1].replace(/\s*&\s*/g, ' & ');
        grimoireState.scriptMetaName = base;
        renderSetupInfo({ grimoireState });
      }
    } catch (_) { }
    const res = await fetch(path, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    await processScriptData({ data: json, addToHistory: true, grimoireState });
    loadStatus.textContent = 'Script loaded successfully!';
    loadStatus.className = 'status';
  } catch (e) {
    console.error('Failed to load script:', e);
    loadStatus.textContent = `Failed to load ${path}: ${e.message}`;
    loadStatus.className = 'error';
  }
}

export async function processScriptData({ data, addToHistory = false, grimoireState }) {
  const scriptHistoryList = document.getElementById('script-history-list');
  console.log('Processing script data:', data);
  grimoireState.scriptData = data;
  grimoireState.allRoles = {};
  grimoireState.baseRoles = {};
  grimoireState.extraTravellerRoles = {};
  // Extract metadata name if present
  try {
    const meta = Array.isArray(data) ? data.find(x => x && typeof x === 'object' && x.id === '_meta') : null;
    grimoireState.scriptMetaName = meta && meta.name ? String(meta.name) : '';
  } catch (_) { grimoireState.scriptMetaName = ''; }

  if (!Array.isArray(data)) {
    throw new Error(`Unexpected script format: ${typeof data}. Expected an array of script entries`);
  }

  console.log('Processing script with', data.length, 'characters');
  await processScriptCharacters({ characterIds: data, grimoireState });

  console.log('Total roles processed:', Object.keys(grimoireState.allRoles).length);
  // After processing into baseRoles/extraTravellerRoles, apply toggle
  applyTravellerToggleAndRefresh({ grimoireState });
  saveAppState({ grimoireState });
  renderSetupInfo({ grimoireState });
  // Update button states after script is loaded
  if (typeof window.updateButtonStates === 'function') {
    window.updateButtonStates();
  }
  if (addToHistory) {
    const histName = grimoireState.scriptMetaName || (Array.isArray(data) && (data.find(x => x && typeof x === 'object' && x.id === '_meta')?.name || 'Custom Script')) || 'Custom Script';
    if (!isExcludedScriptName(histName)) {
      addScriptToHistory({ name: histName, data, scriptHistoryList });
    }
  }
}

export async function loadScriptFile({ event, grimoireState }) {
  const loadStatus = document.getElementById('load-status');
  const file = event.target.files[0];
  if (!file) return;

  console.log('File selected:', file.name, 'Size:', file.size);

  const reader = new FileReader();
  reader.onload = async (e) => {
    let json;
    try {
      console.log('Parsing uploaded file...');
      json = JSON.parse(e.target.result);
      console.log('Uploaded script parsed successfully:', json);
    } catch (error) {
      console.error('Error parsing uploaded file:', error);
      loadStatus.textContent = `Invalid JSON file: ${error.message}`;
      loadStatus.className = 'error';
      return;
    }

    // Check if this is a history export file
    if (json && typeof json === 'object' && !Array.isArray(json)) {
      if ('version' in json && 'scriptHistory' in json && 'grimoireHistory' in json) {
        console.error('History export file detected in script upload');
        loadStatus.textContent = 'This appears to be a history export file. Please use the "Import History" button in the History Management section to import it.';
        loadStatus.className = 'error';
        alert('This appears to be a history export file. Please use the "Import History" button in the History Management section to import it.');
        return;
      }
    }

    try {
      await processScriptData({ data: json, addToHistory: true, grimoireState });
      loadStatus.textContent = 'Custom script loaded successfully!';
      loadStatus.className = 'status';
    } catch (error) {
      console.error('Error processing uploaded script:', error);
      loadStatus.textContent = `Invalid script file: ${error.message}`;
      loadStatus.className = 'error';
    }
  };

  reader.onerror = (error) => {
    console.error('File reading error:', error);
    loadStatus.textContent = 'Error reading file';
    loadStatus.className = 'error';
  };

  reader.readAsText(file);
}

function displayJinxes({ jinxData, grimoireState, characterSheet }) {
  // Get all character IDs in the current script
  const scriptCharacterIds = new Set();
  Object.values(grimoireState.allRoles).forEach(role => {
    scriptCharacterIds.add(role.id);
  });

  // Find all applicable jinxes
  const applicableJinxes = [];

  jinxData.forEach(character => {
    if (scriptCharacterIds.has(character.id) && character.jinx) {
      character.jinx.forEach(jinx => {
        if (scriptCharacterIds.has(jinx.id)) {
          // Both characters in the jinx are in the script
          applicableJinxes.push({
            char1: character.id,
            char2: jinx.id,
            reason: jinx.reason
          });
        }
      });
    }
  });

  // Only display jinxes section if there are applicable jinxes
  if (applicableJinxes.length > 0) {
    // Add jinxes header
    const jinxHeader = document.createElement('h3');
    jinxHeader.textContent = 'Jinxes';
    jinxHeader.className = 'team-jinxes';
    characterSheet.appendChild(jinxHeader);

    // Display each jinx
    applicableJinxes.forEach(jinx => {
      const jinxEl = document.createElement('div');
      jinxEl.className = 'jinx-entry';

      const char1Role = grimoireState.allRoles[jinx.char1];
      const char2Role = grimoireState.allRoles[jinx.char2];

      jinxEl.innerHTML = `
        <div class="jinx-characters">
          <span class="icon" style="background-image: url('${char1Role.image}'), url('./assets/img/token-BqDQdWeO.webp'); background-size: cover, cover;"></span>
          <span class="name">${char1Role.name}</span>
          <span class="jinx-plus">+</span>
          <span class="icon" style="background-image: url('${char2Role.image}'), url('./assets/img/token-BqDQdWeO.webp'); background-size: cover, cover;"></span>
          <span class="name">${char2Role.name}</span>
        </div>
        <div class="jinx-reason">${jinx.reason}</div>
      `;

      // Add click handler to toggle jinx reason display
      jinxEl.addEventListener('click', () => {
        jinxEl.classList.toggle('show-jinx-reason');
      });

      characterSheet.appendChild(jinxEl);
    });
  }
}
