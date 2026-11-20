import { openCharacterModal } from '../character.js';
import { CLICK_EXPAND_SUPPRESS_MS, TOUCH_EXPAND_SUPPRESS_MS, isTouchDevice } from '../constants.js';
import { openReminderTokenModal, openTextReminderModal } from '../reminder.js';
import { showPlayerContextMenu } from './contextMenu.js';
import { collapseUserExpandedStacks, isStackExpanded, positionRadialStack, setStackUserExpanded } from './layout.js';
import { setupInteractiveElement, setupKeyboardActivation } from '../utils/interaction.js';
import { createSafeClickHandler } from '../utils/eventHandlers.js';
import { handlePlayerElementTouch } from './touchHelpers.js';
function isReminderExpansionTarget(target) {
  const clickedReminderArea = !!(target && (target.closest('.reminder-placeholder') || target.closest('.reminders')));
  const clickedIndividualReminder = !!(target && (target.closest('.icon-reminder') || target.closest('.text-reminder')));
  return clickedReminderArea && !clickedIndividualReminder;
}
export function createPlayerListItem({ grimoireState, playerIndex, playerName, setupPlayerNameHandlers }) {
  const listItem = document.createElement('li');
  listItem.innerHTML = `
    <div class="reminders"></div>
    <button type="button" class="player-token" title="Assign character"></button>
    <div class="character-name" aria-live="polite"></div>
    <button type="button" class="player-name" title="Edit name">${playerName}</button>
    <button type="button" class="reminder-placeholder" title="Add reminder">+</button>
  `; const tokenEl = listItem.querySelector('.player-token'); let touchOccurred = false;
  tokenEl.setAttribute('aria-label', `Assign character to ${playerName}`);
  listItem.querySelector('.player-name').setAttribute('aria-label', `Edit name for ${playerName}`);
  listItem.querySelector('.reminder-placeholder').setAttribute('aria-label', `Add reminder for ${playerName}`);
  const activateToken = () => {
    if (grimoireState && grimoireState.playerSetup && grimoireState.playerSetup.selectionActive) {
      if (window.openNumberPickerForSelection) { window.openNumberPickerForSelection(playerIndex); }
    } else if (grimoireState && !grimoireState.grimoireHidden) { openCharacterModal({ grimoireState, playerIndex }); }
  };
  tokenEl.onclick = createSafeClickHandler((e) => {
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
    activateToken();
  }, {
    shouldSkip: () => {
      if (touchOccurred) { touchOccurred = false; return true; }
      return false;
    },
    stopPropagation: false
  });
  setupKeyboardActivation({ element: tokenEl, onActivate: activateToken });
  if ('ontouchstart' in window) {
    setupInteractiveElement({
      element: tokenEl,
      onTap: (e) => {
        handlePlayerElementTouch({
          e,
          listItem,
          actionCallback: activateToken
        });
      },
      onLongPress: (e, x, y) => {
        clearTimeout(grimoireState.longPressTimer); showPlayerContextMenu({ grimoireState, x, y, playerIndex });
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
    tokenEl.addEventListener('touchend', () => {
      if (grimoireState.playerContextMenu?.style.display === 'block') grimoireState.menuOpenedAt = Date.now();
    });
  }
  listItem.addEventListener('contextmenu', (e) => {
    const target = e.target; const fromReminder = !!(target && (target.closest('.icon-reminder') || target.closest('.text-reminder')));
    if (fromReminder) { e.preventDefault(); return; }
    e.preventDefault(); showPlayerContextMenu({ grimoireState, x: e.clientX, y: e.clientY, playerIndex });
  }); setupPlayerNameHandlers({ listItem, grimoireState, playerIndex }); const remindersEl = listItem.querySelector('.reminders');
  const placeholderEl = listItem.querySelector('.reminder-placeholder');
  if (placeholderEl) {
    const activateReminderPlaceholder = (e) => {
      const thisLi = listItem;
      if (!isStackExpanded(thisLi)) {
        const someoneExpanded = collapseUserExpandedStacks({ except: thisLi });
        if (someoneExpanded) {
          thisLi.dataset.actionSuppressUntil = String(Date.now() + CLICK_EXPAND_SUPPRESS_MS); setStackUserExpanded(thisLi, true); return;
        }
      }
      if (isTouchDevice()) {
        openReminderTokenModal({ grimoireState, playerIndex });
      } else if (e.altKey) { openTextReminderModal({ grimoireState, playerIndex }); } else {
        openReminderTokenModal({ grimoireState, playerIndex });
      }
    };
    placeholderEl.onclick = createSafeClickHandler(activateReminderPlaceholder);
    setupKeyboardActivation({ element: placeholderEl, onActivate: activateReminderPlaceholder });
  }
  listItem.dataset.expanded = '0';
  const expand = () => {
    collapseUserExpandedStacks({ except: listItem }); if (isStackExpanded(listItem)) return;
    if (isTouchDevice()) { listItem.dataset.actionSuppressUntil = String(Date.now() + CLICK_EXPAND_SUPPRESS_MS); }
    setStackUserExpanded(listItem, true);
  };
  if (remindersEl) {
    remindersEl.addEventListener('click', (e) => {
      if (isReminderExpansionTarget(e.target)) { expand(); }
    });
  }
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
    if (isReminderExpansionTarget(target)) {
      listItem.dataset.touchSuppressUntil = String(Date.now() + TOUCH_EXPAND_SUPPRESS_MS); expand(); positionRadialStack(listItem);
    }
  }, { passive: true });
  if (!grimoireState.outsideCollapseHandlerInstalled) {
    grimoireState.outsideCollapseHandlerInstalled = true;
    const maybeCollapseOnOutside = (ev) => {
      const target = ev.target; const playerCircleEl = document.getElementById('player-circle'); if (playerCircleEl && playerCircleEl.contains(target)) return;
      collapseUserExpandedStacks();
    }; document.addEventListener('click', maybeCollapseOnOutside, true); document.addEventListener('touchstart', maybeCollapseOnOutside, { passive: true, capture: true });
  }
  return listItem;
}
