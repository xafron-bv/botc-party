import { withStateSave } from './app.js';
import { createBluffTokensContainer, updateAllBluffTokens } from './bluffTokens.js';
import { calculateNightOrder, shouldShowNightOrder, updateDayNightUI, getCurrentPhase, saveCurrentPhaseState } from './dayNightTracking.js';
import { snapshotCurrentGrimoire } from './history/grimoire.js';
import { openReminderTokenModal } from './reminder.js';
import { closeMenusOnOutsideEvent, hidePlayerContextMenu, hideReminderContextMenu } from './ui/contextMenu.js';
import { repositionPlayers } from './ui/layout.js';
import { positionInfoIcons, positionTokenReminders } from './ui/tooltip.js';
import { renderSetupInfo } from './utils/setup.js';
import { handlePlayerElementTouch } from './ui/touchHelpers.js';
import { createPlayerListItem } from './ui/playerCircle.js';
import { ensureGrimoireUnlocked } from './grimoireLock.js';
import { updatePlayerElement } from './ui/playerUpdate.js';
import { createSafeClickHandler, attachTouchHandler } from './utils/eventHandlers.js';

try { window.openReminderTokenModal = openReminderTokenModal; } catch (_) { }
function setupPlayerNameHandlers({ listItem, grimoireState, playerIndex }) {
  const handlePlayerNameClick = withStateSave((_e) => {
    if (!ensureGrimoireUnlocked({ grimoireState })) return;
    const currentName = grimoireState.players[playerIndex].name;
    const newName = prompt('Enter player name:', currentName);
    if (newName) {
      grimoireState.players[playerIndex].name = newName;
      updateGrimoire({ grimoireState });
    }
  });
  listItem.querySelector('.player-name').onclick = createSafeClickHandler(handlePlayerNameClick);
  if ('ontouchstart' in window) {
    attachTouchHandler(listItem.querySelector('.player-name'), (e) => {
      handlePlayerElementTouch({
        e,
        listItem,
        actionCallback: handlePlayerNameClick,
        grimoireState,
        playerIndex
      });
    }, { triggerOnStart: true });
  }
}

export function applyGrimoireHiddenState({ grimoireState }) {
  try { document.body.classList.toggle('grimoire-hidden', !!grimoireState.grimoireHidden); } catch (_) { }
  updateGrimoire({ grimoireState });
}

export function applyGrimoireLockedState({ grimoireState }) {
  try { document.body.classList.toggle('grimoire-locked', !!grimoireState.grimoireLocked); } catch (_) { }
}

export const setGrimoireLocked = withStateSave(({ grimoireState, locked }) => {
  grimoireState.grimoireLocked = !!locked;
  applyGrimoireLockedState({ grimoireState });
});

export function toggleGrimoireLocked({ grimoireState }) {
  setGrimoireLocked({ grimoireState, locked: !grimoireState.grimoireLocked });
}

export const setGrimoireHidden = withStateSave(({ grimoireState, hidden }) => {
  grimoireState.grimoireHidden = !!hidden;
  applyGrimoireHiddenState({ grimoireState });
});

export function toggleGrimoireHidden({ grimoireState }) {
  setGrimoireHidden({ grimoireState, hidden: !grimoireState.grimoireHidden });
}

export function hideGrimoire({ grimoireState }) { setGrimoireHidden({ grimoireState, hidden: true }); }
export function showGrimoire({ grimoireState }) { setGrimoireHidden({ grimoireState, hidden: false }); }

function mountBluffTokensContainer({ grimoireState }) {
  const existingContainer = document.getElementById('bluff-tokens-container');
  if (existingContainer) {
    existingContainer.remove();
  }
  const bluffContainer = createBluffTokensContainer({ grimoireState });
  const parent = document.getElementById('grimoire') || document.getElementById('center');
  if (parent) {
    parent.appendChild(bluffContainer);
  }
}

