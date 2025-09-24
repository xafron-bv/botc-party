import { INCLUDE_TRAVELLERS_KEY, isTouchDevice, MODE_STORAGE_KEY } from './src/constants.js';
import './pwa.js';
import { loadAppState, saveAppState } from './src/app.js';
import { loadAllCharacters, onIncludeTravellersChange, populateCharacterGrid } from './src/character.js';
import { createCurvedLabelSvg } from './src/ui/svg.js';
import { handleGrimoireBackgroundChange, initGrimoireBackground, loadPlayerSetupTable, renderSetupInfo, resetGrimoire, updateGrimoire, toggleGrimoireHidden, applyGrimoireHiddenState, showGrimoire, hideGrimoire } from './src/grimoire.js';
import { addGrimoireHistoryListListeners, renderGrimoireHistory, snapshotCurrentGrimoire } from './src/history/grimoire.js';
import { loadHistories } from './src/history/index.js';
import { addScriptHistoryListListeners, renderScriptHistory } from './src/history/script.js';
import { initExportImport } from './src/history/exportImport.js';
import { repositionPlayers } from './src/ui/layout.js';
import { displayScript, loadScriptFile, loadScriptFromFile } from './src/script.js';
import { initSidebarResize, initSidebarToggle } from './src/ui/sidebar.js';
import { initInAppTour } from './src/ui/tour.js';
import { populateReminderTokenGrid } from './src/reminder.js';
import { initPlayerSetup } from './src/playerSetup.js';
import { initDayNightTracking, generateReminderId, addReminderTimestamp, updateDayNightUI } from './src/dayNightTracking.js';

