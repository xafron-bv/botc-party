import { resolveAssetPath } from '../utils.js';
import { saveAppState } from './app.js';
import { createBluffTokensContainer, updateAllBluffTokens } from './bluffTokens.js';
import { openCharacterModal } from './character.js';
import { CLICK_EXPAND_SUPPRESS_MS, TOUCH_EXPAND_SUPPRESS_MS, isTouchDevice } from './constants.js';
import { calculateNightOrder, getReminderTimestamp, isReminderVisible, saveCurrentPhaseState, shouldShowNightOrder, updateDayNightUI } from './dayNightTracking.js';
import { snapshotCurrentGrimoire } from './history/grimoire.js';
import { openReminderTokenModal, openTextReminderModal } from './reminder.js';
import { showPlayerContextMenu, closeMenusOnOutsideEvent, hidePlayerContextMenu, hideReminderContextMenu, showReminderContextMenu } from './ui/contextMenu.js';
import { positionRadialStack, repositionPlayers } from './ui/layout.js';
import { createCurvedLabelSvg, createDeathRibbonSvg, createDeathVoteIndicatorSvg } from './ui/svg.js';
import { positionInfoIcons, positionNightOrderNumbers, positionTooltip, showTouchAbilityPopup } from './ui/tooltip.js';
import { renderSetupInfo } from './utils/setup.js';
import { setupTouchHandling } from './utils/touchHandlers.js';
import { handlePlayerElementTouch } from './ui/touchHelpers.js';

try { window.openReminderTokenModal = openReminderTokenModal; } catch (_) { }
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
  listItem.querySelector('.player-name').onclick = handlePlayerNameClick;
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

export function getRoleById({ grimoireState, roleId }) {
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
export function applyGrimoireHiddenState({ grimoireState }) {
  try { document.body.classList.toggle('grimoire-hidden', !!grimoireState.grimoireHidden); } catch (_) { }
  const btn = document.getElementById('reveal-assignments');
  if (btn) btn.textContent = grimoireState.grimoireHidden ? 'Show Grimoire' : 'Hide Grimoire';
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
    const tokenEl = listItem.querySelector('.player-token');
    let touchOccurred = false;
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
        const overlay = listItem.querySelector('.number-overlay');
        const canPick = overlay && !overlay.classList.contains('disabled');
        if (canPick && window.openNumberPickerForSelection) window.openNumberPickerForSelection(i);
      } else if (grimoireState && !grimoireState.grimoireHidden) {
        openCharacterModal({ grimoireState, playerIndex: i });
      }
    };
    setupTouchHandling({
      element: tokenEl,
      onTap: (e) => {
        handlePlayerElementTouch({
          e,
          listItem,
          actionCallback: () => {
            if (grimoireState && grimoireState.playerSetup && grimoireState.playerSetup.selectionActive) {
              if (window.openNumberPickerForSelection) window.openNumberPickerForSelection(i);
            } else if (grimoireState && !grimoireState.grimoireHidden) {
              openCharacterModal({ grimoireState, playerIndex: i });
            }
          }
        });
      },
      onLongPress: (e, x, y) => {
        clearTimeout(grimoireState.longPressTimer);
        showPlayerContextMenu({ grimoireState, x, y, playerIndex: i });
      },
      setTouchOccurred: (value) => { touchOccurred = value; },
      shouldSkip: (e) => {
        const target = e.target;
        return (target && (target.closest('.death-ribbon') || target.classList.contains('death-ribbon'))) ||
          (target && target.classList.contains('ability-info-icon'));
      }
    });
    listItem.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      showPlayerContextMenu({ grimoireState, x: e.clientX, y: e.clientY, playerIndex: i });
    });
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
      if (isTouchDevice() && !wasExpanded) {
        listItem.dataset.actionSuppressUntil = String(Date.now() + CLICK_EXPAND_SUPPRESS_MS);
      }
      positionRadialStack(listItem, getVisibleRemindersCount({ grimoireState, playerIndex: i }), grimoireState.players);
    };
    const collapse = () => { listItem.dataset.expanded = '0'; positionRadialStack(listItem, getVisibleRemindersCount({ grimoireState, playerIndex: i }), grimoireState.players); };
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
        positionRadialStack(listItem, getVisibleRemindersCount({ grimoireState, playerIndex: i }), grimoireState.players);
      }
    }, { passive: false });
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
            positionRadialStack(el, getVisibleRemindersCount({ grimoireState, playerIndex: Array.from(allLis).indexOf(el) }), grimoireState.players);
          }
        });
      };
      document.addEventListener('click', maybeCollapseOnOutside, true);
      document.addEventListener('touchstart', maybeCollapseOnOutside, { passive: true, capture: true });
    }
  });
  const center = document.getElementById('center');
  const existingContainer = document.getElementById('bluff-tokens-container');
  if (existingContainer) {
    existingContainer.remove();
  }
  const bluffContainer = createBluffTokensContainer({ grimoireState });
  center.appendChild(bluffContainer);
  requestAnimationFrame(() => {
    repositionPlayers({ grimoireState });
    updateGrimoire({ grimoireState });
    saveAppState({ grimoireState });
    renderSetupInfo({ grimoireState });
  });
}

