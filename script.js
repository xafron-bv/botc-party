import { INCLUDE_TRAVELLERS_KEY, isTouchDevice, MODE_STORAGE_KEY } from './src/constants.js';
import './pwa.js';
import { loadAppState, saveAppState } from './src/app.js';
import { loadAllCharacters, onIncludeTravellersChange, populateCharacterGrid } from './src/character.js';
import { createCurvedLabelSvg } from './src/ui/svg.js';
import { handleGrimoireBackgroundChange, initGrimoireBackground, loadPlayerSetupTable, renderSetupInfo, resetGrimoire, updateGrimoire, toggleGrimoireHidden, applyGrimoireHiddenState, showGrimoire, hideGrimoire } from './src/grimoire.js';
import { addGrimoireHistoryListListeners, renderGrimoireHistory } from './src/history/grimoire.js';
import { loadHistories } from './src/history/index.js';
import { addScriptHistoryListListeners, renderScriptHistory } from './src/history/script.js';
import { initExportImport } from './src/history/exportImport.js';
import { repositionPlayers } from './src/ui/layout.js';
import { displayScript, loadScriptFile, loadScriptFromFile } from './src/script.js';
import { initSidebarResize, initSidebarToggle } from './src/ui/sidebar.js';
import { initInAppTour } from './src/ui/tour.js';
import { populateReminderTokenGrid } from './src/reminder.js';
import { initPlayerSetup } from './src/playerSetup.js';
import { initDayNightTracking, generateReminderId, addReminderTimestamp } from './src/dayNightTracking.js';

document.addEventListener('DOMContentLoaded', async () => {
  const resetGrimoireBtn = document.getElementById('reset-grimoire');
  const assignAndStartBtn = document.getElementById('assign-and-start');
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
  const revealToggleBtn = document.getElementById('reveal-assignments');
  const openStorytellerMessageBtn = document.getElementById('open-storyteller-message');
  const storytellerMessageModal = document.getElementById('storyteller-message-modal');
  const closeStorytellerMessageBtn = document.getElementById('close-storyteller-message');
  const storytellerMessageEdit = document.getElementById('storyteller-message-edit');
  const closeStorytellerMessageEditBtn = document.getElementById('close-storyteller-message-edit');
  const storytellerMessagePicker = document.getElementById('storyteller-message-picker');
  const storytellerMessageInput = document.getElementById('storyteller-message-input');
  const showStorytellerMessageBtn = document.getElementById('show-storyteller-message');
  const toggleBluffsViewBtn = document.getElementById('toggle-bluffs-view');

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
    grimoireHidden: false
  };

  // Player setup state
  grimoireState.playerSetup = grimoireState.playerSetup || { bag: [], assignments: [], revealed: false };

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
    const openPlayerSetupBtn2 = document.getElementById('open-player-setup');
    if (openPlayerSetupBtn2) openPlayerSetupBtn2.style.display = isPlayer ? 'none' : '';
    if (assignAndStartBtn) assignAndStartBtn.style.display = isPlayer ? 'none' : '';
    if (openStorytellerMessageBtn) openStorytellerMessageBtn.style.display = isPlayer ? 'none' : '';
    if (isPlayer && grimoireState.dayNightTracking) {
      grimoireState.dayNightTracking.enabled = false;
    }
  };
  // Hide/Show grimoire toggle (re-uses reveal button location)
  function applyGrimoireHiddenUI() { applyGrimoireHiddenState({ grimoireState }); }

  // Apply bag assignments to players (used when revealing)
  function applyAssignmentsFromBag() {
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
      grimoireState.mode = (val === 'player') ? 'player' : 'storyteller';
      applyModeUI();
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

  if (resetGrimoireBtn) resetGrimoireBtn.addEventListener('click', () => resetGrimoire({ grimoireState, grimoireHistoryList, playerCountInput }));
  if (assignAndStartBtn) assignAndStartBtn.addEventListener('click', () => {
    // Only act if selection is complete
    const sel = grimoireState.playerSetup;
    const n = (grimoireState.players || []).length;
    const picked = Array.isArray(sel && sel.assignments) ? sel.assignments.filter((v) => v !== null && v !== undefined).length : 0;
    if (!sel || picked !== n) return;
    // Apply and reveal
    const assignments = sel.assignments || [];
    const bag = sel.bag || [];
    assignments.forEach((bagIdx, idx) => {
      const roleId = bagIdx !== null && bagIdx !== undefined ? bag[bagIdx] : null;
      if (roleId && grimoireState.players[idx]) grimoireState.players[idx].character = roleId;
    });
    try { document.querySelectorAll('#player-circle li .number-overlay, #player-circle li .number-badge').forEach((el) => el.remove()); } catch (_) { }
    sel.selectionActive = false;
    showGrimoire({ grimoireState });
    // Forget previously selected numbers after starting game
    if (grimoireState.playerSetup) {
      grimoireState.playerSetup.assignments = new Array(grimoireState.players.length).fill(null);
      grimoireState.playerSetup.revealed = true;
    }
  });

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
        toggleBluffsViewBtn.style.display = (label === 'THESE CHARACTERS ARE NOT IN PLAY') ? '' : 'none';
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
    // Match message/reveal token size (2x standard)
    tokenEl.style.width = 'calc(var(--token-size) * 2)';
    tokenEl.style.height = 'calc(var(--token-size) * 2)';
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

  if (toggleBluffsViewBtn) {
    toggleBluffsViewBtn.addEventListener('click', () => {
      // Toggle between text and bluff view
      const bluffsDiv = messageDisplayModal.querySelector('.bluffs-container');
      const textDiv = messageDisplayModal.querySelector('.message-text');
      if (messageDisplayModal.style.display !== 'flex') {
        // ensure overlay visible
        showStorytellerOverlay('');
      }
      const showingBluffs = bluffsDiv.style.display !== 'none';
      if (showingBluffs) {
        bluffsDiv.style.display = 'none';
        textDiv.style.display = '';
        toggleBluffsViewBtn.textContent = 'Show bluffs';
      } else {
        // Render a copy of bluff tokens into the overlay (non-mutating to main grimoire)
        bluffsDiv.innerHTML = '';
        const currentBluffs = (grimoireState.bluffs || [null, null, null]).slice();
        currentBluffs.forEach((roleId, idx) => {
          const btn = document.createElement('button');
          btn.className = 'button';
          btn.textContent = roleId ? (grimoireState.allRoles[roleId]?.name || 'Unknown') : 'Select Bluff';
          btn.addEventListener('click', () => {
            // Open character modal for selecting a temporary bluff; do not mutate main grimoire
            const pick = prompt('Enter character id for temporary bluff:', roleId || '');
            if (pick) {
              currentBluffs[idx] = pick;
              btn.textContent = grimoireState.allRoles[pick]?.name || pick;
            }
          });
          bluffsDiv.appendChild(btn);
        });
        textDiv.style.display = 'none';
        bluffsDiv.style.display = 'flex';
        toggleBluffsViewBtn.textContent = 'Show message';
      }
    });
  }

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