export const setupGrimoire = withStateSave(({ grimoireState, grimoireHistoryList, count }) => {
  const playerCircle = document.getElementById('player-circle');
  const playerCountInput = document.getElementById('player-count');
  grimoireState.grimoireLocked = false;
  applyGrimoireLockedState({ grimoireState });
  try {
    if (grimoireState.gameStarted && !grimoireState.isRestoringState && Array.isArray(grimoireState.players) && grimoireState.players.length > 0) {
      snapshotCurrentGrimoire({ players: grimoireState.players, scriptMetaName: grimoireState.scriptMetaName, scriptData: grimoireState.scriptData, grimoireHistoryList, dayNightTracking: grimoireState.dayNightTracking, winner: grimoireState.winner });
    }
  } catch (_) { }
  console.log('Setting up grimoire with', count, 'players');
  playerCircle.innerHTML = '';
  grimoireState.players = Array.from({ length: count }, (_, i) => ({
    name: `Player ${i + 1}`,
    character: null,
    reminders: [],
    dead: false,
    deathVote: false,
    nightKilledPhase: null
  }));
  if (playerCountInput) {
    try { playerCountInput.value = String(grimoireState.players.length); } catch (_) { }
  }

  grimoireState.players.forEach((player, i) => {
    const listItem = createPlayerListItem({
      grimoireState,
      playerIndex: i,
      playerName: player.name,
      setupPlayerNameHandlers
    });
    playerCircle.appendChild(listItem);
  });
  mountBluffTokensContainer({ grimoireState });
  requestAnimationFrame(() => {
    repositionPlayers({ grimoireState });
    updateGrimoire({ grimoireState });
    renderSetupInfo({ grimoireState });
  });
});

export function updateGrimoire({ grimoireState }) {
  const abilityTooltip = document.getElementById('ability-tooltip');
  const playerCircle = document.getElementById('player-circle');
  const listItems = playerCircle.querySelectorAll('li');
  renderSetupInfo({ grimoireState });
  if (grimoireState.grimoireHidden && abilityTooltip) {
    abilityTooltip.classList.remove('show');
  }

  const showNightReminders = shouldShowNightOrder(grimoireState);
  const nightOrderMap = showNightReminders ? calculateNightOrder(grimoireState) : {};
  const currentPhase = getCurrentPhase(grimoireState);
  const isFirstNight = currentPhase === 'N1';

  listItems.forEach((li, i) => {
    updatePlayerElement({
      li,
      playerIndex: i,
      grimoireState,
      updateGrimoireFn: updateGrimoire,
      saveCurrentPhaseStateFn: saveCurrentPhaseState,
      nightOrderMap,
      isFirstNight,
      showNightReminders,
      currentPhase
    });
  });
  positionInfoIcons();
  positionTokenReminders();
  updateAllBluffTokens({ grimoireState });
}
export const resetGrimoire = withStateSave(({ grimoireState, grimoireHistoryList, playerCountInput }) => {
  const sel = grimoireState.playerSetup;
  if (sel && sel.selectionActive) {
    try {
      document.querySelectorAll('#player-circle li .number-overlay, #player-circle li .number-badge').forEach((el) => el.remove());
    } catch (_) { }
    sel.selectionActive = false;
    sel.assignments = new Array((grimoireState.players || []).length).fill(null);
    try { document.body.classList.remove('selection-active'); } catch (_) { }
    try { document.body.classList.remove('player-setup-open'); } catch (_) { }
    try {
      const numberPickerOverlay = document.getElementById('number-picker-overlay');
      if (numberPickerOverlay) numberPickerOverlay.style.display = 'none';
    } catch (_) { }
  }
  const playerCount = parseInt(playerCountInput.value, 10);
  if (!(playerCount >= 5 && playerCount <= 20)) {
    alert('Player count must be an integer from 5 to 20.');
    return;
  }

  try {
    if (grimoireState.gameStarted && !grimoireState.isRestoringState && Array.isArray(grimoireState.players) && grimoireState.players.length > 0) {
      snapshotCurrentGrimoire({ players: grimoireState.players, scriptMetaName: grimoireState.scriptMetaName, scriptData: grimoireState.scriptData, grimoireHistoryList, dayNightTracking: grimoireState.dayNightTracking, winner: grimoireState.winner });
    }
  } catch (_) { }
  try { grimoireState.grimoireHidden = false; } catch (_) { }
  try { grimoireState.winner = null; } catch (_) { }
  try { grimoireState.gameStarted = false; } catch (_) { }
  try {
    if (!grimoireState.playerSetup) {
      grimoireState.playerSetup = { bag: [], assignments: [], revealed: false };
    } else {
      grimoireState.playerSetup.bag = [];
      grimoireState.playerSetup.assignments = [];
      grimoireState.playerSetup.revealed = false;
      delete grimoireState.playerSetup.selectionComplete;
    }
  } catch (_) { }

  const existingPlayers = Array.isArray(grimoireState.players) ? grimoireState.players : [];
  const newPlayers = Array.from({ length: playerCount }, (_, i) => {
    const existing = existingPlayers[i];
    const name = existing && existing.name ? existing.name : `Player ${i + 1}`;
    return { name, character: null, reminders: [], dead: false, deathVote: false, nightKilledPhase: null };
  });
  grimoireState.players = newPlayers;
  grimoireState.grimoireLocked = false;
  applyGrimoireLockedState({ grimoireState });

  rebuildPlayerCircleUiPreserveState({ grimoireState });
  grimoireState.bluffs = [null, null, null];
  try {
    if (!grimoireState.dayNightTracking) {
      grimoireState.dayNightTracking = { enabled: false, phases: ['N1'], currentPhaseIndex: 0, reminderTimestamps: {} };
    } else {
      grimoireState.dayNightTracking.enabled = false;
      grimoireState.dayNightTracking.phases = ['N1'];
      grimoireState.dayNightTracking.currentPhaseIndex = 0;
      grimoireState.dayNightTracking.reminderTimestamps = {};
    }
    updateDayNightUI(grimoireState);
  } catch (_) { }
  try { applyGrimoireHiddenState({ grimoireState }); } catch (_) { }
});

