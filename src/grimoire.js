import { resolveAssetPath } from '../utils.js';
import { saveAppState } from './app.js';
import { openCharacterModal } from './character.js';
import { BG_STORAGE_KEY, CLICK_EXPAND_SUPPRESS_MS, TOUCH_EXPAND_SUPPRESS_MS, isTouchDevice } from './constants.js';
import { setupTouchHandling } from './utils/touchHandlers.js';
import { snapshotCurrentGrimoire } from './history/grimoire.js';
import { openReminderTokenModal, openTextReminderModal } from './reminder.js';
import { positionRadialStack, repositionPlayers } from './ui/layout.js';
import { createCurvedLabelSvg, createDeathRibbonSvg, createDeathVoteIndicatorSvg } from './ui/svg.js';
import { positionInfoIcons, positionNightOrderNumbers, positionTooltip, showTouchAbilityPopup } from './ui/tooltip.js';
import { getReminderTimestamp, isReminderVisible, updateDayNightUI, calculateNightOrder, shouldShowNightOrder, saveCurrentPhaseState } from './dayNightTracking.js';
import { createBluffTokensContainer, updateAllBluffTokens } from './bluffTokens.js';

// Helper function to get accurate bounding rect accounting for iOS Safari viewport issues
// Expose certain reminder helpers globally for testing fallbacks
try { window.openReminderTokenModal = openReminderTokenModal; } catch (_) { }
function getAccurateRect(element) {
  const rect = element.getBoundingClientRect();

  // Check if visualViewport is available (for iOS Safari zoom/scroll compensation)
  if (window.visualViewport) {
    const scale = window.visualViewport.scale || 1;
    const offsetLeft = window.visualViewport.offsetLeft || 0;
    const offsetTop = window.visualViewport.offsetTop || 0;

    return {
      left: rect.left * scale + offsetLeft,
      right: rect.right * scale + offsetLeft,
      top: rect.top * scale + offsetTop,
      bottom: rect.bottom * scale + offsetTop,
      width: rect.width * scale,
      height: rect.height * scale
    };
  }

  // Fallback to standard getBoundingClientRect for browsers without visualViewport
  return rect;
}

// Helper function to check if a player element is overlapping with another player
function isPlayerOverlapping({ listItem }) {
  const rect1 = getAccurateRect(listItem);
  const allPlayers = document.querySelectorAll('#player-circle li');

  for (let i = 0; i < allPlayers.length; i++) {
    const otherPlayer = allPlayers[i];
    if (otherPlayer === listItem) continue;

    const rect2 = getAccurateRect(otherPlayer);

    // Check if rectangles overlap
    const overlap = !(rect1.right < rect2.left ||
      rect1.left > rect2.right ||
      rect1.bottom < rect2.top ||
      rect1.top > rect2.bottom);

    if (overlap) {
      // Check if the other player has a higher z-index (is on top)
      const zIndex1 = parseInt(listItem.style.zIndex || window.getComputedStyle(listItem).zIndex, 10) || 0;
      const zIndex2 = parseInt(otherPlayer.style.zIndex || window.getComputedStyle(otherPlayer).zIndex, 10) || 0;

      // If the other player has a higher or equal z-index, this player is covered
      if (zIndex2 >= zIndex1) {
        return true;
      }
    }
  }

  return false;
}

// Helper function to handle two-tap behavior for any element within a player
function handlePlayerElementTouch({ e, listItem, actionCallback }) {
  if (!('ontouchstart' in window)) return;

  e.stopPropagation();
  e.preventDefault();

  // Clear any other raised players first
  document.querySelectorAll('#player-circle li[data-raised="true"]').forEach(el => {
    if (el !== listItem) {
      delete el.dataset.raised;
      // Restore original z-index
      el.style.zIndex = el.dataset.originalLiZIndex || '';
      delete el.dataset.originalLiZIndex;
    }
  });

  // Check if this player is already raised
  const wasRaised = listItem.dataset.raised === 'true';

  // Check if player is overlapping with another player
  const isOverlapping = isPlayerOverlapping({ listItem });

  if (isOverlapping && !wasRaised) {
    // First tap on overlapping player: just raise it
    listItem.dataset.raised = 'true';
    listItem.dataset.originalLiZIndex = listItem.style.zIndex || '';
    listItem.style.zIndex = '200'; // Raise above other players
    return; // Don't trigger action
  }

  // Either not partially covered, or already raised - trigger action
  if (actionCallback) {
    actionCallback(e);
  }

  // Keep the player raised after performing the action
  // It will only be un-raised when clicking outside (handled by global listener)
}

// Helper function to set up touch event handlers for player tokens
function setupPlayerTokenTouchHandlers({ tokenEl, grimoireState, playerIndex, listItem, actionCallback, setTouchOccurred }) {
  return setupTouchHandling({
    element: tokenEl,
    onTap: (e) => {
      handlePlayerElementTouch({
        e,
        listItem,
        actionCallback,
        grimoireState,
        playerIndex
      });
    },
    onLongPress: (e, x, y) => {
      // Clear any existing long press timer before showing menu
      clearTimeout(grimoireState.longPressTimer);
      showPlayerContextMenu({ grimoireState, x, y, playerIndex });
    },
    setTouchOccurred,
    shouldSkip: (e) => {
      const target = e.target;
      return (target && (target.closest('.death-ribbon') || target.classList.contains('death-ribbon'))) ||
        (target && target.classList.contains('ability-info-icon'));
    }
  });
}

// Helper function to set up player name click and touch handlers
function setupPlayerNameHandlers({ listItem, grimoireState, playerIndex }) {
  const handlePlayerNameClick = (e) => {
    e.stopPropagation();
    const currentName = grimoireState.players[playerIndex].name;
    const newName = prompt('Enter player name:', currentName);
    if (newName) {
      grimoireState.players[playerIndex].name = newName;
      updateGrimoire({ grimoireState });
      saveAppState({ grimoireState });
    }
  };

  // Add click handler
  listItem.querySelector('.player-name').onclick = handlePlayerNameClick;

  // Add touchstart handler for player name with two-tap behavior
  if ('ontouchstart' in window) {
    listItem.querySelector('.player-name').addEventListener('touchstart', (e) => {
      handlePlayerElementTouch({
        e,
        listItem,
        actionCallback: handlePlayerNameClick,
        grimoireState,
        playerIndex
      });
    });
  }
}

function getRoleById({ grimoireState, roleId }) {
  return grimoireState.allRoles[roleId] || grimoireState.baseRoles[roleId] || grimoireState.extraTravellerRoles[roleId] || null;
}

function getVisibleRemindersCount({ grimoireState, playerIndex }) {
  const player = grimoireState.players[playerIndex];
  if (!player || !player.reminders) return 0;

  let count = 0;
  player.reminders.forEach(reminder => {
    if (isReminderVisible(grimoireState, reminder.reminderId)) {
      count++;
    }
  });
  return count;
}

