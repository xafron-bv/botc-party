import { INCLUDE_TRAVELLERS_KEY, isTouchDevice, MODE_STORAGE_KEY } from './src/constants.js';
import './pwa.js';
import { loadAppState, saveAppState } from './src/app.js';
import { loadAllCharacters, onIncludeTravellersChange, populateCharacterGrid } from './src/character.js';
import { handleGrimoireBackgroundChange, initGrimoireBackground, loadPlayerSetupTable, renderSetupInfo, startGame, updateGrimoire } from './src/grimoire.js';
import { addGrimoireHistoryListListeners, renderGrimoireHistory } from './src/history/grimoire.js';
import { loadHistories } from './src/history/index.js';
import { addScriptHistoryListListeners, renderScriptHistory } from './src/history/script.js';
import { initExportImport } from './src/history/exportImport.js';
import { repositionPlayers } from './src/ui/layout.js';
import { displayScript, loadScriptFile, loadScriptFromFile } from './src/script.js';
import { initSidebarResize, initSidebarToggle } from './src/ui/sidebar.js';
import { initInAppTour } from './src/ui/tour.js';
import { populateReminderTokenGrid } from './src/reminder.js';
import { initDayNightTracking, generateReminderId, addReminderTimestamp } from './src/dayNightTracking.js';

document.addEventListener('DOMContentLoaded', () => {
  const startGameBtn = document.getElementById('start-game');
  const loadTbBtn = document.getElementById('load-tb');
  const loadBmrBtn = document.getElementById('load-bmr');
  const loadSavBtn = document.getElementById('load-sav');
  const loadAllCharsBtn = document.getElementById('load-all-chars');
  const scriptFileInput = document.getElementById('script-file');
  const playerCountInput = document.getElementById('player-count');

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
  const scriptHistoryList = document.getElementById('script-history-list');
  const grimoireHistoryList = document.getElementById('grimoire-history-list');

  const backgroundSelect = document.getElementById('background-select');
  const includeTravellersCheckbox = document.getElementById('include-travellers');
  const nightOrderSortCheckbox = document.getElementById('night-order-sort');
  const nightOrderControls = document.querySelector('.night-order-controls');
  const firstNightBtn = document.getElementById('first-night-btn');
  const otherNightsBtn = document.getElementById('other-nights-btn');
  // Travellers toggle state key and default
  const modeStorytellerRadio = document.getElementById('mode-storyteller');
  const modePlayerRadio = document.getElementById('mode-player');
  const dayNightToggleBtn = document.getElementById('day-night-toggle');
  const dayNightSlider = document.getElementById('day-night-slider');

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
    mode: 'storyteller'
  };

  // Make grimoireState available globally for event handlers
  window.grimoireState = grimoireState;

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
    if (isPlayer && grimoireState.dayNightTracking) {
      grimoireState.dayNightTracking.enabled = false;
    }
  };

  if (modeStorytellerRadio && modePlayerRadio) {
    applyModeUI();
    const onModeChange = (e) => {
      const val = e && e.target && e.target.value;
      grimoireState.mode = (val === 'player') ? 'player' : 'storyteller';
      applyModeUI();
      try { localStorage.setItem(MODE_STORAGE_KEY, grimoireState.mode); } catch (_) { }
      saveAppState({ grimoireState });
    };
    modeStorytellerRadio.addEventListener('change', onModeChange);
    modePlayerRadio.addEventListener('change', onModeChange);
  }

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

    nightOrderSortCheckbox.addEventListener('change', async () => {
      grimoireState.nightOrderSort = nightOrderSortCheckbox.checked;
      try {
        localStorage.setItem('nightOrderSort', grimoireState.nightOrderSort ? '1' : '0');
      } catch (_) { }

      if (nightOrderControls) {
        nightOrderControls.classList.toggle('active', grimoireState.nightOrderSort);
      }

      // Re-display the script with new sorting
      if (grimoireState.scriptData) {
        await displayScript({ data: grimoireState.scriptData, grimoireState });
      }
    });
  }

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
  }

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

  startGameBtn.addEventListener('click', () => startGame({ grimoireState, grimoireHistoryList, playerCountInput }));

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
    grimoireState
  });

  // Load histories and render lists
  loadHistories();
  renderScriptHistory({ scriptHistoryList });
  renderGrimoireHistory({ grimoireHistoryList });

  // Initialize export/import functionality
  initExportImport();

  // Restore previous session (script and grimoire)
  loadAppState({ grimoireState, grimoireHistoryList }).then(() => {
    applyModeUI();
  });

  // Initialize day/night tracking
  initDayNightTracking(grimoireState);

  // In-app tour
  initInAppTour();

  // Click center to open sidebar when collapsed and no game started
  const centerEl = document.getElementById('center');
  if (centerEl) {
    centerEl.addEventListener('click', (e) => {
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
