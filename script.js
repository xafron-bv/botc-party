import './pwa.js';
import { addGrimoireHistoryListListeners, renderGrimoireHistory } from "./ui/history/grimoire.js";
import { loadHistories } from './ui/history/index.js';
import { addScriptHistoryListListeners, addScriptToHistory, renderScriptHistory } from "./ui/history/script.js";
import { positionRadialStack as positionRadialStackLayout, repositionPlayers as repositionPlayersLayout } from './ui/layout.js';
import { initSidebarResize, initSidebarToggle } from './ui/sidebar.js';
import { createCurvedLabelSvg } from './ui/svg.js';
import { initInAppTour } from './ui/tour.js';
import { isExcludedScriptName, normalizeKey, resolveAssetPath } from './utils.js';
import { saveAppState, renderSetupInfo, loadAppState, startGame, updateGrimoire } from './ui/grimoire.js';
import { CLICK_EXPAND_SUPPRESS_MS, TOUCH_EXPAND_SUPPRESS_MS, isTouchDevice, INCLUDE_TRAVELLERS_KEY } from './constants.js';

document.addEventListener('DOMContentLoaded', () => {
  const startGameBtn = document.getElementById('start-game');
  const loadTbBtn = document.getElementById('load-tb');
  const loadBmrBtn = document.getElementById('load-bmr');
  const loadSavBtn = document.getElementById('load-sav');
  const loadAllCharsBtn = document.getElementById('load-all-chars');
  const scriptFileInput = document.getElementById('script-file');
  const playerCountInput = document.getElementById('player-count');
  const playerCircle = document.getElementById('player-circle');
  const characterSheet = document.getElementById('character-sheet');
  const loadStatus = document.getElementById('load-status');

  const characterModal = document.getElementById('character-modal');
  const closeCharacterModalBtn = document.getElementById('close-character-modal');
  const characterGrid = document.getElementById('character-grid');
  const characterSearch = document.getElementById('character-search');
  const characterModalPlayerName = document.getElementById('character-modal-player-name');

  const textReminderModal = document.getElementById('text-reminder-modal');
  const reminderTextInput = document.getElementById('reminder-text-input');
  const saveReminderBtn = document.getElementById('save-reminder-btn');
  const cancelReminderBtn = document.getElementById('cancel-reminder-btn');
  const sidebarResizer = document.getElementById('sidebar-resizer');

  // Ability tooltip elements
  const sidebarEl = document.getElementById('sidebar');
  const reminderTokenModal = document.getElementById('reminder-token-modal');
  const closeReminderTokenModalBtn = document.getElementById('close-reminder-token-modal');
  const reminderTokenGrid = document.getElementById('reminder-token-grid');
  const reminderTokenSearch = document.getElementById('reminder-token-search');
  const reminderTokenModalPlayerName = document.getElementById('reminder-token-modal-player-name');
  const sidebarToggleBtn = document.getElementById('sidebar-toggle');
  const sidebarCloseBtn = document.getElementById('sidebar-close');
  const sidebarBackdrop = document.getElementById('sidebar-backdrop');
  const scriptHistoryList = document.getElementById('script-history-list');
  const grimoireHistoryList = document.getElementById('grimoire-history-list');

  const backgroundSelect = document.getElementById('background-select');
  const centerEl = document.getElementById('center');
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

  const BG_STORAGE_KEY = 'grimoireBackgroundV1';
  function applyGrimoireBackground(value) {
    if (!centerEl) return;
    if (!value || value === 'none') {
      centerEl.style.backgroundImage = 'none';
    } else {
      const url = `./assets/img/${value}`;
      centerEl.style.backgroundImage = `url('${url}')`;
      centerEl.style.backgroundSize = 'cover';
      centerEl.style.backgroundPosition = 'center';
    }
  }

  // Initialize background from localStorage
  try {
    const savedBg = localStorage.getItem(BG_STORAGE_KEY) || 'background4-C7TzDZ7M.webp';
    applyGrimoireBackground(savedBg);
    if (backgroundSelect) backgroundSelect.value = savedBg === 'none' ? 'none' : savedBg;
  } catch (_) { }

  if (backgroundSelect) {
    backgroundSelect.addEventListener('change', () => {
      const val = backgroundSelect.value;
      applyGrimoireBackground(val);
      try { localStorage.setItem(BG_STORAGE_KEY, val); } catch (_) { }
    });
  }

  // Initialize travellers toggle from localStorage
  try {
    grimoireState.includeTravellers = (localStorage.getItem(INCLUDE_TRAVELLERS_KEY) === '1');
  } catch (_) { grimoireState.includeTravellers = false; }
  if (includeTravellersCheckbox) {
    includeTravellersCheckbox.checked = grimoireState.includeTravellers;
    includeTravellersCheckbox.addEventListener('change', () => {
      grimoireState.includeTravellers = !!includeTravellersCheckbox.checked;
      applyTravellerToggleAndRefresh();
      saveAppState({ grimoireState });
    });
  }

  // Build player circle UI from current players WITHOUT snapshotting or resetting players
  function rebuildPlayerCircleUiPreserveState() {
    const playerCircle = document.getElementById('player-circle');
    if (!playerCircle) return;
    playerCircle.innerHTML = '';
    // Keep sidebar input in sync with current number of players
    if (playerCountInput) {
      try { playerCountInput.value = String(grimoireState.players.length); } catch (_) { }
    }
    grimoireState.players.forEach((player, i) => {
      const listItem = document.createElement('li');
      listItem.innerHTML = `
          <div class="reminders"></div>
          <div class="player-token" title="Assign character"></div>
           <div class="character-name" aria-live="polite"></div>
          <div class="player-name" title="Edit name">${player.name}</div>
          <div class="reminder-placeholder" title="Add text reminder">+</div>
      `;
      playerCircle.appendChild(listItem);

      // Open character modal on token click (unless clicking ribbon/info icon)
      listItem.querySelector('.player-token').onclick = (e) => {
        const target = e.target;
        if (target && (target.closest('.death-ribbon') || target.classList.contains('death-ribbon'))) {
          return;
        }
        if (target && target.classList.contains('ability-info-icon')) {
          return;
        }
        openCharacterModal(i);
      };
      listItem.querySelector('.player-name').onclick = (e) => {
        e.stopPropagation();
        const newName = prompt("Enter player name:", player.name);
        if (newName) {
          grimoireState.players[i].name = newName;
          updateGrimoire({ grimoireState });
          saveAppState({ grimoireState });
        }
      };
      listItem.querySelector('.reminder-placeholder').onclick = (e) => {
        e.stopPropagation();
        const thisLi = listItem;
        // If another player's stack is expanded and this one is collapsed, first expand this one
        if (thisLi.dataset.expanded !== '1') {
          const allLis = document.querySelectorAll('#player-circle li');
          let someoneExpanded = false;
          allLis.forEach(el => {
            if (el !== thisLi && el.dataset.expanded === '1') {
              someoneExpanded = true;
              el.dataset.expanded = '0';
              const idx = Array.from(allLis).indexOf(el);
              positionRadialStack(el, (grimoireState.players[idx]?.reminders || []).length);
            }
          });
          if (someoneExpanded) {
            thisLi.dataset.expanded = '1';
            thisLi.dataset.actionSuppressUntil = String(Date.now() + CLICK_EXPAND_SUPPRESS_MS);
            positionRadialStack(thisLi, grimoireState.players[i].reminders.length);
            return;
          }
        }
        if (isTouchDevice) {
          openReminderTokenModal(i);
        } else if (e.altKey) {
          openTextReminderModal(i);
        } else {
          openReminderTokenModal(i);
        }
      };

      // Hover expand/collapse for reminder stack positioning
      listItem.dataset.expanded = '0';
      const expand = () => {
        const wasExpanded = listItem.dataset.expanded === '1';
        const allLis = document.querySelectorAll('#player-circle li');
        allLis.forEach(el => {
          if (el !== listItem && el.dataset.expanded === '1') {
            el.dataset.expanded = '0';
            const idx = Array.from(allLis).indexOf(el);
            positionRadialStack(el, (grimoireState.players[idx]?.reminders || []).length);
          }
        });
        listItem.dataset.expanded = '1';
        if (isTouchDevice && !wasExpanded) {
          listItem.dataset.actionSuppressUntil = String(Date.now() + CLICK_EXPAND_SUPPRESS_MS);
        }
        positionRadialStack(listItem, grimoireState.players[i].reminders.length);
      };
      const collapse = () => { listItem.dataset.expanded = '0'; positionRadialStack(listItem, grimoireState.players[i].reminders.length); };
      if (!isTouchDevice) {
        listItem.addEventListener('mouseenter', expand);
        listItem.addEventListener('mouseleave', collapse);
        listItem.addEventListener('pointerenter', expand);
        listItem.addEventListener('pointerleave', collapse);
      }
      listItem.addEventListener('touchstart', (e) => {
        const target = e.target;
        const tappedReminders = !!(target && target.closest('.reminders'));
        if (tappedReminders) {
          try { e.preventDefault(); } catch (_) { }
          listItem.dataset.touchSuppressUntil = String(Date.now() + TOUCH_EXPAND_SUPPRESS_MS);
        }
        expand();
        positionRadialStack(listItem, grimoireState.players[i].reminders.length);
      }, { passive: false });

      // Player context menu: right-click
      listItem.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        showPlayerContextMenu(e.clientX, e.clientY, i);
      });
      // Long-press on token to open context menu on touch devices
      const tokenEl = listItem.querySelector('.player-token');
      tokenEl.addEventListener('pointerdown', (e) => {
        if (!isTouchDevice) return;
        try { e.preventDefault(); } catch (_) { }
        clearTimeout(grimoireState.longPressTimer);
        const x = (e && (e.clientX || (e.touches && e.touches[0] && e.touches[0].clientX))) || 0;
        const y = (e && (e.clientY || (e.touches && e.touches[0] && e.touches[0].clientY))) || 0;
        grimoireState.longPressTimer = setTimeout(() => {
          showPlayerContextMenu(x, y, i);
        }, 600);
      });
      ['pointerup', 'pointercancel', 'pointerleave'].forEach(evt => {
        tokenEl.addEventListener(evt, () => { clearTimeout(grimoireState.longPressTimer); });
      });

      // Install one-time outside collapse handler for touch devices
      if (isTouchDevice && !grimoireState.outsideCollapseHandlerInstalled) {
        grimoireState.outsideCollapseHandlerInstalled = true;
        const maybeCollapseOnOutside = (ev) => {
          const target = ev.target;
          // If the tap/click is anywhere inside the player circle, do not auto-collapse here.
          // This allows reminder + gating to expand the tapped stack first.
          const playerCircleEl = document.getElementById('player-circle');
          if (playerCircleEl && playerCircleEl.contains(target)) return;
          const allLis = document.querySelectorAll('#player-circle li');
          let clickedInsideExpanded = false;
          allLis.forEach(el => {
            if (el.dataset.expanded === '1' && el.contains(target)) {
              clickedInsideExpanded = true;
            }
          });
          if (clickedInsideExpanded) return;
          allLis.forEach(el => {
            if (el.dataset.expanded === '1') {
              el.dataset.expanded = '0';
              positionRadialStack(el, (grimoireState.players[Array.from(allLis).indexOf(el)]?.reminders || []).length);
            }
          });
        };
        document.addEventListener('click', maybeCollapseOnOutside, true);
        document.addEventListener('touchstart', maybeCollapseOnOutside, { passive: true, capture: true });
      }
    });
    // Apply layout and state immediately for deterministic testing and UX
    repositionPlayers(grimoireState.players);
    updateGrimoire({ grimoireState });
    saveAppState({ grimoireState });
    renderSetupInfo({ grimoireState });
    // Also after paint to ensure positions stabilize
    requestAnimationFrame(() => {
      repositionPlayers(grimoireState.players);
      updateGrimoire({ grimoireState });
    });
  }

  function ensurePlayerContextMenu() {
    if (grimoireState.playerContextMenu) return grimoireState.playerContextMenu;
    const menu = document.createElement('div');
    menu.id = 'player-context-menu';
    const addBeforeBtn = document.createElement('button');
    addBeforeBtn.id = 'player-menu-add-before';
    addBeforeBtn.textContent = 'Add Player Before';
    const addAfterBtn = document.createElement('button');
    addAfterBtn.id = 'player-menu-add-after';
    addAfterBtn.textContent = 'Add Player After';
    const removeBtn = document.createElement('button');
    removeBtn.id = 'player-menu-remove';
    removeBtn.textContent = 'Remove Player';

    addBeforeBtn.addEventListener('click', () => {
      const idx = grimoireState.contextMenuTargetIndex;
      hidePlayerContextMenu();
      if (idx < 0) return;
      if (grimoireState.players.length >= 20) return; // clamp to max
      const newName = `Player ${grimoireState.players.length + 1}`;
      const newPlayer = { name: newName, character: null, reminders: [], dead: false };
      grimoireState.players.splice(idx, 0, newPlayer);
      rebuildPlayerCircleUiPreserveState();
    });
    addAfterBtn.addEventListener('click', () => {
      const idx = grimoireState.contextMenuTargetIndex;
      hidePlayerContextMenu();
      if (idx < 0) return;
      if (grimoireState.players.length >= 20) return; // clamp to max
      const newName = `Player ${grimoireState.players.length + 1}`;
      const newPlayer = { name: newName, character: null, reminders: [], dead: false };
      grimoireState.players.splice(idx + 1, 0, newPlayer);
      rebuildPlayerCircleUiPreserveState();
    });
    removeBtn.addEventListener('click', () => {
      const idx = grimoireState.contextMenuTargetIndex;
      hidePlayerContextMenu();
      if (idx < 0) return;
      if (grimoireState.players.length <= 5) return; // keep within 5..20
      grimoireState.players.splice(idx, 1);
      rebuildPlayerCircleUiPreserveState();
    });

    menu.appendChild(addBeforeBtn);
    menu.appendChild(addAfterBtn);
    menu.appendChild(removeBtn);
    document.body.appendChild(menu);

    // Hide menu when clicking elsewhere or pressing Escape
    document.addEventListener('click', (e) => {
      if (!menu.contains(e.target)) hidePlayerContextMenu();
    }, true);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') hidePlayerContextMenu();
    });
    grimoireState.playerContextMenu = menu;
    return menu;
  }

  function showPlayerContextMenu(x, y, playerIndex) {
    const menu = ensurePlayerContextMenu();
    grimoireState.contextMenuTargetIndex = playerIndex;
    // Enable/disable buttons based on limits
    const canAdd = grimoireState.players.length < 20;
    const canRemove = grimoireState.players.length > 5;
    const addBeforeBtn = menu.querySelector('#player-menu-add-before');
    const addAfterBtn = menu.querySelector('#player-menu-add-after');
    const removeBtn = menu.querySelector('#player-menu-remove');
    [addBeforeBtn, addAfterBtn, removeBtn].forEach(btn => {
      btn.disabled = false;
      btn.classList.remove('disabled');
    });
    if (!canAdd) { addBeforeBtn.disabled = true; addAfterBtn.disabled = true; addBeforeBtn.classList.add('disabled'); addAfterBtn.classList.add('disabled'); }
    if (!canRemove) { removeBtn.disabled = true; removeBtn.classList.add('disabled'); }
    menu.style.display = 'block';
    // Position within viewport bounds
    const margin = 6;
    requestAnimationFrame(() => {
      const rect = menu.getBoundingClientRect();
      let left = x;
      let top = y;
      if (left + rect.width > window.innerWidth - margin) left = Math.max(margin, window.innerWidth - rect.width - margin);
      if (top + rect.height > window.innerHeight - margin) top = Math.max(margin, window.innerHeight - rect.height - margin);
      menu.style.left = `${left}px`;
      menu.style.top = `${top}px`;
    });
  }

  function ensureReminderContextMenu() {
    if (grimoireState.reminderContextMenu) return grimoireState.reminderContextMenu;
    const menu = document.createElement('div');
    menu.id = 'reminder-context-menu';
    const editBtn = document.createElement('button');
    editBtn.id = 'reminder-menu-edit';
    editBtn.textContent = 'Edit Reminder';
    const deleteBtn = document.createElement('button');
    deleteBtn.id = 'reminder-menu-delete';
    deleteBtn.textContent = 'Delete Reminder';

    editBtn.addEventListener('click', () => {
      const { playerIndex, reminderIndex } = grimoireState.reminderContextTarget;
      hideReminderContextMenu();
      if (playerIndex < 0 || reminderIndex < 0) return;
      const rem = (grimoireState.players[playerIndex] && grimoireState.players[playerIndex].reminders && grimoireState.players[playerIndex].reminders[reminderIndex]) || null;
      if (!rem) return;
      const current = rem.label || rem.value || '';
      const next = prompt('Edit reminder', current);
      if (next !== null) {
        if (rem.type === 'icon') {
          rem.label = next;
        } else {
          // Text reminder
          rem.value = next;
          if (rem.label !== undefined) rem.label = next;
        }
        updateGrimoire({ grimoireState });
        saveAppState({ grimoireState });
      }
    });

    deleteBtn.addEventListener('click', () => {
      const { playerIndex, reminderIndex } = grimoireState.reminderContextTarget;
      hideReminderContextMenu();
      if (playerIndex < 0 || reminderIndex < 0) return;
      if (!grimoireState.players[playerIndex] || !grimoireState.players[playerIndex].reminders) return;
      grimoireState.players[playerIndex].reminders.splice(reminderIndex, 1);
      updateGrimoire({ grimoireState });
      saveAppState({ grimoireState });
    });

    menu.appendChild(editBtn);
    menu.appendChild(deleteBtn);
    document.body.appendChild(menu);

    // Hide on outside click or Escape
    document.addEventListener('click', (e) => {
      if (!menu.contains(e.target)) hideReminderContextMenu();
    }, true);
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') hideReminderContextMenu();
    });

    grimoireState.reminderContextMenu = menu;
    return menu;
  }

  function showReminderContextMenu(x, y, playerIndex, reminderIndex) {
    const menu = ensureReminderContextMenu();
    grimoireState.reminderContextTarget = { playerIndex, reminderIndex };
    menu.style.display = 'block';
    const margin = 6;
    requestAnimationFrame(() => {
      const rect = menu.getBoundingClientRect();
      let left = x;
      let top = y;
      if (left + rect.width > window.innerWidth - margin) left = Math.max(margin, window.innerWidth - rect.width - margin);
      if (top + rect.height > window.innerHeight - margin) top = Math.max(margin, window.innerHeight - rect.height - margin);
      menu.style.left = `${left}px`;
      menu.style.top = `${top}px`;
    });
  }

  function hideReminderContextMenu() {
    if (grimoireState.reminderContextMenu) grimoireState.reminderContextMenu.style.display = 'none';
    grimoireState.reminderContextTarget = { playerIndex: -1, reminderIndex: -1 };
    clearTimeout(grimoireState.longPressTimer);
  }

  function hidePlayerContextMenu() {
    if (grimoireState.playerContextMenu) grimoireState.playerContextMenu.style.display = 'none';
    grimoireState.contextMenuTargetIndex = -1;
    clearTimeout(grimoireState.longPressTimer);
  }

  // Event delegation for history lists
  if (scriptHistoryList) {
    addScriptHistoryListListeners({ scriptHistoryList, processScriptData, displayScript });
  }

  if (grimoireHistoryList) {
    addGrimoireHistoryListListeners({ grimoireHistoryList, grimoireState, openCharacterModal, showPlayerContextMenu, openReminderTokenModal, openTextReminderModal, processScriptData, repositionPlayers });
  }

  async function loadAllCharacters() {
    try {
      loadStatus.textContent = 'Loading all characters...';
      loadStatus.className = 'status';

      // Load characters.json directly
      const response = await fetch('./characters.json');
      if (!response.ok) {
        throw new Error(`Failed to load characters.json: ${response.status}`);
      }

      const characters = await response.json();
      console.log('Loading all characters from characters.json');

      // Reset role maps
      grimoireState.allRoles = {};
      grimoireState.baseRoles = {};
      grimoireState.extraTravellerRoles = {};
      const roleLookup = {};

      // Process flat characters array (includes townsfolk, outsider, minion, demon, traveller, fabled)
      let characterIds = [];
      if (Array.isArray(characters)) {
        characters.forEach(role => {
          if (!role || !role.id) return;
          const image = resolveAssetPath(role.image);
          const teamName = (role.team || '').toLowerCase();
          const canonical = { ...role, image, team: teamName };
          roleLookup[role.id] = canonical;
          if (teamName === 'traveller') {
            grimoireState.extraTravellerRoles[role.id] = canonical;
          } else {
            grimoireState.baseRoles[role.id] = canonical;
          }
          characterIds.push(role.id);
        });
      }

      console.log(`Loaded ${Object.keys(grimoireState.allRoles).length} characters from all teams`);

      // Create a pseudo-script data array with all character IDs
      grimoireState.scriptData = [{ id: '_meta', name: 'All Characters', author: 'System' }, ...characterIds];
      // Apply traveller toggle to compute allRoles and render
      applyTravellerToggleAndRefresh();
      saveAppState({ grimoireState });

      loadStatus.textContent = `Loaded ${Object.keys(grimoireState.allRoles).length} characters successfully`;
      loadStatus.className = 'status';

    } catch (error) {
      console.error('Failed to load all characters:', error);
      loadStatus.textContent = `Failed to load all characters: ${error.message}`;
      loadStatus.className = 'error';
    }
  }

  async function loadScriptFromFile(path) {
    try {
      loadStatus.textContent = `Loading script from ${path}...`;
      loadStatus.className = 'status';
      // Pre-set a best-effort name from the filename so UI updates immediately
      try {
        const match = String(path).match(/([^/]+)\.json$/i);
        if (match) {
          const base = match[1].replace(/\s*&\s*/g, ' & ');
          grimoireState.scriptMetaName = base;
          renderSetupInfo({ grimoireState });
        }
      } catch (_) { }
      const res = await fetch(path, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      await processScriptData(json, true);
      loadStatus.textContent = 'Script loaded successfully!';
      loadStatus.className = 'status';
    } catch (e) {
      console.error('Failed to load script:', e);
      loadStatus.textContent = `Failed to load ${path}: ${e.message}`;
      loadStatus.className = 'error';
    }
  }
  loadTbBtn && loadTbBtn.addEventListener('click', () => { grimoireState.scriptMetaName = 'Trouble Brewing'; renderSetupInfo({ grimoireState }); loadScriptFromFile('./Trouble Brewing.json'); });
  loadBmrBtn && loadBmrBtn.addEventListener('click', () => { grimoireState.scriptMetaName = 'Bad Moon Rising'; renderSetupInfo({ grimoireState }); loadScriptFromFile('./Bad Moon Rising.json'); });
  loadSavBtn && loadSavBtn.addEventListener('click', () => { grimoireState.scriptMetaName = 'Sects & Violets'; renderSetupInfo({ grimoireState }); loadScriptFromFile('./Sects and Violets.json'); });
  loadAllCharsBtn && loadAllCharsBtn.addEventListener('click', () => { grimoireState.scriptMetaName = 'All Characters'; renderSetupInfo({ grimoireState }); loadAllCharacters(); });

  scriptFileInput.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    console.log('File selected:', file.name, 'Size:', file.size);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        console.log('Parsing uploaded file...');
        const json = JSON.parse(e.target.result);
        console.log('Uploaded script parsed successfully:', json);

        await processScriptData(json, true);
        loadStatus.textContent = 'Custom script loaded successfully!';
        loadStatus.className = 'status';
      } catch (error) {
        console.error('Error parsing uploaded file:', error);
        loadStatus.textContent = `Invalid JSON file: ${error.message}`;
        loadStatus.className = 'error';
      }
    };

    reader.onerror = (error) => {
      console.error('File reading error:', error);
      loadStatus.textContent = 'Error reading file';
      loadStatus.className = 'error';
    };

    reader.readAsText(file);
  });

  // Load player setup JSON once
  (async function loadPlayerSetupTable() {
    try {
      const res = await fetch('./player-setup.json', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      grimoireState.playerSetupTable = Array.isArray(data.player_setup) ? data.player_setup : [];
      renderSetupInfo({ grimoireState });
    } catch (e) {
      console.error('Failed to load player-setup.json', e);
    }
  })();

  async function processScriptData(data, addToHistory = false) {
    console.log('Processing script data:', data);
    grimoireState.scriptData = data;
    grimoireState.allRoles = {};
    grimoireState.baseRoles = {};
    grimoireState.extraTravellerRoles = {};
    // Extract metadata name if present
    try {
      const meta = Array.isArray(data) ? data.find(x => x && typeof x === 'object' && x.id === '_meta') : null;
      grimoireState.scriptMetaName = meta && meta.name ? String(meta.name) : '';
    } catch (_) { grimoireState.scriptMetaName = ''; }

    if (Array.isArray(data)) {
      console.log('Processing script with', data.length, 'characters');
      await processScriptCharacters(data);
    } else {
      console.error('Unexpected script format:', typeof data);
      return;
    }

    console.log('Total roles processed:', Object.keys(grimoireState.allRoles).length);
    // After processing into baseRoles/extraTravellerRoles, apply toggle
    applyTravellerToggleAndRefresh();
    saveAppState({ grimoireState });
    renderSetupInfo({ grimoireState });
    if (addToHistory) {
      const histName = grimoireState.scriptMetaName || (Array.isArray(data) && (data.find(x => x && typeof x === 'object' && x.id === '_meta')?.name || 'Custom Script')) || 'Custom Script';
      if (!isExcludedScriptName(histName)) {
        addScriptToHistory({ name: histName, data, scriptHistoryList });
      }
    }
  }

  async function processScriptCharacters(characterIds) {
    try {
      console.log('Loading characters.json to resolve character IDs...');
      const response = await fetch('./characters.json');
      if (!response.ok) {
        throw new Error(`Failed to load characters.json: ${response.status}`);
      }

      const characters = await response.json();
      console.log('characters.json loaded successfully');

      // Create canonical lookups and a normalization index
      const roleLookup = {};
      const normalizedToCanonicalId = {};
      if (Array.isArray(characters)) {
        characters.forEach(role => {
          if (!role || !role.id) return;
          const image = resolveAssetPath(role.image);
          const canonical = { ...role, image, team: (role.team || '').toLowerCase() };
          roleLookup[role.id] = canonical;
          const normId = normalizeKey(role.id);
          const normName = normalizeKey(role.name);
          if (normId) normalizedToCanonicalId[normId] = role.id;
          if (normName) normalizedToCanonicalId[normName] = role.id;
        });
      }

      console.log('Role lookup created with', Object.keys(roleLookup).length, 'roles');

      // Pre-populate extraTravellerRoles with all traveller roles from the dataset
      Object.values(roleLookup).forEach(role => {
        if ((role.team || '').toLowerCase() === 'traveller') {
          grimoireState.extraTravellerRoles[role.id] = role;
        }
      });

      // Process the character IDs from the script using normalization
      characterIds.forEach((characterItem) => {
        if (typeof characterItem === 'string' && characterItem !== '_meta') {
          const key = normalizeKey(characterItem);
          const canonicalId = normalizedToCanonicalId[key];
          if (canonicalId && roleLookup[canonicalId]) {
            const role = roleLookup[canonicalId];
            if (role.team === 'traveller') {
              grimoireState.extraTravellerRoles[canonicalId] = role;
            } else {
              grimoireState.baseRoles[canonicalId] = role;
            }
            console.log(`Resolved character ${characterItem} -> ${canonicalId} (${roleLookup[canonicalId].name})`);
          } else {
            console.warn(`Character not found: ${characterItem}`);
          }
        } else if (typeof characterItem === 'object' && characterItem !== null && characterItem.id && characterItem.id !== '_meta') {
          const idKey = normalizeKey(characterItem.id);
          const nameKey = normalizeKey(characterItem.name || '');
          const canonicalId = normalizedToCanonicalId[idKey] || normalizedToCanonicalId[nameKey];
          if (canonicalId && roleLookup[canonicalId]) {
            const role = roleLookup[canonicalId];
            if (role.team === 'traveller') {
              grimoireState.extraTravellerRoles[canonicalId] = role;
            } else {
              grimoireState.baseRoles[canonicalId] = role;
            }
            console.log(`Resolved object character ${characterItem.id} -> ${canonicalId} (${roleLookup[canonicalId].name})`);
          } else if (characterItem.name && characterItem.team && characterItem.ability) {
            const customRole = {
              id: characterItem.id,
              name: characterItem.name,
              team: String(characterItem.team || '').toLowerCase(),
              ability: characterItem.ability,
              image: characterItem.image ? resolveAssetPath(characterItem.image) : './assets/img/token-BqDQdWeO.webp'
            };
            if (characterItem.reminders) customRole.reminders = characterItem.reminders;
            if (characterItem.remindersGlobal) customRole.remindersGlobal = characterItem.remindersGlobal;
            if (characterItem.setup !== undefined) customRole.setup = characterItem.setup;
            if (characterItem.jinxes) customRole.jinxes = characterItem.jinxes;
            if (customRole.team === 'traveller') {
              grimoireState.extraTravellerRoles[characterItem.id] = customRole;
            } else {
              grimoireState.baseRoles[characterItem.id] = customRole;
            }
            console.log(`Added custom character ${characterItem.id} (${characterItem.name})`);
          } else {
            console.warn(`Invalid custom character object:`, characterItem);
          }
        }
      });

      console.log('Script processing completed');

    } catch (error) {
      console.error('Error processing script:', error);
      characterIds.forEach((characterItem) => {
        if (typeof characterItem === 'string' && characterItem !== '_meta') {
          grimoireState.baseRoles[characterItem] = {
            id: characterItem,
            name: characterItem.charAt(0).toUpperCase() + characterItem.slice(1),
            image: './assets/img/token-BqDQdWeO.webp',
            team: 'unknown'
          };
        } else if (typeof characterItem === 'object' && characterItem !== null && characterItem.id && characterItem.id !== '_meta') {
          // Handle custom character objects even in error case
          if (characterItem.name && characterItem.team && characterItem.ability) {
            const customFallback = {
              id: characterItem.id,
              name: characterItem.name,
              team: String(characterItem.team || '').toLowerCase(),
              ability: characterItem.ability,
              image: characterItem.image ? resolveAssetPath(characterItem.image) : './assets/img/token-BqDQdWeO.webp'
            };
            if (customFallback.team === 'traveller') {
              grimoireState.extraTravellerRoles[characterItem.id] = customFallback;
            } else {
              grimoireState.baseRoles[characterItem.id] = customFallback;
            }
          }
        }
      });
    }
  }

  startGameBtn.addEventListener('click', () => startGame({ grimoireState, grimoireHistoryList, playerCountInput, openCharacterModal, showPlayerContextMenu, openReminderTokenModal, openTextReminderModal }));

  function repositionPlayers() { repositionPlayersLayout(grimoireState.players); }

  // Arrange reminders and plus button along the line from token center to circle center
  function positionRadialStack(li, count) { positionRadialStackLayout(li, count, grimoireState.players); }

  // ensureGuidesSvg and drawRadialGuides moved to ui/guides.js

  function openCharacterModal(playerIndex) {
    if (!grimoireState.scriptData) {
      alert("Please load a script first.");
      return;
    }
    grimoireState.selectedPlayerIndex = playerIndex;
    characterModalPlayerName.textContent = grimoireState.players[playerIndex].name;
    populateCharacterGrid();
    characterModal.style.display = 'flex';
    characterSearch.value = '';
    characterSearch.focus();
  }

  function populateCharacterGrid() {
    characterGrid.innerHTML = '';
    const filter = characterSearch.value.toLowerCase();

    const filteredRoles = Object.values(grimoireState.allRoles)
      .filter(role => role.name.toLowerCase().includes(filter));

    console.log(`Showing ${filteredRoles.length} characters for filter: "${filter}"`);

    filteredRoles.forEach(role => {
      const tokenEl = document.createElement('div');
      tokenEl.className = 'token';
      tokenEl.style.backgroundImage = `url('${role.image}'), url('./assets/img/token-BqDQdWeO.webp')`;
      tokenEl.style.backgroundSize = '68% 68%, cover';
      tokenEl.style.position = 'relative';
      tokenEl.style.overflow = 'visible';
      tokenEl.title = role.name;
      tokenEl.onclick = () => assignCharacter(role.id);
      // Add curved bottom text on the token preview
      const svg = createCurvedLabelSvg(`picker-role-arc-${role.id}`, role.name);
      tokenEl.appendChild(svg);
      characterGrid.appendChild(tokenEl);
    });
  }

  function assignCharacter(roleId) {
    if (grimoireState.selectedPlayerIndex > -1) {
      grimoireState.players[grimoireState.selectedPlayerIndex].character = roleId;
      console.log(`Assigned character ${roleId} to player ${grimoireState.selectedPlayerIndex}`);
      updateGrimoire({ grimoireState });
      characterModal.style.display = 'none';
      saveAppState({ grimoireState });
    }
  }

  function openTextReminderModal(playerIndex, reminderIndex = -1, existingText = '') {
    grimoireState.editingReminder = { playerIndex, reminderIndex };
    reminderTextInput.value = existingText;
    textReminderModal.style.display = 'flex';
    reminderTextInput.focus();
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
  characterSearch.oninput = populateCharacterGrid;
  closeReminderTokenModalBtn && (closeReminderTokenModalBtn.onclick = () => reminderTokenModal.style.display = 'none');
  reminderTokenSearch && (reminderTokenSearch.oninput = populateReminderTokenGrid);

  // Close modals by tapping outside content
  characterModal.addEventListener('click', (e) => { if (e.target === characterModal) characterModal.style.display = 'none'; });
  textReminderModal.addEventListener('click', (e) => { if (e.target === textReminderModal) textReminderModal.style.display = 'none'; });
  // For reminder token modal, also close if clicking outside the content container
  reminderTokenModal && reminderTokenModal.addEventListener('click', (e) => {
    if (e.target === reminderTokenModal) { reminderTokenModal.style.display = 'none'; return; }
    const content = reminderTokenModal.querySelector('.modal-content');
    if (content && !content.contains(e.target)) { reminderTokenModal.style.display = 'none'; }
  });

  function openReminderTokenModal(playerIndex) {
    grimoireState.selectedPlayerIndex = playerIndex;
    if (reminderTokenModalPlayerName) reminderTokenModalPlayerName.textContent = grimoireState.players[playerIndex].name;
    reminderTokenModal.style.display = 'flex';
    if (reminderTokenSearch) reminderTokenSearch.value = '';
    populateReminderTokenGrid();
  }

  async function populateReminderTokenGrid() {
    if (!reminderTokenGrid) return;
    reminderTokenGrid.innerHTML = '';
    try {
      const res = await fetch('./characters.json?v=reminders', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load characters.json');
      const json = await res.json();
      // Base: any tokens supplied by data file
      let reminderTokens = Array.isArray(json.reminderTokens) ? json.reminderTokens : [];
      // Build per-character reminders from the current script: use the character's icon and reminder text as label
      const scriptReminderTokens = [];
      try {
        Object.values(grimoireState.allRoles || {}).forEach(role => {
          const roleImage = resolveAssetPath(role.image);
          if (role && Array.isArray(role.reminders) && role.reminders.length) {
            role.reminders.forEach(rem => {
              const label = String(rem || '').trim();
              if (!label) return;
              const norm = label.toLowerCase().replace(/[^a-z0-9]+/g, '');
              const id = `${role.id}-${norm}`;
              scriptReminderTokens.push({ id, image: roleImage, label, characterName: role.name, characterId: role.id });
            });
          }
          if (role && Array.isArray(role.remindersGlobal) && role.remindersGlobal.length) {
            role.remindersGlobal.forEach(rem => {
              const label = String(rem || '').trim();
              if (!label) return;
              const norm = label.toLowerCase().replace(/[^a-z0-9]+/g, '');
              const id = `${role.id}-global-${norm}`;
              scriptReminderTokens.push({ id, image: roleImage, label, characterName: role.name, characterId: role.id });
            });
          }
        });
      } catch (_) { }
      // Always-available generic tokens
      const genericTokens = [
        { id: 'townsfolk-townsfolk', image: '/assets/reminders/good-D9wGdnv9.webp', label: 'Townsfolk' },
        { id: 'wrong-wrong', image: '/assets/reminders/evil-CDY3e2Qm.webp', label: 'Wrong' },
        { id: 'drunk-isthedrunk', image: '/assets/reminders/drunk_g--QNmv0ZY.webp', label: 'Is The Drunk' },
        { id: 'good-good', image: '/assets/reminders/good-D9wGdnv9.webp', label: 'Good' },
        { id: 'evil-evil', image: '/assets/reminders/evil-CDY3e2Qm.webp', label: 'Evil' },
        { id: 'custom-note', image: '/assets/reminders/custom-CLofFTEi.webp', label: 'Custom note' },
        { id: 'virgin-noability', image: '/assets/reminders/virgin_g-DfRSMLSj.webp', label: 'No Ability' }
      ];
      // Merge: generic + per-character + file-provided
      reminderTokens = [...genericTokens, ...scriptReminderTokens, ...reminderTokens];
      const filter = (reminderTokenSearch && reminderTokenSearch.value || '').toLowerCase();
      // Normalize image paths for gh-pages subpath
      reminderTokens = reminderTokens.map(t => ({ ...t, image: resolveAssetPath(t.image) }));
      // Put custom option at the top
      const isCustom = (t) => /custom/i.test(t.label || '') || /custom/i.test(t.id || '');
      reminderTokens.sort((a, b) => (isCustom(a) === isCustom(b)) ? 0 : (isCustom(a) ? -1 : 1));
      const filtered = reminderTokens.filter(t => {
        const combined = `${(t.label || '').toLowerCase()} ${(t.characterName || '').toLowerCase()}`.trim();
        if (!filter) return true;
        const terms = filter.split(/\s+/).filter(Boolean);
        return terms.every(term => combined.includes(term));
      });
      (filtered.length ? filtered : reminderTokens).forEach((token, idx) => {
        const tokenEl = document.createElement('div');
        tokenEl.className = 'token';
        tokenEl.style.backgroundImage = `url('${resolveAssetPath(token.image)}'), url('${resolveAssetPath('assets/img/token-BqDQdWeO.webp')}')`;
        tokenEl.style.backgroundSize = 'cover, cover';
        tokenEl.style.position = 'relative';
        tokenEl.style.overflow = 'visible';
        tokenEl.style.zIndex = '1';
        tokenEl.title = token.label || '';
        const handleSelect = (ev) => {
          try { ev.preventDefault(); } catch (_) { }
          ev.stopPropagation();
          let label = token.label;
          if ((label || '').toLowerCase().includes('custom')) {
            const input = prompt('Enter reminder text:', '');
            if (input === null) return;
            label = input;
          }
          grimoireState.players[grimoireState.selectedPlayerIndex].reminders.push({ type: 'icon', id: token.id, image: token.image, label, rotation: 0 });
          updateGrimoire({ grimoireState });
          saveAppState({ grimoireState });
          reminderTokenModal.style.display = 'none';
        };
        tokenEl.addEventListener('click', handleSelect);

        // Add curved bottom text to preview
        if (token.label) {
          const svg = createCurvedLabelSvg(`picker-arc-${idx}`, token.label);
          tokenEl.appendChild(svg);
        }
        reminderTokenGrid.appendChild(tokenEl);
      });
    } catch (e) {
      console.error(e);
      // As a last resort, show a simple message
      const msg = document.createElement('div');
      msg.style.color = '#ccc';
      msg.textContent = 'No reminder tokens available.';
      reminderTokenGrid.appendChild(msg);
    }
  }

  // Handle container resize to reposition players
  let resizeObserver;
  if ('ResizeObserver' in window) {
    resizeObserver = new ResizeObserver((entries) => {
      if (grimoireState.players.length > 0) {
        console.log('Container resized, repositioning players...');
        requestAnimationFrame(() => repositionPlayers(grimoireState.players));
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
          requestAnimationFrame(() => repositionPlayers(grimoireState.players));
        }
      }, 250);
    });
  }

  // Also reposition players when the page becomes visible (in case of tab switching)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && grimoireState.players.length > 0) {
      requestAnimationFrame(() => repositionPlayers(grimoireState.players));
    }
  });

  function displayScript(data) {
    console.log('Displaying script with', data.length, 'characters');
    characterSheet.innerHTML = '';

    // Group characters by team if we have resolved role data
    const teamGroups = {};
    Object.values(grimoireState.allRoles).forEach(role => {
      if (!teamGroups[role.team]) {
        teamGroups[role.team] = [];
      }
      teamGroups[role.team].push(role);
    });

    // Display grouped by team if we have team information
    if (Object.keys(teamGroups).length > 0) {
      const teamOrder = ['townsfolk', 'outsider', 'minion', 'demon', 'traveller', 'fabled'];
      teamOrder.forEach(team => {
        if (teamGroups[team] && teamGroups[team].length > 0) {
          const teamHeader = document.createElement('h3');
          let teamLabel = team.charAt(0).toUpperCase() + team.slice(1);
          if (team === 'traveller') teamLabel = 'Travellers';
          teamHeader.textContent = teamLabel;
          teamHeader.className = `team-${team === 'traveller' ? 'travellers' : team}`;
          characterSheet.appendChild(teamHeader);

          teamGroups[team].forEach(role => {
            const roleEl = document.createElement('div');
            roleEl.className = 'role';
            roleEl.innerHTML = `
                         <span class="icon" style="background-image: url('${role.image}'), url('./assets/img/token-BqDQdWeO.webp'); background-size: cover, cover;"></span>
                         <span class="name">${role.name}</span>
                         <div class="ability">${role.ability || 'No ability description available'}</div>
                     `;
            // Add click handler to toggle ability display
            roleEl.addEventListener('click', () => {
              roleEl.classList.toggle('show-ability');
            });
            characterSheet.appendChild(roleEl);
          });
        }
      });
    } else {
      // Fallback: show all characters in a single list
      const header = document.createElement('h3');
      header.textContent = 'Characters';
      header.className = 'team-townsfolk';
      characterSheet.appendChild(header);

      data.forEach((characterItem, index) => {
        if (typeof characterItem === 'string' && characterItem !== '_meta') {
          const roleEl = document.createElement('div');
          roleEl.className = 'role';
          roleEl.innerHTML = `
                     <span class="icon" style="background-image: url('./assets/img/token-BqDQdWeO.webp'); background-size: cover;"></span>
                     <span class="name">${characterItem.charAt(0).toUpperCase() + characterItem.slice(1)}</span>
                 `;
          characterSheet.appendChild(roleEl);
        } else if (typeof characterItem === 'object' && characterItem !== null && characterItem.id && characterItem.id !== '_meta') {
          // Display custom character objects
          const roleEl = document.createElement('div');
          roleEl.className = 'role';
          const image = characterItem.image ? resolveAssetPath(characterItem.image) : './assets/img/token-BqDQdWeO.webp';
          roleEl.innerHTML = `
                    <span class="icon" style="background-image: url('${image}'), url('./assets/img/token-BqDQdWeO.webp'); background-size: cover, cover;"></span>
                    <span class="name">${characterItem.name || characterItem.id}</span>
                    <div class="ability">${characterItem.ability || 'No ability description available'}</div>
                `;
          // Add click handler to toggle ability display
          roleEl.addEventListener('click', () => {
            roleEl.classList.toggle('show-ability');
          });
          characterSheet.appendChild(roleEl);
        }
      });
    }
  }

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
  function applyTravellerToggleAndRefresh() {
    grimoireState.allRoles = { ...(grimoireState.baseRoles || {}) };
    if (grimoireState.includeTravellers) {
      grimoireState.allRoles = { ...grimoireState.allRoles, ...(grimoireState.extraTravellerRoles || {}) };
    }
    // Re-render character sheet and, if modal is open, the character grid
    if (Array.isArray(grimoireState.scriptData)) displayScript(grimoireState.scriptData);
    if (characterModal && characterModal.style.display === 'flex') {
      populateCharacterGrid();
    }
  }

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
    repositionPlayers
  });

  // Load histories and render lists
  loadHistories();
  renderScriptHistory({ scriptHistoryList });
  renderGrimoireHistory({ grimoireHistoryList });

  // Restore previous session (script and grimoire)
  loadAppState({ grimoireState, grimoireHistoryList, processScriptData, repositionPlayers, openCharacterModal, showPlayerContextMenu, openReminderTokenModal, openTextReminderModal });

  // In-app tour
  initInAppTour();
});

// Tooltip and info icon helpers are imported from ui/tooltip.js
