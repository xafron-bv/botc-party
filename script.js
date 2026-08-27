import './pwa.js';
import { loadAppState, saveAppState } from './src/app.js';
import { hideCharacterModal, populateCharacterGrid } from './src/character.js';
import { isTouchDevice } from './src/constants.js';
import { addReminderTimestamp, generateReminderId, initDayNightTracking, updateDayNightUI } from './src/dayNightTracking.js';
import { resetGrimoire, showGrimoire, updateGrimoire } from './src/grimoire.js';
import { initExportImport } from './src/history/exportImport.js';
import { addGrimoireHistoryListListeners, renderGrimoireHistory, snapshotCurrentGrimoire } from './src/history/grimoire.js';
import { loadHistories } from './src/history/index.js';
import { addScriptHistoryListListeners, renderScriptHistory } from './src/history/script.js';
import { initPlayerSetup } from './src/playerSetup.js';
import { restoreSelectionSession } from './src/playerSelection.js';
import { updateBluffAttentionState } from './src/bluffTokens.js';
import { populateReminderTokenGrid } from './src/reminder.js';
import { processScriptData } from './src/script.js';
try { window.processScriptData = processScriptData; } catch (_) { /* noop */ }
import { initStorytellerMessages } from './src/storytellerMessages.js';
import { repositionPlayers } from './src/ui/layout.js';
import { initSidebarResize, initSidebarToggle } from './src/ui/sidebar.js';
import { initActionCluster } from './src/ui/actionCluster.js';
import { initCharacterPanel } from './src/ui/characterPanel.js';
import { initDisplaySettings } from './src/ui/displaySettings.js';
import { initGameMode } from './src/ui/gameMode.js';
import { initNightOrderControls } from './src/ui/nightOrderControls.js';
import { initScriptControls } from './src/ui/scriptControls.js';
import { initInAppTour } from './src/ui/tour.js';
import { handleGrimoireBackgroundChange, initGrimoireBackground } from './src/ui/background.js';
import { loadPlayerSetupTable, renderSetupInfo } from './src/utils/setup.js';
import { setupModalCloseHandlers } from './src/modalCloseHandlers.js';
import { initThemeSelector, handleThemeChange } from './src/themeManager.js';
import { initGrimoirePrintExport } from './src/export/grimoirePrint.js';
import { byId, byIds } from './src/utils/dom.js';
import { createGrimoireState, showVersion, trackPageLoad } from './src/bootstrap.js';
import { createDayNightTrackingState } from './src/gameState.js';
document.addEventListener('DOMContentLoaded', async () => {
  const finishPageLoad = trackPageLoad();
  const bootstrap = async () => {
    showVersion();
    const [resetGrimoireBtn, endGameBtn, endGameModal, closeEndGameModalBtn, goodWinsBtn, evilWinsBtn,
      loadTbBtn, loadBmrBtn, loadSavBtn, loadAllCharsBtn, scriptFileInput, loadScriptTextBtn, scriptTextInput,
      loadScriptUrlBtn, scriptUrlInput, playerCountInput, openRulebookBtn, characterModal, characterSearch,
      textReminderModal, reminderTextInput, saveReminderBtn, sidebarResizer, sidebarEl, reminderTokenModal,
      reminderTokenSearch, sidebarToggleBtn, sidebarBackdrop, characterPanel, characterPanelToggleBtn,
      characterPanelCloseBtn, characterPanelCloseMobileBtn, scriptHistoryList, grimoireHistoryList,
      backgroundSelect, themeSelect, includeTravellersCheckbox, nightOrderSortCheckbox] = byIds(
      'reset-grimoire', 'end-game', 'end-game-modal', 'close-end-game-modal', 'good-wins-btn', 'evil-wins-btn',
      'load-tb', 'load-bmr', 'load-sav', 'load-all-chars', 'script-file', 'load-script-text', 'script-text-input',
      'load-script-url', 'script-url-input', 'player-count', 'open-rulebook', 'character-modal', 'character-search',
      'text-reminder-modal', 'reminder-text-input', 'save-reminder-btn', 'sidebar-resizer', 'sidebar',
      'reminder-token-modal', 'reminder-token-search', 'sidebar-toggle', 'sidebar-backdrop', 'character-panel',
      'character-panel-toggle', 'character-panel-close', 'character-panel-close-mobile', 'script-history-list',
      'grimoire-history-list', 'background-select', 'theme-select', 'include-travellers', 'night-order-sort'
    ); const nightOrderControls = document.querySelector('.night-order-controls');
    const [firstNightBtn, otherNightsBtn, nightPhaseToggleBtn, modeStorytellerRadio, modePlayerRadio,
      dayNightToggleBtn, dayNightSlider, revealToggleBtn, revealSelectedBtn, grimoireSnapshotToggleBtn] = byIds(
      'first-night-btn', 'other-nights-btn', 'night-phase-toggle', 'mode-storyteller', 'mode-player',
      'day-night-toggle', 'day-night-slider', 'reveal-assignments', 'reveal-selected-characters',
      'grimoire-snapshot-toggle'
    ); const grimoireState = createGrimoireState(); window.grimoireState = grimoireState; window.updateButtonStates = updateButtonStates; initGrimoireBackground();
    initActionCluster(); initDisplaySettings({ grimoireState }); initGrimoirePrintExport();
    if (backgroundSelect) { backgroundSelect.addEventListener('change', handleGrimoireBackgroundChange); }
    if (themeSelect) { themeSelect.addEventListener('change', handleThemeChange); }
    const { applyGrimoireHiddenUI, applyModeUI, updateGrimoireControlButtons, updateSnapshotToggleUI } = initGameMode({
      grimoireState, grimoireHistoryList, playerCountInput, openRulebookBtn, modeStorytellerRadio,
      modePlayerRadio, dayNightToggleBtn, dayNightSlider, revealToggleBtn, grimoireSnapshotToggleBtn
    });
    function _applyAssignmentsFromBag() {
      const assignments = (grimoireState.playerSetup && grimoireState.playerSetup.assignments) || [];
      const bag = (grimoireState.playerSetup && grimoireState.playerSetup.bag) || []; if (!Array.isArray(assignments) || assignments.length === 0) return;
      assignments.forEach((bagIdx, playerIdx) => {
        if (bagIdx !== null && bagIdx !== undefined) {
          const roleId = bag[bagIdx];
          if (roleId) { if (!grimoireState.players[playerIdx]) return; grimoireState.players[playerIdx].character = roleId; }
        }
      }); if (grimoireState.playerSetup) grimoireState.playerSetup.revealed = true;
      try {
        document.querySelectorAll('#player-circle li .number-overlay, #player-circle li .number-badge').forEach((el) => el.remove());
      } catch (_) { }
    }
    initNightOrderControls({
      grimoireState, includeTravellersCheckbox, nightOrderSortCheckbox, nightOrderControls,
      nightPhaseToggleBtn, firstNightBtn, otherNightsBtn
    });
    if (scriptHistoryList) { addScriptHistoryListListeners({ scriptHistoryList, grimoireState }); }
    if (grimoireHistoryList) { addGrimoireHistoryListListeners({ grimoireHistoryList, grimoireState }); }
    initScriptControls({
      grimoireState, loadTbBtn, loadBmrBtn, loadSavBtn, loadAllCharsBtn, scriptFileInput,
      loadScriptTextBtn, scriptTextInput, loadScriptUrlBtn, scriptUrlInput
    });
    loadPlayerSetupTable({ grimoireState });
    if (resetGrimoireBtn) resetGrimoireBtn.addEventListener('click', () => {
      if (grimoireState.gameStarted && !grimoireState.winner) {
        const ok = window.confirm('A game is in progress. Resetting will end the current game and save it to history. Continue?'); if (!ok) return;
      }
      resetGrimoire({ grimoireState, grimoireHistoryList, playerCountInput });
      try { showGrimoire({ grimoireState }); } catch (_) { }
      try { grimoireState.winner = null; } catch (_) { }
      grimoireState.gameStarted = false;
      try { updateBluffAttentionState({ grimoireState }); } catch (_) { }
      if (endGameBtn) endGameBtn.style.display = ''; if (revealSelectedBtn) revealSelectedBtn.style.display = 'none';
      try {
        const openPlayerSetupBtn2 = byId('open-player-setup');
        if (openPlayerSetupBtn2) { openPlayerSetupBtn2.disabled = false; openPlayerSetupBtn2.title = ''; }
      } catch (_) { }
      applyModeUI(); updateButtonStates(); updateSnapshotToggleUI();
    }); if (endGameBtn) endGameBtn.addEventListener('click', () => { if (endGameModal) endGameModal.style.display = 'flex'; });
    if (closeEndGameModalBtn && endGameModal) closeEndGameModalBtn.addEventListener('click', () => { endGameModal.style.display = 'none'; });
    if (endGameModal) {
      endGameModal.addEventListener('click', (e) => {
        if (e.target === endGameModal) { endGameModal.style.display = 'none'; }
      });
    }
    const handleRevealSelectedFromSidebar = () => {
      const sel = grimoireState.playerSetup || {}; if (!sel.selectionComplete || sel.revealed) return; _applyAssignmentsFromBag(); sel.selectionActive = false; sel.revealed = true;
      grimoireState.gameStarted = true;
      try { document.body.classList.remove('selection-active'); } catch (_) { }
      try { showGrimoire({ grimoireState }); } catch (_) { }
      try { updateGrimoire({ grimoireState }); } catch (_) { }
      try { renderSetupInfo({ grimoireState }); } catch (_) { }
      try { updateBluffAttentionState({ grimoireState }); } catch (_) { }
      const gameStatusEl = byId('game-status');
      if (gameStatusEl) {
        const playerCount = (grimoireState.players || []).length; gameStatusEl.textContent = `Characters revealed (${playerCount} players)`; gameStatusEl.className = 'status';
        try { clearTimeout(grimoireState._gameStatusTimer); } catch (_) { }
        grimoireState._gameStatusTimer = setTimeout(() => { try { gameStatusEl.textContent = ''; } catch (_) { } }, 3000);
      }
      try {
        if (!grimoireState.dayNightTracking) { grimoireState.dayNightTracking = createDayNightTrackingState(); } else {
          grimoireState.dayNightTracking.enabled = false; grimoireState.dayNightTracking.phases = ['N1']; grimoireState.dayNightTracking.currentPhaseIndex = 0;
          grimoireState.dayNightTracking.reminderTimestamps = {};
        }
        updateDayNightUI(grimoireState);
      } catch (_) { }
      updateButtonStates();
      try { saveAppState({ grimoireState }); } catch (_) { }
    };
    if (revealSelectedBtn) { revealSelectedBtn.addEventListener('click', handleRevealSelectedFromSidebar); }
    function declareWinner(team) {
      if (!team) return;
      grimoireState.winner = team; // 'good' or 'evil'
      try { saveAppState({ grimoireState }); } catch (_) { }
      try { updateGrimoire({ grimoireState }); } catch (_) { }
      updateButtonStates();
      try {
        const setupInfoEl = byId('setup-info');
        if (setupInfoEl) {
          let msgEl = byId('winner-message');
          if (!msgEl) {
            msgEl = document.createElement('div'); msgEl.id = 'winner-message'; msgEl.style.marginTop = '8px'; msgEl.style.fontWeight = 'bold'; setupInfoEl.appendChild(msgEl);
          }
          msgEl.style.color = team === 'good' ? '#6bff8a' : '#ff6b6b'; msgEl.textContent = `${team === 'good' ? 'Good' : 'Evil'} has won`;
        }
      } catch (_) { }
      try {
        snapshotCurrentGrimoire({
          players: grimoireState.players,
          scriptMetaName: grimoireState.scriptMetaName,
          scriptData: grimoireState.scriptData,
          grimoireHistoryList,
          dayNightTracking: grimoireState.dayNightTracking,
          winner: team,
          gameStarted: false
        });
      } catch (_) { }
      if (endGameModal) endGameModal.style.display = 'none'; if (endGameBtn) endGameBtn.style.display = 'none'; grimoireState.gameStarted = false; applyModeUI();
      try { updateBluffAttentionState({ grimoireState }); } catch (_) { }
    }
    if (goodWinsBtn) goodWinsBtn.addEventListener('click', () => declareWinner('good')); if (evilWinsBtn) evilWinsBtn.addEventListener('click', () => declareWinner('evil'));
    function updateButtonStates() {
      const openPlayerSetupBtn = byId('open-player-setup'); const revealSelectedBtn = byId('reveal-selected-characters');
      if (openPlayerSetupBtn) {
        const sel = grimoireState.playerSetup || {}; const selectionComplete = !!sel.selectionComplete; openPlayerSetupBtn.disabled = selectionComplete;
        openPlayerSetupBtn.title = selectionComplete ? 'Setup complete. Reset the grimoire to start a new setup.' : '';
      }
      if (revealSelectedBtn) {
        const sel = grimoireState.playerSetup || {}; const selectionComplete = !!sel.selectionComplete; const selectionRevealed = !!sel.revealed;
        const shouldShow = selectionComplete && !selectionRevealed; revealSelectedBtn.style.display = shouldShow ? '' : 'none'; revealSelectedBtn.disabled = false;
        revealSelectedBtn.title = '';
      }
      if (endGameBtn) endGameBtn.style.display = grimoireState.winner ? 'none' : ''; const modeStorytellerRadio = byId('mode-storyteller');
      const modePlayerRadio = byId('mode-player'); if (modeStorytellerRadio) modeStorytellerRadio.disabled = false; if (modePlayerRadio) modePlayerRadio.disabled = false;
    }
    updateButtonStates();
    const observer = new MutationObserver(() => {
      updateButtonStates();
    }); const playerCircle = byId('player-circle');
    if (playerCircle) observer.observe(playerCircle, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    saveReminderBtn.onclick = () => {
      const text = reminderTextInput.value.trim(); const { playerIndex, reminderIndex } = grimoireState.editingReminder;
      if (text) {
        if (reminderIndex > -1) {
          grimoireState.players[playerIndex].reminders[reminderIndex].value = text;
          if (grimoireState.players[playerIndex].reminders[reminderIndex].label !== undefined) { grimoireState.players[playerIndex].reminders[reminderIndex].label = text; }
        } else {
          const reminderId = generateReminderId(); grimoireState.players[playerIndex].reminders.push({ type: 'text', value: text, reminderId });
          addReminderTimestamp(grimoireState, reminderId);
        }
      } else if (reminderIndex > -1) { grimoireState.players[playerIndex].reminders.splice(reminderIndex, 1); }
      updateGrimoire({ grimoireState }); updateButtonStates(); saveAppState({ grimoireState }); textReminderModal.style.display = 'none';
    }; characterSearch.oninput = () => populateCharacterGrid({ grimoireState });
    if (reminderTokenSearch) { reminderTokenSearch.oninput = () => populateReminderTokenGrid({ grimoireState }); }
    const supportsPointerDismiss = 'PointerEvent' in window; let pendingBackdropPointerId = null; const clearBackdropPointer = () => { pendingBackdropPointerId = null; };
    const dismissCharacterModalFromBackdrop = () => {
      hideCharacterModal({ grimoireState, clearBluffSelection: true });
    }; characterModal.addEventListener('botc:character-modal-hidden', clearBackdropPointer);
    if (supportsPointerDismiss) {
      characterModal.addEventListener('pointerdown', (e) => {
        if (e.target === characterModal) { pendingBackdropPointerId = e.pointerId; } else {
          clearBackdropPointer();
        }
      });
      characterModal.addEventListener('pointerup', (e) => {
        if (pendingBackdropPointerId === e.pointerId && e.target === characterModal) { dismissCharacterModalFromBackdrop(); }
        if (pendingBackdropPointerId === e.pointerId) { clearBackdropPointer(); }
      });
      characterModal.addEventListener('pointercancel', (e) => {
        if (e.target === characterModal) { clearBackdropPointer(); }
      });
      characterModal.addEventListener('pointerleave', (e) => {
        if (e.target === characterModal && pendingBackdropPointerId === e.pointerId) { clearBackdropPointer(); }
      });
      characterModal.addEventListener('click', (e) => {
        if (e.target === characterModal) { e.stopPropagation(); e.preventDefault(); }
      });
    } else {
      characterModal.addEventListener('click', (e) => {
        if (e.target === characterModal) { dismissCharacterModalFromBackdrop(); }
      });
    }
    textReminderModal.addEventListener('click', (e) => { if (e.target === textReminderModal) textReminderModal.style.display = 'none'; });
    if (reminderTokenModal) {
      reminderTokenModal.addEventListener('click', (e) => {
        if (e.target === reminderTokenModal) { reminderTokenModal.style.display = 'none'; return; }
        const content = reminderTokenModal.querySelector('.modal-content');
        if (content && !content.contains(e.target)) { reminderTokenModal.style.display = 'none'; }
      });
    }
    let resizeObserver;
    if ('ResizeObserver' in window) {
      resizeObserver = new ResizeObserver(() => {
        if (grimoireState.players.length > 0) { console.log('Container resized, repositioning players...'); requestAnimationFrame(() => repositionPlayers({ grimoireState })); }
      }); const playerCircle = byId('player-circle');
      if (playerCircle) { resizeObserver.observe(playerCircle); }
    } else {
      let resizeTimeout;
      window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
          if (grimoireState.players.length > 0) { console.log('Window resized, repositioning players...'); requestAnimationFrame(() => repositionPlayers({ grimoireState })); }
        }, 250);
      });
    }
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && grimoireState.players.length > 0) { requestAnimationFrame(() => repositionPlayers({ grimoireState })); }
    }); initSidebarResize(sidebarResizer, sidebarEl);
    const collapseSidebar = initSidebarToggle({
      sidebarToggleBtn,
      sidebarBackdrop,
      sidebarEl,
      sidebarResizer,
      isTouchDevice,
      repositionPlayers,
      grimoireState,
      characterPanel,
      characterPanelToggleBtn
    }); initPlayerSetup({ grimoireState, collapseSidebar });
    initCharacterPanel({
      panel: characterPanel,
      toggle: characterPanelToggleBtn,
      closeButtons: [characterPanelCloseBtn, characterPanelCloseMobileBtn, byId('character-panel-close-btn')],
      sidebar: sidebarEl,
      sidebarToggle: sidebarToggleBtn,
      reposition: repositionPlayers,
      grimoireState
    }); loadHistories(); renderScriptHistory({ scriptHistoryList }); renderGrimoireHistory({ grimoireHistoryList }); initExportImport({ grimoireState, grimoireHistoryList });
    initDayNightTracking(grimoireState); await loadAppState({ grimoireState, grimoireHistoryList });
    const hasPlayers = Array.isArray(grimoireState.players) && grimoireState.players.length > 0;
    if (!hasPlayers && playerCountInput) {
      if (!playerCountInput.value) { playerCountInput.value = '5'; }
      resetGrimoire({ grimoireState, grimoireHistoryList, playerCountInput });
    }
    applyModeUI(); applyGrimoireHiddenUI(); updateGrimoireControlButtons(); updateSnapshotToggleUI();
    try {
      const endBtn = byId('end-game'); if (endBtn) endBtn.style.display = grimoireState.winner ? 'none' : '';
      try { restoreSelectionSession({ grimoireState }); } catch (_) { }
    } catch (_) { }
    initInAppTour(); initStorytellerMessages({ grimoireState }); setupModalCloseHandlers({ grimoireState }); initThemeSelector();
  };
  try { await bootstrap(); } catch (error) {
    console.error('Failed to initialize grimoire:', error);
  } finally { finishPageLoad(); }
});
