export function createPlayerSetupState() {
  return { bag: [], assignments: [], revealed: false };
}

export function createDayNightTrackingState({ includeSnapshots = false } = {}) {
  const state = {
    enabled: false,
    phases: ['N1'],
    currentPhaseIndex: 0,
    reminderTimestamps: {}
  };
  if (includeSnapshots) state.phaseSnapshots = {};
  return state;
}

function gameStateFrom(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const state = value.gameState && typeof value.gameState === 'object'
    ? value.gameState
    : value;
  return state && !Array.isArray(state) ? state : null;
}

export function normalizeGameState(value) {
  const state = gameStateFrom(value);
  if (!state) return null;
  return {
    scriptData: Array.isArray(state.scriptData) ? state.scriptData : [],
    players: Array.isArray(state.players) ? state.players : [],
    scriptMetaName: typeof state.scriptMetaName === 'string'
      ? state.scriptMetaName
      : (typeof state.scriptName === 'string' ? state.scriptName : ''),
    includeTravellers: !!state.includeTravellers,
    dayNightTracking: state.dayNightTracking || createDayNightTrackingState(),
    bluffs: Array.isArray(state.bluffs) ? state.bluffs : [null, null, null],
    mode: state.mode === 'player' ? 'player' : 'storyteller',
    grimoireHidden: !!state.grimoireHidden,
    playerSetup: state.playerSetup || createPlayerSetupState(),
    gameStarted: !!state.gameStarted,
    winner: state.winner || null,
    tempSnapshot: state.tempSnapshot || null
  };
}

export function captureGameState(grimoireState) {
  return normalizeGameState(grimoireState);
}

export function captureStoredGameState(grimoireState) {
  const state = captureGameState(grimoireState);
  return {
    scriptData: grimoireState.scriptData,
    players: grimoireState.players,
    scriptName: state.scriptMetaName,
    dayNightTracking: grimoireState.dayNightTracking,
    bluffs: state.bluffs,
    mode: state.mode,
    grimoireHidden: state.grimoireHidden,
    playerSetup: state.playerSetup,
    gameStarted: state.gameStarted,
    winner: state.winner,
    tempSnapshot: state.tempSnapshot
  };
}
