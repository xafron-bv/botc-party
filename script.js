import { INCLUDE_TRAVELLERS_KEY, isTouchDevice } from './src/constants.js';
import './pwa.js';
import { loadAppState, saveAppState } from './src/app.js';
import { loadAllCharacters, onIncludeTravellersChange, populateCharacterGrid } from './src/character.js';
import { handleGrimoireBackgroundChange, initGrimoireBackground, loadPlayerSetupTable, renderSetupInfo, startGame, updateGrimoire } from './src/grimoire.js';
import { addGrimoireHistoryListListeners, renderGrimoireHistory } from './src/history/grimoire.js';
import { loadHistories } from './src/history/index.js';
import { addScriptHistoryListListeners, renderScriptHistory } from './src/history/script.js';
import { repositionPlayers } from './src/ui/layout.js';
import { loadScriptFile, loadScriptFromFile } from './src/script.js';
import { initSidebarResize, initSidebarToggle } from './src/ui/sidebar.js';
import { initInAppTour } from './src/ui/tour.js';
import { populateReminderTokenGrid } from './src/reminder.js';

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
  // Travellers toggle state key and default

  const grimoireState = {
    includeTravellers: false,
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
    outsideCollapseHandlerInstalled: false
  };

  initGrimoireBackground();

  if (backgroundSelect) {
    backgroundSelect.addEventListener('change', handleGrimoireBackgroundChange);
  }

  // Initialize travellers toggle from localStorage
  try {
    grimoireState.includeTravellers = (localStorage.getItem(INCLUDE_TRAVELLERS_KEY) === '1');
  } catch (_) { grimoireState.includeTravellers = false; }
  if (includeTravellersCheckbox) {
    includeTravellersCheckbox.checked = grimoireState.includeTravellers;
    includeTravellersCheckbox.addEventListener('change', () => onIncludeTravellersChange({ grimoireState, includeTravellersCheckbox }));
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
        grimoireState.players[playerIndex].reminders.push({ type: 'text', value: text });
      }
    } else if (reminderIndex > -1) {
      grimoireState.players[playerIndex].reminders.splice(reminderIndex, 1);
    }
    updateGrimoire({ grimoireState });
    saveAppState({ grimoireState });
    textReminderModal.style.display = 'none';
  };

  closeCharacterModalBtn.onclick = () => characterModal.style.display = 'none';
  cancelReminderBtn.onclick = () => textReminderModal.style.display = 'none';
  characterSearch.oninput = () => populateCharacterGrid({ grimoireState });
  if (closeReminderTokenModalBtn) {
    closeReminderTokenModalBtn.onclick = () => reminderTokenModal.style.display = 'none';
  }
  if (reminderTokenSearch) {
    reminderTokenSearch.oninput = () => populateReminderTokenGrid({ grimoireState });
  }

  // Close modals by tapping outside content
  characterModal.addEventListener('click', (e) => { if (e.target === characterModal) characterModal.style.display = 'none'; });
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
        requestAnimationFrame(() => repositionPlayers({ players: grimoireState.players }));
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
          requestAnimationFrame(() => repositionPlayers({ players: grimoireState.players }));
        }
      }, 250);
    });
  }

  // Also reposition players when the page becomes visible (in case of tab switching)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && grimoireState.players.length > 0) {
      requestAnimationFrame(() => repositionPlayers({ players: grimoireState.players }));
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
    players: grimoireState.players
  });

  // Load histories and render lists
  loadHistories();
  renderScriptHistory({ scriptHistoryList });
  renderGrimoireHistory({ grimoireHistoryList });

  // Restore previous session (script and grimoire)
  loadAppState({ grimoireState, grimoireHistoryList });

  // In-app tour
  initInAppTour();
});

// Tooltip and info icon helpers are imported from ui/tooltip.js
