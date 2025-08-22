import { INCLUDE_TRAVELLERS_KEY } from '../constants.js';
import { renderSetupInfo, setupGrimoire, updateGrimoire } from './grimoire.js';
import { repositionPlayers } from './layout.js';
import { processScriptData } from './script.js';

export function saveAppState({ grimoireState }) {
  try {
    const state = { scriptData: grimoireState.scriptData, players: grimoireState.players, scriptName: grimoireState.scriptMetaName };
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
  } catch (_) { } finally { grimoireState.isRestoringState = false; }
}