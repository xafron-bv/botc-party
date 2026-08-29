import { saveAppState } from '../app.js';
import { updateBluffAttentionState } from '../bluffTokens.js';
import { MODE_STORAGE_KEY } from '../constants.js';
import {
  applyGrimoireHiddenState,
  applyGrimoireSnapshotState,
  hasGrimoireSnapshot,
  resetGrimoire,
  restoreGrimoireSnapshot,
  showGrimoire,
  takeGrimoireSnapshot,
  toggleGrimoireHidden
} from '../grimoire.js';
import { byId } from '../utils/dom.js';
import { applyEndGameControlState } from './endGameControls.js';

export function initGameMode({
  grimoireState,
  grimoireHistoryList,
  playerCountInput,
  openRulebookBtn,
  modeStorytellerRadio,
  modePlayerRadio,
  dayNightToggleBtn,
  dayNightSlider,
  revealToggleBtn,
  grimoireSnapshotToggleBtn
}) {
  try {
    const storedMode = localStorage.getItem(MODE_STORAGE_KEY);
    grimoireState.mode = storedMode === 'storyteller' ? 'storyteller' : 'player';
  } catch (_) {
    grimoireState.mode = 'player';
  }

  const updateGrimoireControlButtons = () => {
    if (!revealToggleBtn) return;
    const hidden = !!grimoireState.grimoireHidden;
    revealToggleBtn.style.display = grimoireState.mode === 'player' ? '' : 'none';
    revealToggleBtn.textContent = hidden ? 'Show Grimoire' : 'Hide Grimoire';
    revealToggleBtn.title = hidden
      ? 'Reveal characters to players'
      : 'Hide characters on this device';
    revealToggleBtn.setAttribute('aria-pressed', String(hidden));
  };

  const updateSnapshotToggleUI = () => {
    if (!grimoireSnapshotToggleBtn) return;
    const active = hasGrimoireSnapshot(grimoireState);
    const label = active
      ? 'Restore grimoire to before temporary changes'
      : 'Make temporary changes to the grimoire';
    grimoireSnapshotToggleBtn.style.display =
      grimoireState.mode === 'storyteller' ? '' : 'none';
    grimoireSnapshotToggleBtn.setAttribute('aria-pressed', String(active));
    grimoireSnapshotToggleBtn.classList.toggle('active', active);
    grimoireSnapshotToggleBtn.title = label;
    grimoireSnapshotToggleBtn.setAttribute('aria-label', label);
    const icon = grimoireSnapshotToggleBtn.querySelector('i');
    if (icon) icon.className = active ? 'fas fa-rotate-left' : 'fas fa-camera';
    applyGrimoireSnapshotState({ grimoireState });
  };

  const applyModeUI = () => {
    const isPlayer = grimoireState.mode === 'player';
    if (modeStorytellerRadio) modeStorytellerRadio.checked = !isPlayer;
    if (modePlayerRadio) modePlayerRadio.checked = isPlayer;
    document.body.classList.toggle('mode-player', isPlayer);
    document.body.classList.toggle('mode-storyteller', !isPlayer);
    if (dayNightToggleBtn) dayNightToggleBtn.style.display = isPlayer ? 'none' : '';
    if (dayNightSlider && isPlayer) {
      dayNightSlider.classList.remove('open');
      dayNightSlider.style.display = 'none';
    }
    const storytellerOnlyControls = [
      byId('open-player-setup'),
      openRulebookBtn,
      byId('open-storyteller-message')
    ];
    storytellerOnlyControls.forEach((control) => {
      if (control) control.style.display = isPlayer ? 'none' : '';
    });
    applyEndGameControlState({ grimoireState });
    if (isPlayer && grimoireState.dayNightTracking) {
      grimoireState.dayNightTracking.enabled = false;
    }
    updateBluffAttentionState({ grimoireState });
    updateGrimoireControlButtons();
    updateSnapshotToggleUI();
  };

  const applyGrimoireHiddenUI = () => {
    applyGrimoireHiddenState({ grimoireState });
    updateGrimoireControlButtons();
  };

  revealToggleBtn?.addEventListener('click', () => {
    if (grimoireState.mode !== 'player') return;
    toggleGrimoireHidden({ grimoireState });
    updateGrimoireControlButtons();
  });

  grimoireSnapshotToggleBtn?.addEventListener('click', () => {
    if (grimoireState.mode !== 'storyteller') return;
    if (hasGrimoireSnapshot(grimoireState)) {
      restoreGrimoireSnapshot({ grimoireState });
    } else {
      takeGrimoireSnapshot({ grimoireState });
    }
    updateSnapshotToggleUI();
  });

  if (modeStorytellerRadio && modePlayerRadio) {
    const onModeChange = (event) => {
      const nextMode = event.target.value === 'player' ? 'player' : 'storyteller';
      if (nextMode === grimoireState.mode) return;
      if (
        grimoireState.gameStarted &&
        !window.confirm(
          'A game is in progress. Switching mode will reset the grimoire and end the current game. Continue?'
        )
      ) {
        applyModeUI();
        return;
      }
      resetGrimoire({ grimoireState, grimoireHistoryList, playerCountInput });
      showGrimoire({ grimoireState });
      grimoireState.winner = null;
      grimoireState.gameStarted = false;
      grimoireState.mode = nextMode;
      applyModeUI();
      try {
        localStorage.setItem(MODE_STORAGE_KEY, grimoireState.mode);
      } catch (_) {}
      saveAppState({ grimoireState });
    };
    modeStorytellerRadio.addEventListener('change', onModeChange);
    modePlayerRadio.addEventListener('change', onModeChange);
  }

  applyModeUI();
  return {
    applyGrimoireHiddenUI,
    applyModeUI,
    updateGrimoireControlButtons,
    updateSnapshotToggleUI
  };
}