document.addEventListener('DOMContentLoaded', async () => {
  const resetGrimoireBtn = document.getElementById('reset-grimoire');
  const startGameBtn = document.getElementById('start-game');
  const endGameBtn = document.getElementById('end-game');
  const endGameModal = document.getElementById('end-game-modal');
  const closeEndGameModalBtn = document.getElementById('close-end-game-modal');
  const goodWinsBtn = document.getElementById('good-wins-btn');
  const evilWinsBtn = document.getElementById('evil-wins-btn');
  const loadTbBtn = document.getElementById('load-tb');
  const loadBmrBtn = document.getElementById('load-bmr');
  const loadSavBtn = document.getElementById('load-sav');
  const loadAllCharsBtn = document.getElementById('load-all-chars');
  const scriptFileInput = document.getElementById('script-file');
  const playerCountInput = document.getElementById('player-count');
  const addPlayersBtn = document.getElementById('add-players');

  const characterModal = document.getElementById('character-modal');
  const closeCharacterModalBtn = document.getElementById('close-character-modal');
  const characterSearch = document.getElementById('character-search');

  const textReminderModal = document.getElementById('text-reminder-modal');
  const reminderTextInput = document.getElementById('reminder-text-input');
  const saveReminderBtn = document.getElementById('save-reminder-btn');
  const cancelReminderBtn = document.getElementById('cancel-reminder-btn');
  const sidebarResizer = document.getElementById('sidebar-resizer');

  // Ability tooltip elements
  const sidebarEl = document.getElementById('sidebar');
  const reminderTokenModal = document.getElementById('reminder-token-modal');
  const closeReminderTokenModalBtn = document.getElementById('close-reminder-token-modal');
  const reminderTokenSearch = document.getElementById('reminder-token-search');
  const sidebarToggleBtn = document.getElementById('sidebar-toggle');
  const sidebarCloseBtn = document.getElementById('sidebar-close');
  const sidebarBackdrop = document.getElementById('sidebar-backdrop');
  const characterPanel = document.getElementById('character-panel');
  const characterPanelToggleBtn = document.getElementById('character-panel-toggle');
  const characterPanelCloseBtn = document.getElementById('character-panel-close');
  const scriptHistoryList = document.getElementById('script-history-list');
  const grimoireHistoryList = document.getElementById('grimoire-history-list');

  const backgroundSelect = document.getElementById('background-select');
  const includeTravellersCheckbox = document.getElementById('include-travellers');
  const nightOrderSortCheckbox = document.getElementById('night-order-sort');
  const nightOrderControls = document.querySelector('.night-order-controls');
  const firstNightBtn = document.getElementById('first-night-btn');
  const otherNightsBtn = document.getElementById('other-nights-btn');
  const nightPhaseToggleBtn = document.getElementById('night-phase-toggle');
  // Travellers toggle state key and default
  const modeStorytellerRadio = document.getElementById('mode-storyteller');
  const modePlayerRadio = document.getElementById('mode-player');
  const dayNightToggleBtn = document.getElementById('day-night-toggle');
  const dayNightSlider = document.getElementById('day-night-slider');
  const revealToggleBtn = document.getElementById('reveal-assignments');
  const openStorytellerMessageBtn = document.getElementById('open-storyteller-message');
  const storytellerMessageModal = document.getElementById('storyteller-message-modal');
  const closeStorytellerMessageBtn = document.getElementById('close-storyteller-message');
  const storytellerMessageEdit = document.getElementById('storyteller-message-edit');
  const closeStorytellerMessageEditBtn = document.getElementById('close-storyteller-message-edit');
  const storytellerMessagePicker = document.getElementById('storyteller-message-picker');
  const storytellerMessageInput = document.getElementById('storyteller-message-input');
  const showStorytellerMessageBtn = document.getElementById('show-storyteller-message');

  const grimoireState = {
    includeTravellers: false,
    nightOrderSort: false,
    nightPhase: 'first-night',
    // Player context menu elements
    playerContextMenu: null,
    contextMenuTargetIndex: -1,
    longPressTimer: null,
    // Reminder context menu elements (for touch long-press on reminders)
    reminderContextMenu: null,
    reminderContextTarget: { playerIndex: -1, reminderIndex: -1 },
    scriptData: null,
    scriptMetaName: '',
    playerSetupTable: [],
    allRoles: {},
    // Roles separation for traveller toggle
    baseRoles: {},
    extraTravellerRoles: {},
    players: [],
    selectedPlayerIndex: -1,
    editingReminder: { playerIndex: -1, reminderIndex: -1 },
    isRestoringState: false,
    outsideCollapseHandlerInstalled: false,
    mode: 'storyteller',
    grimoireHidden: false,
    gameStarted: false
  };

  // Helper to apply/remove pre-game class (players exist but game not started)
  function updatePreGameClass() {
    try {
      const hasPlayers = Array.isArray(grimoireState.players) && grimoireState.players.length > 0;
      if (hasPlayers && !grimoireState.gameStarted) {
        document.body.classList.add('pre-game');
      } else {
        document.body.classList.remove('pre-game');
      }
    } catch (_) { }
  }

  // Player setup state
  grimoireState.playerSetup = grimoireState.playerSetup || { bag: [], assignments: [], revealed: false };

  // Make grimoireState available globally for event handlers
  window.grimoireState = grimoireState;
  // Make updateButtonStates available globally
  window.updateButtonStates = updateButtonStates;

  initGrimoireBackground();

  if (backgroundSelect) {
    backgroundSelect.addEventListener('change', handleGrimoireBackgroundChange);
  }

  // Initialize mode from localStorage
  try {
    const storedMode = localStorage.getItem(MODE_STORAGE_KEY);
    grimoireState.mode = storedMode === 'player' ? 'player' : 'storyteller';
  } catch (_) {
    grimoireState.mode = 'storyteller';
  }

  const applyModeUI = () => {
    if (modeStorytellerRadio) modeStorytellerRadio.checked = grimoireState.mode !== 'player';
    if (modePlayerRadio) modePlayerRadio.checked = grimoireState.mode === 'player';
    const isPlayer = grimoireState.mode === 'player';
    if (dayNightToggleBtn) dayNightToggleBtn.style.display = isPlayer ? 'none' : '';
    if (dayNightSlider && isPlayer) {
      dayNightSlider.classList.remove('open');
      dayNightSlider.style.display = 'none';
    }
    const openPlayerSetupBtn2 = document.getElementById('open-player-setup');
    if (openPlayerSetupBtn2) openPlayerSetupBtn2.style.display = isPlayer ? 'none' : '';
    // Always show Start/End Game button in both modes
    if (startGameBtn) startGameBtn.style.display = '';
    if (openStorytellerMessageBtn) openStorytellerMessageBtn.style.display = isPlayer ? 'none' : '';
    if (isPlayer && grimoireState.dayNightTracking) {
      grimoireState.dayNightTracking.enabled = false;
    }
    try { updateStartGameEnabled(); } catch (_) { }
  };
  // Hide/Show grimoire toggle (re-uses reveal button location)
  function applyGrimoireHiddenUI() { applyGrimoireHiddenState({ grimoireState }); }

  // Apply bag assignments to players (used when revealing)
  function _applyAssignmentsFromBag() {
    const assignments = (grimoireState.playerSetup && grimoireState.playerSetup.assignments) || [];
    const bag = (grimoireState.playerSetup && grimoireState.playerSetup.bag) || [];
    if (!Array.isArray(assignments) || assignments.length === 0) return;
    assignments.forEach((bagIdx, playerIdx) => {
      if (bagIdx !== null && bagIdx !== undefined) {
        const roleId = bag[bagIdx];
        if (roleId) {
          if (!grimoireState.players[playerIdx]) return;
          grimoireState.players[playerIdx].character = roleId;
        }
      }
    });
    if (grimoireState.playerSetup) grimoireState.playerSetup.revealed = true;
    // Clear any temporary number overlays/badges after revealing
    try {
      document.querySelectorAll('#player-circle li .number-overlay, #player-circle li .number-badge').forEach((el) => el.remove());
    } catch (_) { }
  }

  if (revealToggleBtn) {
    revealToggleBtn.addEventListener('click', () => toggleGrimoireHidden({ grimoireState }));
  }

  if (modeStorytellerRadio && modePlayerRadio) {
    applyModeUI();
    const onModeChange = (e) => {
      const val = e && e.target && e.target.value;
      const nextMode = (val === 'player') ? 'player' : 'storyteller';
      if (nextMode === grimoireState.mode) return;
      // If a game is in progress, confirm before resetting (which will end and save the game)
      if (grimoireState.gameStarted) {
        const ok = window.confirm('A game is in progress. Switching mode will reset the grimoire and end the current game. Continue?');
        if (!ok) { applyModeUI(); return; }
      }
      // Reset grimoire before applying mode change
      try { resetGrimoire({ grimoireState, grimoireHistoryList, playerCountInput }); } catch (_) { }
      try { showGrimoire({ grimoireState }); } catch (_) { }
      try { grimoireState.winner = null; } catch (_) { }
      grimoireState.gameStarted = false;
      // Apply mode and UI
      grimoireState.mode = nextMode;
      applyModeUI();
      updateStartGameEnabled();
      try { localStorage.setItem(MODE_STORAGE_KEY, grimoireState.mode); } catch (_) { }
      saveAppState({ grimoireState });
    };
    modeStorytellerRadio.addEventListener('change', onModeChange);
    modePlayerRadio.addEventListener('change', onModeChange);
  }

  // Initialize player setup module
  initPlayerSetup({ grimoireState });

  // Initialize travellers toggle from localStorage
  try {
    grimoireState.includeTravellers = (localStorage.getItem(INCLUDE_TRAVELLERS_KEY) === '1');
  } catch (_) { grimoireState.includeTravellers = false; }
  if (includeTravellersCheckbox) {
    includeTravellersCheckbox.checked = grimoireState.includeTravellers;
    includeTravellersCheckbox.addEventListener('change', () => onIncludeTravellersChange({ grimoireState, includeTravellersCheckbox }));
  }

  // Initialize night order sort from localStorage
  try {
    grimoireState.nightOrderSort = (localStorage.getItem('nightOrderSort') === '1');
    grimoireState.nightPhase = localStorage.getItem('nightPhase') || 'first-night';
  } catch (_) {
    grimoireState.nightOrderSort = false;
    grimoireState.nightPhase = 'first-night';
  }

  if (nightOrderSortCheckbox) {
    nightOrderSortCheckbox.checked = grimoireState.nightOrderSort;
    if (nightOrderControls) {
      nightOrderControls.classList.toggle('active', grimoireState.nightOrderSort);
    }
    // Show/hide phase toggle button based on sort state
    if (nightPhaseToggleBtn) {
      nightPhaseToggleBtn.style.display = grimoireState.nightOrderSort ? '' : 'none';
    }
    // Also hide/show the entire night-phase selector container to satisfy existing Cypress test
    const nightPhaseContainer = document.querySelector('.night-phase-buttons');
    if (nightPhaseContainer) {
      nightPhaseContainer.style.display = grimoireState.nightOrderSort ? '' : 'none';
    }

    nightOrderSortCheckbox.addEventListener('change', async () => {
      grimoireState.nightOrderSort = nightOrderSortCheckbox.checked;
      try {
        localStorage.setItem('nightOrderSort', grimoireState.nightOrderSort ? '1' : '0');
      } catch (_) { }

      if (nightOrderControls) {
        nightOrderControls.classList.toggle('active', grimoireState.nightOrderSort);
      }
      if (nightPhaseToggleBtn) {
        nightPhaseToggleBtn.style.display = grimoireState.nightOrderSort ? '' : 'none';
      }
      const nightPhaseContainer2 = document.querySelector('.night-phase-buttons');
      if (nightPhaseContainer2) {
        nightPhaseContainer2.style.display = grimoireState.nightOrderSort ? '' : 'none';
      }

      // Re-display the script with new sorting
      if (grimoireState.scriptData) {
        await displayScript({ data: grimoireState.scriptData, grimoireState });
      }
    });
  }

  // Character panel toggle logic might exist below; hook into open/close events
  if (characterPanelToggleBtn) {
    characterPanelToggleBtn.addEventListener('click', () => {
      setTimeout(() => { try { applySidebarToggleVisibilityForPanel(); } catch (_) { } }, 10);
    });
  }
  if (characterPanelCloseBtn) {
    characterPanelCloseBtn.addEventListener('click', () => {
      setTimeout(() => { try { applySidebarToggleVisibilityForPanel(); } catch (_) { } }, 10);
    });
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setTimeout(() => { try { applySidebarToggleVisibilityForPanel(); } catch (_) { } }, 10);
  });

  // Helper: hide sidebar toggle on small screens if script panel open
  function applySidebarToggleVisibilityForPanel() {
    if (!sidebarToggleBtn) return;
    const small = window.innerWidth <= 900;
    if (small && document.body.classList.contains('character-panel-open')) {
      sidebarToggleBtn.style.visibility = 'hidden';
      sidebarToggleBtn.style.pointerEvents = 'none';
    } else {
      sidebarToggleBtn.style.visibility = '';
      sidebarToggleBtn.style.pointerEvents = '';
    }
  }

  window.addEventListener('resize', () => applySidebarToggleVisibilityForPanel());

  // Set up radio buttons
  if (firstNightBtn && otherNightsBtn) {
    // Set initial state
    firstNightBtn.checked = grimoireState.nightPhase === 'first-night';
    otherNightsBtn.checked = grimoireState.nightPhase === 'other-nights';

    const handlePhaseChange = async (e) => {
      grimoireState.nightPhase = e.target.value;
      try {
        localStorage.setItem('nightPhase', grimoireState.nightPhase);
      } catch (_) { }

      // Re-display the script with new phase
      if (grimoireState.scriptData && grimoireState.nightOrderSort) {
        await displayScript({ data: grimoireState.scriptData, grimoireState });
      }
    };

    firstNightBtn.addEventListener('change', handlePhaseChange);
    otherNightsBtn.addEventListener('change', handlePhaseChange);
    if (nightPhaseToggleBtn) {
      nightPhaseToggleBtn.addEventListener('click', async () => {
        // Toggle phase value
        const newPhase = grimoireState.nightPhase === 'first-night' ? 'other-nights' : 'first-night';
        grimoireState.nightPhase = newPhase;
        if (firstNightBtn) firstNightBtn.checked = newPhase === 'first-night';
        if (otherNightsBtn) otherNightsBtn.checked = newPhase === 'other-nights';
        // Update button label
        nightPhaseToggleBtn.textContent = newPhase === 'first-night' ? 'First Night' : 'Other Nights';
        try { localStorage.setItem('nightPhase', grimoireState.nightPhase); } catch (_) { }
        if (grimoireState.scriptData && grimoireState.nightOrderSort) {
          await displayScript({ data: grimoireState.scriptData, grimoireState });
        }
      });
      // Initial label
      nightPhaseToggleBtn.textContent = grimoireState.nightPhase === 'first-night' ? 'First Night' : 'Other Nights';
    }
  }

  // Initial visibility adjustment
  try { applySidebarToggleVisibilityForPanel(); } catch (_) { }

  // Event delegation for history lists
  if (scriptHistoryList) {
    addScriptHistoryListListeners({ scriptHistoryList, grimoireState });
  }

  if (grimoireHistoryList) {
    addGrimoireHistoryListListeners({ grimoireHistoryList, grimoireState });
  }

  if (loadTbBtn) {
    loadTbBtn.addEventListener('click', () => {
      grimoireState.scriptMetaName = 'Trouble Brewing';
      renderSetupInfo({ grimoireState });
      loadScriptFromFile({ path: './Trouble Brewing.json', grimoireState });
    });
  }
  if (loadBmrBtn) {
    loadBmrBtn.addEventListener('click', () => {
      grimoireState.scriptMetaName = 'Bad Moon Rising';
      renderSetupInfo({ grimoireState });
      loadScriptFromFile({ path: './Bad Moon Rising.json', grimoireState });
    });
  }
  if (loadSavBtn) {
    loadSavBtn.addEventListener('click', () => {
      grimoireState.scriptMetaName = 'Sects & Violets';
      renderSetupInfo({ grimoireState });
      loadScriptFromFile({ path: './Sects and Violets.json', grimoireState });
    });
  }
  if (loadAllCharsBtn) {
    loadAllCharsBtn.addEventListener('click', () => {
      grimoireState.scriptMetaName = 'All Characters';
      renderSetupInfo({ grimoireState });
      loadAllCharacters({ grimoireState });
    });
  }

  scriptFileInput.addEventListener('change', (event) => loadScriptFile({ event, grimoireState }));

  loadPlayerSetupTable({ grimoireState });

  if (resetGrimoireBtn) resetGrimoireBtn.addEventListener('click', () => {
    // Only prompt if an active game is in progress (started and no winner declared yet)
    if (grimoireState.gameStarted && !grimoireState.winner) {
      const ok = window.confirm('A game is in progress. Resetting will end the current game and save it to history. Continue?');
      if (!ok) return;
    }
    resetGrimoire({ grimoireState, grimoireHistoryList, playerCountInput });
    // Always show grimoire after reset
    try { showGrimoire({ grimoireState }); } catch (_) { }
    // Reset game state UI: show Start, hide End, clear winner
    try { grimoireState.winner = null; } catch (_) { }
    grimoireState.gameStarted = false;
    if (startGameBtn) startGameBtn.style.display = '';
    if (endGameBtn) endGameBtn.style.display = 'none';
    // Explicitly re-enable gated buttons after reset
    try {
      if (startGameBtn) { startGameBtn.disabled = false; startGameBtn.title = ''; }
      const openPlayerSetupBtn2 = document.getElementById('open-player-setup');
      if (openPlayerSetupBtn2) { openPlayerSetupBtn2.disabled = false; openPlayerSetupBtn2.title = ''; }
    } catch (_) { }
    // Re-apply mode-specific UI so that in player mode the Start Player Setup button stays hidden
    applyModeUI();
    updateStartGameEnabled();
    updateButtonStates();
    updatePreGameClass();
  });

  if (addPlayersBtn) addPlayersBtn.addEventListener('click', () => {
    resetGrimoire({ grimoireState, grimoireHistoryList, playerCountInput });
    // Always show grimoire after adding players
    try { showGrimoire({ grimoireState }); } catch (_) { }
    // Reset game state UI: show Start, hide End, clear winner
    try { grimoireState.winner = null; } catch (_) { }
    grimoireState.gameStarted = false;
    if (startGameBtn) startGameBtn.style.display = '';
    if (endGameBtn) endGameBtn.style.display = 'none';
    try {
      if (startGameBtn) { startGameBtn.disabled = false; startGameBtn.title = ''; }
      const openPlayerSetupBtn2 = document.getElementById('open-player-setup');
      if (openPlayerSetupBtn2) { openPlayerSetupBtn2.disabled = false; openPlayerSetupBtn2.title = ''; }
    } catch (_) { }
    // Re-apply mode-specific UI so that in player mode the Start Player Setup button stays hidden
    applyModeUI();
    updateStartGameEnabled();
    updateButtonStates();
    updatePreGameClass();
  });
  if (startGameBtn) startGameBtn.addEventListener('click', () => {
    // In player mode, starting a game should reset the grimoire (fresh state for players)
    // In storyteller mode, we preserve current assignments/reminders/death states.
    try {
      if (grimoireState.mode === 'player') {
        const playerCountInputEl = document.getElementById('player-count');
        const grimoireHistoryListEl = document.getElementById('grimoire-history-list');
        if (playerCountInputEl) {
          resetGrimoire({ grimoireState, grimoireHistoryList: grimoireHistoryListEl, playerCountInput: playerCountInputEl });
        }
      }
    } catch (_) { }
    // Apply any remaining number-selection assignments to players
    const sel = grimoireState.playerSetup || {};
    const assignments = Array.isArray(sel.assignments) ? sel.assignments : [];
    const bag = Array.isArray(sel.bag) ? sel.bag : [];
    assignments.forEach((bagIdx, idx) => {
      const roleId = (bagIdx !== null && bagIdx !== undefined) ? bag[bagIdx] : null;
      if (roleId && grimoireState.players[idx] && !grimoireState.players[idx].character) {
        grimoireState.players[idx].character = roleId;
      }
    });
    try { document.querySelectorAll('#player-circle li .number-overlay, #player-circle li .number-badge').forEach((el) => el.remove()); } catch (_) { }
    if (sel) sel.selectionActive = false;
    try { document.body.classList.remove('selection-active'); } catch (_) { }
    showGrimoire({ grimoireState });
    // Forget previously selected numbers after starting game
    if (grimoireState.playerSetup) {
      grimoireState.playerSetup.assignments = new Array(grimoireState.players.length).fill(null);
      grimoireState.playerSetup.revealed = true;
    }
    // Show feedback for starting a new game
    const gameStatusEl = document.getElementById('game-status');
    if (gameStatusEl) {
      const playerCount = (grimoireState.players || []).length;
      gameStatusEl.textContent = `New game started (${playerCount} players)`;
      gameStatusEl.className = 'status';
      try { clearTimeout(grimoireState._gameStatusTimer); } catch (_) { }
      grimoireState._gameStatusTimer = setTimeout(() => { try { gameStatusEl.textContent = ''; } catch (_) { } }, 3000);
    }
    // Show End Game button and hide Start Game until end/reset/start-selection
    if (endGameBtn) endGameBtn.style.display = '';
    if (startGameBtn) startGameBtn.style.display = 'none';
    // Hide Start Player Setup during an active game
    const openPlayerSetupBtn2 = document.getElementById('open-player-setup');
    if (openPlayerSetupBtn2) openPlayerSetupBtn2.style.display = 'none';
    grimoireState.gameStarted = true;
    updatePreGameClass();

    // Reset day/night tracking when a new game starts
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
  });

  // Handle End Game flow
  if (endGameBtn) endGameBtn.addEventListener('click', () => { if (endGameModal) endGameModal.style.display = 'flex'; });

  if (closeEndGameModalBtn && endGameModal) closeEndGameModalBtn.addEventListener('click', () => { endGameModal.style.display = 'none'; });
  if (endGameModal) {
    endGameModal.addEventListener('click', (e) => {
      if (e.target === endGameModal) { endGameModal.style.display = 'none'; }
    });
  }

  function declareWinner(team) {
    if (!team) return;
    grimoireState.winner = team; // 'good' or 'evil'
    try { saveAppState({ grimoireState }); } catch (_) { }
    // Refresh grimoire UI and ensure center winner message is appended immediately
    try { updateGrimoire({ grimoireState }); } catch (_) { }
    updateButtonStates();
    try {
      const setupInfoEl = document.getElementById('setup-info');
      if (setupInfoEl) {
        let msgEl = document.getElementById('winner-message');
        if (!msgEl) {
          msgEl = document.createElement('div');
          msgEl.id = 'winner-message';
          msgEl.style.marginTop = '8px';
          msgEl.style.fontWeight = 'bold';
          setupInfoEl.appendChild(msgEl);
        }
        msgEl.style.color = team === 'good' ? '#6bff8a' : '#ff6b6b';
        msgEl.textContent = `${team === 'good' ? 'Good' : 'Evil'} has won`;
      }
    } catch (_) { }
    // Snapshot to history with winner info
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
    if (endGameModal) endGameModal.style.display = 'none';
    // After ending game, hide End Game and show Start Game again
    if (endGameBtn) endGameBtn.style.display = 'none';
    if (startGameBtn) startGameBtn.style.display = '';
    // Re-apply mode-specific UI for Start Player Setup visibility
    applyModeUI();
    updateStartGameEnabled();
    // Gate further starts or player setup until grimoire reset (winner flag presence is the gate)
    try {
      const openPlayerSetupBtn2 = document.getElementById('open-player-setup');
      if (startGameBtn) {
        startGameBtn.disabled = true;
        startGameBtn.title = 'Reset grimoire to start a new game';
      }
      if (openPlayerSetupBtn2) {
        openPlayerSetupBtn2.disabled = true;
        openPlayerSetupBtn2.title = 'Reset grimoire to configure a new game';
      }
    } catch (_) { }
  }

  if (goodWinsBtn) goodWinsBtn.addEventListener('click', () => declareWinner('good'));
  if (evilWinsBtn) evilWinsBtn.addEventListener('click', () => declareWinner('evil'));

  // Enable/disable Start Game based on character assignment completeness
  function updateStartGameEnabled() {
    if (!startGameBtn) return;
    const players = grimoireState.players || [];
    // New rule: Start Game available whenever players exist (unless a winner gate requires reset)
    const hasPlayers = players.length > 0;
    startGameBtn.disabled = !!grimoireState.winner || !hasPlayers;
  }

  // Update button states based on grimoire state
  function updateButtonStates() {
    const players = grimoireState.players || [];
    const hasPlayers = players.length > 0;
    const addPlayersBtn = document.getElementById('add-players');
    const openPlayerSetupBtn = document.getElementById('open-player-setup');
    const startGameBtn = document.getElementById('start-game');

    // Show/hide ADD PLAYERS button - only show when no players exist
    if (addPlayersBtn) {
      addPlayersBtn.style.display = hasPlayers ? 'none' : 'block';
    }

    // Disable game setup buttons when no players exist
    if (openPlayerSetupBtn) {
      const sel = grimoireState.playerSetup || {};
      const selectionComplete = !!sel.selectionComplete;
      openPlayerSetupBtn.disabled = !hasPlayers || !!grimoireState.winner || selectionComplete;
      if (grimoireState.winner) {
        openPlayerSetupBtn.title = 'Reset grimoire to configure a new game';
      } else if (!hasPlayers) {
        openPlayerSetupBtn.title = 'Add players first';
      } else if (selectionComplete) {
        openPlayerSetupBtn.title = 'Setup complete. Reset the grimoire to start a new setup.';
      } else {
        openPlayerSetupBtn.title = '';
      }
    }
    // Don't disable reset-grimoire as it's used to start the game
    // Don't disable storyteller message as it's a tool that works without players

    // Start game button should be disabled if no players, but also respect existing character assignment logic
    if (startGameBtn) {
      if (!hasPlayers) {
        startGameBtn.disabled = true;
      } else {
        // Re-apply the character assignment logic
        updateStartGameEnabled();
      }
      if (grimoireState.winner) {
        startGameBtn.title = 'Reset grimoire to start a new game';
      } else if (!hasPlayers) {
        startGameBtn.title = 'Add players first';
      } else {
        startGameBtn.title = '';
      }
    }

    // Disable mode toggle when no players
    const modeStorytellerRadio = document.getElementById('mode-storyteller');
    const modePlayerRadio = document.getElementById('mode-player');
    if (modeStorytellerRadio) modeStorytellerRadio.disabled = !hasPlayers;
    if (modePlayerRadio) modePlayerRadio.disabled = !hasPlayers;

    // Update pre-game class whenever buttons update (covers many state changes)
    updatePreGameClass();
  }

  // Initial state
  updateStartGameEnabled();
  updateButtonStates();
  updatePreGameClass();

  // Observe grimoire changes to toggle Start Game and button states
  const observer = new MutationObserver(() => {
    updateStartGameEnabled();
    updateButtonStates();
  });
  const playerCircle = document.getElementById('player-circle');
  if (playerCircle) observer.observe(playerCircle, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });

  // Also update when players change programmatically
  const originalUpdateGrimoire = updateGrimoire;
  if (typeof originalUpdateGrimoire === 'function') {
    (window)._updateGrimoireWrapped = true;
  }

  saveReminderBtn.onclick = () => {
    const text = reminderTextInput.value.trim();
    const { playerIndex, reminderIndex } = grimoireState.editingReminder;
    if (text) {
      if (reminderIndex > -1) {
        // Update existing reminder - preserve label if it exists
        grimoireState.players[playerIndex].reminders[reminderIndex].value = text;
        if (grimoireState.players[playerIndex].reminders[reminderIndex].label !== undefined) {
          grimoireState.players[playerIndex].reminders[reminderIndex].label = text;
        }
      } else {
        const reminderId = generateReminderId();
        grimoireState.players[playerIndex].reminders.push({ type: 'text', value: text, reminderId });
        addReminderTimestamp(grimoireState, reminderId);
      }
    } else if (reminderIndex > -1) {
      grimoireState.players[playerIndex].reminders.splice(reminderIndex, 1);
    }
    updateGrimoire({ grimoireState });
    updateButtonStates();
    saveAppState({ grimoireState });
    textReminderModal.style.display = 'none';
  };

  closeCharacterModalBtn.onclick = () => {
    characterModal.style.display = 'none';
    // Clear any selection states when closing the modal
    delete grimoireState.selectedBluffIndex;
    // Don't change selectedPlayerIndex as it might be legitimately set
  };
  cancelReminderBtn.onclick = () => textReminderModal.style.display = 'none';
  characterSearch.oninput = () => populateCharacterGrid({ grimoireState });
  if (closeReminderTokenModalBtn) {
    closeReminderTokenModalBtn.onclick = () => reminderTokenModal.style.display = 'none';
  }
  if (reminderTokenSearch) {
    reminderTokenSearch.oninput = () => populateReminderTokenGrid({ grimoireState });
  }

  // Close modals by tapping outside content
  characterModal.addEventListener('click', (e) => {
    if (e.target === characterModal) {
      characterModal.style.display = 'none';
      // Clear any bluff selection when closing
      delete grimoireState.selectedBluffIndex;
    }
  });
  textReminderModal.addEventListener('click', (e) => { if (e.target === textReminderModal) textReminderModal.style.display = 'none'; });
  // For reminder token modal, also close if clicking outside the content container
  if (reminderTokenModal) {
    reminderTokenModal.addEventListener('click', (e) => {
      if (e.target === reminderTokenModal) { reminderTokenModal.style.display = 'none'; return; }
      const content = reminderTokenModal.querySelector('.modal-content');
      if (content && !content.contains(e.target)) { reminderTokenModal.style.display = 'none'; }
    });
  }

  // Handle container resize to reposition players
  let resizeObserver;
  if ('ResizeObserver' in window) {
    resizeObserver = new ResizeObserver(() => {
      if (grimoireState.players.length > 0) {
        console.log('Container resized, repositioning players...');
        requestAnimationFrame(() => repositionPlayers({ grimoireState }));
      }
    });

    // Observe the player circle container for size changes
    const playerCircle = document.getElementById('player-circle');
    if (playerCircle) {
      resizeObserver.observe(playerCircle);
    }
  } else {
    // Fallback to window resize for older browsers
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        if (grimoireState.players.length > 0) {
          console.log('Window resized, repositioning players...');
          requestAnimationFrame(() => repositionPlayers({ grimoireState }));
        }
      }, 250);
    });
  }

  // Also reposition players when the page becomes visible (in case of tab switching)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && grimoireState.players.length > 0) {
      requestAnimationFrame(() => repositionPlayers({ grimoireState }));
    }
  });

  // Auto-load default tokens when the page is ready
  function autoLoadTokens() {
    // Check if service worker is ready
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      console.log('Service worker ready');
    } else {
      // Wait for service worker to be ready
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('Service worker controller changed');
      });

      // Fallback: if no service worker after a reasonable time, load anyway
      const fallbackTimer = setTimeout(() => {
        if (!navigator.serviceWorker.controller) {
          console.log('Service worker not ready');
        }
      }, 2000);

      // Clear fallback if service worker becomes ready
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        clearTimeout(fallbackTimer);
      });
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoLoadTokens);
  } else {
    autoLoadTokens();
  }

  // Compute visible roles from baseRoles and extraTravellerRoles based on toggle
  // Sidebar resizer
  initSidebarResize(sidebarResizer, sidebarEl);

  // Sidebar toggle
  initSidebarToggle({
    sidebarToggleBtn,
    sidebarCloseBtn,
    sidebarBackdrop,
    sidebarEl,
    sidebarResizer,
    isTouchDevice,
    repositionPlayers,
    grimoireState,
    characterPanel,
    characterPanelToggleBtn
  });

  // Character panel toggle logic
  (function initCharacterPanelToggle() {
    if (!characterPanel || !characterPanelToggleBtn) return;
    const PANEL_KEY = 'characterPanelOpen';
    const applyState = (open) => {
      characterPanel.setAttribute('aria-hidden', String(!open));
      document.body.classList.toggle('character-panel-open', open);
      characterPanelToggleBtn.setAttribute('aria-pressed', String(open));
      // Keep static label
      characterPanelToggleBtn.textContent = 'Script';
      try { localStorage.setItem(PANEL_KEY, open ? '1' : '0'); } catch (_) { }
      // Restore sidebar toggle visibility when closing panel (mobile CSS hides it only while open)
      // No inline sidebar toggle manipulation needed; CSS governs visibility.
      // No sidebar state mutation here; sidebar visibility managed independently.
      // Ensure any inline-hidden sidebar toggle (mobile case) is restored immediately after closing
      try { applySidebarToggleVisibilityForPanel(); } catch (_) { }
      // Reposition players after CSS transition (allow layout to settle)
      setTimeout(() => { try { repositionPlayers({ grimoireState }); } catch (_) { } }, 320);
    };
    let startOpen = false;
    try { startOpen = localStorage.getItem(PANEL_KEY) === '1'; } catch (_) { }
    applyState(startOpen);
    characterPanelToggleBtn.addEventListener('click', () => {
      const open = !document.body.classList.contains('character-panel-open');
      applyState(open);
    });
    if (characterPanelCloseBtn) characterPanelCloseBtn.addEventListener('click', () => applyState(false));
    // Close on outside click for wider screens (not touch overlay) when open
    document.addEventListener('click', (e) => {
      if (!document.body.classList.contains('character-panel-open')) return;
      const target = e.target;
      // Ignore clicks originating inside the panel or on its toggle
      if (characterPanel.contains(target) || characterPanelToggleBtn.contains(target)) return;
      // Also ignore clicks within the sidebar so dismissing the panel doesn't inadvertently hide sidebar toggle state
      const sidebar = document.getElementById('sidebar');
      if (sidebar && sidebar.contains(target)) return;
      applyState(false);
    });
    // Escape key closes panel
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && document.body.classList.contains('character-panel-open')) applyState(false);
    });
    // Responsive: collapse automatically on very small viewports
    const mq = window.matchMedia('(max-width: 900px)');
    const handleMq = () => {
      if (mq.matches) {
        // On small screens default closed unless previously opened in this session
        if (!document.body.classList.contains('character-panel-open')) applyState(false);
      }
    };
    mq.addEventListener('change', handleMq);
    handleMq();
  })();

  // Load histories and render lists
  loadHistories();
  renderScriptHistory({ scriptHistoryList });
  renderGrimoireHistory({ grimoireHistoryList });

  // Initialize export/import functionality
  initExportImport();

  // Initialize day/night tracking first
  initDayNightTracking(grimoireState);

  // Restore previous session (script and grimoire), then apply mode UI
  await loadAppState({ grimoireState, grimoireHistoryList });
  applyModeUI();
  applyGrimoireHiddenUI();

  // In-app tour
  initInAppTour();
  // Storyteller Message feature
  function buildMessagePicker() {
    if (!storytellerMessagePicker) return;
    storytellerMessagePicker.innerHTML = '';
    const table = grimoireState.playerSetupTableRaw || {};
    const msgs = Array.isArray(table.storyteller_messages) ? table.storyteller_messages : [];
    msgs.forEach((entry) => {
      const label = typeof entry === 'string' ? entry : entry.text;
      const btn = document.createElement('button');
      btn.className = 'button';
      btn.textContent = label;
      btn.addEventListener('click', () => {
        const editModal = document.getElementById('storyteller-message-edit');
        const listModal = document.getElementById('storyteller-message-modal');
        if (listModal) listModal.style.display = 'none';
        if (editModal) editModal.style.display = 'flex';
        storytellerMessageInput.value = label;
        const slotCount = typeof entry === 'object' ? (entry.slots || 0) : 0;
        grimoireState.storytellerTempSlots = new Array(Math.max(0, slotCount)).fill(null);
        renderMessageSlots(slotCount);
        if (typeof entry === 'object' && entry.freeText) {
          storytellerMessageInput.value = '';
          storytellerMessageInput.placeholder = 'Type your message...';
        } else {
          storytellerMessageInput.placeholder = '';
        }
      });
      storytellerMessagePicker.appendChild(btn);
    });
  }

  const messageSlotsEl = document.getElementById('storyteller-message-slots');
  const roleGridEl = document.getElementById('storyteller-role-grid');
  let currentSlotTargets = [];

  function applyStoryMsgRoleLook(tokenEl, roleId) {
    const existingSvg = tokenEl.querySelector('svg');
    if (existingSvg) existingSvg.remove();
    // Match view/edit message token size (1.5x standard)
    tokenEl.style.width = 'calc(var(--token-size) * 1.5)';
    tokenEl.style.height = 'calc(var(--token-size) * 1.5)';
    tokenEl.style.border = '4px solid #D4AF37';
    tokenEl.style.boxShadow = '0 0 20px rgba(212, 175, 55, 0.6), inset 0 0 20px rgba(0, 0, 0, 0.3)';
    tokenEl.style.borderRadius = '50%';
    if (roleId && grimoireState.allRoles[roleId]) {
      const role = grimoireState.allRoles[roleId];
      tokenEl.classList.remove('empty');
      tokenEl.classList.add('has-character');
      const characterImage = role.image || './assets/img/token-BqDQdWeO.webp';
      tokenEl.style.backgroundImage = `url('${characterImage}'), url('./assets/img/token-BqDQdWeO.webp')`;
      tokenEl.style.backgroundSize = '68% 68%, cover';
      tokenEl.style.backgroundPosition = 'center, center';
      tokenEl.style.backgroundRepeat = 'no-repeat, no-repeat';
      tokenEl.style.backgroundColor = 'transparent';
      const svg = createCurvedLabelSvg(`story-msg-${roleId}-${Math.random().toString(36).slice(2)}`, role.name);
      tokenEl.appendChild(svg);
    } else {
      tokenEl.classList.add('empty');
      tokenEl.classList.remove('has-character');
      tokenEl.style.backgroundImage = "url('./assets/img/token-BqDQdWeO.webp')";
      tokenEl.style.backgroundSize = 'cover';
      tokenEl.style.backgroundPosition = 'center';
      tokenEl.style.backgroundRepeat = 'no-repeat';
      const svg = createCurvedLabelSvg('story-msg-empty', 'None');
      tokenEl.appendChild(svg);
    }
  }

  function renderMessageSlots(count) {
    if (!messageSlotsEl) return;
    messageSlotsEl.innerHTML = '';
    currentSlotTargets = new Array(Math.max(0, count)).fill(null);
    if (count > 0) {
      messageSlotsEl.style.display = 'flex';
      for (let i = 0; i < count; i++) {
        const slot = document.createElement('div');
        slot.className = 'token empty';
        applyStoryMsgRoleLook(slot, null);
        slot.addEventListener('click', () => openRoleGridForSlot(i));
        messageSlotsEl.appendChild(slot);
      }
    } else {
      messageSlotsEl.style.display = 'none';
    }
  }

  function openRoleGridForSlot(slotIndex) {
    if (!roleGridEl) return;
    // Use existing character modal grid for consistency like bluffs
    const characterModal = document.getElementById('character-modal');
    const characterSearch = document.getElementById('character-search');
    if (!grimoireState.scriptData) { alert('Please load a script first.'); return; }
    // Temporarily reuse grimoireState.selectedBluffIndex to store slot index for this ephemeral selection
    grimoireState._tempStorytellerSlotIndex = slotIndex;
    const modalTitle = characterModal.querySelector('h3');
    if (modalTitle) modalTitle.textContent = 'Select a Character';
    populateCharacterGrid({ grimoireState });
    // Ensure edit modal stays under character modal
    const editModal = document.getElementById('storyteller-message-edit');
    if (editModal) editModal.style.display = 'flex';
    characterModal.style.display = 'flex';
    characterSearch.value = '';
    characterSearch.focus();
    // Hook into global selection by intercepting assign via window handler
    const grid = document.getElementById('character-grid');
    const handler = (e) => {
      const item = e.target.closest('.token');
      if (!item) return;
      const roleId = item.dataset.roleId || item.getAttribute('data-role-id');
      if (!roleId) return;
      e.preventDefault();
      currentSlotTargets[slotIndex] = roleId;
      const slot = messageSlotsEl.children[slotIndex];
      applyStoryMsgRoleLook(slot, roleId);
      characterModal.style.display = 'none';
      grid.removeEventListener('click', handler, true);
      delete grimoireState._tempStorytellerSlotIndex;
    };
    grid.addEventListener('click', handler, true);
  }

  // Load storyteller messages from player-setup.json too
  async function loadStorytellerMessages() {
    try {
      const res = await fetch('./player-setup.json');
      const data = await res.json();
      grimoireState.playerSetupTableRaw = data || {};
      buildMessagePicker();
    } catch (_) { /* ignore */ }
  }
  loadStorytellerMessages();

  if (openStorytellerMessageBtn && storytellerMessageModal) {
    openStorytellerMessageBtn.addEventListener('click', () => {
      if (grimoireState.mode === 'player') return;
      storytellerMessageModal.style.display = 'flex';
      buildMessagePicker();
      try { storytellerMessageModal.scrollIntoView({ block: 'center' }); } catch (_) { }
    });
  }
  if (closeStorytellerMessageBtn && storytellerMessageModal) {
    closeStorytellerMessageBtn.addEventListener('click', () => { storytellerMessageModal.style.display = 'none'; });
  }

  // Edit modal close behavior to match character modal
  if (closeStorytellerMessageEditBtn && storytellerMessageEdit) {
    closeStorytellerMessageEditBtn.addEventListener('click', () => { storytellerMessageEdit.style.display = 'none'; });
  }
  if (storytellerMessageEdit) {
    storytellerMessageEdit.addEventListener('click', (e) => {
      const content = storytellerMessageEdit.querySelector('.modal-content');
      if (e.target === storytellerMessageEdit) { storytellerMessageEdit.style.display = 'none'; return; }
      if (content && !content.contains(e.target)) { storytellerMessageEdit.style.display = 'none'; }
    });
  }

  // Fullscreen overlay element (created once)
  const messageDisplayModal = document.getElementById('storyteller-message-display');
  const closeMessageDisplayBtn = document.getElementById('close-storyteller-message-display');

  function showStorytellerOverlay(text) {
    if (!messageDisplayModal) return;
    const textDiv = messageDisplayModal.querySelector('.message-text');
    const bluffsDiv = messageDisplayModal.querySelector('.bluffs-container');
    if (textDiv) textDiv.textContent = text || '';
    if (bluffsDiv) bluffsDiv.style.display = 'none';
    // render chosen slots
    const slotsDisplay = document.getElementById('storyteller-slots-display');
    if (slotsDisplay) {
      slotsDisplay.innerHTML = '';
      const selectedSlots = Array.isArray(grimoireState.storytellerTempSlots)
        ? grimoireState.storytellerTempSlots
        : (currentSlotTargets || []);
      if (selectedSlots.length > 0) {
        selectedSlots.forEach((roleId) => {
          const slot = document.createElement('div');
          slot.className = 'token';
          applyStoryMsgRoleLook(slot, roleId || null);
          slotsDisplay.appendChild(slot);
        });
      }
    }
    messageDisplayModal.style.display = 'flex';
    // Hide grimoire while showing message using centralized helper
    hideGrimoire({ grimoireState });
  }
  function hideStorytellerOverlay() {
    if (!messageDisplayModal) return;
    messageDisplayModal.style.display = 'none';
    const bluffsDiv = messageDisplayModal.querySelector('.bluffs-container');
    if (bluffsDiv) bluffsDiv.style.display = 'none';
  }

  if (messageDisplayModal) {
    messageDisplayModal.addEventListener('click', (e) => {
      if (e.target === messageDisplayModal) hideStorytellerOverlay();
      const content = messageDisplayModal.querySelector('.modal-content');
      if (content && !content.contains(e.target)) hideStorytellerOverlay();
    });
  }
  if (closeMessageDisplayBtn) closeMessageDisplayBtn.addEventListener('click', hideStorytellerOverlay);

  if (showStorytellerMessageBtn) {
    showStorytellerMessageBtn.addEventListener('click', () => {
      if (!Array.isArray(grimoireState.storytellerTempSlots) || !grimoireState.storytellerTempSlots.length) {
        try { grimoireState.storytellerTempSlots = (currentSlotTargets || []).slice(); } catch (_) { }
      }
      showStorytellerOverlay(storytellerMessageInput.value.trim());
      storytellerMessageModal.style.display = 'none';
      // If message is the special bluffs one, show toggle button in modal earlier (handled in picker)
    });
  }

  // Click center to open sidebar when collapsed and no game started
  const centerEl = document.getElementById('center');
  if (centerEl) {
    centerEl.addEventListener('click', (e) => {
      // If the character panel is currently open, ignore center clicks so closing the panel
      // via outside click does not immediately trigger the sidebar to open (which hides the toggle)
      if (document.body.classList.contains('character-panel-open')) return;
      const isCollapsed = document.body.classList.contains('sidebar-collapsed');
      const noPlayers = !Array.isArray(grimoireState.players) || grimoireState.players.length === 0;
      if (isCollapsed && noPlayers) {
        try { e.preventDefault(); } catch (_) { }
        try { e.stopPropagation(); } catch (_) { }
        const toggleBtn = document.getElementById('sidebar-toggle');
        if (toggleBtn) toggleBtn.click();
      }
    }, true);
  }
});

// Tooltip and info icon helpers are imported from ui/tooltip.js
