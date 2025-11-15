import './pwa.js';
import { loadAppState, saveAppState } from './src/app.js';
import { hideCharacterModal, loadAllCharacters, onIncludeTravellersChange, populateCharacterGrid } from './src/character.js';
import { INCLUDE_TRAVELLERS_KEY, isTouchDevice, MODE_STORAGE_KEY } from './src/constants.js';
import { addReminderTimestamp, generateReminderId, initDayNightTracking, updateDayNightUI } from './src/dayNightTracking.js';
import { applyGrimoireHiddenState, applyGrimoireLockedState, resetGrimoire, showGrimoire, toggleGrimoireHidden, toggleGrimoireLocked, updateGrimoire } from './src/grimoire.js';
import { ensureGrimoireUnlocked } from './src/grimoireLock.js';
import { initExportImport } from './src/history/exportImport.js';
import { addGrimoireHistoryListListeners, renderGrimoireHistory, snapshotCurrentGrimoire } from './src/history/grimoire.js';
import { loadHistories } from './src/history/index.js';
import { addScriptHistoryListListeners, renderScriptHistory } from './src/history/script.js';
import { initPlayerSetup, restoreSelectionSession } from './src/playerSetup.js';
import { updateBluffAttentionState } from './src/bluffTokens.js';
import { populateReminderTokenGrid } from './src/reminder.js';
import { displayScript, loadScriptFile, loadScriptFromDataJson } from './src/script.js';
import { initStorytellerMessages } from './src/storytellerMessages.js';
import { repositionPlayers } from './src/ui/layout.js';
import { initSidebarResize, initSidebarToggle } from './src/ui/sidebar.js';
import { initDisplaySettings } from './src/ui/displaySettings.js';
import { initInAppTour } from './src/ui/tour.js';
import { handleGrimoireBackgroundChange, initGrimoireBackground } from './src/ui/background.js';
import { loadPlayerSetupTable, renderSetupInfo } from './src/utils/setup.js';
import { resolveAssetPath } from './utils.js';
import { setupModalCloseHandlers } from './src/modalCloseHandlers.js';

function normalizeUrl(url) {
  if (!url) return null;
  try {
    return new URL(resolveAssetPath(url), window.location.href).toString();
  } catch (_) {
    return resolveAssetPath(url);
  }
}

function getNow() {
  if (typeof window !== 'undefined' && window.performance && typeof window.performance.now === 'function') {
    try {
      return window.performance.now();
    } catch (_) { /* ignore */ }
  }
  return Date.now();
}