export const rebuildPlayerCircleUiPreserveState = withStateSave(({ grimoireState }) => {
  const playerCircle = document.getElementById('player-circle');
  const playerCountInput = document.getElementById('player-count');
  if (!playerCircle) return;
  playerCircle.innerHTML = '';
  if (playerCountInput) {
    try { playerCountInput.value = String(grimoireState.players.length); } catch (_) { }
  }
  grimoireState.players.forEach((player, i) => {
    const listItem = createPlayerListItem({
      grimoireState,
      playerIndex: i,
      playerName: player.name,
      setupPlayerNameHandlers
    });
    playerCircle.appendChild(listItem);
  });
  mountBluffTokensContainer({ grimoireState });
  repositionPlayers({ grimoireState });
  updateGrimoire({ grimoireState });
  renderSetupInfo({ grimoireState });
  requestAnimationFrame(() => {
    repositionPlayers({ grimoireState });
    updateGrimoire({ grimoireState });
  });
});
document.addEventListener('DOMContentLoaded', () => {
  if ('ontouchstart' in window) {
    document.addEventListener('touchstart', (e) => {
      const target = e.target;
      if (!target.closest('#player-circle li')) {
        document.querySelectorAll('#player-circle li[data-raised="true"]').forEach(el => {
          delete el.dataset.raised;
          el.style.zIndex = el.dataset.originalLiZIndex || '';
          delete el.dataset.originalLiZIndex;
        });
      }
    }, { passive: true });
  }
});

document.addEventListener('pointerdown', closeMenusOnOutsideEvent, true);
document.addEventListener('touchstart', closeMenusOnOutsideEvent, true);

document.addEventListener('keydown', (e) => {
  const grimoireState = window.grimoireState;
  if (!grimoireState) return;

  if (e.key === 'Escape') {
    if (grimoireState.playerContextMenu && grimoireState.playerContextMenu.style.display === 'block') {
      hidePlayerContextMenu({ grimoireState });
    }

    if (grimoireState.reminderContextMenu && grimoireState.reminderContextMenu.style.display === 'block') {
      hideReminderContextMenu({ grimoireState });
    }
  }
});
