import { generateId, formatDateName } from '../../utils.js';
import { saveHistories, history } from './index.js';
import { updateGrimoire, renderSetupInfo, setupGrimoire } from '../grimoire.js';
import { saveAppState } from '../app.js';
import { repositionPlayers } from '../ui/layout.js';
import { processScriptData } from '../script.js';

export function renderGrimoireHistory({ grimoireHistoryList }) {
  if (!grimoireHistoryList) return;
  grimoireHistoryList.innerHTML = '';
  history.grimoireHistory.forEach(entry => {
    const li = document.createElement('li');
    li.dataset.id = entry.id;
    li.className = 'history-item';
    const nameSpan = document.createElement('span');
    nameSpan.className = 'history-name';
    nameSpan.textContent = entry.name || formatDateName(new Date(entry.createdAt || Date.now()));
    // Inline edit input (hidden by default)
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'history-edit-input';
    nameInput.value = entry.name || formatDateName(new Date(entry.createdAt || Date.now()));
    nameInput.style.display = 'none';
    // Icons
    const renameBtn = document.createElement('button');
    renameBtn.className = 'icon-btn rename';
    renameBtn.title = 'Rename';
    renameBtn.innerHTML = '<i class="fa-solid fa-pen"></i>';
    const saveBtn = document.createElement('button');
    saveBtn.className = 'icon-btn save';
    saveBtn.title = 'Save';
    saveBtn.style.display = 'none';
    saveBtn.innerHTML = '<i class="fa-solid fa-check"></i>';
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'icon-btn delete';
    deleteBtn.title = 'Delete';
    deleteBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
    li.appendChild(nameSpan);
    li.appendChild(nameInput);
    li.appendChild(renameBtn);
    li.appendChild(saveBtn);
    li.appendChild(deleteBtn);
    grimoireHistoryList.appendChild(li);
  });
}

function isGrimoireStateEqual(state1, state2) {
  // Handle null/undefined cases
  if (!state1.players || !state2.players) return false;

  // Compare player count first for quick rejection
  if (state1.players.length !== state2.players.length) return false;

  // Compare players
  for (let i = 0; i < state1.players.length; i++) {
    const p1 = state1.players[i];
    const p2 = state2.players[i];
    if (p1.name !== p2.name || p1.character !== p2.character || p1.dead !== p2.dead) return false;

    // Compare reminders
    const r1 = p1.reminders || [];
    const r2 = p2.reminders || [];
    if (r1.length !== r2.length) return false;
    for (let j = 0; j < r1.length; j++) {
      if (r1[j].type !== r2[j].type || r1[j].token !== r2[j].token ||
        r1[j].text !== r2[j].text || r1[j].label !== r2[j].label) return false;
    }
  }

  // Compare script data
  if (state1.scriptName !== state2.scriptName) return false;
  if (JSON.stringify(state1.scriptData) !== JSON.stringify(state2.scriptData)) return false;

  return true;
}

export function snapshotCurrentGrimoire({ players, scriptMetaName, scriptData, grimoireHistoryList }) {
  try {
    if (!Array.isArray(players) || players.length === 0) return;

    // Check if the current state already exists in any history entry
    const currentState = {
      players: players,
      scriptName: scriptMetaName || (Array.isArray(scriptData) && (scriptData.find(x => x && typeof x === 'object' && x.id === '_meta')?.name || '')) || '',
      scriptData: scriptData
    };

    // Check against ALL history entries, not just the most recent
    for (const historyEntry of history.grimoireHistory) {
      const historyState = {
        players: historyEntry.players,
        scriptName: historyEntry.scriptName,
        scriptData: historyEntry.scriptData
      };

      if (isGrimoireStateEqual(currentState, historyState)) {
        // This exact state already exists in history, don't create a duplicate
        return;
      }
    }

    const snapPlayers = JSON.parse(JSON.stringify(players));
    const name = formatDateName(new Date());
    const entry = {
      id: generateId('grimoire'),
      name,
      createdAt: Date.now(),
      players: snapPlayers,
      scriptName: scriptMetaName || (Array.isArray(scriptData) && (scriptData.find(x => x && typeof x === 'object' && x.id === '_meta')?.name || '')) || '',
      scriptData: Array.isArray(scriptData) ? JSON.parse(JSON.stringify(scriptData)) : null
    };
    history.grimoireHistory.unshift(entry);
    saveHistories();
    renderGrimoireHistory({ grimoireHistoryList });
  } catch (_) { }
}