function extractUrlsFromCssValue(value, collector) {
  if (!value || value === 'none') return;
  const regex = /url\(("|')?([^"')]+)\1?\)/g;
  let match;
  while ((match = regex.exec(value))) {
    collector(normalizeUrl(match[2]));
  }
}

function collectVisibleAssetUrls({ grimoireState }) {
  const urls = new Set();
  const add = (url) => {
    const normalized = normalizeUrl(url);
    if (normalized) urls.add(normalized);
  };

  add('./assets/img/token.png');

  try {
    if (Array.isArray(grimoireState?.players)) {
      grimoireState.players.forEach((player) => {
        const id = player?.character;
        if (!id) return;
        const role = grimoireState.allRoles?.[id] || grimoireState.baseRoles?.[id];
        if (role?.image) add(role.image);
      });
    }
    if (Array.isArray(grimoireState?.bluffs)) {
      grimoireState.bluffs.forEach((id) => {
        if (!id) return;
        const role = grimoireState.allRoles?.[id] || grimoireState.extraTravellerRoles?.[id] || grimoireState.baseRoles?.[id];
        if (role?.image) add(role.image);
      });
    }
  } catch (_) { /* best effort */ }

  const selectors = [
    'body',
    '#app',
    '#grimoire',
    '.player-token',
    '.bluff-token',
    '.reminder-token',
    '.storyteller-slot',
    '.storyteller-slot .token',
    '.storyteller-message-slot',
    '.reminder-icon',
    '.character-token'
  ];
  try {
    selectors.forEach((selector) => {
      document.querySelectorAll(selector).forEach((el) => {
        const style = window.getComputedStyle(el);
        extractUrlsFromCssValue(style.backgroundImage, add);
        extractUrlsFromCssValue(style.maskImage, add);
      });
    });
  } catch (_) { /* ignore */ }

  try {
    document.querySelectorAll('#app img').forEach((img) => add(img.currentSrc || img.src));
  } catch (_) { /* ignore */ }

  return Array.from(urls);
}

async function waitForImageUrls(urls, timeoutMs = 15000) {
  if (!Array.isArray(urls) || urls.length === 0) return;
  const uniqueUrls = Array.from(new Set(urls.filter(Boolean)));
  if (uniqueUrls.length === 0) return;

  try { window.__criticalImageCount = uniqueUrls.length; } catch (_) {}

  const loadPromises = uniqueUrls.map((url) => new Promise((resolve) => {
    try {
      const img = new window.Image();
      const done = () => resolve(url);
      img.onload = done;
      img.onerror = done;
      img.decoding = 'async';
      img.src = url;
    } catch (_) {
      resolve(url);
    }
  }));

  const timeoutPromise = new Promise((resolve) => setTimeout(resolve, timeoutMs));
  await Promise.race([Promise.all(loadPromises), timeoutPromise]);
  try { window.__criticalImagesLoaded = true; } catch (_) {}
}

document.addEventListener('DOMContentLoaded', async () => {
  const loadingOverlay = document.getElementById('app-loading');
  let overlayHidden = false;
  try {
    window.__overlayInitialVisible = !!loadingOverlay;
    const messageEl = document.getElementById('app-loading-message');
    window.__overlayInitialMessage = messageEl ? messageEl.textContent || '' : '';
  } catch (_) { /* non-fatal */ }
  const hideLoadingOverlay = () => {
    if (!loadingOverlay || overlayHidden) return;
    overlayHidden = true;
    loadingOverlay.setAttribute('aria-hidden', 'true');
    loadingOverlay.classList.add('hidden');
    setTimeout(() => {
      try { loadingOverlay.remove(); } catch (_) { /* element might already be gone */ }
    }, 350);
    try {
      window.__overlayRemoved = true;
      window.__overlayRemovedAt = getNow();
    } catch (_) { /* diagnostics only */ }
  };
  const hideOverlayOnNextFrame = () => {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => hideLoadingOverlay());
    } else {
      setTimeout(() => hideLoadingOverlay(), 0);
    }
  };
  const overlayFailSafe = setTimeout(() => hideOverlayOnNextFrame(), 20000);

  const waitForFullLoad = () => new Promise((resolve) => {
    if (document.readyState === 'complete') {
      try {
        window.__windowLoadCompleted = true;
        window.__windowLoadTimestamp = getNow();
      } catch (_) { /* diagnostics only */ }
      resolve();
      return;
    }
    const timeout = setTimeout(() => resolve(), 12000);
    window.addEventListener('load', () => {
      clearTimeout(timeout);
      try {
        window.__windowLoadCompleted = true;
        window.__windowLoadTimestamp = getNow();
      } catch (_) { /* diagnostics only */ }
      resolve();
    }, { once: true });
  });
  const windowLoadPromise = waitForFullLoad();

  const bootstrap = async () => {
  // Populate version from service-worker.js CACHE_NAME pattern (v<number>)
    try {
      const el = document.getElementById('app-version-value');
      if (el) {
        fetch('./service-worker.js')
          .then(r => r.text())
          .then(text => {
            const m = text.match(/CACHE_NAME\s*=\s*['"]botc-party-grimoire-v(\d+)['"]/);
            if (m) el.textContent = m[1]; else el.textContent = '?';
          })
          .catch(() => { el.textContent = '?'; });
      }
    } catch (_) { /* ignore */ }
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
    const openRulebookBtn = document.getElementById('open-rulebook');

    const characterModal = document.getElementById('character-modal');
    const characterSearch = document.getElementById('character-search');

    const textReminderModal = document.getElementById('text-reminder-modal');
    const reminderTextInput = document.getElementById('reminder-text-input');
    const saveReminderBtn = document.getElementById('save-reminder-btn');
    const sidebarResizer = document.getElementById('sidebar-resizer');

    const sidebarEl = document.getElementById('sidebar');
    const reminderTokenModal = document.getElementById('reminder-token-modal');
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
    const modeStorytellerRadio = document.getElementById('mode-storyteller');
    const modePlayerRadio = document.getElementById('mode-player');
    const dayNightToggleBtn = document.getElementById('day-night-toggle');
    const dayNightSlider = document.getElementById('day-night-slider');
    const displaySettingsToggleBtn = document.getElementById('display-settings-toggle');
    const revealToggleBtn = document.getElementById('reveal-assignments');
    const grimoireLockToggleBtn = document.getElementById('grimoire-lock-toggle');

    const grimoireState = {
      includeTravellers: false,
      nightOrderSort: false,
      nightPhase: 'first-night',
      playerContextMenu: null,
      contextMenuTargetIndex: -1,
      longPressTimer: null,
      reminderContextMenu: null,
      reminderContextTarget: { playerIndex: -1, reminderIndex: -1 },
      scriptData: null,
      scriptMetaName: '',
      playerSetupTable: [],
      allRoles: {},
      baseRoles: {},
      extraTravellerRoles: {},
      players: [],
      selectedPlayerIndex: -1,
      editingReminder: { playerIndex: -1, reminderIndex: -1 },
      isRestoringState: false,
      outsideCollapseHandlerInstalled: false,
      mode: 'player',
      grimoireHidden: false,
      grimoireLocked: false,
      gameStarted: false,
      displaySettings: { tokenScale: 1, playerNameScale: 1, circleScale: 1 }
    };

    function updatePreGameOverlayMessage() {
      const overlayInner = document.querySelector('#pre-game-overlay .overlay-inner');
      if (!overlayInner) return;
      if (!document.body.classList.contains('pre-game')) return;
      if (grimoireState.winner) {
        try {
          const overlay = document.getElementById('pre-game-overlay');
          if (overlay) overlay.style.display = 'none';
        } catch (_) { }
        return;
      }
      if (document.body.classList.contains('selection-active')) return;
      if (document.body.classList.contains('player-setup-open')) return;
      const ps = grimoireState.playerSetup || {};
      const players = grimoireState.players || [];
      const totalPlayers = players.length;
      const bag = Array.isArray(ps.bag) ? ps.bag : [];

      if (ps.selectionComplete) {
        overlayInner.innerHTML = '<h2>Number Selection Complete</h2><p>Hand the device back to the storyteller.</p>';
      } else if (bag.length !== totalPlayers || totalPlayers === 0) {
        overlayInner.innerHTML = '<h2>Configure Player Setup</h2><p>Open Player Setup to choose or randomize characters so that the bag matches the player count, then start number selection.</p>';
      } else if (!ps.selectionActive) {
        overlayInner.innerHTML = '<h2>Ready for Number Selection</h2><p>Click Start Number Selection to let each player privately pick their number.</p>';
      }
    }
    try { window.updatePreGameOverlayMessage = updatePreGameOverlayMessage; } catch (_) { }

    function updatePreGameClass() {
      try {
        const hasPlayers = Array.isArray(grimoireState.players) && grimoireState.players.length > 0;
        const storytellerMode = grimoireState.mode !== 'player';
        if (storytellerMode && hasPlayers && !grimoireState.gameStarted && !grimoireState.winner) {
          document.body.classList.add('pre-game');
        } else {
          document.body.classList.remove('pre-game');
        }
      } catch (_) { }
    }

    grimoireState.playerSetup = grimoireState.playerSetup || { bag: [], assignments: [], revealed: false };

    window.grimoireState = grimoireState;
    window.updateButtonStates = updateButtonStates;

    initGrimoireBackground();
    initDisplaySettings({ grimoireState });

    if (backgroundSelect) {
      backgroundSelect.addEventListener('change', handleGrimoireBackgroundChange);
    }

    try {
      const storedMode = localStorage.getItem(MODE_STORAGE_KEY);
      grimoireState.mode = storedMode === 'player' ? 'player' : 'storyteller';
    } catch (_) {
      grimoireState.mode = 'storyteller';
    }

    const updateGrimoireControlButtons = () => {
      const isPlayer = grimoireState.mode === 'player';
      if (revealToggleBtn) {
        const hidden = !!grimoireState.grimoireHidden;
        revealToggleBtn.style.display = isPlayer ? '' : 'none';
        revealToggleBtn.textContent = hidden ? 'Show Grimoire' : 'Hide Grimoire';
        revealToggleBtn.title = hidden ? 'Reveal characters to players' : 'Hide characters on this device';
        revealToggleBtn.setAttribute('aria-pressed', String(hidden));
      }
      if (grimoireLockToggleBtn) {
        const locked = !!grimoireState.grimoireLocked;
        grimoireLockToggleBtn.style.display = isPlayer ? 'none' : '';
        grimoireLockToggleBtn.textContent = locked ? 'Unlock Grimoire' : 'Lock Grimoire';
        grimoireLockToggleBtn.title = locked ? 'Unlock to allow grimoire changes' : 'Lock to prevent lineup changes';
        grimoireLockToggleBtn.setAttribute('aria-pressed', String(locked));
      }
    };

    const applyModeUI = () => {
      if (modeStorytellerRadio) modeStorytellerRadio.checked = grimoireState.mode !== 'player';
      if (modePlayerRadio) modePlayerRadio.checked = grimoireState.mode === 'player';
      const isPlayer = grimoireState.mode === 'player';
      if (dayNightToggleBtn) dayNightToggleBtn.style.display = isPlayer ? 'none' : '';
      if (displaySettingsToggleBtn) {
        if (isPlayer) {
          displaySettingsToggleBtn.classList.add('single-toggle');
        } else {
          displaySettingsToggleBtn.classList.remove('single-toggle');
        }
      }
      if (dayNightSlider && isPlayer) {
        dayNightSlider.classList.remove('open');
        dayNightSlider.style.display = 'none';
      }
      const openPlayerSetupBtn2 = document.getElementById('open-player-setup');
      if (openPlayerSetupBtn2) openPlayerSetupBtn2.style.display = isPlayer ? 'none' : '';
      if (openRulebookBtn) openRulebookBtn.style.display = isPlayer ? 'none' : '';
      // Always show Start/End Game button in both modes
      if (startGameBtn) startGameBtn.style.display = '';
      const _openStBtn = document.getElementById('open-storyteller-message');
      if (_openStBtn) _openStBtn.style.display = isPlayer ? 'none' : '';
      if (isPlayer && grimoireState.dayNightTracking) {
        grimoireState.dayNightTracking.enabled = false;
      }
      try { updateStartGameEnabled(); } catch (_) { }
      try { updateBluffAttentionState({ grimoireState }); } catch (_) { }
      updateGrimoireControlButtons();
    };
    function applyGrimoireHiddenUI() {
      applyGrimoireHiddenState({ grimoireState });
      updateGrimoireControlButtons();
    }

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
      try {
        document.querySelectorAll('#player-circle li .number-overlay, #player-circle li .number-badge').forEach((el) => el.remove());
      } catch (_) { }
    }

    if (revealToggleBtn) {
      revealToggleBtn.addEventListener('click', () => {
        if (grimoireState.mode !== 'player') return;
        toggleGrimoireHidden({ grimoireState });
        updateGrimoireControlButtons();
      });
    }
    if (grimoireLockToggleBtn) {
      grimoireLockToggleBtn.addEventListener('click', () => {
        if (grimoireState.mode === 'player') return;
        toggleGrimoireLocked({ grimoireState });
        updateGrimoireControlButtons();
      });
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
        updatePreGameClass();
        updateStartGameEnabled();
        try { localStorage.setItem(MODE_STORAGE_KEY, grimoireState.mode); } catch (_) { }
        saveAppState({ grimoireState });
      };
      modeStorytellerRadio.addEventListener('change', onModeChange);
      modePlayerRadio.addEventListener('change', onModeChange);
    }

    // Initialize player setup module
    initPlayerSetup({ grimoireState });

    try {
      grimoireState.includeTravellers = (localStorage.getItem(INCLUDE_TRAVELLERS_KEY) === '1');
    } catch (_) { grimoireState.includeTravellers = false; }
    if (includeTravellersCheckbox) {
      includeTravellersCheckbox.checked = grimoireState.includeTravellers;
      includeTravellersCheckbox.addEventListener('change', () => onIncludeTravellersChange({ grimoireState, includeTravellersCheckbox }));
    }

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

        if (grimoireState.scriptData) {
          await displayScript({ data: grimoireState.scriptData, grimoireState });
        }
      });
    }

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

    if (firstNightBtn && otherNightsBtn) {
      firstNightBtn.checked = grimoireState.nightPhase === 'first-night';
      otherNightsBtn.checked = grimoireState.nightPhase === 'other-nights';

      const handlePhaseChange = async (e) => {
        grimoireState.nightPhase = e.target.value;
        try {
          localStorage.setItem('nightPhase', grimoireState.nightPhase);
        } catch (_) { }

        if (grimoireState.scriptData && grimoireState.nightOrderSort) {
          await displayScript({ data: grimoireState.scriptData, grimoireState });
        }
      };

      firstNightBtn.addEventListener('change', handlePhaseChange);
      otherNightsBtn.addEventListener('change', handlePhaseChange);
      if (nightPhaseToggleBtn) {
        nightPhaseToggleBtn.addEventListener('click', async () => {
          const newPhase = grimoireState.nightPhase === 'first-night' ? 'other-nights' : 'first-night';
          grimoireState.nightPhase = newPhase;
          if (firstNightBtn) firstNightBtn.checked = newPhase === 'first-night';
          if (otherNightsBtn) otherNightsBtn.checked = newPhase === 'other-nights';
          nightPhaseToggleBtn.textContent = newPhase === 'first-night' ? 'First Night' : 'Other Nights';
          try { localStorage.setItem('nightPhase', grimoireState.nightPhase); } catch (_) { }
          if (grimoireState.scriptData && grimoireState.nightOrderSort) {
            await displayScript({ data: grimoireState.scriptData, grimoireState });
          }
        });
        nightPhaseToggleBtn.textContent = grimoireState.nightPhase === 'first-night' ? 'First Night' : 'Other Nights';
      }
    }

    try { applySidebarToggleVisibilityForPanel(); } catch (_) { }

    if (scriptHistoryList) {
      addScriptHistoryListListeners({ scriptHistoryList, grimoireState });
    }

    if (grimoireHistoryList) {
      addGrimoireHistoryListListeners({ grimoireHistoryList, grimoireState });
    }

    if (loadTbBtn) {
      loadTbBtn.addEventListener('click', async () => {
        grimoireState.scriptMetaName = 'Trouble Brewing';
        renderSetupInfo({ grimoireState });
        await loadScriptFromDataJson({ editionId: 'tb', grimoireState });
      });
    }
    if (loadBmrBtn) {
      loadBmrBtn.addEventListener('click', async () => {
        grimoireState.scriptMetaName = 'Bad Moon Rising';
        renderSetupInfo({ grimoireState });
        await loadScriptFromDataJson({ editionId: 'bmr', grimoireState });
      });
    }
    if (loadSavBtn) {
      loadSavBtn.addEventListener('click', async () => {
        grimoireState.scriptMetaName = 'Sects & Violets';
        renderSetupInfo({ grimoireState });
        await loadScriptFromDataJson({ editionId: 'snv', grimoireState });
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
      if (grimoireState.gameStarted && !grimoireState.winner) {
        const ok = window.confirm('A game is in progress. Resetting will end the current game and save it to history. Continue?');
        if (!ok) return;
      }
      resetGrimoire({ grimoireState, grimoireHistoryList, playerCountInput });
      try { showGrimoire({ grimoireState }); } catch (_) { }
      try { grimoireState.winner = null; } catch (_) { }
      grimoireState.gameStarted = false;
      try { updateBluffAttentionState({ grimoireState }); } catch (_) { }
      if (startGameBtn) startGameBtn.style.display = '';
      if (endGameBtn) endGameBtn.style.display = 'none';
      try {
        if (startGameBtn) { startGameBtn.disabled = false; startGameBtn.title = ''; }
        const openPlayerSetupBtn2 = document.getElementById('open-player-setup');
        if (openPlayerSetupBtn2) { openPlayerSetupBtn2.disabled = false; openPlayerSetupBtn2.title = ''; }
      } catch (_) { }
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
      const gameStatusEl = document.getElementById('game-status');
      if (gameStatusEl) {
        const playerCount = (grimoireState.players || []).length;
        gameStatusEl.textContent = `New game started (${playerCount} players)`;
        gameStatusEl.className = 'status';
        try { clearTimeout(grimoireState._gameStatusTimer); } catch (_) { }
        grimoireState._gameStatusTimer = setTimeout(() => { try { gameStatusEl.textContent = ''; } catch (_) { } }, 3000);
      }
      if (endGameBtn) endGameBtn.style.display = '';
      if (startGameBtn) startGameBtn.style.display = 'none';
      const openPlayerSetupBtn2 = document.getElementById('open-player-setup');
      if (openPlayerSetupBtn2) openPlayerSetupBtn2.style.display = 'none';
      grimoireState.gameStarted = true;
      try { updateBluffAttentionState({ grimoireState }); } catch (_) { }
      updatePreGameClass();
      try { saveAppState({ grimoireState }); } catch (_) { }

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
      if (endGameBtn) endGameBtn.style.display = 'none';
      applyModeUI();
      updateStartGameEnabled();
      try { updateBluffAttentionState({ grimoireState }); } catch (_) { }
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

    function updateStartGameEnabled() {
      if (!startGameBtn) return;
      const players = grimoireState.players || [];
      const hasPlayers = players.length >= 5;
      startGameBtn.disabled = !!grimoireState.winner || !hasPlayers;
    }

    function updateButtonStates() {
      const openPlayerSetupBtn = document.getElementById('open-player-setup');
      const startGameBtn = document.getElementById('start-game');

      if (openPlayerSetupBtn) {
        const sel = grimoireState.playerSetup || {};
        const selectionComplete = !!sel.selectionComplete;
        openPlayerSetupBtn.disabled = !!grimoireState.winner || selectionComplete;
        if (grimoireState.winner) {
          openPlayerSetupBtn.title = 'Reset grimoire to configure a new game';
        } else if (selectionComplete) {
          openPlayerSetupBtn.title = 'Setup complete. Reset the grimoire to start a new setup.';
        } else {
          openPlayerSetupBtn.title = '';
        }
      }

      if (startGameBtn) {
        updateStartGameEnabled();
        if (grimoireState.winner) {
          startGameBtn.title = 'Reset grimoire to start a new game';
        } else {
          startGameBtn.title = '';
        }
      }

      const modeStorytellerRadio = document.getElementById('mode-storyteller');
      const modePlayerRadio = document.getElementById('mode-player');
      if (modeStorytellerRadio) modeStorytellerRadio.disabled = false;
      if (modePlayerRadio) modePlayerRadio.disabled = false;

      updatePreGameClass();
      try { updatePreGameOverlayMessage(); } catch (_) { }
    }

    updateStartGameEnabled();
    updateButtonStates();
    updatePreGameClass();

    const observer = new MutationObserver(() => {
      updateStartGameEnabled();
      updateButtonStates();
    });
    const playerCircle = document.getElementById('player-circle');
    if (playerCircle) observer.observe(playerCircle, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });

    const originalUpdateGrimoire = updateGrimoire;
    if (typeof originalUpdateGrimoire === 'function') {
      (window)._updateGrimoireWrapped = true;
    }

    saveReminderBtn.onclick = () => {
      if (!ensureGrimoireUnlocked({ grimoireState })) return;
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

    characterSearch.oninput = () => populateCharacterGrid({ grimoireState });
    if (reminderTokenSearch) {
      reminderTokenSearch.oninput = () => populateReminderTokenGrid({ grimoireState });
    }

    // Close modals by tapping outside content
    const supportsPointerDismiss = 'PointerEvent' in window;
    let pendingBackdropPointerId = null;

    const clearBackdropPointer = () => { pendingBackdropPointerId = null; };
    const dismissCharacterModalFromBackdrop = () => {
      hideCharacterModal({ grimoireState, clearBluffSelection: true });
    };

    characterModal.addEventListener('botc:character-modal-hidden', clearBackdropPointer);

    if (supportsPointerDismiss) {
      characterModal.addEventListener('pointerdown', (e) => {
        if (e.target === characterModal) {
          pendingBackdropPointerId = e.pointerId;
        } else {
          clearBackdropPointer();
        }
      });

      characterModal.addEventListener('pointerup', (e) => {
        if (pendingBackdropPointerId === e.pointerId && e.target === characterModal) {
          dismissCharacterModalFromBackdrop();
        }
        if (pendingBackdropPointerId === e.pointerId) {
          clearBackdropPointer();
        }
      });

      characterModal.addEventListener('pointercancel', (e) => {
        if (e.target === characterModal) {
          clearBackdropPointer();
        }
      });

      characterModal.addEventListener('pointerleave', (e) => {
        if (e.target === characterModal && pendingBackdropPointerId === e.pointerId) {
          clearBackdropPointer();
        }
      });

      characterModal.addEventListener('click', (e) => {
        if (e.target === characterModal) {
          e.stopPropagation();
          e.preventDefault();
        }
      });
    } else {
      characterModal.addEventListener('click', (e) => {
        if (e.target === characterModal) {
          dismissCharacterModalFromBackdrop();
        }
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
        if (grimoireState.players.length > 0) {
          console.log('Container resized, repositioning players...');
          requestAnimationFrame(() => repositionPlayers({ grimoireState }));
        }
      });

      const playerCircle = document.getElementById('player-circle');
      if (playerCircle) {
        resizeObserver.observe(playerCircle);
      }
    } else {
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

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && grimoireState.players.length > 0) {
        requestAnimationFrame(() => repositionPlayers({ grimoireState }));
      }
    });

    function autoLoadTokens() {
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        console.log('Service worker ready');
      } else {
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          console.log('Service worker controller changed');
        });

        const fallbackTimer = setTimeout(() => {
          if (!navigator.serviceWorker.controller) {
            console.log('Service worker not ready');
          }
        }, 2000);

        navigator.serviceWorker.addEventListener('controllerchange', () => {
          clearTimeout(fallbackTimer);
        });
      }
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', autoLoadTokens);
    } else {
      autoLoadTokens();
    }

    initSidebarResize(sidebarResizer, sidebarEl);

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

    (function initCharacterPanelToggle() {
      if (!characterPanel || !characterPanelToggleBtn) return;
      const PANEL_KEY = 'characterPanelOpen';
      const applyState = (open) => {
        characterPanel.setAttribute('aria-hidden', String(!open));
        document.body.classList.toggle('character-panel-open', open);
        characterPanelToggleBtn.setAttribute('aria-pressed', String(open));
        characterPanelToggleBtn.textContent = 'Script';
        try { localStorage.setItem(PANEL_KEY, open ? '1' : '0'); } catch (_) { }
        try { applySidebarToggleVisibilityForPanel(); } catch (_) { }
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
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && document.body.classList.contains('character-panel-open')) applyState(false);
      });
      const mq = window.matchMedia('(max-width: 900px)');
      const handleMq = () => {
        if (mq.matches) {
          if (!document.body.classList.contains('character-panel-open')) applyState(false);
        }
      };
      mq.addEventListener('change', handleMq);
      handleMq();
    })();

    loadHistories();
    renderScriptHistory({ scriptHistoryList });
    renderGrimoireHistory({ grimoireHistoryList });

    initExportImport();

    initDayNightTracking(grimoireState);

    await loadAppState({ grimoireState, grimoireHistoryList });
    const hasPlayers = Array.isArray(grimoireState.players) && grimoireState.players.length > 0;
    if (!hasPlayers && playerCountInput) {
      if (!playerCountInput.value) {
        playerCountInput.value = '5';
      }
      resetGrimoire({ grimoireState, grimoireHistoryList, playerCountInput });
    }
    applyModeUI();
    applyGrimoireHiddenUI();
    applyGrimoireLockedState({ grimoireState });
    updateGrimoireControlButtons();
    try {
      updatePreGameClass();
      if (window.updatePreGameOverlayMessage) window.updatePreGameOverlayMessage();
      // If a game was in progress, ensure Start/End button visibility matches
      const startBtn = document.getElementById('start-game');
      const endBtn = document.getElementById('end-game');
      const openSetupBtn = document.getElementById('open-player-setup');
      if (grimoireState.gameStarted) {
        if (endBtn) endBtn.style.display = '';
        if (startBtn) startBtn.style.display = 'none';
        if (openSetupBtn) openSetupBtn.style.display = 'none';
      }
      // Restore any in-progress number selection session (pre-game privacy flow)
      try { restoreSelectionSession({ grimoireState }); } catch (_) { }
    } catch (_) { }

    initInAppTour();
    initStorytellerMessages({ grimoireState });
    setupModalCloseHandlers({ grimoireState });

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

    return { grimoireState };
  };

  let bootstrapResult;
  try {
    bootstrapResult = await bootstrap();
  } catch (error) {
    console.error('Failed to initialize grimoire:', error);
  }

  try {
    await windowLoadPromise;
  } catch (_) { /* ignore */ }

  try {
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }
  } catch (_) { /* ignore */ }

  try {
    await new Promise((resolve) => {
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(() => resolve());
      } else {
        setTimeout(resolve, 0);
      }
    });
    const urls = collectVisibleAssetUrls({ grimoireState: bootstrapResult?.grimoireState });
    await waitForImageUrls(urls, 15000);
  } catch (_) { /* ignore */ }

  clearTimeout(overlayFailSafe);
  hideOverlayOnNextFrame();
});
