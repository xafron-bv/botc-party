import { processScriptCharacters, applyTravellerToggleAndRefresh } from './character.js';
import { resolveAssetPath, isExcludedScriptName } from '../utils.js';
import { saveAppState } from './app.js';
import { renderSetupInfo } from './utils/setup.js';
import { addScriptToHistory } from './history/script.js';

export async function displayScript({ data, grimoireState }) {
  const characterSheet = document.getElementById('character-sheet');
  console.log('Displaying script with', data.length, 'characters');
  characterSheet.innerHTML = '';

  let jinxData = [];
  try {
    const dataResponse = await fetch('./data.json');
    if (dataResponse.ok) {
      const data = await dataResponse.json();
      jinxData = data.roles
        .filter(role => role.jinxes && role.jinxes.length > 0)
        .map(role => ({ id: role.id, jinx: role.jinxes }));
    }
  } catch (e) {
    console.warn('Failed to load jinx data:', e);
  }

  if (grimoireState.nightOrderSort) {
    const nightOrderKey = grimoireState.nightPhase === 'first-night' ? 'firstNight' : 'otherNight';
    const nightOrderCharacterIds = (grimoireState.nightOrderData && grimoireState.nightOrderData[nightOrderKey]) || [];
    const officialOrderMap = new Map();
    nightOrderCharacterIds.forEach((id, index) => {
      if (!officialOrderMap.has(id)) {
        officialOrderMap.set(id, index + 1);
      }
    });

    const rolesToRender = [];
    Object.values(grimoireState.allRoles || {}).forEach(role => {
      if (!role || !role.id || role.id === '_meta') return;
      const orderFromData = officialOrderMap.get(role.id);
      if (orderFromData !== undefined) {
        rolesToRender.push({ role, order: orderFromData, sourcePriority: 0 });
        return;
      }
      const scriptOrderValue = typeof role[nightOrderKey] === 'number' ? role[nightOrderKey] : null;
      if (scriptOrderValue && scriptOrderValue > 0) {
        rolesToRender.push({ role, order: scriptOrderValue, sourcePriority: 1 });
      }
    });

    rolesToRender.sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      if (a.sourcePriority !== b.sourcePriority) return a.sourcePriority - b.sourcePriority;
      const nameA = a.role.name || a.role.id || '';
      const nameB = b.role.name || b.role.id || '';
      return nameA.localeCompare(nameB);
    });

    rolesToRender.forEach(({ role }) => {
      const roleEl = document.createElement('div');
      roleEl.className = 'role';
      roleEl.innerHTML = `
        <span class="icon" style="background-image: url('${role.image}'), url('./assets/img/token.png'); background-size: cover, cover;"></span>
        <span class="name">${role.name}</span>
        <div class="ability">${role.ability || 'No ability description available'}</div>
      `;
      roleEl.addEventListener('click', () => {
        roleEl.classList.toggle('show-ability');
      });
      characterSheet.appendChild(roleEl);
    });

    displayJinxes({ jinxData, grimoireState, characterSheet });
  } else {
    const teamGroups = {};
    Object.values(grimoireState.allRoles).forEach(role => {
      if (!teamGroups[role.team]) {
        teamGroups[role.team] = [];
      }
      teamGroups[role.team].push(role);
    });

    if (Object.keys(teamGroups).length > 0) {
      const teamOrder = ['townsfolk', 'outsider', 'minion', 'demon', 'traveller', 'fabled', 'loric'];
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
                           <span class="icon" style="background-image: url('${role.image}'), url('./assets/img/token.png'); background-size: cover, cover;"></span>
                           <span class="name">${role.name}</span>
                           <div class="ability">${role.ability || 'No ability description available'}</div>
                       `;
            roleEl.addEventListener('click', () => {
              roleEl.classList.toggle('show-ability');
            });
            characterSheet.appendChild(roleEl);
          });
        }

        if (team === 'demon') {
          displayJinxes({ jinxData, grimoireState, characterSheet });
        }
      });
    } else {
      const header = document.createElement('h3');
      header.textContent = 'Characters';
      header.className = 'team-townsfolk';
      characterSheet.appendChild(header);

      data.forEach((characterItem) => {
        if (typeof characterItem === 'string' && characterItem !== '_meta') {
          const roleEl = document.createElement('div');
          roleEl.className = 'role';
          roleEl.innerHTML = `
                       <span class="icon" style="background-image: url('./assets/img/token.png'); background-size: cover;"></span>
                       <span class="name">${characterItem.charAt(0).toUpperCase() + characterItem.slice(1)}</span>
                   `;
          characterSheet.appendChild(roleEl);
        } else if (typeof characterItem === 'object' && characterItem !== null && characterItem.id && characterItem.id !== '_meta') {
          const roleEl = document.createElement('div');
          roleEl.className = 'role';
          const image = characterItem.image ? resolveAssetPath(characterItem.image) : './assets/img/token.png';
          roleEl.innerHTML = `
                      <span class="icon" style="background-image: url('${image}'), url('./assets/img/token.png'); background-size: cover, cover;"></span>
                      <span class="name">${characterItem.name || characterItem.id}</span>
                      <div class="ability">${characterItem.ability || 'No ability description available'}</div>
                  `;
          roleEl.addEventListener('click', () => {
            roleEl.classList.toggle('show-ability');
          });
          characterSheet.appendChild(roleEl);
        }
      });
    }
  }
  try {
    const panel = document.getElementById('character-panel');
    const toggleBtn = document.getElementById('character-panel-toggle');
    const PANEL_KEY = 'characterPanelOpen';
    let storedPref = null;
    try { storedPref = localStorage.getItem(PANEL_KEY); } catch (_) { }
    const roles = characterSheet.querySelectorAll('.role');
    const urlParams = new URLSearchParams(window.location.search);
    const isTest = urlParams.has('test');
    if (panel && toggleBtn && roles.length > 0 && panel.getAttribute('aria-hidden') === 'true') {
      if (storedPref === null || (isTest && storedPref !== '0')) {
        toggleBtn.dispatchEvent(new Event('click'));
      }
    }
  } catch (_) { }
}

export async function loadScriptFromDataJson({ editionId, grimoireState }) {
  const loadStatus = document.getElementById('load-status');

  // Map edition IDs to their full names
  const editionNames = {
    'tb': 'Trouble Brewing',
    'bmr': 'Bad Moon Rising',
    'snv': 'Sects and Violets'
  };

  try {
    const editionName = editionNames[editionId] || editionId;
    loadStatus.textContent = `Loading ${editionName}...`;
    loadStatus.className = 'status';

    const res = await fetch('./data.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const edition = data.editions.find(e => e.id === editionId);
    if (!edition) throw new Error(`Edition ${editionId} not found`);

    const editionCharacters = data.roles
      .filter(role => role.edition === editionId && role.team !== 'traveller')
      .map(role => role.id);

    const scriptData = [
      { id: '_meta', author: '', name: editionName },
      ...editionCharacters
    ];

    await processScriptData({ data: scriptData, addToHistory: true, grimoireState });
    loadStatus.textContent = 'Script loaded successfully!';
    loadStatus.className = 'status';
  } catch (e) {
    console.error('Failed to load edition:', e);
    loadStatus.textContent = `Failed to load ${editionId}: ${e.message}`;
    loadStatus.className = 'error';
  }
}

export async function loadScriptFromFile({ path, grimoireState }) {
  const loadStatus = document.getElementById('load-status');
  try {
    loadStatus.textContent = `Loading script from ${path}...`;
    loadStatus.className = 'status';
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
  grimoireState.scriptTravellerRoles = {};
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

export async function loadScriptFromText({ grimoireState, text }) {
  const loadStatus = document.getElementById('load-status');
  const setStatus = (message, className = 'status') => {
    if (!loadStatus) return;
    loadStatus.textContent = message;
    loadStatus.className = className;
  };

  const raw = (text || '').trim();
  if (!raw) {
    setStatus('Paste script JSON into the textbox first.', 'error');
    return;
  }

  let json;
  try {
    json = JSON.parse(raw);
  } catch (error) {
    setStatus(`Pasted content is not valid JSON: ${error.message}`, 'error');
    return;
  }

  if (json && typeof json === 'object' && !Array.isArray(json)) {
    if ('version' in json && 'scriptHistory' in json && 'grimoireHistory' in json) {
      setStatus('This looks like a history export. Use Import History instead.', 'error');
      alert('This appears to be a history export file. Please use the "Import History" button in the History Management section to import it.');
      return;
    }
  }

  try {
    await processScriptData({ data: json, addToHistory: true, grimoireState });
    setStatus('Custom script loaded from pasted text!');
  } catch (error) {
    console.error('Error processing pasted script:', error);
    setStatus(`Invalid script data: ${error.message}`, 'error');
  }
}

export async function loadScriptFromUrl({ grimoireState, url }) {
  const loadStatus = document.getElementById('load-status');
  const setStatus = (message, className = 'status') => {
    if (!loadStatus) return;
    loadStatus.textContent = message;
    loadStatus.className = className;
  };

  const trimmed = (url || '').trim();
  if (!trimmed) {
    setStatus('Enter a script URL first.', 'error');
    return;
  }

  let targetUrl = trimmed;
  try {
    targetUrl = new URL(trimmed, window.location.href).toString();
  } catch (_) {
    setStatus('That link is not a valid URL.', 'error');
    return;
  }

  setStatus('Loading script from link...');
  let json;
  try {
    const res = await fetch(targetUrl, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    json = await res.json();
  } catch (error) {
    console.error('Failed to fetch script from URL', error);
    const msg = /Failed to fetch/i.test(error?.message || '')
      ? 'This link will not allow us to download the script. Please paste the JSON or upload the file instead.'
      : `Failed to load script from URL: ${error.message}`;
    setStatus(msg, 'error');
    return;
  }

  if (json && typeof json === 'object' && !Array.isArray(json)) {
    if ('version' in json && 'scriptHistory' in json && 'grimoireHistory' in json) {
      setStatus('This looks like a history export. Use Import History instead.', 'error');
      alert('This appears to be a history export file. Please use the "Import History" button in the History Management section to import it.');
      return;
    }
  }

  try {
    await processScriptData({ data: json, addToHistory: true, grimoireState });
    setStatus('Custom script loaded from URL!');
  } catch (error) {
    console.error('Error processing URL script:', error);
    setStatus(`Invalid script data: ${error.message}`, 'error');
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
      try { event.target.value = ''; } catch (_) { }
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
  const scriptCharacterIds = new Set();
  Object.values(grimoireState.allRoles).forEach(role => {
    scriptCharacterIds.add(role.id);
  });

  const applicableJinxes = [];

  jinxData.forEach(character => {
    if (scriptCharacterIds.has(character.id) && character.jinx) {
      character.jinx.forEach(jinx => {
        if (scriptCharacterIds.has(jinx.id)) {
          applicableJinxes.push({
            char1: character.id,
            char2: jinx.id,
            reason: jinx.reason
          });
        }
      });
    }
  });

  if (applicableJinxes.length > 0) {
    const jinxHeader = document.createElement('h3');
    jinxHeader.textContent = 'Jinxes';
    jinxHeader.className = 'team-jinxes';
    characterSheet.appendChild(jinxHeader);

    applicableJinxes.forEach(jinx => {
      const jinxEl = document.createElement('div');
      jinxEl.className = 'jinx-entry';

      const char1Role = grimoireState.allRoles[jinx.char1];
      const char2Role = grimoireState.allRoles[jinx.char2];

      jinxEl.innerHTML = `
        <div class="jinx-characters">
          <span class="icon" style="background-image: url('${char1Role.image}'), url('./assets/img/token.png'); background-size: cover, cover;"></span>
          <span class="name">${char1Role.name}</span>
          <span class="jinx-plus">+</span>
          <span class="icon" style="background-image: url('${char2Role.image}'), url('./assets/img/token.png'); background-size: cover, cover;"></span>
          <span class="name">${char2Role.name}</span>
        </div>
        <div class="jinx-reason">${jinx.reason}</div>
      `;

      jinxEl.addEventListener('click', () => {
        jinxEl.classList.toggle('show-jinx-reason');
      });

      characterSheet.appendChild(jinxEl);
    });
  }
}