// Centralized grimoire visibility helpers
export function applyGrimoireHiddenState({ grimoireState }) {
  try { document.body.classList.toggle('grimoire-hidden', !!grimoireState.grimoireHidden); } catch (_) { }
  const btn = document.getElementById('reveal-assignments');
  if (btn) btn.textContent = grimoireState.grimoireHidden ? 'Show Grimoire' : 'Hide Grimoire';
  // Re-render so token visuals/labels match hidden state immediately
  updateGrimoire({ grimoireState });
}

export function setGrimoireHidden({ grimoireState, hidden }) {
  grimoireState.grimoireHidden = !!hidden;
  applyGrimoireHiddenState({ grimoireState });
  saveAppState({ grimoireState });
}

export function toggleGrimoireHidden({ grimoireState }) {
  setGrimoireHidden({ grimoireState, hidden: !grimoireState.grimoireHidden });
}

export function hideGrimoire({ grimoireState }) { setGrimoireHidden({ grimoireState, hidden: true }); }
export function showGrimoire({ grimoireState }) { setGrimoireHidden({ grimoireState, hidden: false }); }

// A lot of similar code in rebuildPlayerCircleUiPreserveState
export function setupGrimoire({ grimoireState, grimoireHistoryList, count }) {
  const playerCircle = document.getElementById('player-circle');
  const playerCountInput = document.getElementById('player-count');
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
    deathVote: false
  }));
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

    // Track if a touch event has occurred to prevent click after touch
    const tokenEl = listItem.querySelector('.player-token');
    let touchOccurred = false;

    // Only the main token area opens the character modal; ribbon handles dead toggle
    tokenEl.onclick = (e) => {
      // Ignore click if it was triggered by a touch event
      if (touchOccurred) {
        touchOccurred = false;
        return;
      }

      // Block any token interaction before game starts
      if (!grimoireState.gameStarted) return;

      const target = e.target;
      if (target && (target.closest('.death-ribbon') || target.classList.contains('death-ribbon'))) {
        return; // handled by ribbon click
      }
      if (target && target.classList.contains('ability-info-icon')) {
        return; // handled by info icon
      }
      if (grimoireState && grimoireState.playerSetup && grimoireState.playerSetup.selectionActive) {
        const overlay = listItem.querySelector('.number-overlay');
        const canPick = overlay && !overlay.classList.contains('disabled');
        if (canPick && window.openNumberPickerForSelection) window.openNumberPickerForSelection(i);
      } else if (grimoireState && !grimoireState.grimoireHidden) {
        openCharacterModal({ grimoireState, playerIndex: i });
      }
    };

    // Set up touch handling for player token
    setupPlayerTokenTouchHandlers({
      tokenEl,
      grimoireState,
      playerIndex: i,
      listItem,
      actionCallback: () => {
        if (grimoireState && grimoireState.playerSetup && grimoireState.playerSetup.selectionActive) {
          if (window.openNumberPickerForSelection) window.openNumberPickerForSelection(i);
        } else if (grimoireState && !grimoireState.grimoireHidden) {
          openCharacterModal({ grimoireState, playerIndex: i });
        }
      },
      setTouchOccurred: (value) => { touchOccurred = value; }
    });

    // Player context menu: right-click
    listItem.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      showPlayerContextMenu({ grimoireState, x: e.clientX, y: e.clientY, playerIndex: i });
    });

    // Set up click and touch handling for player name
    setupPlayerNameHandlers({ listItem, grimoireState, playerIndex: i });

    listItem.querySelector('.reminder-placeholder').onclick = (e) => {
      e.stopPropagation();
      if (!grimoireState.gameStarted) return; // Gate adding reminders pre-game
      const thisLi = listItem;
      if (thisLi.dataset.expanded !== '1') {
        const allLis = document.querySelectorAll('#player-circle li');
        let someoneExpanded = false;
        allLis.forEach(el => {
          if (el !== thisLi && el.dataset.expanded === '1') {
            someoneExpanded = true;
            el.dataset.expanded = '0';
            const idx = Array.from(allLis).indexOf(el);
            positionRadialStack(el, getVisibleRemindersCount({ grimoireState, playerIndex: idx }), grimoireState.players);
          }
        });
        if (someoneExpanded) {
          thisLi.dataset.expanded = '1';
          thisLi.dataset.actionSuppressUntil = String(Date.now() + CLICK_EXPAND_SUPPRESS_MS);
          positionRadialStack(thisLi, getVisibleRemindersCount({ grimoireState, playerIndex: i }), grimoireState.players);
          return;
        }
      }
      if (isTouchDevice()) {
        openReminderTokenModal({ grimoireState, playerIndex: i });
      } else if (e.altKey) {
        openTextReminderModal({ grimoireState, playerIndex: i });
      } else {
        openReminderTokenModal({ grimoireState, playerIndex: i });
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
          positionRadialStack(el, getVisibleRemindersCount({ grimoireState, playerIndex: idx }), grimoireState.players);
        }
      });
      listItem.dataset.expanded = '1';
      // Only set suppression on touch, and only when changing from collapsed -> expanded
      if (isTouchDevice() && !wasExpanded) {
        listItem.dataset.actionSuppressUntil = String(Date.now() + CLICK_EXPAND_SUPPRESS_MS);
      }
      positionRadialStack(listItem, getVisibleRemindersCount({ grimoireState, playerIndex: i }), grimoireState.players);
    };
    const collapse = () => { listItem.dataset.expanded = '0'; positionRadialStack(listItem, getVisibleRemindersCount({ grimoireState, playerIndex: i }), grimoireState.players); };
    if (!isTouchDevice()) {
      // Only expand on hover over reminders and placeholder elements
      const remindersEl = listItem.querySelector('.reminders');
      const placeholderEl = listItem.querySelector('.reminder-placeholder');

      if (remindersEl) {
        remindersEl.addEventListener('mouseenter', expand);
        remindersEl.addEventListener('mouseleave', collapse);
        remindersEl.addEventListener('pointerenter', expand);
        remindersEl.addEventListener('pointerleave', collapse);
      }

      if (placeholderEl) {
        placeholderEl.addEventListener('mouseenter', expand);
        placeholderEl.addEventListener('mouseleave', collapse);
        placeholderEl.addEventListener('pointerenter', expand);
        placeholderEl.addEventListener('pointerleave', collapse);
      }
    }
    // Touch: expand on any tap; only suppress synthetic click if tap started on reminders
    listItem.addEventListener('touchstart', (e) => {
      const target = e.target;

      // Check if tapped on death ribbon
      if (target && target.closest('.death-ribbon')) {
        return; // Don't expand for death ribbon taps
      }

      // Check if tapped on player token (character circle)
      if (target && target.closest('.player-token')) {
        return; // Don't expand for character circle taps
      }

      // Check if tapped on player name
      if (target && target.closest('.player-name')) {
        return; // Don't expand for player name taps
      }

      // Only expand if tapped on reminders or reminder placeholder
      const tappedReminders = !!(target && target.closest('.reminders'));
      const tappedPlaceholder = !!(target && target.closest('.reminder-placeholder'));

      if (tappedReminders || tappedPlaceholder) {
        if (tappedReminders) {
          try { e.preventDefault(); } catch (_) { }
          listItem.dataset.touchSuppressUntil = String(Date.now() + TOUCH_EXPAND_SUPPRESS_MS);
        }
        expand();
        positionRadialStack(listItem, getVisibleRemindersCount({ grimoireState, playerIndex: i }), grimoireState.players);
      }
    }, { passive: false });

    // (desktop) no extra mousedown handler; rely on hover/pointerenter and explicit clicks on reminders

    // Install one-time outside click/tap collapse for touch devices
    if (isTouchDevice() && !grimoireState.outsideCollapseHandlerInstalled) {
      grimoireState.outsideCollapseHandlerInstalled = true;
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
            positionRadialStack(el, getVisibleRemindersCount({ grimoireState, playerIndex: Array.from(allLis).indexOf(el) }), grimoireState.players);
          }
        });
      };
      document.addEventListener('click', maybeCollapseOnOutside, true);
      document.addEventListener('touchstart', maybeCollapseOnOutside, { passive: true, capture: true });
    }

    // No capture intercepts; rely on pointer-events gating and the touchstart handler above
  });

  // Add bluff tokens container
  const center = document.getElementById('center');
  const existingContainer = document.getElementById('bluff-tokens-container');
  if (existingContainer) {
    existingContainer.remove();
  }
  const bluffContainer = createBluffTokensContainer({ grimoireState });
  center.appendChild(bluffContainer);

  // Use requestAnimationFrame to ensure DOM is fully rendered
  requestAnimationFrame(() => {
    repositionPlayers({ grimoireState });
    updateGrimoire({ grimoireState });
    saveAppState({ grimoireState });
    renderSetupInfo({ grimoireState });
  });
}

