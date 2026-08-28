import { openCharacterModal } from '../character.js';
import { CLICK_EXPAND_SUPPRESS_MS, TOUCH_EXPAND_SUPPRESS_MS, isTouchDevice } from '../constants.js';
import { getVisibleRemindersCount, openReminderTokenModal, openTextReminderModal } from '../reminder.js';
import { showPlayerContextMenu } from './contextMenu.js';
import { positionRadialStack } from './layout.js';
import { setupInteractiveElement } from '../utils/interaction.js';
import { createSafeClickHandler } from '../utils/eventHandlers.js';
import { handlePlayerElementTouch } from './touchHelpers.js';
function isReminderExpansionTarget(target) {
  const clickedReminderArea = !!(target && (target.closest('.reminder-placeholder') || target.closest('.reminders')));
  const clickedIndividualReminder = !!(target && (target.closest('.icon-reminder') || target.closest('.text-reminder')));
  return clickedReminderArea && !clickedIndividualReminder;
}
function collapseOtherReminderStacks({ listItem, grimoireState }) {
  let collapsedAny = false; const listItems = Array.from(document.querySelectorAll('#player-circle li'));
  listItems.forEach((element, playerIndex) => {
    if (element === listItem || element.dataset.expanded !== '1') return;
    collapsedAny = true; element.dataset.expanded = '0';
    positionRadialStack(element, getVisibleRemindersCount({ grimoireState, playerIndex }));
  });
  return collapsedAny;
}
export function createPlayerListItem({ grimoireState, playerIndex, playerName, setupPlayerNameHandlers }) {
  const listItem = document.createElement('li');
  listItem.innerHTML = `
    <div class="reminders"></div>
    <div class="player-token" title="Assign character"></div>
    <div class="character-name" aria-live="polite"></div>
    <div class="player-name" title="Edit name">${playerName}</div>
    <div class="reminder-placeholder" title="Add text reminder">+</div>
  `; const tokenEl = listItem.querySelector('.player-token'); let touchOccurred = false;
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
    if (grimoireState && grimoireState.playerSetup && grimoireState.playerSetup.selectionActive) {
      if (window.openNumberPickerForSelection) { window.openNumberPickerForSelection(playerIndex); }
    } else if (grimoireState && !grimoireState.grimoireHidden) { openCharacterModal({ grimoireState, playerIndex }); }
  }, {
    shouldSkip: () => {
      if (touchOccurred) { touchOccurred = false; return true; }
      return false;
    },
    stopPropagation: false
  });
  if ('ontouchstart' in window) {
    setupInteractiveElement({
      element: tokenEl,
      onTap: (e) => {
        handlePlayerElementTouch({
          e,
          listItem,
          actionCallback: () => {
            if (grimoireState && grimoireState.playerSetup && grimoireState.playerSetup.selectionActive) {
              if (window.openNumberPickerForSelection) { window.openNumberPickerForSelection(playerIndex); }
            } else if (grimoireState && !grimoireState.grimoireHidden) { openCharacterModal({ grimoireState, playerIndex }); }
          }
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
    placeholderEl.onclick = createSafeClickHandler((e) => {
      const thisLi = listItem;
      if (thisLi.dataset.expanded !== '1') {
        const someoneExpanded = collapseOtherReminderStacks({ listItem: thisLi, grimoireState });
        if (someoneExpanded) {
          thisLi.dataset.expanded = '1'; thisLi.dataset.actionSuppressUntil = String(Date.now() + CLICK_EXPAND_SUPPRESS_MS);
          positionRadialStack(thisLi, getVisibleRemindersCount({ grimoireState, playerIndex })); return;
        }
      }
      if (isTouchDevice()) {
        openReminderTokenModal({ grimoireState, playerIndex });
      } else if (e.altKey) { openTextReminderModal({ grimoireState, playerIndex }); } else {
        openReminderTokenModal({ grimoireState, playerIndex });
      }
    });
  }
  listItem.dataset.expanded = '0';
  const expand = () => {
    const wasExpanded = listItem.dataset.expanded === '1'; collapseOtherReminderStacks({ listItem, grimoireState }); listItem.dataset.expanded = '1';
    if (isTouchDevice() && !wasExpanded) { listItem.dataset.actionSuppressUntil = String(Date.now() + CLICK_EXPAND_SUPPRESS_MS); }
    positionRadialStack(listItem, getVisibleRemindersCount({ grimoireState, playerIndex }));
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
      listItem.dataset.touchSuppressUntil = String(Date.now() + TOUCH_EXPAND_SUPPRESS_MS); expand();
      positionRadialStack(listItem, getVisibleRemindersCount({ grimoireState, playerIndex }));
    }
  }, { passive: true });
  if (!grimoireState.outsideCollapseHandlerInstalled) {
    grimoireState.outsideCollapseHandlerInstalled = true;
    const maybeCollapseOnOutside = (ev) => {
      const target = ev.target; const playerCircleEl = document.getElementById('player-circle'); if (playerCircleEl && playerCircleEl.contains(target)) return;
      const allLis = document.querySelectorAll('#player-circle li'); let clickedInsideExpanded = false;
      allLis.forEach(el => {
        if (el.dataset.expanded === '1' && el.contains(target)) { clickedInsideExpanded = true; }
      }); if (clickedInsideExpanded) return;
      allLis.forEach(el => {
        if (el.dataset.expanded === '1') {
          el.dataset.expanded = '0';
          positionRadialStack(el, getVisibleRemindersCount({
            grimoireState,
            playerIndex: Array.from(allLis).indexOf(el)
          }));
        }
      });
    }; document.addEventListener('click', maybeCollapseOnOutside, true); document.addEventListener('touchstart', maybeCollapseOnOutside, { passive: true, capture: true });
  }
  return listItem;
}