export function updateGrimoire({ grimoireState }) {
  const abilityTooltip = document.getElementById('ability-tooltip');
  const playerCircle = document.getElementById('player-circle');
  const listItems = playerCircle.querySelectorAll('li');
  renderSetupInfo({ grimoireState });
  if (grimoireState.grimoireHidden && abilityTooltip) {
    abilityTooltip.classList.remove('show');
  }

  listItems.forEach((li, i) => {
    const player = grimoireState.players[i];
    const playerNameEl = li.querySelector('.player-name');
    playerNameEl.textContent = player.name;
    const angle = parseFloat(li.dataset.angle || '0');
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
    const existingArc = tokenDiv.querySelector('.icon-reminder-svg');
    if (existingArc) existingArc.remove();
    const oldCircle = tokenDiv.querySelector('.death-overlay');
    if (oldCircle) oldCircle.remove();
    const oldRibbon = tokenDiv.querySelector('.death-ribbon');
    if (oldRibbon) oldRibbon.remove();
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
        const svg = createCurvedLabelSvg(`player-arc-${i}`, role.name);
        tokenDiv.appendChild(svg);
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
          const infoIcon = document.createElement('div');
          infoIcon.className = 'ability-info-icon';
          infoIcon.innerHTML = '<i class="fas fa-info-circle"></i>';
          infoIcon.dataset.playerIndex = i;
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
        const arc = tokenDiv.querySelector('.icon-reminder-svg');
        if (arc) arc.remove();
      }
    } else {
      tokenDiv.style.backgroundImage = `url('${resolveAssetPath('assets/img/token-BqDQdWeO.webp')}')`;
      tokenDiv.style.backgroundSize = 'cover';
      tokenDiv.style.backgroundColor = 'rgba(0,0,0,0.2)';
      tokenDiv.classList.remove('has-character');
      if (charNameDiv) charNameDiv.textContent = '';
      const arc = tokenDiv.querySelector('.icon-reminder-svg');
      if (arc) arc.remove();
    }
    const overlay = document.createElement('div');
    overlay.className = 'death-overlay';
    overlay.title = player.dead ? 'Click to mark alive' : 'Click to mark dead';
    tokenDiv.appendChild(overlay);

    const ribbon = createDeathRibbonSvg();
    ribbon.classList.add('death-ribbon');
    const handleRibbonToggle = (e) => {
      e.stopPropagation();
      const player = grimoireState.players[i];
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
    if ('ontouchstart' in window) {
      setupTouchHandling({
        element: ribbon,
        onTap: (e) => {
          handlePlayerElementTouch({
            e,
            listItem: li,
            actionCallback: handleRibbonToggle,
            grimoireState,
            playerIndex: i
          });
        },
        onLongPress: (e, x, y) => {
          clearTimeout(grimoireState.longPressTimer);
          showPlayerContextMenu({ grimoireState, x, y, playerIndex: i });
        },
        setTouchOccurred: (val) => {
          grimoireState.touchOccurred = val;
        }
      });
    }
    try {
      ribbon.querySelectorAll('rect, path').forEach((shape) => {
        shape.addEventListener('click', handleRibbonToggle);
      });
    } catch (_) {
      ribbon.addEventListener('click', handleRibbonToggle);
    }
    tokenDiv.appendChild(ribbon);

    if (player.dead) {
      tokenDiv.classList.add('is-dead');
    } else {
      tokenDiv.classList.remove('is-dead');
    }
    const existingDeathVote = tokenDiv.querySelector('.death-vote-indicator');
    if (existingDeathVote) existingDeathVote.remove();

    if (player.dead && !player.deathVote) {
      const deathVoteIndicator = createDeathVoteIndicatorSvg();
      const handleDeathVoteClick = (e) => {
        e.stopPropagation();
        const player = grimoireState.players[i];
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
      if ('ontouchstart' in window) {
        setupTouchHandling({
          element: deathVoteIndicator,
          onTap: (e) => {
            handlePlayerElementTouch({
              e,
              listItem: li,
              actionCallback: handleDeathVoteClick,
              grimoireState,
              playerIndex: i
            });
          },
          onLongPress: (e, x, y) => {
            clearTimeout(grimoireState.longPressTimer);
            showPlayerContextMenu({ grimoireState, x, y, playerIndex: i });
          },
          setTouchOccurred: (val) => {
            grimoireState.touchOccurred = val;
          }
        });
      }

      tokenDiv.appendChild(deathVoteIndicator);
    }
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
    let visibleRemindersCount = 0;
    player.reminders.forEach((reminder, idx) => {
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

        if (reminder.label) {
          const isCustom = reminder.id === 'custom-note';

          if (isCustom) {
            const textSpan = document.createElement('span');
            textSpan.className = 'icon-reminder-content';
            textSpan.textContent = reminder.label;
            const textLength = reminder.label.length;
            if (textLength > 40) {
              textSpan.style.fontSize = 'clamp(7px, calc(var(--token-size) * 0.06), 10px)';
            } else if (textLength > 20) {
              textSpan.style.fontSize = 'clamp(8px, calc(var(--token-size) * 0.07), 12px)';
            }

            iconEl.appendChild(textSpan);
          } else {
            const svg = createCurvedLabelSvg(`arc-${i}-${idx}`, reminder.label);
            iconEl.appendChild(svg);
          }
        }
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
        setupTouchHandling({
          element: iconEl,
          onTap: (e) => {
            const parentLi = iconEl.closest('li');
            const isCollapsed = !!(parentLi && parentLi.dataset.expanded !== '1');
            if (isCollapsed) {
              e.stopPropagation();
              try { e.preventDefault(); } catch (_) { }
              parentLi.dataset.expanded = '1';
              parentLi.dataset.actionSuppressUntil = String(Date.now() + CLICK_EXPAND_SUPPRESS_MS);
              positionRadialStack(parentLi, getVisibleRemindersCount({ grimoireState, playerIndex: i }));
            }
          },
          onLongPress: (e, x, y) => {
            showReminderContextMenu({ grimoireState, x, y, playerIndex: i, reminderIndex: idx });
          },
          setTouchOccurred: (val) => { grimoireState.touchOccurred = val; },
          showPressFeedback: true
        });
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
        const displayText = reminder.label || reminder.value || '';
        const textSpan = document.createElement('span');
        textSpan.className = 'text-reminder-content';
        textSpan.textContent = displayText;
        const textLength = displayText.length;
        if (textLength > 40) {
          textSpan.style.fontSize = 'clamp(7px, calc(var(--token-size) * 0.06), 10px)';
        } else if (textLength > 20) {
          textSpan.style.fontSize = 'clamp(8px, calc(var(--token-size) * 0.07), 12px)';
        }

        reminderEl.appendChild(textSpan);

        reminderEl.style.transform = 'translate(-50%, -50%)';
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
        setupTouchHandling({
          element: reminderEl,
          onTap: (e) => {
            e.stopPropagation();
            const parentLi = reminderEl.closest('li');
            if (parentLi) {
              const suppressUntil = parseInt(parentLi.dataset.actionSuppressUntil || '0', 10);
              if (parentLi.dataset.expanded !== '1' || Date.now() < suppressUntil) {
                if (parentLi.dataset.expanded !== '1') {
                  parentLi.dataset.expanded = '1';
                  parentLi.dataset.actionSuppressUntil = String(Date.now() + CLICK_EXPAND_SUPPRESS_MS);
                  positionRadialStack(parentLi, getVisibleRemindersCount({ grimoireState, playerIndex: i }));
                }
              }
            }
          },
          onLongPress: (e, x, y) => {
            showReminderContextMenu({ grimoireState, x, y, playerIndex: i, reminderIndex: idx });
          },
          setTouchOccurred: (val) => { grimoireState.touchOccurred = val; },
          showPressFeedback: true
        });
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
    positionRadialStack(li, visibleRemindersCount);
  });
  if ('ontouchstart' in window) {
    positionInfoIcons();
  }
  positionNightOrderNumbers();
  updateAllBluffTokens({ grimoireState });
}
export function resetGrimoire({ grimoireState, grimoireHistoryList, playerCountInput }) {
  const sel = grimoireState.playerSetup;
  if (sel && sel.selectionActive) {
    try {
      document.querySelectorAll('#player-circle li .number-overlay, #player-circle li .number-badge').forEach((el) => el.remove());
    } catch (_) { }
    sel.selectionActive = false;
    sel.assignments = new Array((grimoireState.players || []).length).fill(null);
    try { document.body.classList.remove('selection-active'); } catch (_) { }
    try { document.body.classList.remove('player-setup-open'); } catch (_) { }
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
  try { grimoireState.grimoireHidden = false; } catch (_) { }
  try { grimoireState.winner = null; } catch (_) { }
  try {
    if (!grimoireState.playerSetup) {
      grimoireState.playerSetup = { bag: [], assignments: [], revealed: false };
    } else {
      grimoireState.playerSetup.bag = [];
      grimoireState.playerSetup.assignments = [];
      grimoireState.playerSetup.revealed = false;
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
  grimoireState.bluffs = [null, null, null];
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
  try { saveAppState({ grimoireState }); } catch (_) { }
  try { applyGrimoireHiddenState({ grimoireState }); } catch (_) { }
}

export function rebuildPlayerCircleUiPreserveState({ grimoireState }) {
  const playerCircle = document.getElementById('player-circle');
  const playerCountInput = document.getElementById('player-count');
  if (!playerCircle) return;
  playerCircle.innerHTML = '';
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
    const tokenEl2 = listItem.querySelector('.player-token');
    let touchOccurred2 = false;
    tokenEl2.onclick = (e) => {
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
    setupTouchHandling({
      element: tokenEl2,
      onTap: (e) => {
        handlePlayerElementTouch({
          e,
          listItem,
          actionCallback: () => {
            if (grimoireState && grimoireState.playerSetup && grimoireState.playerSetup.selectionActive) {
              if (window.openNumberPickerForSelection) window.openNumberPickerForSelection(i);
            } else if (grimoireState && !grimoireState.grimoireHidden) {
              openCharacterModal({ grimoireState, playerIndex: i });
            }
          }
        });
      },
      onLongPress: (e, x, y) => {
        clearTimeout(grimoireState.longPressTimer);
        showPlayerContextMenu({ grimoireState, x, y, playerIndex: i });
      },
      setTouchOccurred: (value) => { touchOccurred2 = value; },
      shouldSkip: (e) => {
        const target = e.target;
        return (target && (target.closest('.death-ribbon') || target.classList.contains('death-ribbon'))) ||
          (target && target.classList.contains('ability-info-icon'));
      }
    });
    listItem.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      showPlayerContextMenu({ grimoireState, x: e.clientX, y: e.clientY, playerIndex: i });
    });
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
        positionRadialStack(listItem, getVisibleRemindersCount({ grimoireState, playerIndex: i }));
      }
    }, { passive: false });
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
            positionRadialStack(el, getVisibleRemindersCount({ grimoireState, playerIndex: Array.from(allLis).indexOf(el) }));
          }
        });
      };
      document.addEventListener('click', maybeCollapseOnOutside, true);
      document.addEventListener('touchstart', maybeCollapseOnOutside, { passive: true, capture: true });
    }
  });
  const center = document.getElementById('center');
  const existingContainer = document.getElementById('bluff-tokens-container');
  if (existingContainer) {
    existingContainer.remove();
  }
  const bluffContainer = createBluffTokensContainer({ grimoireState });
  center.appendChild(bluffContainer);
  repositionPlayers({ grimoireState });
  updateGrimoire({ grimoireState });
  saveAppState({ grimoireState });
  renderSetupInfo({ grimoireState });
  requestAnimationFrame(() => {
    repositionPlayers({ grimoireState });
    updateGrimoire({ grimoireState });
  });
}
document.addEventListener('DOMContentLoaded', () => {
  if ('ontouchstart' in window) {
    document.addEventListener('touchstart', (e) => {
      const target = e.target;
      if (!target.closest('#player-circle li')) {
        document.querySelectorAll('#player-circle li[data-raised="true"]').forEach(el => {
          delete el.dataset.raised;
          el.style.zIndex = el.dataset.originalLiZIndex || '';
          delete el.dataset.originalLiZIndex;
        });
      }
    }, { passive: true });
  }
});

document.addEventListener('pointerdown', closeMenusOnOutsideEvent, true);
document.addEventListener('touchstart', closeMenusOnOutsideEvent, true);

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