export async function handleGrimoireHistoryClick({ e, grimoireHistoryList, grimoireState }) {
  const li = e.target.closest('li');
  if (!li) return;
  const id = li.dataset.id;
  const entry = history.grimoireHistory.find(x => x.id === id);
  if (!entry) return;
  const clickedDelete = e.target.closest('.icon-btn.delete');
  const clickedRename = e.target.closest('.icon-btn.rename');
  const clickedSave = e.target.closest('.icon-btn.save');
  const clickedInput = e.target.closest('.history-edit-input');
  if (clickedDelete) {
    if (confirm('Delete this grimoire snapshot?')) {
      history.grimoireHistory = history.grimoireHistory.filter(x => x.id !== id);
      saveHistories();
      renderGrimoireHistory({ grimoireHistoryList });
    }
    return;
  }
  if (clickedRename) {
    const nameSpan = li.querySelector('.history-name');
    const input = li.querySelector('.history-edit-input');
    const renameBtn = li.querySelector('.icon-btn.rename');
    const saveBtn = li.querySelector('.icon-btn.save');
    nameSpan.style.display = 'none';
    input.style.display = 'inline-block';
    renameBtn.style.display = 'none';
    saveBtn.style.display = 'inline-block';
    li.classList.add('editing');
    input.focus();
    input.setSelectionRange(0, input.value.length);
    return;
  }
  if (clickedSave) {
    const input = li.querySelector('.history-edit-input');
    const newName = (input.value || '').trim();
    if (newName) {
      entry.name = newName;
      entry.updatedAt = Date.now();
      saveHistories();
      renderGrimoireHistory({ grimoireHistoryList });
    }
    li.classList.remove('editing');
    return;
  }
  if (clickedInput) return; // don't load when clicking into input
  if (li.classList.contains('editing')) return; // avoid loading while editing
  // Default: clicking the item or name loads the grimoire

  // Check if the entry we're about to load is different from current state
  const currentState = {
    players: grimoireState.players,
    scriptName: grimoireState.scriptMetaName || '',
    scriptData: grimoireState.scriptData
  };
  const entryState = {
    players: entry.players,
    scriptName: entry.scriptName || '',
    scriptData: entry.scriptData
  };

  // Only snapshot if we're loading a different state
  if (!isGrimoireStateEqual(currentState, entryState)) {
    // Snapshot current game before loading history item (same as startGame does)
    try {
      if (!grimoireState.isRestoringState && Array.isArray(grimoireState.players) && grimoireState.players.length > 0) {
        snapshotCurrentGrimoire({
          players: grimoireState.players,
          scriptMetaName: grimoireState.scriptMetaName,
          scriptData: grimoireState.scriptData,
          grimoireHistoryList
        });
      }
    } catch (_) { }
  }

  await restoreGrimoireFromEntry({ entry, grimoireState, grimoireHistoryList });
}

export function handleGrimoireHistoryOnDown(e) {
  const li = e.target.closest('li.history-item');
  if (!li) return;
  if (e.target.closest('.icon-btn') || e.target.closest('.history-edit-input')) return;
  li.classList.add('pressed');
}

export function handleGrimoireHistoryOnClear() {
  document.querySelectorAll('#grimoire-history-list li.pressed').forEach(el => el.classList.remove('pressed'));
}

export function handleGrimoireHistoryOnKeyDown({ e, grimoireHistoryList }) {
  if (!e.target.classList.contains('history-edit-input')) return;
  const li = e.target.closest('li');
  const id = li && li.dataset.id;
  const entry = history.grimoireHistory.find(x => x.id === id);
  if (!entry) return;
  if (e.key === 'Enter') {
    const newName = (e.target.value || '').trim();
    if (newName) {
      entry.name = newName;
      entry.updatedAt = Date.now();
      saveHistories();
      renderGrimoireHistory({ grimoireHistoryList });
    }
  }
}

export async function restoreGrimoireFromEntry({ entry, grimoireState, grimoireHistoryList }) {
  if (!entry) return;
  try {
    grimoireState.isRestoringState = true;
    if (entry.scriptData) {
      await processScriptData({ data: entry.scriptData, addToHistory: false, grimoireState });
      grimoireState.scriptMetaName = entry.scriptName || grimoireState.scriptMetaName;
    }
    setupGrimoire({ grimoireState, grimoireHistoryList, count: (entry.players || []).length || 0 });
    grimoireState.players = JSON.parse(JSON.stringify(entry.players || []));
    updateGrimoire({ grimoireState });
    repositionPlayers({ grimoireState });
    saveAppState({ grimoireState });
    renderSetupInfo({ grimoireState });
  } catch (e) {
    console.error('Failed to restore grimoire from history:', e);
  } finally {
    grimoireState.isRestoringState = false;
  }
}

export function addGrimoireHistoryListListeners({ grimoireHistoryList, grimoireState }) {
  grimoireHistoryList.addEventListener('pointerdown', handleGrimoireHistoryOnDown);
  grimoireHistoryList.addEventListener('pointerup', handleGrimoireHistoryOnClear);
  grimoireHistoryList.addEventListener('pointercancel', handleGrimoireHistoryOnClear);
  grimoireHistoryList.addEventListener('pointerleave', handleGrimoireHistoryOnClear);
  grimoireHistoryList.addEventListener('click', async (e) => handleGrimoireHistoryClick({ e, grimoireHistoryList, grimoireState }));
  grimoireHistoryList.addEventListener('keydown', (e) => handleGrimoireHistoryOnKeyDown({ e, grimoireHistoryList }));
}
