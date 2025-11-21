import { openCharacterModal } from '../character.js';
import { CLICK_EXPAND_SUPPRESS_MS, TOUCH_EXPAND_SUPPRESS_MS, isTouchDevice } from '../constants.js';
import { getVisibleRemindersCount, openReminderTokenModal, openTextReminderModal } from '../reminder.js';
import { showPlayerContextMenu } from './contextMenu.js';
import { positionRadialStack } from './layout.js';
import { setupTouchHandling } from '../utils/touchHandlers.js';
import { createSafeClickHandler } from '../utils/eventHandlers.js';
import { handlePlayerElementTouch } from './touchHelpers.js';
import { ensureGrimoireUnlocked } from '../grimoireLock.js';

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

  const canInteract = () => grimoireState.mode === 'player' || !grimoireState.winner;

  // Click handler for player token
  tokenEl.onclick = createSafeClickHandler((e) => {
    if (!canInteract()) return;

    const target = e.target;
    if (target && (target.closest('.death-ribbon') || target.classList.contains('death-ribbon'))) {
      return; // handled by ribbon click
    }
    if (target && target.classList.contains('ability-info-icon')) {
      return; // handled by info icon
    }
    if (target && (target.closest('.death-vote-indicator') || target.classList.contains('death-vote-indicator'))) {
      return; // handled by death vote indicator
    }
    if (grimoireState && grimoireState.playerSetup && grimoireState.playerSetup.selectionActive) {
      // Allow reassignment - openNumberPicker will handle freeing up previous selections
      if (window.openNumberPickerForSelection) {
        window.openNumberPickerForSelection(playerIndex);
      }
    } else if (grimoireState && !grimoireState.grimoireHidden) {
      if (!ensureGrimoireUnlocked({ grimoireState })) return;
      openCharacterModal({ grimoireState, playerIndex });
    }
  }, {
    shouldSkip: () => {
      if (touchOccurred) {
        touchOccurred = false;
        return true;
      }
      return false;
    },
    stopPropagation: false
  });

  // Touch handling for player token
  setupTouchHandling({
    element: tokenEl,
    onTap: (e) => {
      handlePlayerElementTouch({
        e,
        listItem,
        actionCallback: () => {
          if (!canInteract()) return;
          if (grimoireState && grimoireState.playerSetup && grimoireState.playerSetup.selectionActive) {
            if (window.openNumberPickerForSelection) {
              window.openNumberPickerForSelection(playerIndex);
            }
          } else if (grimoireState && !grimoireState.grimoireHidden) {
            if (!ensureGrimoireUnlocked({ grimoireState })) return;
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
        (target && (target.closest('.death-vote-indicator') || target.classList.contains('death-vote-indicator'))) ||
        (target && target.classList.contains('ability-info-icon')) ||
        (target && target.closest('.token-reminder'));
    }
  });

  // Context menu handler
  listItem.addEventListener('contextmenu', (e) => {
    const target = e.target;
    const fromReminder = !!(target && (target.closest('.icon-reminder') || target.closest('.text-reminder')));
    if (fromReminder) {
      e.preventDefault();
      return;
    }
    e.preventDefault();
    showPlayerContextMenu({ grimoireState, x: e.clientX, y: e.clientY, playerIndex });
  });

  // Setup player name editing handlers
  setupPlayerNameHandlers({ listItem, grimoireState, playerIndex });

  // Reminder placeholder click handler
  const remindersEl = listItem.querySelector('.reminders');
  const placeholderEl = listItem.querySelector('.reminder-placeholder');

  if (placeholderEl) {
    placeholderEl.onclick = createSafeClickHandler((e) => {
      if (!canInteract()) return; // Gate adding reminders pre-game in storyteller mode

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
      if (!ensureGrimoireUnlocked({ grimoireState })) return;
      if (isTouchDevice()) {
        openReminderTokenModal({ grimoireState, playerIndex });
      } else if (e.altKey) {
        openTextReminderModal({ grimoireState, playerIndex });
      } else {
        openReminderTokenModal({ grimoireState, playerIndex });
      }
    });
  }

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

  if (remindersEl) {
    remindersEl.addEventListener('click', (e) => {
      const target = e.target;
      // Only expand if clicking on the reminders container itself or placeholder
      // Don't expand if clicking on individual reminders (they handle their own expand logic)
      const clickedPlaceholder = !!(target && target.closest('.reminder-placeholder'));
      const clickedRemindersContainer = !!(target && target.closest('.reminders'));
      const clickedIndividualReminder = !!(target && (target.closest('.icon-reminder') || target.closest('.text-reminder')));

      if ((clickedPlaceholder || clickedRemindersContainer) && !clickedIndividualReminder) {
        expand();
      }
    });
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
    if (target && target.closest('.death-vote-indicator')) {
      return; // Don't expand when tapping ghost vote indicator
    }
    const tappedPlaceholder = !!(target && target.closest('.reminder-placeholder'));
    const tappedRemindersContainer = !!(target && target.closest('.reminders'));

    // Only expand if tapping on placeholder or reminders container
    if (tappedPlaceholder || tappedRemindersContainer) {
      listItem.dataset.touchSuppressUntil = String(Date.now() + TOUCH_EXPAND_SUPPRESS_MS);
      expand();
      positionRadialStack(listItem, getVisibleRemindersCount({ grimoireState, playerIndex }));
    }
  }, { passive: true });

  // Install global outside-click collapse handler (once per grimoire)
  if (!grimoireState.outsideCollapseHandlerInstalled) {
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