function countTravelers({ grimoireState }) {
  let travelerCount = 0;
  grimoireState.players.forEach(player => {
    if (player.character) {
      const role = getRoleById({ grimoireState, roleId: player.character });
      if (role && role.team === 'traveller') {
        travelerCount++;
      }
    }
  });
  return travelerCount;
}

function lookupCountsForPlayers({ grimoireState, count }) {
  if (!Array.isArray(grimoireState.playerSetupTable)) return null;
  const row = grimoireState.playerSetupTable.find(r => Number(r.players) === Number(count));
  return row || null;
}

export function ensureReminderContextMenu({ grimoireState }) {
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
    hideReminderContextMenu({ grimoireState });
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
    hideReminderContextMenu({ grimoireState });
    if (playerIndex < 0 || reminderIndex < 0) return;
    if (!grimoireState.players[playerIndex] || !grimoireState.players[playerIndex].reminders) return;
    grimoireState.players[playerIndex].reminders.splice(reminderIndex, 1);

    // Save phase state if day/night tracking is enabled
    if (grimoireState.dayNightTracking && grimoireState.dayNightTracking.enabled) {
      saveCurrentPhaseState(grimoireState);
    }

    updateGrimoire({ grimoireState });
    saveAppState({ grimoireState });
  });

  menu.appendChild(editBtn);
  menu.appendChild(deleteBtn);
  document.body.appendChild(menu);

  grimoireState.reminderContextMenu = menu;
  return menu;
}

export function hideReminderContextMenu({ grimoireState }) {
  if (grimoireState.reminderContextMenu) grimoireState.reminderContextMenu.style.display = 'none';
  grimoireState.reminderContextTarget = { playerIndex: -1, reminderIndex: -1 };
  clearTimeout(grimoireState.longPressTimer);
  // Remove shield if no other menus are open
  maybeRemoveContextShield({ grimoireState });
}

export function showPlayerContextMenu({ grimoireState, x, y, playerIndex }) {
  const menu = ensurePlayerContextMenu({ grimoireState });
  grimoireState.contextMenuTargetIndex = playerIndex;
  // Set a timestamp when the menu was opened
  grimoireState.menuOpenedAt = Date.now();
  // Install gesture shield on touch devices to prevent page scroll and capture gesture
  try {
    if (isTouchDevice()) ensureContextShield({ grimoireState });
  } catch (_) { }

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

export function hidePlayerContextMenu({ grimoireState }) {
  if (grimoireState.playerContextMenu) grimoireState.playerContextMenu.style.display = 'none';
  grimoireState.contextMenuTargetIndex = -1;
  grimoireState.menuOpenedAt = 0;
  clearTimeout(grimoireState.longPressTimer);
  // Remove shield if no other menus are open
  maybeRemoveContextShield({ grimoireState });
}

export function ensurePlayerContextMenu({ grimoireState }) {
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

  // Helper function to handle button actions only on proper tap/click
  const addButtonHandler = (button, action) => {
    let touchMoved = false;
    let lastTouchEnd = 0;

    button.addEventListener('touchstart', (e) => {
      touchMoved = false;
      e.stopPropagation();
    });

    button.addEventListener('touchmove', (e) => {
      touchMoved = true;
      e.stopPropagation();
    });

    button.addEventListener('touchend', (e) => {
      e.stopPropagation();
      e.preventDefault();
      if (!touchMoved) {
        lastTouchEnd = Date.now();
        action();
      }
    });

    button.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      // Skip click if it was triggered by a recent touch
      const timeSinceTouchEnd = Date.now() - lastTouchEnd;
      if (timeSinceTouchEnd > 300) {
        action();
      }
    });
  };

  addButtonHandler(addBeforeBtn, () => {
    const idx = grimoireState.contextMenuTargetIndex;
    hidePlayerContextMenu({ grimoireState });
    if (idx < 0) return;
    if (grimoireState.players.length >= 20) return; // clamp to max
    const newName = `Player ${grimoireState.players.length + 1}`;
    const newPlayer = { name: newName, character: null, reminders: [], dead: false, deathVote: false };
    grimoireState.players.splice(idx, 0, newPlayer);
    rebuildPlayerCircleUiPreserveState({ grimoireState });
  });

  addButtonHandler(addAfterBtn, () => {
    const idx = grimoireState.contextMenuTargetIndex;
    hidePlayerContextMenu({ grimoireState });
    if (idx < 0) return;
    if (grimoireState.players.length >= 20) return; // clamp to max
    const newName = `Player ${grimoireState.players.length + 1}`;
    const newPlayer = { name: newName, character: null, reminders: [], dead: false, deathVote: false };
    grimoireState.players.splice(idx + 1, 0, newPlayer);
    rebuildPlayerCircleUiPreserveState({ grimoireState });
  });

  addButtonHandler(removeBtn, () => {
    const idx = grimoireState.contextMenuTargetIndex;
    hidePlayerContextMenu({ grimoireState });
    if (idx < 0) return;
    if (grimoireState.players.length <= 5) return; // keep within 5..20
    grimoireState.players.splice(idx, 1);
    rebuildPlayerCircleUiPreserveState({ grimoireState });
  });

  menu.appendChild(addBeforeBtn);
  menu.appendChild(addAfterBtn);
  menu.appendChild(removeBtn);
  document.body.appendChild(menu);

  grimoireState.playerContextMenu = menu;
  return menu;
}

