import { INCLUDE_TRAVELLERS_KEY, MODE_STORAGE_KEY } from './constants.js';
import { setupGrimoire, updateGrimoire } from './grimoire.js';
import { renderSetupInfo } from './utils/setup.js';
import { repositionPlayers } from './ui/layout.js';
import { processScriptData } from './script.js';
import { showDayNightSlider, updateDayNightUI } from './dayNightTracking.js';
import { rebuildAllRoles } from './character.js';
import { captureStoredGameState } from './gameState.js';
export function withStateSave(fn) {
  return function (...args) {
    const result = fn.apply(this, args); let grimoireState = null;
    for (const arg of args) {
      if (arg && arg.grimoireState) { grimoireState = arg.grimoireState; break; }
    }
    if (!grimoireState && window.grimoireState) { grimoireState = window.grimoireState; }
    const shouldSave = grimoireState && !grimoireState.isRestoringState;
    if (result instanceof Promise) {
      return result.then((res) => { if (shouldSave) saveAppState({ grimoireState }); return res; });
    } else { if (shouldSave) saveAppState({ grimoireState }); return result; }
  };
}
export function saveAppState({ grimoireState }) {
  try {
    localStorage.setItem('botcAppStateV1', JSON.stringify(captureStoredGameState(grimoireState)));
    try { localStorage.setItem(INCLUDE_TRAVELLERS_KEY, grimoireState.includeTravellers ? '1' : '0'); } catch (_) { }
    try { localStorage.setItem(MODE_STORAGE_KEY, (grimoireState.mode === 'player') ? 'player' : 'storyteller'); } catch (_) { }
  } catch (_) { }
}
export async function loadAppState({ grimoireState, grimoireHistoryList }) {
  try {
    grimoireState.isRestoringState = true; const raw = localStorage.getItem('botcAppStateV1'); if (!raw) return; const saved = JSON.parse(raw);
    if (saved && Array.isArray(saved.scriptData) && saved.scriptData.length) {
      await processScriptData({ data: saved.scriptData, addToHistory: false, grimoireState });
      if (saved.scriptMetaName) { grimoireState.scriptMetaName = String(saved.scriptMetaName); }
      if (saved.includeTravellers) { grimoireState.includeTravellers = saved.includeTravellers; }
    }
    if (saved && Array.isArray(saved.players) && saved.players.length) {
      setupGrimoire({ grimoireState, grimoireHistoryList, count: saved.players.length }); grimoireState.players = saved.players; rebuildAllRoles({ grimoireState });
      updateGrimoire({ grimoireState }); repositionPlayers({ grimoireState }); renderSetupInfo({ grimoireState });
    }
    if (saved && saved.dayNightTracking) {
      grimoireState.dayNightTracking = saved.dayNightTracking;
      if (grimoireState.dayNightTracking.enabled) { showDayNightSlider(); }
      updateDayNightUI(grimoireState);
    }
    if (saved && saved.bluffs) { grimoireState.bluffs = saved.bluffs; }
    if (saved && saved.mode) { grimoireState.mode = saved.mode === 'player' ? 'player' : 'storyteller'; } else {
      grimoireState.mode = 'player';
    }
    if (saved && typeof saved.grimoireHidden === 'boolean') { grimoireState.grimoireHidden = !!saved.grimoireHidden; }
    if (saved && saved.playerSetup) { grimoireState.playerSetup = saved.playerSetup; }
    if (saved && typeof saved.gameStarted === 'boolean') { grimoireState.gameStarted = !!saved.gameStarted; } else {
      grimoireState.gameStarted = false;
    }
    grimoireState.winner = saved.winner || null;
    grimoireState.historyEdit = saved.historyEdit || null;
    if (saved && Object.prototype.hasOwnProperty.call(saved, 'tempSnapshot')) { grimoireState.tempSnapshot = saved.tempSnapshot || null; } else {
      grimoireState.tempSnapshot = null;
    }
  } catch (_) { } finally { grimoireState.isRestoringState = false; }
}
