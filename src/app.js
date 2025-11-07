import { INCLUDE_TRAVELLERS_KEY, MODE_STORAGE_KEY } from './constants.js';
import { setupGrimoire, updateGrimoire } from './grimoire.js';
import { renderSetupInfo } from './utils/setup.js';
import { repositionPlayers } from './ui/layout.js';
import { processScriptData } from './script.js';
import { updateDayNightUI } from './dayNightTracking.js';

export function saveAppState({ grimoireState }) {
  try {
    const state = {
      scriptData: grimoireState.scriptData,
      players: grimoireState.players,
      scriptName: grimoireState.scriptMetaName,
      dayNightTracking: grimoireState.dayNightTracking,
      bluffs: grimoireState.bluffs || [null, null, null],
      mode: grimoireState.mode || 'player',
      grimoireHidden: !!grimoireState.grimoireHidden,
      grimoireLocked: !!grimoireState.grimoireLocked,
      playerSetup: grimoireState.playerSetup || { bag: [], assignments: [], revealed: false },
      gameStarted: !!grimoireState.gameStarted,
      winner: grimoireState.winner || null
    };
    localStorage.setItem('botcAppStateV1', JSON.stringify(state));
    try { localStorage.setItem(INCLUDE_TRAVELLERS_KEY, grimoireState.includeTravellers ? '1' : '0'); } catch (_) { }
    try { localStorage.setItem(MODE_STORAGE_KEY, (grimoireState.mode === 'player') ? 'player' : 'storyteller'); } catch (_) { }
  } catch (_) { }
}

export async function loadAppState({ grimoireState, grimoireHistoryList }) {
  try {
    grimoireState.isRestoringState = true;
    const raw = localStorage.getItem('botcAppStateV1');
    if (!raw) return;
    const saved = JSON.parse(raw);
    if (saved && Array.isArray(saved.scriptData) && saved.scriptData.length) {
      await processScriptData({ data: saved.scriptData, addToHistory: false, grimoireState });
      if (saved.scriptMetaName) { grimoireState.scriptMetaName = String(saved.scriptMetaName); }
      if (saved.includeTravellers) { grimoireState.includeTravellers = saved.includeTravellers; }
    }
    if (saved && Array.isArray(saved.players) && saved.players.length) {
      setupGrimoire({ grimoireState, grimoireHistoryList, count: saved.players.length });
      grimoireState.players = saved.players;
      updateGrimoire({ grimoireState });
      repositionPlayers({ grimoireState });
      renderSetupInfo({ grimoireState });
    }
    if (saved && saved.dayNightTracking) {
      grimoireState.dayNightTracking = saved.dayNightTracking;
      updateDayNightUI(grimoireState);
    }
    if (saved && saved.bluffs) {
      grimoireState.bluffs = saved.bluffs;
    }
    if (saved && saved.mode) {
      grimoireState.mode = saved.mode === 'player' ? 'player' : 'storyteller';
    } else {
      grimoireState.mode = 'player';
    }
    if (saved && typeof saved.grimoireHidden === 'boolean') {
      grimoireState.grimoireHidden = !!saved.grimoireHidden;
    }
    if (saved && typeof saved.grimoireLocked === 'boolean') {
      grimoireState.grimoireLocked = !!saved.grimoireLocked;
    }
    if (saved && saved.playerSetup) {
      grimoireState.playerSetup = saved.playerSetup;
    }
    if (saved && typeof saved.gameStarted === 'boolean') {
      grimoireState.gameStarted = !!saved.gameStarted;
    } else {
      grimoireState.gameStarted = false;
    }
    if (saved && saved.winner) {
      grimoireState.winner = saved.winner;
    }
  } catch (_) { } finally { grimoireState.isRestoringState = false; }
}