// Context gesture shield to reliably handle touch interaction while a context menu is open
function ensureContextShield({ grimoireState }) {
  let shield = document.getElementById('context-shield');
  if (!shield) {
    shield = document.createElement('div');
    shield.id = 'context-shield';
    document.body.appendChild(shield);
  }

  // Track whether we should commit selection on first release
  let justOpened = true;

  const highlightAt = (clientX, clientY) => {
    // highlightAt helper currently only relies on elementFromPoint side-effects; remove unused variable to satisfy linter
    document.elementFromPoint(clientX, clientY);
    const menu = grimoireState.playerContextMenu;
    if (menu && menu.style.display === 'block') {
      // Optionally add hover highlighting if buttons have :hover states via CSS
      // No-op here; pointer events already focus the element under finger
    }
  };

  const commitAt = (clientX, clientY) => {
    const menu = grimoireState.playerContextMenu;
    if (!menu || menu.style.display !== 'block') return false;
    const el = document.elementFromPoint(clientX, clientY);
    const button = el && el.closest && el.closest('#player-context-menu button:not(:disabled)');
    if (button && menu.contains(button)) {
      // Simulate a click without letting default page gestures run
      try { button.click(); } catch (_) { }
      return true;
    }
    return false;
  };

  const onPointerDown = (e) => {
    try { e.preventDefault(); } catch (_) { }
    // Keep interaction confined to the shield; highlight if inside menu
    highlightAt(e.clientX, e.clientY);
  };
  const onPointerMove = (e) => {
    try { e.preventDefault(); } catch (_) { }
    highlightAt(e.clientX, e.clientY);
  };
  const onPointerUp = (e) => {
    try { e.preventDefault(); } catch (_) { }
    const selected = commitAt(e.clientX, e.clientY);
    if (justOpened && !selected) { justOpened = false; return; }
    // If an action was taken or it wasn't the first lift, hide the shield if menu closed
    maybeRemoveContextShield({ grimoireState });
  };

  // Register listeners (once per open)
  shield.addEventListener('pointerdown', onPointerDown, { passive: false });
  shield.addEventListener('pointermove', onPointerMove, { passive: false });
  shield.addEventListener('pointerup', onPointerUp, { passive: false });

  // Prevent ghost clicks while shield is active
  const blockClick = (ev) => {
    const menuEl = grimoireState.playerContextMenu;
    const remEl = grimoireState.reminderContextMenu;
    const isInsideMenu = (menuEl && menuEl.contains(ev.target)) || (remEl && remEl.contains(ev.target));
    if (!isInsideMenu) {
      ev.stopPropagation();
      ev.preventDefault();
    }
  };
  document.addEventListener('click', blockClick, true);

  // Store cleanup for later
  grimoireState._contextShieldCleanup = () => {
    try { shield.removeEventListener('pointerdown', onPointerDown, { passive: false }); } catch (_) { }
    try { shield.removeEventListener('pointermove', onPointerMove, { passive: false }); } catch (_) { }
    try { shield.removeEventListener('pointerup', onPointerUp, { passive: false }); } catch (_) { }
    try { document.removeEventListener('click', blockClick, true); } catch (_) { }
    try { shield.remove(); } catch (_) { }
  };

  return shield;
}

function maybeRemoveContextShield({ grimoireState }) {
  const anyMenuOpen = !!(grimoireState.playerContextMenu && grimoireState.playerContextMenu.style.display === 'block') ||
    !!(grimoireState.reminderContextMenu && grimoireState.reminderContextMenu.style.display === 'block');
  if (anyMenuOpen) return;
  if (grimoireState._contextShieldCleanup) {
    try { grimoireState._contextShieldCleanup(); } catch (_) { }
    grimoireState._contextShieldCleanup = null;
  }
}

