import { loadAppState } from '../app.js';
import { INCLUDE_TRAVELLERS_KEY, MODE_STORAGE_KEY } from '../constants.js';
import { applyGrimoireHiddenState, applyGrimoireLockedState } from '../grimoire.js';
import { updateBluffAttentionState } from '../bluffTokens.js';

function getStatusEl() {
  return document.getElementById('import-status');
}

function setStatus({ message, isError = false }) {
  const el = getStatusEl();
  if (!el) return;
  el.textContent = message || '';
  el.className = message ? (isError ? 'error' : 'status') : '';
  if (message) {
    setTimeout(() => {
      try {
        const current = getStatusEl();
        if (current) {
          current.textContent = '';
          current.className = '';
        }
      } catch (_) { }
    }, 5000);
  }
}

function isHistoryExportFile(data) {
  return !!(data &&
    typeof data === 'object' &&
    !Array.isArray(data) &&
    ('scriptHistory' in data || 'grimoireHistory' in data));
}

function normalizeImportedGameState(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const state = (data.gameState && typeof data.gameState === 'object') ? data.gameState : data;
  if (!state || typeof state !== 'object' || Array.isArray(state)) return null;

  const scriptData = Array.isArray(state.scriptData) ? state.scriptData : [];
  const players = Array.isArray(state.players) ? state.players : [];

  return {
    scriptData,
    players,
    scriptMetaName: typeof state.scriptMetaName === 'string' ? state.scriptMetaName : (typeof state.scriptName === 'string' ? state.scriptName : ''),
    includeTravellers: !!state.includeTravellers,
    dayNightTracking: state.dayNightTracking || { enabled: false, phases: ['N1'], currentPhaseIndex: 0, reminderTimestamps: {} },
    bluffs: Array.isArray(state.bluffs) ? state.bluffs : [null, null, null],
    mode: state.mode === 'player' ? 'player' : 'storyteller',
    grimoireHidden: !!state.grimoireHidden,
    grimoireLocked: !!state.grimoireLocked,
    playerSetup: state.playerSetup || { bag: [], assignments: [], revealed: false },
    gameStarted: !!state.gameStarted,
    winner: state.winner || null
  };
}

function applyModeUi({ grimoireState }) {
  const modeStorytellerRadio = document.getElementById('mode-storyteller');
  const modePlayerRadio = document.getElementById('mode-player');
  const dayNightToggleBtn = document.getElementById('day-night-toggle');
  const displaySettingsToggleBtn = document.getElementById('display-settings-toggle');
  const dayNightSlider = document.getElementById('day-night-slider');
  const openRulebookBtn = document.getElementById('open-rulebook');
  const revealToggleBtn = document.getElementById('reveal-assignments');
  const grimoireLockToggleBtn = document.getElementById('grimoire-lock-toggle');

  if (modeStorytellerRadio) modeStorytellerRadio.checked = grimoireState.mode !== 'player';
  if (modePlayerRadio) modePlayerRadio.checked = grimoireState.mode === 'player';

  const isPlayer = grimoireState.mode === 'player';
  if (dayNightToggleBtn) dayNightToggleBtn.style.display = isPlayer ? 'none' : '';
  if (displaySettingsToggleBtn) {
    if (isPlayer) displaySettingsToggleBtn.classList.add('single-toggle');
    else displaySettingsToggleBtn.classList.remove('single-toggle');
  }
  if (dayNightSlider && isPlayer) {
    dayNightSlider.classList.remove('open');
    dayNightSlider.style.display = 'none';
  }

  const openPlayerSetupBtn = document.getElementById('open-player-setup');
  if (openPlayerSetupBtn) openPlayerSetupBtn.style.display = isPlayer ? 'none' : '';
  if (openRulebookBtn) openRulebookBtn.style.display = isPlayer ? 'none' : '';
  const openStBtn = document.getElementById('open-storyteller-message');
  if (openStBtn) openStBtn.style.display = isPlayer ? 'none' : '';

  if (isPlayer && grimoireState.dayNightTracking) {
    grimoireState.dayNightTracking.enabled = false;
  }

  if (revealToggleBtn) {
    const hidden = !!grimoireState.grimoireHidden;
    revealToggleBtn.style.display = isPlayer ? '' : 'none';
    revealToggleBtn.textContent = hidden ? 'Show Grimoire' : 'Hide Grimoire';
    revealToggleBtn.title = hidden ? 'Reveal characters to players' : 'Hide characters on this device';
    revealToggleBtn.setAttribute('aria-pressed', String(hidden));
  }
  if (grimoireLockToggleBtn) {
    const locked = !!grimoireState.grimoireLocked;
    grimoireLockToggleBtn.style.display = isPlayer ? 'none' : '';
    grimoireLockToggleBtn.textContent = locked ? 'Unlock Grimoire' : 'Lock Grimoire';
    grimoireLockToggleBtn.title = locked ? 'Unlock to allow grimoire changes' : 'Lock to prevent lineup changes';
    grimoireLockToggleBtn.setAttribute('aria-pressed', String(locked));
  }

  try { updateBluffAttentionState({ grimoireState }); } catch (_) { }
}

