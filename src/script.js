import { processScriptCharacters, applyTravellerToggleAndRefresh, rebuildAllRoles } from './character.js';
import { resolveAssetPath, isExcludedScriptName } from '../utils.js';
import { withStateSave } from './app.js';
import { renderSetupInfo } from './utils/setup.js';
import { addScriptToHistory } from './history/script.js';
import { openCharacterPanel } from './ui/characterPanel.js';
import { byId, createElement } from './utils/dom.js';
import { loadGameData } from './roleData.js';
import { readJsonFile } from './utils/jsonFiles.js';
const TOKEN_IMAGE = './assets/img/token.png';
const HISTORY_EXPORT_MESSAGE = 'This appears to be a history export file. Please use the "Import History" button in the History Management section to import it.';
const isHistoryExport = (value) => value && typeof value === 'object' && !Array.isArray(value)
  && 'version' in value && 'scriptHistory' in value && 'grimoireHistory' in value;
function statusWriter() {
  const element = byId('load-status');
  return (message, className = 'status') => { if (element) Object.assign(element, { textContent: message, className }); };
}
function rejectHistoryExport(data, setStatus, shortMessage = 'This looks like a history export. Use Import History instead.') {
  if (!isHistoryExport(data)) return false; setStatus(shortMessage, 'error'); alert(HISTORY_EXPORT_MESSAGE); return true;
}
function appendRole(characterSheet, role, simple = false) {
  const element = createElement('div', 'role'); const image = role.image ? resolveAssetPath(role.image) : TOKEN_IMAGE;
  element.innerHTML = simple
    ? `<span class="icon" style="background-image: url('${TOKEN_IMAGE}'); background-size: cover;"></span><span class="name">${role.name}</span>`
    : `<span class="icon" style="background-image: url('${image}'), url('${TOKEN_IMAGE}'); background-size: cover, cover;"></span>
      <span class="name">${role.name || role.id}</span><div class="ability">${role.ability || 'No ability description available'}</div>`;
  if (!simple) element.addEventListener('click', () => element.classList.toggle('show-ability')); characterSheet.appendChild(element);
}
function appendHeader(characterSheet, text, className) { characterSheet.appendChild(createElement('h3', className, text)); }
export async function displayScript({ data, grimoireState }) {
  const characterSheet = byId('character-sheet'); console.log('Displaying script with', data.length, 'characters'); characterSheet.innerHTML = ''; let storedPanelState;
  try { storedPanelState = localStorage.getItem('characterPanelOpen'); } catch (_) { }
  const autoOpen = !window.matchMedia('(max-width: 900px)').matches && (storedPanelState === null || (new URLSearchParams(window.location.search).has('test') && storedPanelState !== '0'));
  if (autoOpen) openCharacterPanel();
  const metaEntry = Array.isArray(data) ? data.find(x => x && typeof x === 'object' && x.id === '_meta') : null;
  const scriptTitle = metaEntry?.name || grimoireState.scriptMetaName || ''; const scriptAuthor = metaEntry?.author || '';
  const bootleggerNotes = Array.isArray(metaEntry?.bootlegger) ? metaEntry.bootlegger.filter(Boolean) : [];
  if (scriptTitle || scriptAuthor || bootleggerNotes.length) {
    const metaBlock = createElement('div', 'script-meta');
    if (scriptTitle) { metaBlock.appendChild(createElement('div', 'script-meta__title', scriptTitle)); }
    if (scriptAuthor) { metaBlock.appendChild(createElement('div', 'script-meta__author', `Author: ${scriptAuthor}`)); }
    if (bootleggerNotes.length) {
      const bootleggerEl = createElement('div', 'script-meta__bootlegger'); const list = createElement('ul', 'script-meta__bootlegger-list');
      bootleggerEl.appendChild(createElement('div', 'script-meta__bootlegger-title', 'Bootlegger'));
      bootleggerNotes.forEach(note => list.appendChild(createElement('li', '', note))); bootleggerEl.appendChild(list); metaBlock.appendChild(bootleggerEl);
    }
    characterSheet.appendChild(metaBlock);
  }
  let jinxData = [];
  try {
    const gameData = await loadGameData();
    jinxData = gameData.roles
      .filter(role => role.jinxes && role.jinxes.length > 0)
      .map(role => ({ id: role.id, jinx: role.jinxes }));
  } catch (e) { console.warn('Failed to load jinx data:', e); }
  const displayRoles = {
    ...(grimoireState.baseRoles || {}),
    ...(grimoireState.scriptTravellerRoles || {}),
    ...(grimoireState.includeTravellers ? (grimoireState.extraTravellerRoles || {}) : {})
  };
  if (grimoireState.nightOrderSort) {
    const nightOrderKey = grimoireState.nightPhase === 'first-night' ? 'firstNight' : 'otherNight';
    const nightOrderCharacterIds = (grimoireState.nightOrderData && grimoireState.nightOrderData[nightOrderKey]) || []; const officialOrderMap = new Map();
    nightOrderCharacterIds.forEach((id, index) => {
      if (!officialOrderMap.has(id)) { officialOrderMap.set(id, index + 1); }
    }); const rolesToRender = [];
    Object.values(displayRoles).forEach(role => {
      if (!role || !role.id || role.id === '_meta') return; const orderFromData = officialOrderMap.get(role.id);
      if (orderFromData !== undefined) { rolesToRender.push({ role, order: orderFromData, sourcePriority: 0 }); return; }
      const scriptOrderValue = typeof role[nightOrderKey] === 'number' ? role[nightOrderKey] : null;
      if (scriptOrderValue && scriptOrderValue > 0) { rolesToRender.push({ role, order: scriptOrderValue, sourcePriority: 1 }); }
    });
    rolesToRender.sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order; if (a.sourcePriority !== b.sourcePriority) return a.sourcePriority - b.sourcePriority;
      const nameA = a.role.name || a.role.id || ''; const nameB = b.role.name || b.role.id || ''; return nameA.localeCompare(nameB);
    }); rolesToRender.forEach(({ role }) => appendRole(characterSheet, role)); displayJinxes({ jinxData, grimoireState, characterSheet, displayRoles });
  } else {
    const teamGroups = {};
    Object.values(displayRoles).forEach(role => {
      if (!teamGroups[role.team]) { teamGroups[role.team] = []; }
      teamGroups[role.team].push(role);
    });
    if (Object.keys(teamGroups).length > 0) {
      const teamOrder = ['townsfolk', 'outsider', 'minion', 'demon', 'traveller', 'fabled', 'loric'];
      teamOrder.forEach(team => {
        if (teamGroups[team]?.length) {
          const name = team === 'traveller' ? 'Travellers' : team.charAt(0).toUpperCase() + team.slice(1);
          appendHeader(characterSheet, name, `team-${team === 'traveller' ? 'travellers' : team}`); teamGroups[team].forEach(role => appendRole(characterSheet, role));
        }
        if (team === 'demon') displayJinxes({ jinxData, grimoireState, characterSheet, displayRoles });
      });
    } else {
      appendHeader(characterSheet, 'Characters', 'team-townsfolk');
      data.forEach((characterItem) => {
        if (typeof characterItem === 'string' && characterItem !== '_meta') {
          appendRole(characterSheet, { name: characterItem.charAt(0).toUpperCase() + characterItem.slice(1) }, true);
        } else if (typeof characterItem === 'object' && characterItem !== null && characterItem.id && characterItem.id !== '_meta') { appendRole(characterSheet, characterItem); }
      });
    }
  }
}
export function loadScriptFromDataJson({ editionId, grimoireState }) {
  const pendingLoad = (async () => {
    const setStatus = statusWriter();
    const editionNames = { 'tb': 'Trouble Brewing', 'bmr': 'Bad Moon Rising', 'snv': 'Sects and Violets' };
    try {
      const editionName = editionNames[editionId] || editionId; setStatus(`Loading ${editionName}...`); const data = await loadGameData(); const edition = data.editions.find(e => e.id === editionId);
      if (!edition) throw new Error(`Edition ${editionId} not found`);
      const editionCharacters = data.roles.filter(role => role.edition === editionId && role.team !== 'traveller').map(role => role.id);
      const scriptData = [{ id: '_meta', author: '', name: editionName }, ...editionCharacters];
      await processScriptData({ data: scriptData, addToHistory: true, grimoireState }); setStatus('Script loaded successfully!');
    } catch (error) { console.error('Failed to load edition:', error); setStatus(`Failed to load ${editionId}: ${error.message}`, 'error'); }
  })();
  grimoireState.scriptLoadPromise = pendingLoad;
  return pendingLoad.finally(() => {
    if (grimoireState.scriptLoadPromise === pendingLoad) grimoireState.scriptLoadPromise = null;
  });
}
export async function loadScriptFromFile({ path, grimoireState }) {
  const setStatus = statusWriter();
  try {
    setStatus(`Loading script from ${path}...`);
    try {
      const match = String(path).match(/([^/]+)\.json$/i);
      if (match) { const base = match[1].replace(/\s*&\s*/g, ' & '); grimoireState.scriptMetaName = base; renderSetupInfo({ grimoireState }); }
    } catch (_) { }
    const res = await fetch(path, { cache: 'no-store' }); if (!res.ok) throw new Error(`HTTP ${res.status}`); const json = await res.json();
    await processScriptData({ data: json, addToHistory: true, grimoireState }); setStatus('Script loaded successfully!');
  } catch (e) { console.error('Failed to load script:', e); setStatus(`Failed to load ${path}: ${e.message}`, 'error'); }
}
export const processScriptData = withStateSave(async ({ data, addToHistory = false, grimoireState }) => {
  const scriptHistoryList = document.getElementById('script-history-list'); console.log('Processing script data:', data); grimoireState.scriptData = data;
  grimoireState.allRoles = {}; grimoireState.baseRoles = {}; grimoireState.extraTravellerRoles = {}; grimoireState.scriptTravellerRoles = {};
  try {
    const meta = Array.isArray(data) ? data.find(x => x && typeof x === 'object' && x.id === '_meta') : null;
    grimoireState.scriptMetaName = meta && meta.name ? String(meta.name) : '';
  } catch (_) { grimoireState.scriptMetaName = ''; }
  if (!Array.isArray(data)) { throw new Error(`Unexpected script format: ${typeof data}. Expected an array of script entries`); }
  console.log('Processing script with', data.length, 'characters'); await processScriptCharacters({ characterIds: data, grimoireState }); rebuildAllRoles({ grimoireState });
  console.log('Total roles processed:', Object.keys(grimoireState.allRoles).length); applyTravellerToggleAndRefresh({ grimoireState }); renderSetupInfo({ grimoireState });
  if (typeof window.updateButtonStates === 'function') { window.updateButtonStates(); }
  if (addToHistory) {
    const histName = grimoireState.scriptMetaName || (Array.isArray(data) && (data.find(x => x && typeof x === 'object' && x.id === '_meta')?.name || 'Custom Script')) || 'Custom Script';
    if (!isExcludedScriptName(histName)) { addScriptToHistory({ name: histName, data, scriptHistoryList }); }
  }
});
export async function loadScriptFromText({ grimoireState, text }) {
  const setStatus = statusWriter(); const raw = (text || '').trim();
  if (!raw) { setStatus('Paste script JSON into the textbox first.', 'error'); return; }
  let json;
  try { json = JSON.parse(raw); } catch (error) {
    setStatus(`Pasted content is not valid JSON: ${error.message}`, 'error'); return;
  }
  if (rejectHistoryExport(json, setStatus)) return;
  try { await processScriptData({ data: json, addToHistory: true, grimoireState }); setStatus('Custom script loaded from pasted text!'); } catch (error) {
    console.error('Error processing pasted script:', error); setStatus(`Invalid script data: ${error.message}`, 'error');
  }
}
export async function loadScriptFromUrl({ grimoireState, url }) {
  const setStatus = statusWriter(); const trimmed = (url || '').trim();
  if (!trimmed) { setStatus('Enter a script URL first.', 'error'); return; }
  let targetUrl = trimmed; let urlObj = null;
  try { urlObj = new URL(trimmed, window.location.href); targetUrl = urlObj.toString(); } catch (_) {
    setStatus('That link is not a valid URL.', 'error'); return;
  }
  const sharedScriptParam = urlObj?.searchParams?.get('script');
  if (sharedScriptParam) {
    setStatus('Loading script from link...'); const data = decodeSharedScriptParam(sharedScriptParam);
    if (!data) { setStatus('Could not load shared script (invalid share link).', 'error'); return; }
    try { await processScriptData({ data, addToHistory: true, grimoireState }); setStatus('Custom script loaded from link!'); } catch (error) {
      console.error('Error processing shared script data:', error); setStatus(`Invalid script data: ${error.message}`, 'error');
    }
    return;
  }
  const nestedUrl = urlObj?.searchParams?.get('scriptUrl');
  if (nestedUrl) {
    try { targetUrl = new URL(nestedUrl, window.location.href).toString(); } catch (_) {
      setStatus('That nested link is not a valid URL.', 'error'); return;
    }
  }
  setStatus('Loading script from link...'); let json;
  try { const res = await fetch(targetUrl, { cache: 'no-store' }); if (!res.ok) throw new Error(`HTTP ${res.status}`); json = await res.json(); } catch (error) {
    console.error('Failed to fetch script from URL', error);
    const msg = /Failed to fetch/i.test(error?.message || '')
      ? 'This link will not allow us to download the script. Please paste the JSON or upload the file instead.'
      : `Failed to load script from URL: ${error.message}`;
    setStatus(msg, 'error'); return;
  }
  if (rejectHistoryExport(json, setStatus)) return;
  try { await processScriptData({ data: json, addToHistory: true, grimoireState }); setStatus('Custom script loaded from URL!'); } catch (error) {
    console.error('Error processing URL script:', error); setStatus(`Invalid script data: ${error.message}`, 'error');
  }
}
export function decodeSharedScriptParam(param) {
  if (!param) return null;
  try {
    const decoded = decodeURIComponent(param); const normalized = decoded.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4); const binary = atob(padded); const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    let jsonStr = '';
    if (typeof TextDecoder !== 'undefined') {
      try {
        jsonStr = new TextDecoder().decode(bytes);
      } catch (_) { /* fallback below */ }
    }
    if (!jsonStr) { jsonStr = Array.from(bytes).map((b) => `%${b.toString(16).padStart(2, '0')}`).join(''); jsonStr = decodeURIComponent(jsonStr); }
    return JSON.parse(jsonStr);
  } catch (err) { console.error('Failed to decode shared script param', err); return null; }
}
export async function loadScriptFile({ event, grimoireState }) {
  const setStatus = statusWriter(); const file = event.target.files[0]; if (!file) return; console.log('File selected:', file.name, 'Size:', file.size);
  let json;
  try { console.log('Parsing uploaded file...'); json = await readJsonFile(file); console.log('Uploaded script parsed successfully:', json); } catch (error) {
    if (!(error instanceof SyntaxError)) { console.error('File reading error:', error); setStatus('Error reading file', 'error'); return; }
    console.error('Error parsing uploaded file:', error); setStatus(`Invalid JSON file: ${error.message}`, 'error'); return;
  }
  if (rejectHistoryExport(json, setStatus, HISTORY_EXPORT_MESSAGE)) return;
  try {
    await processScriptData({ data: json, addToHistory: true, grimoireState }); setStatus('Custom script loaded successfully!'); event.target.value = '';
  } catch (error) { console.error('Error processing uploaded script:', error); setStatus(`Invalid script file: ${error.message}`, 'error'); }
}
function displayJinxes({ jinxData, grimoireState, characterSheet, displayRoles }) {
  const roles = displayRoles || grimoireState.allRoles; const scriptCharacterIds = new Set(Object.values(roles).map(role => role.id));
  const applicableJinxes = jinxData.flatMap(character => !scriptCharacterIds.has(character.id) ? []
    : (character.jinx || []).filter(jinx => scriptCharacterIds.has(jinx.id))
      .map(jinx => ({ char1: character.id, char2: jinx.id, reason: jinx.reason })));
  if (applicableJinxes.length > 0) {
    appendHeader(characterSheet, 'Jinxes', 'team-jinxes');
    applicableJinxes.forEach(jinx => {
      const jinxEl = createElement('div', 'jinx-entry'); const char1Role = roles[jinx.char1]; const char2Role = roles[jinx.char2];
      jinxEl.innerHTML = `
        <div class="jinx-characters">
          <span class="icon" style="background-image: url('${char1Role.image}'), url('./assets/img/token.png'); background-size: cover, cover;"></span>
          <span class="name">${char1Role.name}</span>
          <span class="jinx-plus">+</span>
          <span class="icon" style="background-image: url('${char2Role.image}'), url('./assets/img/token.png'); background-size: cover, cover;"></span>
          <span class="name">${char2Role.name}</span>
        </div>
        <div class="jinx-reason">${jinx.reason}</div>
      `; jinxEl.addEventListener('click', () => jinxEl.classList.toggle('show-jinx-reason')); characterSheet.appendChild(jinxEl);
    });
  }
}