export function showReminderContextMenu({ grimoireState, x, y, playerIndex, reminderIndex }) {
  const menu = ensureReminderContextMenu({ grimoireState });
  grimoireState.reminderContextTarget = { playerIndex, reminderIndex };
  // Install gesture shield on touch devices
  try {
    if (isTouchDevice()) ensureContextShield({ grimoireState });
  } catch (_) { }
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

export function renderSetupInfo({ grimoireState }) {
  const setupInfoEl = document.getElementById('setup-info');
  if (!setupInfoEl) return;
  const totalPlayers = grimoireState.players.length;
  const travelerCount = countTravelers({ grimoireState });
  const adjustedCount = totalPlayers - travelerCount;
  const row = lookupCountsForPlayers({ grimoireState, count: adjustedCount });
  // Prefer parsed meta name; otherwise keep any existing hint
  let scriptName = grimoireState.scriptMetaName || '';
  if (!scriptName && Array.isArray(grimoireState.scriptData)) {
    const meta = grimoireState.scriptData.find(x => x && typeof x === 'object' && x.id === '_meta');
    if (meta && meta.name) scriptName = String(meta.name);
  }
  if (!row && !scriptName) {
    setupInfoEl.textContent = 'Select a script and add players from the sidebar.';
    return;
  }

  // Build display with script name on first line, counts on second line
  let displayHtml = '';
  if (scriptName) {
    displayHtml = `<div>${scriptName}</div>`;
  }

  // Build second line with player counts
  const countsLine = [];

  // Only show alive count if we have a valid role distribution
  if (totalPlayers > 0 && row) {
    const alivePlayers = grimoireState.players.filter(player => !player.dead).length;
    countsLine.push(`${alivePlayers}/${totalPlayers}`);
  }

  if (row) {
    // Add colored role counts
    const roleCountsHtml = [
      `<span class="townsfolk-count">${row.townsfolk}</span>`,
      `<span class="outsider-count">${row.outsiders}</span>`,
      `<span class="minion-count">${row.minions}</span>`,
      `<span class="demon-count">${row.demons}</span>`
    ].join('/');
    countsLine.push(roleCountsHtml);
  }

  if (countsLine.length > 0) {
    displayHtml += `<div>${countsLine.join('  ')}</div>`;
  }

  setupInfoEl.innerHTML = displayHtml;
  if (grimoireState.winner) {
    const msg = document.createElement('div');
    msg.id = 'winner-message';
    msg.style.marginTop = '8px';
    msg.style.fontWeight = 'bold';
    msg.style.color = grimoireState.winner === 'good' ? '#6bff8a' : '#ff6b6b';
    msg.textContent = `${grimoireState.winner === 'good' ? 'Good' : 'Evil'} has won`;
    setupInfoEl.appendChild(msg);
  }
}


export function updateGrimoire({ grimoireState }) {
  const abilityTooltip = document.getElementById('ability-tooltip');
  const playerCircle = document.getElementById('player-circle');
  const listItems = playerCircle.querySelectorAll('li');

  // Update setup info (which now includes alive count)
  renderSetupInfo({ grimoireState });

  // Ensure any lingering tooltip is hidden if we are masking the grimoire
  if (grimoireState.grimoireHidden && abilityTooltip) {
    abilityTooltip.classList.remove('show');
  }

  listItems.forEach((li, i) => {
    const player = grimoireState.players[i];
    const playerNameEl = li.querySelector('.player-name');
    playerNameEl.textContent = player.name;

    // Check if player is in NW or NE quadrant
    const angle = parseFloat(li.dataset.angle || '0');

    // Calculate the actual y position to determine quadrant
    const y = Math.sin(angle);
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

    // In hidden mode, remove any touch-mode ability icons; keep token node (preserves click handler)
    if (grimoireState.grimoireHidden && tokenDiv) {
      li.querySelectorAll('.ability-info-icon').forEach((node) => node.remove());
    }

    if (!grimoireState.grimoireHidden && player.character) {
      const role = getRoleById({ grimoireState, roleId: player.character });
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
            if (grimoireState.grimoireHidden) return;
            if (role.ability) {
              abilityTooltip.textContent = role.ability;
              abilityTooltip.classList.add('show');
              positionTooltip(e.target, abilityTooltip);
            }
          });

          tokenDiv.addEventListener('mouseleave', () => {
            abilityTooltip.classList.remove('show');
          });
        } else if (role.ability && !grimoireState.grimoireHidden) {
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
      const player = grimoireState.players[i];
      // Phase 1: Alive -> Dead
      if (!player.dead) { // Phase 1: Alive -> Dead
        grimoireState.players[i].dead = true;
        grimoireState.players[i].deathVote = false; // initialize unused vote
      } else if (player.dead && !player.deathVote) { // Phase 2: mark vote used
        grimoireState.players[i].deathVote = true;
      } else if (player.dead && player.deathVote) { // Phase 3: confirm resurrect
        if (window.confirm('Resurrect this player?')) {
          grimoireState.players[i].dead = false;
          grimoireState.players[i].deathVote = false;
        } else {
          return; // abort update/save if cancelled
        }
      }

      if (grimoireState.dayNightTracking && grimoireState.dayNightTracking.enabled) {
        saveCurrentPhaseState(grimoireState);
      }
      updateGrimoire({ grimoireState });
      saveAppState({ grimoireState });
    };

    // Add touch handler for death ribbon with two-tap behavior
    if ('ontouchstart' in window) {
      ribbon.addEventListener('touchstart', (e) => {
        handlePlayerElementTouch({
          e,
          listItem: li,
          actionCallback: handleRibbonToggle,
          grimoireState,
          playerIndex: i
        });
      });
    }

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

    // Add death vote indicator for dead players
    const existingDeathVote = tokenDiv.querySelector('.death-vote-indicator');
    if (existingDeathVote) existingDeathVote.remove();

    if (player.dead && !player.deathVote) {
      const deathVoteIndicator = createDeathVoteIndicatorSvg();
      const handleDeathVoteClick = (e) => {
        e.stopPropagation();
        const player = grimoireState.players[i];
        // Ghost vote click mirrors ribbon second phase: mark vote used if still available
        if (player.dead && !player.deathVote) {
          grimoireState.players[i].deathVote = true;
          if (grimoireState.dayNightTracking && grimoireState.dayNightTracking.enabled) {
            saveCurrentPhaseState(grimoireState);
          }
          updateGrimoire({ grimoireState });
          saveAppState({ grimoireState });
        }
      };

      deathVoteIndicator.addEventListener('click', handleDeathVoteClick);

      // Add touch handler for death vote with two-tap behavior
      if ('ontouchstart' in window) {
        deathVoteIndicator.addEventListener('touchstart', (e) => {
          handlePlayerElementTouch({
            e,
            listItem: li,
            actionCallback: handleDeathVoteClick,
            grimoireState,
            playerIndex: i
          });
        });
      }

      tokenDiv.appendChild(deathVoteIndicator);
    }

    // Add night order number if applicable
    const existingNightOrder = tokenDiv.querySelector('[data-testid="night-order-number"]');
    if (existingNightOrder) existingNightOrder.remove();

    if (shouldShowNightOrder(grimoireState)) {
      const nightOrderMap = calculateNightOrder(grimoireState);
      if (nightOrderMap[i]) {
        const nightOrderDiv = document.createElement('div');
        nightOrderDiv.setAttribute('data-testid', 'night-order-number');
        nightOrderDiv.className = 'night-order-number';
        nightOrderDiv.textContent = nightOrderMap[i];
        nightOrderDiv.dataset.playerIndex = i;
        tokenDiv.appendChild(nightOrderDiv);
      }
    }

    const remindersDiv = li.querySelector('.reminders');
    remindersDiv.innerHTML = '';

    // Create reminder elements; positions are handled by positionRadialStack()
    // Filter reminders based on visibility and add visible count
    let visibleRemindersCount = 0;
    player.reminders.forEach((reminder, idx) => {
      // Check if reminder should be visible based on day/night tracking
      if (!isReminderVisible(grimoireState, reminder.reminderId)) {
        return; // Skip this reminder
      }
      visibleRemindersCount++;

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
            positionRadialStack(parentLi, getVisibleRemindersCount({ grimoireState, playerIndex: i }));
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
        if (!isTouchDevice()) {
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
                  positionRadialStack(parentLi, getVisibleRemindersCount({ grimoireState, playerIndex: i }));
                }
                return;
              }
            }
            const current = grimoireState.players[i].reminders[idx]?.label || grimoireState.players[i].reminders[idx]?.value || '';
            const next = prompt('Edit reminder', current);
            if (next !== null) {
              grimoireState.players[i].reminders[idx].label = next;
              updateGrimoire({ grimoireState });
              saveAppState({ grimoireState });
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
                  positionRadialStack(parentLi, getVisibleRemindersCount({ grimoireState, playerIndex: i }));
                }
                return;
              }
            }
            grimoireState.players[i].reminders.splice(idx, 1);
            updateGrimoire({ grimoireState });
            saveAppState({ grimoireState });
          });
          iconEl.appendChild(delBtn);
        }

        // Touch long-press for reminder context menu (iOS Safari, Android)
        if (isTouchDevice()) {
          const onPressStart = (e) => {
            try { e.preventDefault(); } catch (_) { }
            clearTimeout(grimoireState.longPressTimer);
            try { iconEl.classList.add('press-feedback'); } catch (_) { }
            const x = (e && (e.clientX || (e.touches && e.touches[0] && e.touches[0].clientX))) || 0;
            const y = (e && (e.clientY || (e.touches && e.touches[0] && e.touches[0].clientY))) || 0;
            grimoireState.longPressTimer = setTimeout(() => {
              try { iconEl.classList.remove('press-feedback'); } catch (_) { }
              showReminderContextMenu({ grimoireState, x, y, playerIndex: i, reminderIndex: idx });
            }, 600);
          };
          const onPressEnd = () => {
            // Only clear the timer if the reminder menu is not already visible
            if (!grimoireState.reminderContextMenu || grimoireState.reminderContextMenu.style.display !== 'block') {
              clearTimeout(grimoireState.longPressTimer);
            }
            try { iconEl.classList.remove('press-feedback'); } catch (_) { }
          };
          iconEl.addEventListener('pointerdown', onPressStart);
          iconEl.addEventListener('pointerup', onPressEnd);
          iconEl.addEventListener('pointercancel', onPressEnd);
          iconEl.addEventListener('pointerleave', onPressEnd);
          iconEl.addEventListener('touchstart', onPressStart, { passive: false });
          iconEl.addEventListener('touchend', onPressEnd);
          iconEl.addEventListener('touchcancel', onPressEnd);
          iconEl.addEventListener('contextmenu', (e) => { try { e.preventDefault(); } catch (_) { } });
        }

        // Add timestamp if day/night tracking is enabled
        const timestamp = getReminderTimestamp(grimoireState, reminder.reminderId);
        if (timestamp && grimoireState.dayNightTracking && grimoireState.dayNightTracking.enabled) {
          const timestampEl = document.createElement('span');
          timestampEl.className = 'reminder-timestamp';
          timestampEl.textContent = timestamp;
          iconEl.appendChild(timestampEl);
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
                positionRadialStack(parentLi, getVisibleRemindersCount({ grimoireState, playerIndex: i }));
              }

            }
          }
          // No-op on desktop; use hover edit icon instead
        };
        // Desktop hover actions on text reminders
        if (!isTouchDevice()) {
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
                  positionRadialStack(parentLi, getVisibleRemindersCount({ grimoireState, playerIndex: i }));
                }
                return;
              }
            }
            const current = grimoireState.players[i].reminders[idx]?.label || grimoireState.players[i].reminders[idx]?.value || '';
            const next = prompt('Edit reminder', current);
            if (next !== null) {
              grimoireState.players[i].reminders[idx].value = next;
              if (grimoireState.players[i].reminders[idx].label !== undefined) {
                grimoireState.players[i].reminders[idx].label = next;
              }
              updateGrimoire({ grimoireState });
              saveAppState({ grimoireState });
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
                  positionRadialStack(parentLi, getVisibleRemindersCount({ grimoireState, playerIndex: i }));
                }
                return;
              }
            }
            grimoireState.players[i].reminders.splice(idx, 1);
            updateGrimoire({ grimoireState });
            saveAppState({ grimoireState });
          });
          reminderEl.appendChild(delBtn2);
        }
        // Touch long-press for reminder context menu
        if (isTouchDevice()) {
          const onPressStart2 = (e) => {
            try { e.preventDefault(); } catch (_) { }
            clearTimeout(grimoireState.longPressTimer);
            try { reminderEl.classList.add('press-feedback'); } catch (_) { }
            const x = (e && (e.clientX || (e.touches && e.touches[0] && e.touches[0].clientX))) || 0;
            const y = (e && (e.clientY || (e.touches && e.touches[0] && e.touches[0].clientY))) || 0;
            grimoireState.longPressTimer = setTimeout(() => {
              try { reminderEl.classList.remove('press-feedback'); } catch (_) { }
              showReminderContextMenu({ grimoireState, x, y, playerIndex: i, reminderIndex: idx });
            }, 600);
          };
          const onPressEnd2 = () => {
            // Only clear the timer if the reminder menu is not already visible
            if (!grimoireState.reminderContextMenu || grimoireState.reminderContextMenu.style.display !== 'block') {
              clearTimeout(grimoireState.longPressTimer);
            }
            try { reminderEl.classList.remove('press-feedback'); } catch (_) { }
          };
          reminderEl.addEventListener('pointerdown', onPressStart2);
          reminderEl.addEventListener('pointerup', onPressEnd2);
          reminderEl.addEventListener('pointercancel', onPressEnd2);
          reminderEl.addEventListener('pointerleave', onPressEnd2);
          reminderEl.addEventListener('touchstart', onPressStart2, { passive: false });
          reminderEl.addEventListener('touchend', onPressEnd2);
          reminderEl.addEventListener('touchcancel', onPressEnd2);
          reminderEl.addEventListener('contextmenu', (e) => { try { e.preventDefault(); } catch (_) { } });
        }

        // Add timestamp if day/night tracking is enabled
        const textTimestamp = getReminderTimestamp(grimoireState, reminder.reminderId);
        if (textTimestamp && grimoireState.dayNightTracking && grimoireState.dayNightTracking.enabled) {
          const timestampEl = document.createElement('span');
          timestampEl.className = 'reminder-timestamp';
          timestampEl.textContent = textTimestamp;
          reminderEl.appendChild(timestampEl);
        }

        remindersDiv.appendChild(reminderEl);
      }
    });

    // After rendering, position all reminders and the plus button in a radial stack
    // Use visible reminders count instead of total reminders
    positionRadialStack(li, visibleRemindersCount);
  });

  // Position info icons and night order numbers after updating grimoire
  if ('ontouchstart' in window) {
    positionInfoIcons();
  }
  positionNightOrderNumbers();

  // Update bluff tokens
  updateAllBluffTokens({ grimoireState });
}
export function resetGrimoire({ grimoireState, grimoireHistoryList, playerCountInput }) {
  // If number selection is active, cancel it and remove any overlays before resetting
  const sel = grimoireState.playerSetup;
  if (sel && sel.selectionActive) {
    try {
      document.querySelectorAll('#player-circle li .number-overlay, #player-circle li .number-badge').forEach((el) => el.remove());
    } catch (_) { }
    sel.selectionActive = false;
    sel.assignments = new Array((grimoireState.players || []).length).fill(null);
    // Clean up body classes reflecting selection state
    try { document.body.classList.remove('selection-active'); } catch (_) { }
    try { document.body.classList.remove('player-setup-open'); } catch (_) { }
    // Also close any open number picker overlay/modal
    try {
      const numberPickerOverlay = document.getElementById('number-picker-overlay');
      if (numberPickerOverlay) numberPickerOverlay.style.display = 'none';
    } catch (_) { }
    try { saveAppState({ grimoireState }); } catch (_) { }
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

  // Reset meta states per requirement: unhide grimoire, clear winner, clear player setup bag.
  try { grimoireState.grimoireHidden = false; } catch (_) { }
  try { grimoireState.winner = null; } catch (_) { }
  try {
    if (!grimoireState.playerSetup) {
      grimoireState.playerSetup = { bag: [], assignments: [], revealed: false };
    } else {
      grimoireState.playerSetup.bag = [];
      grimoireState.playerSetup.assignments = [];
      grimoireState.playerSetup.revealed = false;
      // Clear selection completion flag so setup can be started again
      delete grimoireState.playerSetup.selectionComplete;
    }
  } catch (_) { }

  const existingPlayers = Array.isArray(grimoireState.players) ? grimoireState.players : [];
  const newPlayers = Array.from({ length: playerCount }, (_, i) => {
    const existing = existingPlayers[i];
    const name = existing && existing.name ? existing.name : `Player ${i + 1}`;
    return { name, character: null, reminders: [], dead: false, deathVote: false };
  });
  grimoireState.players = newPlayers;

  rebuildPlayerCircleUiPreserveState({ grimoireState });

  // Assignments will be repopulated via player setup when needed.

  // Reset bluffs when resetting grimoire
  grimoireState.bluffs = [null, null, null];

  // Reset day/night tracking when starting a new game
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

  // Feedback for starting a new game is shown when Start Game is clicked, not on reset

  // Persist reset state
  try { saveAppState({ grimoireState }); } catch (_) { }
  // Apply hidden state UI after forcing visible
  try { applyGrimoireHiddenState({ grimoireState }); } catch (_) { }
}

export function applyGrimoireBackground(value) {
  const centerEl = document.getElementById('center');
  if (!centerEl) return;
  const classList = ['bg-dark', 'bg-red-gradient', 'bg-dark-purple', 'bg-wood', 'bg-cosmic'];
  // Remove all variant classes first
  classList.forEach(c => centerEl.classList.remove(c));
  // Legacy mapping: treat missing/none/unknown as 'dark'
  if (!value || value === 'none') value = 'dark';

  switch (value) {
    case 'dark':
      centerEl.classList.add('bg-dark');
      break;
    case 'red-gradient':
      centerEl.classList.add('bg-red-gradient');
      break;
    case 'dark-purple':
      centerEl.classList.add('bg-dark-purple');
      break;
    case 'wood':
      centerEl.classList.add('bg-wood');
      break;
    case 'cosmic':
      centerEl.classList.add('bg-cosmic');
      break;
    default:
      // Fallback: treat as color hex code or CSS color
      centerEl.style.backgroundImage = 'none';
      centerEl.style.backgroundColor = value;
  }
}

export function initGrimoireBackground() {
  const centerEl = document.getElementById('center');
  const backgroundSelect = document.getElementById('background-select');
  if (!centerEl) return;
  try {
    let savedBg = localStorage.getItem(BG_STORAGE_KEY) || 'dark';
    if (savedBg === 'none') {
      // Migrate legacy 'none' selection to 'dark'
      savedBg = 'dark';
      try { localStorage.setItem(BG_STORAGE_KEY, 'dark'); } catch (_) { }
    }
    applyGrimoireBackground(savedBg);
    if (backgroundSelect) backgroundSelect.value = savedBg;
  } catch (_) { }
}

export function handleGrimoireBackgroundChange() {
  const backgroundSelect = document.getElementById('background-select');
  const val = backgroundSelect.value;
  applyGrimoireBackground(val);
  try { localStorage.setItem(BG_STORAGE_KEY, val); } catch (_) { }
}

export function rebuildPlayerCircleUiPreserveState({ grimoireState }) {
  const playerCircle = document.getElementById('player-circle');
  const playerCountInput = document.getElementById('player-count');
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

    // Track if a touch event has occurred to prevent click after touch
    const tokenEl2 = listItem.querySelector('.player-token');
    let touchOccurred2 = false;

    // Open character modal on token click (unless clicking ribbon/info icon)
    tokenEl2.onclick = (e) => {
      // Ignore click if it was triggered by a touch event
      if (touchOccurred2) {
        touchOccurred2 = false;
        return;
      }

      if (!grimoireState.gameStarted) return; // Gate before start

      const target = e.target;
      if (target && (target.closest('.death-ribbon') || target.classList.contains('death-ribbon'))) {
        return;
      }
      if (target && target.classList.contains('ability-info-icon')) {
        return;
      }
      if (grimoireState && !grimoireState.grimoireHidden) {
        openCharacterModal({ grimoireState, playerIndex: i });
      }
    };

    // Set up touch handling for player token
    setupPlayerTokenTouchHandlers({
      tokenEl: tokenEl2,
      grimoireState,
      playerIndex: i,
      listItem,
      actionCallback: () => {
        if (grimoireState && grimoireState.playerSetup && grimoireState.playerSetup.selectionActive) {
          if (window.openNumberPickerForSelection) window.openNumberPickerForSelection(i);
        } else if (grimoireState && !grimoireState.grimoireHidden) {
          openCharacterModal({ grimoireState, playerIndex: i });
        }
      },
      setTouchOccurred: (value) => { touchOccurred2 = value; }
    });

    // Set up click and touch handling for player name
    setupPlayerNameHandlers({ listItem, grimoireState, playerIndex: i });

    listItem.querySelector('.reminder-placeholder').onclick = (e) => {
      e.stopPropagation();
      if (!grimoireState.gameStarted) return; // Gate adding reminders pre-game
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
            positionRadialStack(el, getVisibleRemindersCount({ grimoireState, playerIndex: idx }));
          }
        });
        if (someoneExpanded) {
          thisLi.dataset.expanded = '1';
          thisLi.dataset.actionSuppressUntil = String(Date.now() + CLICK_EXPAND_SUPPRESS_MS);
          positionRadialStack(thisLi, getVisibleRemindersCount({ grimoireState, playerIndex: i }));
          return;
        }
      }
      if (isTouchDevice()) {
        openReminderTokenModal({ grimoireState, playerIndex: i });
      } else if (e.altKey) {
        openTextReminderModal({ grimoireState, playerIndex: i });
      } else {
        openReminderTokenModal({ grimoireState, playerIndex: i });
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
          positionRadialStack(el, getVisibleRemindersCount({ grimoireState, playerIndex: idx }));
        }
      });
      listItem.dataset.expanded = '1';
      if (isTouchDevice() && !wasExpanded) {
        listItem.dataset.actionSuppressUntil = String(Date.now() + CLICK_EXPAND_SUPPRESS_MS);
      }
      positionRadialStack(listItem, getVisibleRemindersCount({ grimoireState, playerIndex: i }));
    };
    const collapse = () => { listItem.dataset.expanded = '0'; positionRadialStack(listItem, getVisibleRemindersCount({ grimoireState, playerIndex: i })); };
    if (!isTouchDevice()) {
      // Only expand on hover over reminders and placeholder elements
      const remindersEl = listItem.querySelector('.reminders');
      const placeholderEl = listItem.querySelector('.reminder-placeholder');

      if (remindersEl) {
        remindersEl.addEventListener('mouseenter', expand);
        remindersEl.addEventListener('mouseleave', collapse);
        remindersEl.addEventListener('pointerenter', expand);
        remindersEl.addEventListener('pointerleave', collapse);
      }

      if (placeholderEl) {
        placeholderEl.addEventListener('mouseenter', expand);
        placeholderEl.addEventListener('mouseleave', collapse);
        placeholderEl.addEventListener('pointerenter', expand);
        placeholderEl.addEventListener('pointerleave', collapse);
      }
    }
    listItem.addEventListener('touchstart', (e) => {
      const target = e.target;

      // Check if tapped on death ribbon
      if (target && target.closest('.death-ribbon')) {
        return; // Don't expand for death ribbon taps
      }

      // Check if tapped on player token (character circle)
      if (target && target.closest('.player-token')) {
        return; // Don't expand for character circle taps
      }

      // Check if tapped on player name
      if (target && target.closest('.player-name')) {
        return; // Don't expand for player name taps
      }

      // Only expand if tapped on reminders or reminder placeholder
      const tappedReminders = !!(target && target.closest('.reminders'));
      const tappedPlaceholder = !!(target && target.closest('.reminder-placeholder'));

      if (tappedReminders || tappedPlaceholder) {
        if (tappedReminders) {
          try { e.preventDefault(); } catch (_) { }
          listItem.dataset.touchSuppressUntil = String(Date.now() + TOUCH_EXPAND_SUPPRESS_MS);
        }
        expand();
        positionRadialStack(listItem, getVisibleRemindersCount({ grimoireState, playerIndex: i }));
      }
    }, { passive: false });

    // Player context menu: right-click
    listItem.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      showPlayerContextMenu({ grimoireState, x: e.clientX, y: e.clientY, playerIndex: i });
    });
    // Long-press on token to open context menu on touch devices
    const tokenEl = listItem.querySelector('.player-token');
    tokenEl.addEventListener('pointerdown', (e) => {
      if (!isTouchDevice()) return;
      try { e.preventDefault(); } catch (_) { }
      clearTimeout(grimoireState.longPressTimer);
      const x = (e && (e.clientX || (e.touches && e.touches[0] && e.touches[0].clientX))) || 0;
      const y = (e && (e.clientY || (e.touches && e.touches[0] && e.touches[0].clientY))) || 0;
      grimoireState.longPressTimer = setTimeout(() => {
        showPlayerContextMenu({ grimoireState, x, y, playerIndex: i });
      }, 600);
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(evt => {
      tokenEl.addEventListener(evt, () => {
        // Only clear the timer if the menu is not already visible
        if (!grimoireState.playerContextMenu || grimoireState.playerContextMenu.style.display !== 'block') {
          clearTimeout(grimoireState.longPressTimer);
        }
      });
    });

    // Install one-time outside collapse handler for touch devices
    if (isTouchDevice() && !grimoireState.outsideCollapseHandlerInstalled) {
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
            positionRadialStack(el, getVisibleRemindersCount({ grimoireState, playerIndex: Array.from(allLis).indexOf(el) }));
          }
        });
      };
      document.addEventListener('click', maybeCollapseOnOutside, true);
      document.addEventListener('touchstart', maybeCollapseOnOutside, { passive: true, capture: true });
    }
  });

  // Add bluff tokens container
  const center = document.getElementById('center');
  const existingContainer = document.getElementById('bluff-tokens-container');
  if (existingContainer) {
    existingContainer.remove();
  }
  const bluffContainer = createBluffTokensContainer({ grimoireState });
  center.appendChild(bluffContainer);

  // Apply layout and state immediately for deterministic testing and UX
  repositionPlayers({ grimoireState });
  updateGrimoire({ grimoireState });
  saveAppState({ grimoireState });
  renderSetupInfo({ grimoireState });
  // Also after paint to ensure positions stabilize
  requestAnimationFrame(() => {
    repositionPlayers({ grimoireState });
    updateGrimoire({ grimoireState });
  });
}