export function exportCurrentGame({ grimoireState }) {
  const gameState = {
    scriptData: Array.isArray(grimoireState.scriptData) ? grimoireState.scriptData : [],
    scriptMetaName: typeof grimoireState.scriptMetaName === 'string' ? grimoireState.scriptMetaName : '',
    includeTravellers: !!grimoireState.includeTravellers,
    players: Array.isArray(grimoireState.players) ? grimoireState.players : [],
    dayNightTracking: grimoireState.dayNightTracking || { enabled: false, phases: ['N1'], currentPhaseIndex: 0, reminderTimestamps: {} },
    bluffs: Array.isArray(grimoireState.bluffs) ? grimoireState.bluffs : [null, null, null],
    mode: grimoireState.mode === 'player' ? 'player' : 'storyteller',
    grimoireHidden: !!grimoireState.grimoireHidden,
    grimoireLocked: !!grimoireState.grimoireLocked,
    playerSetup: grimoireState.playerSetup || { bag: [], assignments: [], revealed: false },
    gameStarted: !!grimoireState.gameStarted,
    winner: grimoireState.winner || null
  };

  const exportData = {
    kind: 'botc-current-game',
    version: 1,
    exportDate: new Date().toISOString(),
    gameState
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  const date = new Date().toISOString().split('T')[0];
  a.download = `botc-game-${date}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  setStatus({ message: 'Game exported successfully!' });

  if (window.Cypress) {
    window.lastDownloadedGameFile = {
      filename: a.download,
      content: JSON.stringify(exportData, null, 2),
      exportDate: exportData.exportDate
    };
  }
}

export async function importCurrentGame({ file, grimoireState, grimoireHistoryList }) {
  const text = await file.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch (error) {
    setStatus({ message: 'Error importing game: invalid JSON.', isError: true });
    throw error;
  }

  if (Array.isArray(data)) {
    alert('This appears to be a script file. Please use the "Upload Custom Script" option in the Game Setup section to load it.');
    return;
  }

  if (isHistoryExportFile(data)) {
    alert('This appears to be a user data history export file. Please use the "Import Data" button.');
    return;
  }

  const normalized = normalizeImportedGameState(data);
  if (!normalized) {
    alert('Invalid game export file.');
    return;
  }

  const saved = {
    scriptData: normalized.scriptData,
    scriptMetaName: normalized.scriptMetaName,
    scriptName: normalized.scriptMetaName,
    includeTravellers: normalized.includeTravellers,
    players: normalized.players,
    dayNightTracking: normalized.dayNightTracking,
    bluffs: normalized.bluffs,
    mode: normalized.mode,
    grimoireHidden: normalized.grimoireHidden,
    grimoireLocked: normalized.grimoireLocked,
    playerSetup: normalized.playerSetup,
    gameStarted: normalized.gameStarted,
    winner: normalized.winner
  };

  try { localStorage.setItem('botcAppStateV1', JSON.stringify(saved)); } catch (_) { }
  try { localStorage.setItem(INCLUDE_TRAVELLERS_KEY, saved.includeTravellers ? '1' : '0'); } catch (_) { }
  try { localStorage.setItem(MODE_STORAGE_KEY, saved.mode); } catch (_) { }

  await loadAppState({ grimoireState, grimoireHistoryList });
  try { applyGrimoireHiddenState({ grimoireState }); } catch (_) { }
  try { applyGrimoireLockedState({ grimoireState }); } catch (_) { }
  try { applyModeUi({ grimoireState }); } catch (_) { }

  setStatus({ message: 'Game imported successfully!' });
}

export function initCurrentGameExportImport({ grimoireState, grimoireHistoryList }) {
  const exportBtn = document.getElementById('export-game-btn');
  const importBtn = document.getElementById('import-game-btn');
  const importFileInput = document.getElementById('import-game-file');

  if (exportBtn) {
    exportBtn.addEventListener('click', () => exportCurrentGame({ grimoireState }));
  }

  if (importBtn && importFileInput) {
    importBtn.addEventListener('click', () => importFileInput.click());
    importFileInput.addEventListener('change', async (e) => {
      const f = e.target.files && e.target.files[0];
      if (!f) return;
      try {
        await importCurrentGame({ file: f, grimoireState, grimoireHistoryList });
      } catch (error) {
        console.error('Error importing game:', error);
      } finally {
        try { importFileInput.value = ''; } catch (_) { }
      }
    });
  }
}

