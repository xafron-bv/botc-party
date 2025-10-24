import { openCharacterModal } from '../character.js';
import { CLICK_EXPAND_SUPPRESS_MS, TOUCH_EXPAND_SUPPRESS_MS, isTouchDevice } from '../constants.js';
import { getVisibleRemindersCount, openReminderTokenModal, openTextReminderModal } from '../reminder.js';
import { showPlayerContextMenu } from './contextMenu.js';
import { positionRadialStack } from './layout.js';
import { setupTouchHandling } from '../utils/touchHandlers.js';
import { handlePlayerElementTouch } from './touchHelpers.js';

/**
 * Creates and configures a single player list item for the grimoire circle
 * @param {Object} params
 * @param {Object} params.grimoireState - The current grimoire state
 * @param {number} params.playerIndex - Index of the player
 * @param {string} params.playerName - Name of the player
 * @param {Function} params.setupPlayerNameHandlers - Function to setup player name editing handlers
 * @returns {HTMLLIElement} The configured list item element
 */
export function createPlayerListItem({ grimoireState, playerIndex, playerName, setupPlayerNameHandlers }) {
  const listItem = document.createElement('li');
  listItem.innerHTML = `
    <div class="reminders"></div>
    <div class="player-token" title="Assign character"></div>
    <div class="character-name" aria-live="polite"></div>
    <div class="player-name" title="Edit name">${playerName}</div>
    <div class="reminder-placeholder" title="Add text reminder">+</div>
  `;

  const tokenEl = listItem.querySelector('.player-token');
  let touchOccurred = false;

  // Click handler for player token
  tokenEl.onclick = (e) => {
    if (touchOccurred) {
      touchOccurred = false;
      return;
    }
    if (!grimoireState.gameStarted) return;

    const target = e.target;
    if (target && (target.closest('.death-ribbon') || target.classList.contains('death-ribbon'))) {
      return; // handled by ribbon click
    }
    if (target && target.classList.contains('ability-info-icon')) {
      return; // handled by info icon
    }
    if (grimoireState && grimoireState.playerSetup && grimoireState.playerSetup.selectionActive) {
      // Allow reassignment - openNumberPicker will handle freeing up previous selections
      if (window.openNumberPickerForSelection) {
        window.openNumberPickerForSelection(playerIndex);
      }
    } else if (grimoireState && !grimoireState.grimoireHidden) {
      openCharacterModal({ grimoireState, playerIndex });
    }
  };

  // Touch handling for player token
  setupTouchHandling({
    element: tokenEl,
    onTap: (e) => {
      handlePlayerElementTouch({
        e,
        listItem,
        actionCallback: () => {
          if (grimoireState && grimoireState.playerSetup && grimoireState.playerSetup.selectionActive) {
            if (window.openNumberPickerForSelection) {
              window.openNumberPickerForSelection(playerIndex);
            }
          } else if (grimoireState && !grimoireState.grimoireHidden) {
            openCharacterModal({ grimoireState, playerIndex });
          }
        }
      });
    },
    onLongPress: (e, x, y) => {
      clearTimeout(grimoireState.longPressTimer);
      showPlayerContextMenu({ grimoireState, x, y, playerIndex });
    },
    setTouchOccurred: (value) => { touchOccurred = value; },
    shouldSkip: (e) => {
      const target = e.target;
      return (target && (target.closest('.death-ribbon') || target.classList.contains('death-ribbon'))) ||
        (target && target.classList.contains('ability-info-icon'));
    }
  });

  // Context menu handler
  listItem.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    showPlayerContextMenu({ grimoireState, x: e.clientX, y: e.clientY, playerIndex });
  });

  // Setup player name editing handlers
  setupPlayerNameHandlers({ listItem, grimoireState, playerIndex });

  // Reminder placeholder click handler
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
          positionRadialStack(el, getVisibleRemindersCount({ grimoireState, playerIndex: idx }));
        }
      });
      if (someoneExpanded) {
        thisLi.dataset.expanded = '1';
        thisLi.dataset.actionSuppressUntil = String(Date.now() + CLICK_EXPAND_SUPPRESS_MS);
        positionRadialStack(thisLi, getVisibleRemindersCount({ grimoireState, playerIndex }));
        return;
      }
    }
    if (isTouchDevice()) {
      openReminderTokenModal({ grimoireState, playerIndex });
    } else if (e.altKey) {
      openTextReminderModal({ grimoireState, playerIndex });
    } else {
      openReminderTokenModal({ grimoireState, playerIndex });
    }
  };

  // Setup expand/collapse behavior
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
    positionRadialStack(listItem, getVisibleRemindersCount({ grimoireState, playerIndex }));
  };

  const collapse = () => {
    listItem.dataset.expanded = '0';
    positionRadialStack(listItem, getVisibleRemindersCount({ grimoireState, playerIndex }));
  };

  // Desktop hover behavior
  if (!isTouchDevice()) {
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

  // Touch expand behavior
  listItem.addEventListener('touchstart', (e) => {
    const target = e.target;
    if (target && target.closest('.death-ribbon')) {
      return; // Don't expand for death ribbon taps
    }
    if (target && target.closest('.player-token')) {
      return; // Don't expand for character circle taps
    }
    if (target && target.closest('.player-name')) {
      return; // Don't expand for player name taps
    }
    const tappedReminders = !!(target && target.closest('.reminders'));
    const tappedPlaceholder = !!(target && target.closest('.reminder-placeholder'));

    if (tappedReminders || tappedPlaceholder) {
      if (tappedReminders) {
        try { e.preventDefault(); } catch (_) { }
        listItem.dataset.touchSuppressUntil = String(Date.now() + TOUCH_EXPAND_SUPPRESS_MS);
      }
      expand();
      positionRadialStack(listItem, getVisibleRemindersCount({ grimoireState, playerIndex }));
    }
  }, { passive: false });

  // Install global outside-click collapse handler (once per grimoire)
  if (isTouchDevice() && !grimoireState.outsideCollapseHandlerInstalled) {
    grimoireState.outsideCollapseHandlerInstalled = true;
    const maybeCollapseOnOutside = (ev) => {
      const target = ev.target;
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
          positionRadialStack(el, getVisibleRemindersCount({
            grimoireState,
            playerIndex: Array.from(allLis).indexOf(el)
          }));
        }
      });
    };
    document.addEventListener('click', maybeCollapseOnOutside, true);
    document.addEventListener('touchstart', maybeCollapseOnOutside, { passive: true, capture: true });
  }

  return listItem;
}