export async function loadPlayerSetupTable({ grimoireState }) {
  try {
    const res = await fetch('./player-setup.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    grimoireState.playerSetupTable = Array.isArray(data.player_setup) ? data.player_setup : [];
    renderSetupInfo({ grimoireState });
  } catch (e) {
    console.error('Failed to load player-setup.json', e);
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Register global touch handler for clearing raised states (only once)
  if ('ontouchstart' in window) {
    document.addEventListener('touchstart', (e) => {
      const target = e.target;
      // If not tapping on a player element, clear all raised states
      if (!target.closest('#player-circle li')) {
        document.querySelectorAll('#player-circle li[data-raised="true"]').forEach(el => {
          delete el.dataset.raised;
          // Restore original z-index
          el.style.zIndex = el.dataset.originalLiZIndex || '';
          delete el.dataset.originalLiZIndex;
        });
      }
    }, { passive: true });
  }
});

// Global handlers for context menus - registered once at app start
document.addEventListener('click', (e) => {
  const grimoireState = window.grimoireState;
  if (!grimoireState) return;

  // Handle player context menu
  if (grimoireState.playerContextMenu) {
    const menu = grimoireState.playerContextMenu;
    if (menu.style.display === 'block' && !menu.contains(e.target)) {
      // Only ignore the close if this click is happening within 100ms of opening
      const timeSinceOpen = Date.now() - (grimoireState.menuOpenedAt || 0);
      if (timeSinceOpen > 100) {
        hidePlayerContextMenu({ grimoireState });
      }
    }
  }

  // Handle reminder context menu
  if (grimoireState.reminderContextMenu) {
    const menu = grimoireState.reminderContextMenu;
    if (menu.style.display === 'block' && !menu.contains(e.target)) {
      hideReminderContextMenu({ grimoireState });
    }
  }
}, true);

document.addEventListener('touchstart', (e) => {
  const grimoireState = window.grimoireState;
  if (!grimoireState) return;

  // Handle player context menu
  if (grimoireState.playerContextMenu) {
    const menu = grimoireState.playerContextMenu;
    if (menu.style.display === 'block' && !menu.contains(e.target)) {
      // Only ignore the close if this touch is happening within 100ms of opening
      const timeSinceOpen = Date.now() - (grimoireState.menuOpenedAt || 0);
      if (timeSinceOpen > 100) {
        hidePlayerContextMenu({ grimoireState });
      }
    }
  }

  // Handle reminder context menu
  if (grimoireState.reminderContextMenu) {
    const menu = grimoireState.reminderContextMenu;
    if (menu.style.display === 'block' && !menu.contains(e.target)) {
      hideReminderContextMenu({ grimoireState });
    }
  }
}, true);

// Prevent menus from disappearing on touch release
document.addEventListener('touchend', (e) => {
  const grimoireState = window.grimoireState;
  if (!grimoireState) return;

  if (grimoireState.playerContextMenu && grimoireState.playerContextMenu.contains(e.target)) {
    e.stopPropagation();
  }

  if (grimoireState.reminderContextMenu && grimoireState.reminderContextMenu.contains(e.target)) {
    e.stopPropagation();
  }
}, true);

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
