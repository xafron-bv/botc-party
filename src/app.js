import { INCLUDE_TRAVELLERS_KEY } from './constants.js';
import { renderSetupInfo, setupGrimoire, updateGrimoire } from './grimoire.js';
import { repositionPlayers } from './ui/layout.js';
import { processScriptData } from './script.js';
import { updateDayNightUI } from './dayNightTracking.js';

export function saveAppState({ grimoireState }) {
  try {
    const state = { 
      scriptData: grimoireState.scriptData, 
      players: grimoireState.players, 
      scriptName: grimoireState.scriptMetaName,
      dayNightTracking: grimoireState.dayNightTracking
    };
    localStorage.setItem('botcAppStateV1', JSON.stringify(state));
    try { localStorage.setItem(INCLUDE_TRAVELLERS_KEY, grimoireState.includeTravellers ? '1' : '0'); } catch (_) { }
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
      repositionPlayers({ players: grimoireState.players });
      renderSetupInfo({ grimoireState });
    }
    if (saved && saved.dayNightTracking) {
      grimoireState.dayNightTracking = saved.dayNightTracking;
      // Update the UI after loading state
      updateDayNightUI(grimoireState);
    }
  } catch (_) { } finally { grimoireState.isRestoringState = false; }
}
