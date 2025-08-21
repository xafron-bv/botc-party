import './pwa.js';
import { generateId, formatDateName, isExcludedScriptName, resolveAssetPath, normalizeKey } from './utils.js';
import { positionTooltip, showTouchAbilityPopup, positionInfoIcons } from './ui/tooltip.js';
import { createCurvedLabelSvg, createDeathRibbonSvg } from './ui/svg.js';
import { initSidebarResize, initSidebarToggle } from './ui/sidebar.js';
import { initInAppTour } from './ui/tour.js';
import { repositionPlayers as repositionPlayersLayout, positionRadialStack as positionRadialStackLayout } from './ui/layout.js';
import { renderScriptHistory } from './ui/history.js';

document.addEventListener('DOMContentLoaded', () => {
  const startGameBtn = document.getElementById('start-game');
  const loadTbBtn = document.getElementById('load-tb');
  const loadBmrBtn = document.getElementById('load-bmr');
  const loadSavBtn = document.getElementById('load-sav');
  const loadAllCharsBtn = document.getElementById('load-all-chars');
  const scriptFileInput = document.getElementById('script-file');
  const playerCountInput = document.getElementById('player-count');
  const playerCircle = document.getElementById('player-circle');
  const setupInfoEl = document.getElementById('setup-info');
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
  const abilityTooltip = document.getElementById('ability-tooltip');
  const touchAbilityPopup = document.getElementById('touch-ability-popup');
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
  const INCLUDE_TRAVELLERS_KEY = 'botcIncludeTravellersV1';
  let includeTravellers = false;

  // Player context menu elements
  let playerContextMenu = null;
  let contextMenuTargetIndex = -1;
  let longPressTimer = null;

  // Reminder context menu elements (for touch long-press on reminders)
  let reminderContextMenu = null;
  let reminderContextTarget = { playerIndex: -1, reminderIndex: -1 };

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
    includeTravellers = (localStorage.getItem(INCLUDE_TRAVELLERS_KEY) === '1');
  } catch (_) { includeTravellers = false; }
  if (includeTravellersCheckbox) {
    includeTravellersCheckbox.checked = includeTravellers;
    includeTravellersCheckbox.addEventListener('change', () => {
      includeTravellers = !!includeTravellersCheckbox.checked;
      applyTravellerToggleAndRefresh();
      saveAppState();
    });
  }

  let scriptData = null;
  let scriptMetaName = '';
  let playerSetupTable = [];
  let allRoles = {};
  // Roles separation for traveller toggle
  let baseRoles = {};
  let extraTravellerRoles = {};
  let players = [];
  let selectedPlayerIndex = -1;
  let editingReminder = { playerIndex: -1, reminderIndex: -1 };
  const isTouchDevice = (window.matchMedia && window.matchMedia('(hover: none) and (pointer: coarse)').matches) || ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  const TOUCH_EXPAND_SUPPRESS_MS = 350;
  const CLICK_EXPAND_SUPPRESS_MS = 250;
  let outsideCollapseHandlerInstalled = false;
  const prefersOverlaySidebar = window.matchMedia('(max-width: 900px)');
  let scriptHistory = [];
  let grimoireHistory = [];
  let isRestoringState = false;

  // Helpers now imported from utils.js

  function saveHistories() {
    try { localStorage.setItem('botcScriptHistoryV1', JSON.stringify(scriptHistory)); } catch (_) { }
    try { localStorage.setItem('botcGrimoireHistoryV1', JSON.stringify(grimoireHistory)); } catch (_) { }
  }

  function loadHistories() {
    try {
      const sRaw = localStorage.getItem('botcScriptHistoryV1');
      if (sRaw) scriptHistory = JSON.parse(sRaw) || [];
    } catch (_) { scriptHistory = []; }
    try {
      const gRaw = localStorage.getItem('botcGrimoireHistoryV1');
      if (gRaw) grimoireHistory = JSON.parse(gRaw) || [];
    } catch (_) { grimoireHistory = []; }
  }

  function renderGrimoireHistory() {
    if (!grimoireHistoryList) return;
    grimoireHistoryList.innerHTML = '';
    grimoireHistory.forEach(entry => {
      const li = document.createElement('li');
      li.dataset.id = entry.id;
      li.className = 'history-item';
      const nameSpan = document.createElement('span');
      nameSpan.className = 'history-name';
      nameSpan.textContent = entry.name || formatDateName(new Date(entry.createdAt || Date.now()));
      // Inline edit input (hidden by default)
      const nameInput = document.createElement('input');
      nameInput.type = 'text';
      nameInput.className = 'history-edit-input';
      nameInput.value = entry.name || formatDateName(new Date(entry.createdAt || Date.now()));
      nameInput.style.display = 'none';
      // Icons
      const renameBtn = document.createElement('button');
      renameBtn.className = 'icon-btn rename';
      renameBtn.title = 'Rename';
      renameBtn.innerHTML = '<i class="fa-solid fa-pen"></i>';
      const saveBtn = document.createElement('button');
      saveBtn.className = 'icon-btn save';
      saveBtn.title = 'Save';
      saveBtn.style.display = 'none';
      saveBtn.innerHTML = '<i class="fa-solid fa-check"></i>';
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'icon-btn delete';
      deleteBtn.title = 'Delete';
      deleteBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
      li.appendChild(nameSpan);
      li.appendChild(nameInput);
      li.appendChild(renameBtn);
      li.appendChild(saveBtn);
      li.appendChild(deleteBtn);
      grimoireHistoryList.appendChild(li);
    });
  }

  function addScriptToHistory(name, data) {
    const entryName = (name && String(name).trim()) || 'Custom Script';
    // Update existing by name if found, else add new
    const idx = scriptHistory.findIndex(e => (e.name || '').toLowerCase() === entryName.toLowerCase());
    if (idx >= 0) {
      scriptHistory[idx].data = data;
      scriptHistory[idx].updatedAt = Date.now();
    } else {
      scriptHistory.unshift({ id: generateId('script'), name: entryName, data, createdAt: Date.now(), updatedAt: Date.now() });
    }
    saveHistories();
    renderScriptHistory({ scriptHistoryList, scriptHistory });
  }

  // Build player circle UI from current players WITHOUT snapshotting or resetting players
  function rebuildPlayerCircleUiPreserveState() {
    if (!playerCircle) return;
    playerCircle.innerHTML = '';
    // Keep sidebar input in sync with current number of players
    if (playerCountInput) {
      try { playerCountInput.value = String(players.length); } catch (_) { }
    }
    players.forEach((player, i) => {
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
          players[i].name = newName;
          updateGrimoire();
          saveAppState();
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
              positionRadialStack(el, (players[idx]?.reminders || []).length);
            }
          });
          if (someoneExpanded) {
            thisLi.dataset.expanded = '1';
            thisLi.dataset.actionSuppressUntil = String(Date.now() + CLICK_EXPAND_SUPPRESS_MS);
            positionRadialStack(thisLi, players[i].reminders.length);
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
            positionRadialStack(el, (players[idx]?.reminders || []).length);
          }
        });
        listItem.dataset.expanded = '1';
        if (isTouchDevice && !wasExpanded) {
          listItem.dataset.actionSuppressUntil = String(Date.now() + CLICK_EXPAND_SUPPRESS_MS);
        }
        positionRadialStack(listItem, players[i].reminders.length);
      };
      const collapse = () => { listItem.dataset.expanded = '0'; positionRadialStack(listItem, players[i].reminders.length); };
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
        positionRadialStack(listItem, players[i].reminders.length);
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
        clearTimeout(longPressTimer);
        const x = (e && (e.clientX || (e.touches && e.touches[0] && e.touches[0].clientX))) || 0;
        const y = (e && (e.clientY || (e.touches && e.touches[0] && e.touches[0].clientY))) || 0;
        longPressTimer = setTimeout(() => {
          showPlayerContextMenu(x, y, i);
        }, 600);
      });
      ['pointerup', 'pointercancel', 'pointerleave'].forEach(evt => {
        tokenEl.addEventListener(evt, () => { clearTimeout(longPressTimer); });
      });

      // Install one-time outside collapse handler for touch devices
      if (isTouchDevice && !outsideCollapseHandlerInstalled) {
        outsideCollapseHandlerInstalled = true;
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
              positionRadialStack(el, (players[Array.from(allLis).indexOf(el)]?.reminders || []).length);
            }
          });
        };
        document.addEventListener('click', maybeCollapseOnOutside, true);
        document.addEventListener('touchstart', maybeCollapseOnOutside, { passive: true, capture: true });
      }
    });
    // Apply layout and state immediately for deterministic testing and UX
    repositionPlayers();
    updateGrimoire();
    saveAppState();
    renderSetupInfo();
    // Also after paint to ensure positions stabilize
    requestAnimationFrame(() => {
      repositionPlayers();
      updateGrimoire();
    });
  }

  function ensurePlayerContextMenu() {
    if (playerContextMenu) return playerContextMenu;
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
      const idx = contextMenuTargetIndex;
      hidePlayerContextMenu();
      if (idx < 0) return;
      if (players.length >= 20) return; // clamp to max
      const newName = `Player ${players.length + 1}`;
      const newPlayer = { name: newName, character: null, reminders: [], dead: false };
      players.splice(idx, 0, newPlayer);
      rebuildPlayerCircleUiPreserveState();
    });
    addAfterBtn.addEventListener('click', () => {
      const idx = contextMenuTargetIndex;
      hidePlayerContextMenu();
      if (idx < 0) return;
      if (players.length >= 20) return; // clamp to max
      const newName = `Player ${players.length + 1}`;
      const newPlayer = { name: newName, character: null, reminders: [], dead: false };
      players.splice(idx + 1, 0, newPlayer);
      rebuildPlayerCircleUiPreserveState();
    });
    removeBtn.addEventListener('click', () => {
      const idx = contextMenuTargetIndex;
      hidePlayerContextMenu();
      if (idx < 0) return;
      if (players.length <= 5) return; // keep within 5..20
      players.splice(idx, 1);
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
    playerContextMenu = menu;
    return menu;
  }

  function showPlayerContextMenu(x, y, playerIndex) {
    const menu = ensurePlayerContextMenu();
    contextMenuTargetIndex = playerIndex;
    // Enable/disable buttons based on limits
    const canAdd = players.length < 20;
    const canRemove = players.length > 5;
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
    if (reminderContextMenu) return reminderContextMenu;
    const menu = document.createElement('div');
    menu.id = 'reminder-context-menu';
    const editBtn = document.createElement('button');
    editBtn.id = 'reminder-menu-edit';
    editBtn.textContent = 'Edit Reminder';
    const deleteBtn = document.createElement('button');
    deleteBtn.id = 'reminder-menu-delete';
    deleteBtn.textContent = 'Delete Reminder';

    editBtn.addEventListener('click', () => {
      const { playerIndex, reminderIndex } = reminderContextTarget;
      hideReminderContextMenu();
      if (playerIndex < 0 || reminderIndex < 0) return;
      const rem = (players[playerIndex] && players[playerIndex].reminders && players[playerIndex].reminders[reminderIndex]) || null;
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
        updateGrimoire();
        saveAppState();
      }
    });

    deleteBtn.addEventListener('click', () => {
      const { playerIndex, reminderIndex } = reminderContextTarget;
      hideReminderContextMenu();
      if (playerIndex < 0 || reminderIndex < 0) return;
      if (!players[playerIndex] || !players[playerIndex].reminders) return;
      players[playerIndex].reminders.splice(reminderIndex, 1);
      updateGrimoire();
      saveAppState();
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

    reminderContextMenu = menu;
    return menu;
  }

  function showReminderContextMenu(x, y, playerIndex, reminderIndex) {
    const menu = ensureReminderContextMenu();
    reminderContextTarget = { playerIndex, reminderIndex };
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
    if (reminderContextMenu) reminderContextMenu.style.display = 'none';
    reminderContextTarget = { playerIndex: -1, reminderIndex: -1 };
    clearTimeout(longPressTimer);
  }

  function hidePlayerContextMenu() {
    if (playerContextMenu) playerContextMenu.style.display = 'none';
    contextMenuTargetIndex = -1;
    clearTimeout(longPressTimer);
  }

  function snapshotCurrentGrimoire() {
    try {
      if (!Array.isArray(players) || players.length === 0) return;
      const snapPlayers = JSON.parse(JSON.stringify(players));
      let name = formatDateName(new Date());
      const entry = {
        id: generateId('grimoire'),
        name,
        createdAt: Date.now(),
        players: snapPlayers,
        scriptName: scriptMetaName || (Array.isArray(scriptData) && (scriptData.find(x => x && typeof x === 'object' && x.id === '_meta')?.name || '')) || '',
        scriptData: Array.isArray(scriptData) ? JSON.parse(JSON.stringify(scriptData)) : null
      };
      grimoireHistory.unshift(entry);
      saveHistories();
      renderGrimoireHistory();
    } catch (_) { }
  }

  async function restoreGrimoireFromEntry(entry) {
    if (!entry) return;
    try {
      isRestoringState = true;
      if (entry.scriptData) {
        await processScriptData(entry.scriptData, false);
        scriptMetaName = entry.scriptName || scriptMetaName;
      }
      setupGrimoire((entry.players || []).length || 0);
      players = JSON.parse(JSON.stringify(entry.players || []));
      updateGrimoire();
      repositionPlayers();
      saveAppState();
      renderSetupInfo();
    } catch (e) {
      console.error('Failed to restore grimoire from history:', e);
    } finally {
      isRestoringState = false;
    }
  }

  // Event delegation for history lists
  if (scriptHistoryList) {
    // Click-to-load and icon actions
    scriptHistoryList.addEventListener('click', async (e) => {
      const li = e.target.closest('li');
      if (!li) return;
      const id = li.dataset.id;
      const entry = scriptHistory.find(x => x.id === id);
      if (!entry) return;
      const clickedDelete = e.target.closest('.icon-btn.delete');
      const clickedRename = e.target.closest('.icon-btn.rename');
      const clickedSave = e.target.closest('.icon-btn.save');
      const clickedInput = e.target.closest('.history-edit-input');
      if (clickedDelete) {
        if (confirm('Delete this script from history?')) {
          scriptHistory = scriptHistory.filter(x => x.id !== id);
          saveHistories();
          renderScriptHistory({ scriptHistoryList, scriptHistory });
        }
        return;
      }
      if (clickedRename) {
        const nameSpan = li.querySelector('.history-name');
        const input = li.querySelector('.history-edit-input');
        const renameBtn = li.querySelector('.icon-btn.rename');
        const saveBtn = li.querySelector('.icon-btn.save');
        nameSpan.style.display = 'none';
        input.style.display = 'inline-block';
        renameBtn.style.display = 'none';
        saveBtn.style.display = 'inline-block';
        li.classList.add('editing');
        input.focus();
        input.setSelectionRange(0, input.value.length);
        return;
      }
      if (clickedSave) {
        const input = li.querySelector('.history-edit-input');
        const newName = (input.value || '').trim();
        if (newName) {
          entry.name = newName;
          entry.updatedAt = Date.now();
          saveHistories();
          renderScriptHistory({ scriptHistoryList, scriptHistory });
        }
        li.classList.remove('editing');
        return;
      }
      if (clickedInput) return; // don't load when clicking into input
      if (li.classList.contains('editing')) return; // avoid loading while editing
      // Default: clicking the item or name loads the script
      try {
        await processScriptData(entry.data, false);
        scriptMetaName = entry.name || scriptMetaName || '';
        displayScript(scriptData);
        saveAppState();
        renderSetupInfo();
      } catch (err) { console.error(err); }
    });
    // Press feedback
    const pressHandlers = (ul) => {
      const onDown = (e) => {
        const li = e.target.closest('li.history-item');
        if (!li) return;
        if (e.target.closest('.icon-btn') || e.target.closest('.history-edit-input')) return;
        li.classList.add('pressed');
      };
      const onClear = (e) => {
        document.querySelectorAll('#script-history-list li.pressed').forEach(el => el.classList.remove('pressed'));
      };
      ul.addEventListener('pointerdown', onDown);
      ul.addEventListener('pointerup', onClear);
      ul.addEventListener('pointercancel', onClear);
      ul.addEventListener('pointerleave', onClear);
    };
    pressHandlers(scriptHistoryList);
    // Save on Enter when editing
    scriptHistoryList.addEventListener('keydown', (e) => {
      if (!e.target.classList.contains('history-edit-input')) return;
      const li = e.target.closest('li');
      const id = li && li.dataset.id;
      const entry = scriptHistory.find(x => x.id === id);
      if (!entry) return;
      if (e.key === 'Enter') {
        const newName = (e.target.value || '').trim();
        if (newName) {
          entry.name = newName;
          entry.updatedAt = Date.now();
          saveHistories();
          renderScriptHistory({ scriptHistoryList, scriptHistory });
        }
      }
    });
  }

  if (grimoireHistoryList) {
    // Click-to-load and icon actions
    grimoireHistoryList.addEventListener('click', async (e) => {
      const li = e.target.closest('li');
      if (!li) return;
      const id = li.dataset.id;
      const entry = grimoireHistory.find(x => x.id === id);
      if (!entry) return;
      const clickedDelete = e.target.closest('.icon-btn.delete');
      const clickedRename = e.target.closest('.icon-btn.rename');
      const clickedSave = e.target.closest('.icon-btn.save');
      const clickedInput = e.target.closest('.history-edit-input');
      if (clickedDelete) {
        if (confirm('Delete this grimoire snapshot?')) {
          grimoireHistory = grimoireHistory.filter(x => x.id !== id);
          saveHistories();
          renderGrimoireHistory();
        }
        return;
      }
      if (clickedRename) {
        const nameSpan = li.querySelector('.history-name');
        const input = li.querySelector('.history-edit-input');
        const renameBtn = li.querySelector('.icon-btn.rename');
        const saveBtn = li.querySelector('.icon-btn.save');
        nameSpan.style.display = 'none';
        input.style.display = 'inline-block';
        renameBtn.style.display = 'none';
        saveBtn.style.display = 'inline-block';
        li.classList.add('editing');
        input.focus();
        input.setSelectionRange(0, input.value.length);
        return;
      }
      if (clickedSave) {
        const input = li.querySelector('.history-edit-input');
        const newName = (input.value || '').trim();
        if (newName) {
          entry.name = newName;
          entry.updatedAt = Date.now();
          saveHistories();
          renderGrimoireHistory();
        }
        li.classList.remove('editing');
        return;
      }
      if (clickedInput) return; // don't load when clicking into input
      if (li.classList.contains('editing')) return; // avoid loading while editing
      // Default: clicking the item or name loads the grimoire
      await restoreGrimoireFromEntry(entry);
    });
    // Press feedback
    const pressHandlersG = (ul) => {
      const onDown = (e) => {
        const li = e.target.closest('li.history-item');
        if (!li) return;
        if (e.target.closest('.icon-btn') || e.target.closest('.history-edit-input')) return;
        li.classList.add('pressed');
      };
      const onClear = () => {
        document.querySelectorAll('#grimoire-history-list li.pressed').forEach(el => el.classList.remove('pressed'));
      };
      ul.addEventListener('pointerdown', onDown);
      ul.addEventListener('pointerup', onClear);
      ul.addEventListener('pointercancel', onClear);
      ul.addEventListener('pointerleave', onClear);
    };
    pressHandlersG(grimoireHistoryList);
    // Save on Enter when editing
    grimoireHistoryList.addEventListener('keydown', (e) => {
      if (!e.target.classList.contains('history-edit-input')) return;
      const li = e.target.closest('li');
      const id = li && li.dataset.id;
      const entry = grimoireHistory.find(x => x.id === id);
      if (!entry) return;
      if (e.key === 'Enter') {
        const newName = (e.target.value || '').trim();
        if (newName) {
          entry.name = newName;
          entry.updatedAt = Date.now();
          saveHistories();
          renderGrimoireHistory();
        }
      }
    });
  }

  function saveAppState() {
    try {
      const state = { scriptData, players, scriptName: scriptMetaName };
      localStorage.setItem('botcAppStateV1', JSON.stringify(state));
      try { localStorage.setItem(INCLUDE_TRAVELLERS_KEY, includeTravellers ? '1' : '0'); } catch (_) { }
    } catch (_) { }
  }

  async function loadAppState() {
    try {
      isRestoringState = true;
      const raw = localStorage.getItem('botcAppStateV1');
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved && Array.isArray(saved.scriptData) && saved.scriptData.length) {
        await processScriptData(saved.scriptData, false);
        if (saved.scriptName) { scriptMetaName = String(saved.scriptName); }
      }
      if (saved && Array.isArray(saved.players) && saved.players.length) {
        setupGrimoire(saved.players.length);
        players = saved.players;
        updateGrimoire();
        repositionPlayers();
        renderSetupInfo();
      }
    } catch (_) { } finally { isRestoringState = false; }
  }

  // Path and key helpers imported from utils.js

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
      allRoles = {};
      baseRoles = {};
      extraTravellerRoles = {};
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
            extraTravellerRoles[role.id] = canonical;
          } else {
            baseRoles[role.id] = canonical;
          }
          characterIds.push(role.id);
        });
      }

      console.log(`Loaded ${Object.keys(allRoles).length} characters from all teams`);

      // Create a pseudo-script data array with all character IDs
      scriptData = [{ id: '_meta', name: 'All Characters', author: 'System' }, ...characterIds];
      // Apply traveller toggle to compute allRoles and render
      applyTravellerToggleAndRefresh();
      saveAppState();

      loadStatus.textContent = `Loaded ${Object.keys(allRoles).length} characters successfully`;
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
          scriptMetaName = base;
          renderSetupInfo();
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
  loadTbBtn && loadTbBtn.addEventListener('click', () => { scriptMetaName = 'Trouble Brewing'; renderSetupInfo(); loadScriptFromFile('./Trouble Brewing.json'); });
  loadBmrBtn && loadBmrBtn.addEventListener('click', () => { scriptMetaName = 'Bad Moon Rising'; renderSetupInfo(); loadScriptFromFile('./Bad Moon Rising.json'); });
  loadSavBtn && loadSavBtn.addEventListener('click', () => { scriptMetaName = 'Sects & Violets'; renderSetupInfo(); loadScriptFromFile('./Sects and Violets.json'); });
  loadAllCharsBtn && loadAllCharsBtn.addEventListener('click', () => { scriptMetaName = 'All Characters'; renderSetupInfo(); loadAllCharacters(); });

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
      playerSetupTable = Array.isArray(data.player_setup) ? data.player_setup : [];
      renderSetupInfo();
    } catch (e) {
      console.error('Failed to load player-setup.json', e);
    }
  })();

  function lookupCountsForPlayers(count) {
    if (!Array.isArray(playerSetupTable)) return null;
    const row = playerSetupTable.find(r => Number(r.players) === Number(count));
    return row || null;
  }

  function renderSetupInfo() {
    if (!setupInfoEl) return;
    const count = players.length;
    const row = lookupCountsForPlayers(count);
    // Prefer parsed meta name; otherwise keep any existing hint
    let scriptName = scriptMetaName || '';
    if (!scriptName && Array.isArray(scriptData)) {
      const meta = scriptData.find(x => x && typeof x === 'object' && x.id === '_meta');
      if (meta && meta.name) scriptName = String(meta.name);
    }
    if (!row && !scriptName) { setupInfoEl.textContent = 'Select a script and add players from the sidebar.'; return; }
    const parts = [];
    if (scriptName) parts.push(scriptName);
    if (row) parts.push(`${row.townsfolk}/${row.outsiders}/${row.minions}/${row.demons}`);
    setupInfoEl.textContent = parts.join(' ');
  }

  async function processScriptData(data, addToHistory = false) {
    console.log('Processing script data:', data);
    scriptData = data;
    allRoles = {};
    baseRoles = {};
    extraTravellerRoles = {};
    // Extract metadata name if present
    try {
      const meta = Array.isArray(data) ? data.find(x => x && typeof x === 'object' && x.id === '_meta') : null;
      scriptMetaName = meta && meta.name ? String(meta.name) : '';
    } catch (_) { scriptMetaName = ''; }

    if (Array.isArray(data)) {
      console.log('Processing script with', data.length, 'characters');
      await processScriptCharacters(data);
    } else {
      console.error('Unexpected script format:', typeof data);
      return;
    }

    console.log('Total roles processed:', Object.keys(allRoles).length);
    // After processing into baseRoles/extraTravellerRoles, apply toggle
    applyTravellerToggleAndRefresh();
    saveAppState();
    renderSetupInfo();
    if (addToHistory) {
      const histName = scriptMetaName || (Array.isArray(data) && (data.find(x => x && typeof x === 'object' && x.id === '_meta')?.name || 'Custom Script')) || 'Custom Script';
      if (!isExcludedScriptName(histName)) {
        addScriptToHistory(histName, data);
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
          extraTravellerRoles[role.id] = role;
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
              extraTravellerRoles[canonicalId] = role;
            } else {
              baseRoles[canonicalId] = role;
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
              extraTravellerRoles[canonicalId] = role;
            } else {
              baseRoles[canonicalId] = role;
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
              extraTravellerRoles[characterItem.id] = customRole;
            } else {
              baseRoles[characterItem.id] = customRole;
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
          baseRoles[characterItem] = {
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
              extraTravellerRoles[characterItem.id] = customFallback;
            } else {
              baseRoles[characterItem.id] = customFallback;
            }
          }
        }
      });
    }
  }

  startGameBtn.addEventListener('click', () => {
    const playerCount = parseInt(playerCountInput.value, 10);
    if (playerCount >= 5 && playerCount <= 20) {
      setupGrimoire(playerCount);
    } else {
      alert('Player count must be an integer from 5 to 20.');
    }
  });

  function setupGrimoire(count) {
    try {
      if (!isRestoringState && Array.isArray(players) && players.length > 0) {
        snapshotCurrentGrimoire();
      }
    } catch (_) { }
    console.log('Setting up grimoire with', count, 'players');
    playerCircle.innerHTML = '';
    players = Array.from({ length: count }, (_, i) => ({
      name: `Player ${i + 1}`,
      character: null,
      reminders: [],
      dead: false
    }));

    players.forEach((player, i) => {
      const listItem = document.createElement('li');
      listItem.innerHTML = `
              <div class="reminders"></div>
              <div class="player-token" title="Assign character"></div>
               <div class="character-name" aria-live="polite"></div>
              <div class="player-name" title="Edit name">${player.name}</div>
              <div class="reminder-placeholder" title="Add text reminder">+</div>
          `;
      playerCircle.appendChild(listItem);

      // Only the main token area opens the character modal; ribbon handles dead toggle
      listItem.querySelector('.player-token').onclick = (e) => {
        const target = e.target;
        if (target && (target.closest('.death-ribbon') || target.classList.contains('death-ribbon'))) {
          return; // handled by ribbon click
        }
        if (target && target.classList.contains('ability-info-icon')) {
          return; // handled by info icon
        }
        openCharacterModal(i);
      };
      // Player context menu: right-click
      listItem.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        showPlayerContextMenu(e.clientX, e.clientY, i);
      });
      // Long-press on token to open context menu on touch devices
      const tokenForMenu = listItem.querySelector('.player-token');
      tokenForMenu.addEventListener('pointerdown', (e) => {
        if (!isTouchDevice) return;
        try { e.preventDefault(); } catch (_) { }
        clearTimeout(longPressTimer);
        const x = (e && (e.clientX || (e.touches && e.touches[0] && e.touches[0].clientX))) || 0;
        const y = (e && (e.clientY || (e.touches && e.touches[0] && e.touches[0].clientY))) || 0;
        longPressTimer = setTimeout(() => {
          showPlayerContextMenu(x, y, i);
        }, 600);
      });
      ['pointerup', 'pointercancel', 'pointerleave'].forEach(evt => {
        tokenForMenu.addEventListener(evt, () => { clearTimeout(longPressTimer); });
      });
      listItem.querySelector('.player-name').onclick = (e) => {
        e.stopPropagation();
        const newName = prompt("Enter player name:", player.name);
        if (newName) {
          players[i].name = newName;
          updateGrimoire();
          saveAppState();
        }
      };
      listItem.querySelector('.reminder-placeholder').onclick = (e) => {
        e.stopPropagation();
        const thisLi = listItem;
        if (thisLi.dataset.expanded !== '1') {
          const allLis = document.querySelectorAll('#player-circle li');
          let someoneExpanded = false;
          allLis.forEach(el => {
            if (el !== thisLi && el.dataset.expanded === '1') {
              someoneExpanded = true;
              el.dataset.expanded = '0';
              const idx = Array.from(allLis).indexOf(el);
              positionRadialStack(el, (players[idx]?.reminders || []).length);
            }
          });
          if (someoneExpanded) {
            thisLi.dataset.expanded = '1';
            thisLi.dataset.actionSuppressUntil = String(Date.now() + CLICK_EXPAND_SUPPRESS_MS);
            positionRadialStack(thisLi, players[i].reminders.length);
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
            positionRadialStack(el, (players[idx]?.reminders || []).length);
          }
        });
        listItem.dataset.expanded = '1';
        // Only set suppression on touch, and only when changing from collapsed -> expanded
        if (isTouchDevice && !wasExpanded) {
          listItem.dataset.actionSuppressUntil = String(Date.now() + CLICK_EXPAND_SUPPRESS_MS);
        }
        positionRadialStack(listItem, players[i].reminders.length);
      };
      const collapse = () => { listItem.dataset.expanded = '0'; positionRadialStack(listItem, players[i].reminders.length); };
      if (!isTouchDevice) {
        listItem.addEventListener('mouseenter', expand);
        listItem.addEventListener('mouseleave', collapse);
        // Pointer events for broader device support
        listItem.addEventListener('pointerenter', expand);
        listItem.addEventListener('pointerleave', collapse);
      }
      // Touch: expand on any tap; only suppress synthetic click if tap started on reminders
      listItem.addEventListener('touchstart', (e) => {
        const target = e.target;
        const tappedReminders = !!(target && target.closest('.reminders'));
        if (tappedReminders) {
          try { e.preventDefault(); } catch (_) { }
          listItem.dataset.touchSuppressUntil = String(Date.now() + TOUCH_EXPAND_SUPPRESS_MS);
        }
        expand();
        positionRadialStack(listItem, players[i].reminders.length);
      }, { passive: false });

      // (desktop) no extra mousedown handler; rely on hover/pointerenter and explicit clicks on reminders

      // Install one-time outside click/tap collapse for touch devices
      if (isTouchDevice && !outsideCollapseHandlerInstalled) {
        outsideCollapseHandlerInstalled = true;
        const maybeCollapseOnOutside = (ev) => {
          const target = ev.target;
          // Ignore clicks/taps inside the player circle to allow in-circle interactions (like + gating)
          const playerCircleEl = document.getElementById('player-circle');
          if (playerCircleEl && playerCircleEl.contains(target)) return;
          // Do nothing if target is inside any expanded list item
          const allLis = document.querySelectorAll('#player-circle li');
          let clickedInsideExpanded = false;
          allLis.forEach(el => {
            if (el.dataset.expanded === '1' && el.contains(target)) {
              clickedInsideExpanded = true;
            }
          });
          if (clickedInsideExpanded) return;
          // Collapse all expanded items
          allLis.forEach(el => {
            if (el.dataset.expanded === '1') {
              el.dataset.expanded = '0';
              positionRadialStack(el, (players[Array.from(allLis).indexOf(el)]?.reminders || []).length);
            }
          });
        };
        document.addEventListener('click', maybeCollapseOnOutside, true);
        document.addEventListener('touchstart', maybeCollapseOnOutside, { passive: true, capture: true });
      }

      // No capture intercepts; rely on pointer-events gating and the touchstart handler above
    });

    // Use requestAnimationFrame to ensure DOM is fully rendered
    requestAnimationFrame(() => {
      repositionPlayers();
      updateGrimoire();
      saveAppState();
      renderSetupInfo();
    });
  }

  function repositionPlayers() { repositionPlayersLayout(players); }

  function updateGrimoire() {
    const listItems = playerCircle.querySelectorAll('li');
    listItems.forEach((li, i) => {
      const player = players[i];
      const playerNameEl = li.querySelector('.player-name');
      playerNameEl.textContent = player.name;

      // Check if player is in NW or NE quadrant
      const angle = parseFloat(li.dataset.angle || '0');

      // Calculate the actual x,y position to determine quadrant
      const x = Math.cos(angle);
      const y = Math.sin(angle);

      // Names go on top for NW (x<0, y<0) and NE (x>0, y<0) quadrants
      const isNorthQuadrant = y < 0;

      if (isNorthQuadrant) {
        playerNameEl.classList.add('top-half');
        li.classList.add('is-north');
        li.classList.remove('is-south');
      } else {
        playerNameEl.classList.remove('top-half');
        li.classList.add('is-south');
        li.classList.remove('is-north');
      }

      const tokenDiv = li.querySelector('.player-token');
      const charNameDiv = li.querySelector('.character-name');
      // Remove any previous arc label overlay
      const existingArc = tokenDiv.querySelector('.icon-reminder-svg');
      if (existingArc) existingArc.remove();
      // Remove any previous death UI
      const oldCircle = tokenDiv.querySelector('.death-overlay');
      if (oldCircle) oldCircle.remove();
      const oldRibbon = tokenDiv.querySelector('.death-ribbon');
      if (oldRibbon) oldRibbon.remove();

      if (player.character) {
        const role = getRoleById(player.character);
        if (role) {
          tokenDiv.style.backgroundImage = `url('${resolveAssetPath(role.image)}'), url('${resolveAssetPath('assets/img/token-BqDQdWeO.webp')}')`;
          tokenDiv.style.backgroundSize = '68% 68%, cover';
          tokenDiv.style.backgroundColor = 'transparent';
          tokenDiv.classList.add('has-character');
          if (charNameDiv) charNameDiv.textContent = role.name;
          // Add curved label on the token
          const svg = createCurvedLabelSvg(`player-arc-${i}`, role.name);
          tokenDiv.appendChild(svg);

          // Add tooltip functionality for non-touch devices
          if (!('ontouchstart' in window)) {
            tokenDiv.addEventListener('mouseenter', (e) => {
              if (role.ability) {
                abilityTooltip.textContent = role.ability;
                abilityTooltip.classList.add('show');
                positionTooltip(e.target, abilityTooltip);
              }
            });

            tokenDiv.addEventListener('mouseleave', () => {
              abilityTooltip.classList.remove('show');
            });
          } else if (role.ability) {
            // Add info icon for touch mode - will be positioned after circle layout
            const infoIcon = document.createElement('div');
            infoIcon.className = 'ability-info-icon';
            infoIcon.innerHTML = '<i class="fas fa-info-circle"></i>';
            infoIcon.dataset.playerIndex = i;
            // Handle both click and touch events
            const handleInfoClick = (e) => {
              e.stopPropagation();
              e.preventDefault();
              showTouchAbilityPopup(infoIcon, role.ability);
            };
            infoIcon.onclick = handleInfoClick;
            infoIcon.addEventListener('touchstart', (e) => {
              e.stopPropagation();
              e.preventDefault();
              handleInfoClick(e); // Call the click handler on touch
            });
            li.appendChild(infoIcon); // Append to li, not tokenDiv
          }
        } else {
          tokenDiv.style.backgroundImage = `url('${resolveAssetPath('assets/img/token-BqDQdWeO.webp')}')`;
          tokenDiv.style.backgroundSize = 'cover';
          tokenDiv.style.backgroundColor = 'rgba(0,0,0,0.2)';
          tokenDiv.classList.remove('has-character');
          if (charNameDiv) charNameDiv.textContent = '';
          // Ensure no leftover arc label remains
          const arc = tokenDiv.querySelector('.icon-reminder-svg');
          if (arc) arc.remove();
        }
      } else {
        tokenDiv.style.backgroundImage = `url('${resolveAssetPath('assets/img/token-BqDQdWeO.webp')}')`;
        tokenDiv.style.backgroundSize = 'cover';
        tokenDiv.style.backgroundColor = 'rgba(0,0,0,0.2)';
        tokenDiv.classList.remove('has-character');
        if (charNameDiv) charNameDiv.textContent = '';
        // Ensure no leftover arc label remains
        const arc = tokenDiv.querySelector('.icon-reminder-svg');
        if (arc) arc.remove();
      }

      // Add death overlay circle and ribbon indicator
      const overlay = document.createElement('div');
      overlay.className = 'death-overlay';
      overlay.title = player.dead ? 'Click to mark alive' : 'Click to mark dead';
      // overlay is visual only; click is on ribbon
      tokenDiv.appendChild(overlay);

      const ribbon = createDeathRibbonSvg();
      ribbon.classList.add('death-ribbon');
      const handleRibbonToggle = (e) => {
        e.stopPropagation();
        players[i].dead = !players[i].dead;
        updateGrimoire();
        saveAppState();
      };
      // Attach to painted shapes only to avoid transparent hit areas
      try {
        ribbon.querySelectorAll('rect, path').forEach((shape) => {
          shape.addEventListener('click', handleRibbonToggle);
        });
      } catch (_) {
        // Fallback: still attach on svg
        ribbon.addEventListener('click', handleRibbonToggle);
      }
      tokenDiv.appendChild(ribbon);

      if (player.dead) {
        tokenDiv.classList.add('is-dead');
      } else {
        tokenDiv.classList.remove('is-dead');
      }

      const remindersDiv = li.querySelector('.reminders');
      remindersDiv.innerHTML = '';

      // Create reminder elements; positions are handled by positionRadialStack()
      player.reminders.forEach((reminder, idx) => {
        if (reminder.type === 'icon') {
          const iconEl = document.createElement('div');
          iconEl.className = 'icon-reminder';
          iconEl.style.transform = `translate(-50%, -50%) rotate(${reminder.rotation || 0}deg)`;
          iconEl.style.backgroundImage = `url('${resolveAssetPath(reminder.image)}'), url('${resolveAssetPath('assets/img/token-BqDQdWeO.webp')}')`;
          iconEl.title = (reminder.label || '');
          iconEl.addEventListener('click', (e) => {
            const parentLi = iconEl.closest('li');
            const isCollapsed = !!(parentLi && parentLi.dataset.expanded !== '1');
            if (isCollapsed) {
              e.stopPropagation();
              try { e.preventDefault(); } catch (_) { }
              parentLi.dataset.expanded = '1';
              parentLi.dataset.actionSuppressUntil = String(Date.now() + CLICK_EXPAND_SUPPRESS_MS);
              positionRadialStack(parentLi, players[i].reminders.length);
            }
          }, true);

          if (reminder.label) {
            // Check if this is a custom reminder by ID
            const isCustom = reminder.id === 'custom-note';

            if (isCustom) {
              // For custom reminders, show straight text with dark background
              const textSpan = document.createElement('span');
              textSpan.className = 'icon-reminder-content';
              textSpan.textContent = reminder.label;

              // Adjust font size based on text length
              const textLength = reminder.label.length;
              if (textLength > 40) {
                textSpan.style.fontSize = 'clamp(7px, calc(var(--token-size) * 0.06), 10px)';
              } else if (textLength > 20) {
                textSpan.style.fontSize = 'clamp(8px, calc(var(--token-size) * 0.07), 12px)';
              }

              iconEl.appendChild(textSpan);
            } else {
              // For other reminders, show curved text at bottom
              const svg = createCurvedLabelSvg(`arc-${i}-${idx}`, reminder.label);
              iconEl.appendChild(svg);
            }
          }

          // Desktop hover actions on icon reminders
          if (!isTouchDevice) {
            const editBtn = document.createElement('div');
            editBtn.className = 'reminder-action edit';
            editBtn.title = 'Edit';
            editBtn.innerHTML = '<i class="fa-solid fa-pen"></i>';
            editBtn.addEventListener('click', (e) => {
              e.stopPropagation();
              try { e.preventDefault(); } catch (_) { }
              const parentLi = editBtn.closest('li');
              if (parentLi) {
                const suppressUntil = parseInt(parentLi.dataset.actionSuppressUntil || '0', 10);
                if (parentLi.dataset.expanded !== '1' || Date.now() < suppressUntil) {
                  if (parentLi.dataset.expanded !== '1') {
                    parentLi.dataset.expanded = '1';
                    parentLi.dataset.actionSuppressUntil = String(Date.now() + CLICK_EXPAND_SUPPRESS_MS);
                    positionRadialStack(parentLi, players[i].reminders.length);
                  }
                  return;
                }
              }
              const current = players[i].reminders[idx]?.label || players[i].reminders[idx]?.value || '';
              const next = prompt('Edit reminder', current);
              if (next !== null) {
                players[i].reminders[idx].label = next;
                updateGrimoire();
                saveAppState();
              }
            });
            iconEl.appendChild(editBtn);

            const delBtn = document.createElement('div');
            delBtn.className = 'reminder-action delete';
            delBtn.title = 'Delete';
            delBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
            delBtn.addEventListener('click', (e) => {
              e.stopPropagation();
              try { e.preventDefault(); } catch (_) { }
              const parentLi = delBtn.closest('li');
              if (parentLi) {
                const suppressUntil = parseInt(parentLi.dataset.actionSuppressUntil || '0', 10);
                if (parentLi.dataset.expanded !== '1' || Date.now() < suppressUntil) {
                  if (parentLi.dataset.expanded !== '1') {
                    parentLi.dataset.expanded = '1';
                    parentLi.dataset.actionSuppressUntil = String(Date.now() + CLICK_EXPAND_SUPPRESS_MS);
                    positionRadialStack(parentLi, players[i].reminders.length);
                  }
                  return;
                }
              }
              players[i].reminders.splice(idx, 1);
              updateGrimoire();
              saveAppState();
            });
            iconEl.appendChild(delBtn);
          }

          // Touch long-press for reminder context menu (iOS Safari, Android)
          if (isTouchDevice) {
            const onPressStart = (e) => {
              try { e.preventDefault(); } catch (_) { }
              clearTimeout(longPressTimer);
              try { iconEl.classList.add('press-feedback'); } catch (_) { }
              const x = (e && (e.clientX || (e.touches && e.touches[0] && e.touches[0].clientX))) || 0;
              const y = (e && (e.clientY || (e.touches && e.touches[0] && e.touches[0].clientY))) || 0;
              longPressTimer = setTimeout(() => {
                try { iconEl.classList.remove('press-feedback'); } catch (_) { }
                showReminderContextMenu(x, y, i, idx);
              }, 600);
            };
            const onPressEnd = () => { clearTimeout(longPressTimer); try { iconEl.classList.remove('press-feedback'); } catch (_) { } };
            iconEl.addEventListener('pointerdown', onPressStart);
            iconEl.addEventListener('pointerup', onPressEnd);
            iconEl.addEventListener('pointercancel', onPressEnd);
            iconEl.addEventListener('pointerleave', onPressEnd);
            iconEl.addEventListener('touchstart', onPressStart, { passive: false });
            iconEl.addEventListener('touchend', onPressEnd);
            iconEl.addEventListener('touchcancel', onPressEnd);
            iconEl.addEventListener('contextmenu', (e) => { try { e.preventDefault(); } catch (_) { } });
          }

          remindersDiv.appendChild(iconEl);
        } else {
          const reminderEl = document.createElement('div');
          reminderEl.className = 'text-reminder';

          // Check if this is actually a text reminder with a label (legacy data)
          // If so, use the label as the display text
          const displayText = reminder.label || reminder.value || '';

          // Create a span for the text with dark background
          const textSpan = document.createElement('span');
          textSpan.className = 'text-reminder-content';
          textSpan.textContent = displayText;

          // Adjust font size based on text length
          const textLength = displayText.length;
          if (textLength > 40) {
            textSpan.style.fontSize = 'clamp(7px, calc(var(--token-size) * 0.06), 10px)';
          } else if (textLength > 20) {
            textSpan.style.fontSize = 'clamp(8px, calc(var(--token-size) * 0.07), 12px)';
          }

          reminderEl.appendChild(textSpan);

          reminderEl.style.transform = 'translate(-50%, -50%)';
          reminderEl.onclick = (e) => {
            e.stopPropagation();
            const parentLi = reminderEl.closest('li');
            if (parentLi) {
              const suppressUntil = parseInt(parentLi.dataset.actionSuppressUntil || '0', 10);
              if (parentLi.dataset.expanded !== '1' || Date.now() < suppressUntil) {
                // If collapsed, expand instead of acting
                if (parentLi.dataset.expanded !== '1') {
                  parentLi.dataset.expanded = '1';
                  parentLi.dataset.actionSuppressUntil = String(Date.now() + CLICK_EXPAND_SUPPRESS_MS);
                  positionRadialStack(parentLi, players[i].reminders.length);
                }
                return;
              }
            }
            // No-op on desktop; use hover edit icon instead
          };
          // Desktop hover actions on text reminders
          if (!isTouchDevice) {
            const editBtn2 = document.createElement('div');
            editBtn2.className = 'reminder-action edit';
            editBtn2.title = 'Edit';
            editBtn2.innerHTML = '<i class="fa-solid fa-pen"></i>';
            editBtn2.addEventListener('click', (e) => {
              e.stopPropagation();
              try { e.preventDefault(); } catch (_) { }
              const parentLi = editBtn2.closest('li');
              if (parentLi) {
                const suppressUntil = parseInt(parentLi.dataset.actionSuppressUntil || '0', 10);
                if (parentLi.dataset.expanded !== '1' || Date.now() < suppressUntil) {
                  if (parentLi.dataset.expanded !== '1') {
                    parentLi.dataset.expanded = '1';
                    parentLi.dataset.actionSuppressUntil = String(Date.now() + CLICK_EXPAND_SUPPRESS_MS);
                    positionRadialStack(parentLi, players[i].reminders.length);
                  }
                  return;
                }
              }
              const current = players[i].reminders[idx]?.label || players[i].reminders[idx]?.value || '';
              const next = prompt('Edit reminder', current);
              if (next !== null) {
                players[i].reminders[idx].value = next;
                if (players[i].reminders[idx].label !== undefined) {
                  players[i].reminders[idx].label = next;
                }
                updateGrimoire();
                saveAppState();
              }
            });
            reminderEl.appendChild(editBtn2);

            const delBtn2 = document.createElement('div');
            delBtn2.className = 'reminder-action delete';
            delBtn2.title = 'Delete';
            delBtn2.innerHTML = '<i class="fa-solid fa-trash"></i>';
            delBtn2.addEventListener('click', (e) => {
              e.stopPropagation();
              try { e.preventDefault(); } catch (_) { }
              const parentLi = delBtn2.closest('li');
              if (parentLi) {
                const suppressUntil = parseInt(parentLi.dataset.actionSuppressUntil || '0', 10);
                if (parentLi.dataset.expanded !== '1' || Date.now() < suppressUntil) {
                  if (parentLi.dataset.expanded !== '1') {
                    parentLi.dataset.expanded = '1';
                    parentLi.dataset.actionSuppressUntil = String(Date.now() + CLICK_EXPAND_SUPPRESS_MS);
                    positionRadialStack(parentLi, players[i].reminders.length);
                  }
                  return;
                }
              }
              players[i].reminders.splice(idx, 1);
              updateGrimoire();
              saveAppState();
            });
            reminderEl.appendChild(delBtn2);
          }
          // Touch long-press for reminder context menu
          if (isTouchDevice) {
            const onPressStart2 = (e) => {
              try { e.preventDefault(); } catch (_) { }
              clearTimeout(longPressTimer);
              try { reminderEl.classList.add('press-feedback'); } catch (_) { }
              const x = (e && (e.clientX || (e.touches && e.touches[0] && e.touches[0].clientX))) || 0;
              const y = (e && (e.clientY || (e.touches && e.touches[0] && e.touches[0].clientY))) || 0;
              longPressTimer = setTimeout(() => {
                try { reminderEl.classList.remove('press-feedback'); } catch (_) { }
                showReminderContextMenu(x, y, i, idx);
              }, 600);
            };
            const onPressEnd2 = () => { clearTimeout(longPressTimer); try { reminderEl.classList.remove('press-feedback'); } catch (_) { } };
            reminderEl.addEventListener('pointerdown', onPressStart2);
            reminderEl.addEventListener('pointerup', onPressEnd2);
            reminderEl.addEventListener('pointercancel', onPressEnd2);
            reminderEl.addEventListener('pointerleave', onPressEnd2);
            reminderEl.addEventListener('touchstart', onPressStart2, { passive: false });
            reminderEl.addEventListener('touchend', onPressEnd2);
            reminderEl.addEventListener('touchcancel', onPressEnd2);
            reminderEl.addEventListener('contextmenu', (e) => { try { e.preventDefault(); } catch (_) { } });
          }

          remindersDiv.appendChild(reminderEl);
        }
      });

      // After rendering, position all reminders and the plus button in a radial stack
      positionRadialStack(li, player.reminders.length);
    });

    // Position info icons after updating grimoire
    if ('ontouchstart' in window) {
      positionInfoIcons();
    }
  }

  // Arrange reminders and plus button along the line from token center to circle center
  function positionRadialStack(li, count) { positionRadialStackLayout(li, count, players); }

  // ensureGuidesSvg and drawRadialGuides moved to ui/guides.js

  function openCharacterModal(playerIndex) {
    if (!scriptData) {
      alert("Please load a script first.");
      return;
    }
    selectedPlayerIndex = playerIndex;
    characterModalPlayerName.textContent = players[playerIndex].name;
    populateCharacterGrid();
    characterModal.style.display = 'flex';
    characterSearch.value = '';
    characterSearch.focus();
  }

  function populateCharacterGrid() {
    characterGrid.innerHTML = '';
    const filter = characterSearch.value.toLowerCase();

    const filteredRoles = Object.values(allRoles)
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
    if (selectedPlayerIndex > -1) {
      players[selectedPlayerIndex].character = roleId;
      console.log(`Assigned character ${roleId} to player ${selectedPlayerIndex}`);
      updateGrimoire();
      characterModal.style.display = 'none';
      saveAppState();
    }
  }

  function openTextReminderModal(playerIndex, reminderIndex = -1, existingText = '') {
    editingReminder = { playerIndex, reminderIndex };
    reminderTextInput.value = existingText;
    textReminderModal.style.display = 'flex';
    reminderTextInput.focus();
  }

  saveReminderBtn.onclick = () => {
    const text = reminderTextInput.value.trim();
    const { playerIndex, reminderIndex } = editingReminder;
    if (text) {
      if (reminderIndex > -1) {
        // Update existing reminder - preserve label if it exists
        players[playerIndex].reminders[reminderIndex].value = text;
        if (players[playerIndex].reminders[reminderIndex].label !== undefined) {
          players[playerIndex].reminders[reminderIndex].label = text;
        }
      } else {
        players[playerIndex].reminders.push({ type: 'text', value: text });
      }
    } else if (reminderIndex > -1) {
      players[playerIndex].reminders.splice(reminderIndex, 1);
    }
    updateGrimoire();
    saveAppState();
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

  // createCurvedLabelSvg moved to ui/svg.js

  // createDeathRibbonSvg moved to ui/svg.js

  function openReminderTokenModal(playerIndex) {
    selectedPlayerIndex = playerIndex;
    if (reminderTokenModalPlayerName) reminderTokenModalPlayerName.textContent = players[playerIndex].name;
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
        Object.values(allRoles || {}).forEach(role => {
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
          players[selectedPlayerIndex].reminders.push({ type: 'icon', id: token.id, image: token.image, label, rotation: 0 });
          updateGrimoire();
          saveAppState();
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
      if (players.length > 0) {
        console.log('Container resized, repositioning players...');
        requestAnimationFrame(repositionPlayers);
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
        if (players.length > 0) {
          console.log('Window resized, repositioning players...');
          requestAnimationFrame(repositionPlayers);
        }
      }, 250);
    });
  }

  // Also reposition players when the page becomes visible (in case of tab switching)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && players.length > 0) {
      requestAnimationFrame(repositionPlayers);
    }
  });

  function displayScript(data) {
    console.log('Displaying script with', data.length, 'characters');
    characterSheet.innerHTML = '';

    // Group characters by team if we have resolved role data
    const teamGroups = {};
    Object.values(allRoles).forEach(role => {
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
    allRoles = { ...(baseRoles || {}) };
    if (includeTravellers) {
      allRoles = { ...allRoles, ...(extraTravellerRoles || {}) };
    }
    // Re-render character sheet and, if modal is open, the character grid
    if (Array.isArray(scriptData)) displayScript(scriptData);
    if (characterModal && characterModal.style.display === 'flex') {
      populateCharacterGrid();
    }
  }

  // Helper to get role by id respecting traveller toggle
  function getRoleById(roleId) {
    return allRoles[roleId] || baseRoles[roleId] || extraTravellerRoles[roleId] || null;
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
    prefersOverlaySidebar,
    isTouchDevice,
    repositionPlayers
  });

  // Load histories and render lists
  loadHistories();
  renderScriptHistory({ scriptHistoryList, scriptHistory });
  renderGrimoireHistory();

  // Restore previous session (script and grimoire)
  loadAppState();

  // In-app tour
  initInAppTour();
});

// Tooltip and info icon helpers are imported from ui/tooltip.js
