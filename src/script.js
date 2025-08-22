import { processScriptCharacters, applyTravellerToggleAndRefresh } from './character.js';
import { resolveAssetPath, isExcludedScriptName } from '../utils.js';
import { saveAppState } from './app.js';
import { renderSetupInfo } from './grimoire.js';
import { addScriptToHistory } from './history/script.js';

export function displayScript({ data, grimoireState }) {
  const characterSheet = document.getElementById('character-sheet');
  console.log('Displaying script with', data.length, 'characters');
  characterSheet.innerHTML = '';

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

  if (Array.isArray(data)) {
    console.log('Processing script with', data.length, 'characters');
    await processScriptCharacters({ characterIds: data, grimoireState });
  } else {
    console.error('Unexpected script format:', typeof data);
    return;
  }

  console.log('Total roles processed:', Object.keys(grimoireState.allRoles).length);
  // After processing into baseRoles/extraTravellerRoles, apply toggle
  applyTravellerToggleAndRefresh({ grimoireState });
  saveAppState({ grimoireState });
  renderSetupInfo({ grimoireState });
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
    try {
      console.log('Parsing uploaded file...');
      const json = JSON.parse(e.target.result);
      console.log('Uploaded script parsed successfully:', json);

      await processScriptData({ data: json, addToHistory: true, grimoireState });
      loadStatus.textContent = 'Custom script loaded successfully!';
      loadStatus.className = 'status';
    } catch (error) {
      console.error('Error parsing uploaded file:', error);
      loadStatus.textContent = `Invalid JSON file: ${error.message}`;
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
