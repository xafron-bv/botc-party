import { resolveAssetPath } from '../utils.js';
import { saveAppState } from './app.js';
import { createBluffTokensContainer, updateAllBluffTokens } from './bluffTokens.js';
import { calculateNightOrder, saveCurrentPhaseState, shouldShowNightOrder, updateDayNightUI, getCurrentPhase } from './dayNightTracking.js';
import { snapshotCurrentGrimoire } from './history/grimoire.js';
import { openReminderTokenModal, renderRemindersForPlayer } from './reminder.js';
import { showPlayerContextMenu, closeMenusOnOutsideEvent, hidePlayerContextMenu, hideReminderContextMenu } from './ui/contextMenu.js';
import { positionRadialStack, repositionPlayers } from './ui/layout.js';
import { createCurvedLabelSvg, createDeathRibbonSvg, createDeathVoteIndicatorSvg } from './ui/svg.js';
import { positionInfoIcons, positionTokenReminders, showTouchAbilityPopup } from './ui/tooltip.js';
import { showStorytellerMessage } from './storytellerMessages.js';
import { renderSetupInfo } from './utils/setup.js';
import { setupTouchHandling } from './utils/touchHandlers.js';
import { handlePlayerElementTouch } from './ui/touchHelpers.js';
import { createPlayerListItem } from './ui/playerCircle.js';
import { createAbilityInfoIcon } from './ui/abilityInfoIcon.js';
import { applyTokenArtwork } from './ui/tokenArtwork.js';
import { ensureGrimoireUnlocked } from './grimoireLock.js';

try { window.openReminderTokenModal = openReminderTokenModal; } catch (_) { }
function setupPlayerNameHandlers({ listItem, grimoireState, playerIndex }) {
  const handlePlayerNameClick = (e) => {
    e.stopPropagation();
    if (!ensureGrimoireUnlocked({ grimoireState })) return;
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
  if (!roleId) return null;
  const allRoles = grimoireState.allRoles || {};
  const baseRoles = grimoireState.baseRoles || {};
  const extraTravellerRoles = grimoireState.extraTravellerRoles || {};
  return allRoles[roleId] || baseRoles[roleId] || extraTravellerRoles[roleId] || null;
}

export function applyGrimoireHiddenState({ grimoireState }) {
  try { document.body.classList.toggle('grimoire-hidden', !!grimoireState.grimoireHidden); } catch (_) { }
  updateGrimoire({ grimoireState });
}

export function applyGrimoireLockedState({ grimoireState }) {
  try { document.body.classList.toggle('grimoire-locked', !!grimoireState.grimoireLocked); } catch (_) { }
}

export function setGrimoireLocked({ grimoireState, locked }) {
  grimoireState.grimoireLocked = !!locked;
  applyGrimoireLockedState({ grimoireState });
  saveAppState({ grimoireState });
}

export function toggleGrimoireLocked({ grimoireState }) {
  setGrimoireLocked({ grimoireState, locked: !grimoireState.grimoireLocked });
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
  grimoireState.grimoireLocked = false;
  applyGrimoireLockedState({ grimoireState });
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
    const listItem = createPlayerListItem({
      grimoireState,
      playerIndex: i,
      playerName: player.name,
      setupPlayerNameHandlers
    });
    playerCircle.appendChild(listItem);
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

  const showNightReminders = shouldShowNightOrder(grimoireState);
  const nightOrderMap = showNightReminders ? calculateNightOrder(grimoireState) : {};
  const currentPhase = getCurrentPhase(grimoireState);
  const isFirstNight = currentPhase === 'N1';
  const REMINDER_RADIUS_BASE = 1.26;
  const NIGHT_ORDER_RADIUS = 1.24;
  const RIGHT_OFFSET = Math.PI / 6;
  const LEFT_OFFSET = -Math.PI / 6;
  const LEFT_DELTA = Math.PI / 18;
  const baseTokenImage = resolveAssetPath('assets/img/token.png');

  const getBluffRoleIds = () => {
    const bluffs = Array.isArray(grimoireState.bluffs) ? grimoireState.bluffs : [];
    const ids = bluffs.slice(0, 3);
    while (ids.length < 3) ids.push(null);
    return ids;
  };

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
    li.querySelectorAll('.ability-info-icon').forEach((node) => node.remove());

    // Check if we're in selection mode and this is a traveller
    const isSelectionActive = grimoireState.playerSetup && grimoireState.playerSetup.selectionActive;
    const role = player.character ? getRoleById({ grimoireState, roleId: player.character }) : null;
    const isTraveller = role && role.team === 'traveller';
    const shouldShowCharacter = !grimoireState.grimoireHidden || (isSelectionActive && isTraveller);

    if (shouldShowCharacter && player.character) {
      if (role) {
        const roleImage = role.image ? resolveAssetPath(role.image) : null;
        applyTokenArtwork({
          tokenEl: tokenDiv,
          baseImage: baseTokenImage,
          roleImage
        });
        tokenDiv.classList.add('has-character');
        if (charNameDiv) charNameDiv.textContent = role.name;
        const svg = createCurvedLabelSvg(`player-arc-${i}`, role.name);
        tokenDiv.appendChild(svg);
        if (role.ability && shouldShowCharacter) {
          const infoIcon = createAbilityInfoIcon({
            ariaLabel: `Show ability for ${role.name}`,
            title: `Show ability for ${role.name}`,
            dataset: { playerIndex: String(i) },
            onActivate: ({ icon }) => {
              showTouchAbilityPopup(icon, role.ability);
            }
          });
          li.appendChild(infoIcon); // Append to li, not tokenDiv
        }
      } else {
        applyTokenArtwork({
          tokenEl: tokenDiv,
          baseImage: baseTokenImage,
          roleImage: null
        });
        tokenDiv.classList.remove('has-character');
        if (charNameDiv) charNameDiv.textContent = '';
        const arc = tokenDiv.querySelector('.icon-reminder-svg');
        if (arc) arc.remove();
      }
    } else {
      applyTokenArtwork({
        tokenEl: tokenDiv,
        baseImage: baseTokenImage,
        roleImage: null
      });
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
      if (!ensureGrimoireUnlocked({ grimoireState })) return;
      const playerSetup = grimoireState.playerSetup || {};
      const selectionActive = !!playerSetup.selectionActive;
      const selectionComplete = !!playerSetup.selectionComplete;
      const gameStarted = !!grimoireState.gameStarted;
      // Prevent death ribbon interaction during or immediately after number selection
      if (selectionActive || (selectionComplete && !gameStarted)) {
        return;
      }
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
        if (!ensureGrimoireUnlocked({ grimoireState })) return;
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
    tokenDiv.querySelectorAll('.token-reminder').forEach((node) => node.remove());
    let nextReminderIndex = 0;
    const addTokenReminder = ({
      text,
      testId,
      className = '',
      ariaLabel,
      title,
      onActivate,
      radiusFactor,
      angleOffset = 0
    }) => {
      const reminder = document.createElement('div');
      reminder.className = `token-reminder${className ? ` ${className}` : ''}`;
      if (typeof text === 'string') reminder.textContent = text;
      if (testId) reminder.setAttribute('data-testid', testId);
      reminder.dataset.playerIndex = i;
      const orderIndex = nextReminderIndex++;
      reminder.dataset.reminderIndex = String(orderIndex);
      if (typeof radiusFactor === 'number' && Number.isFinite(radiusFactor)) {
        reminder.dataset.reminderRadius = String(radiusFactor);
      }
      if (typeof angleOffset === 'number' && Number.isFinite(angleOffset)) {
        reminder.dataset.reminderAngleOffset = String(angleOffset);
      }
      if (onActivate) {
        reminder.setAttribute('role', 'button');
        reminder.setAttribute('tabindex', '0');
        if (ariaLabel) reminder.setAttribute('aria-label', ariaLabel);
        if (title) reminder.setAttribute('title', title);
        const activate = (event) => {
          event.stopPropagation();
          event.preventDefault();
          onActivate(event);
        };
        reminder.addEventListener('click', activate);
        reminder.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            activate(event);
          }
        });
        reminder.addEventListener('mousedown', (event) => {
          event.stopPropagation();
        });
        reminder.addEventListener('touchstart', (event) => {
          event.stopPropagation();
        }, { passive: true });
        reminder.addEventListener('touchend', (event) => {
          activate(event);
        }, { passive: false });
      } else {
        reminder.setAttribute('aria-hidden', 'true');
        if (title) reminder.setAttribute('title', title);
      }
      tokenDiv.appendChild(reminder);
      return reminder;
    };

    const showBluffOverlay = () => {
      showStorytellerMessage({
        text: 'THESE CHARACTERS ARE NOT IN PLAY',
        slotCount: 3,
        slotRoleIds: getBluffRoleIds()
      });
    };

    const showMinionOverlay = () => {
      showStorytellerMessage({
        text: 'THESE ARE YOUR MINIONS',
        slotCount: 0
      });
    };

    const showDemonOverlay = () => {
      showStorytellerMessage({
        text: 'THIS IS THE DEMON',
        slotCount: 0
      });
    };

    const hasNightOrder = !!nightOrderMap[i];
    if (showNightReminders) {
      if (isFirstNight && role && role.team === 'demon') {
        addTokenReminder({
          text: 'B',
          testId: 'night-reminder-bluffs',
          className: 'token-reminder--bluffs night-reminder-button',
          ariaLabel: 'Show bluffs storyteller message',
          title: 'Show bluffs',
          onActivate: showBluffOverlay,
          radiusFactor: REMINDER_RADIUS_BASE,
          angleOffset: LEFT_OFFSET - LEFT_DELTA
        });
      }

      if (hasNightOrder) {
        const reminder = addTokenReminder({
          text: String(nightOrderMap[i]),
          testId: 'night-order-number',
          className: 'token-reminder--night-order',
          title: `Night order ${nightOrderMap[i]}`,
          radiusFactor: NIGHT_ORDER_RADIUS,
          angleOffset: RIGHT_OFFSET
        });
        reminder.dataset.playerIndex = i;
      }

      if (isFirstNight && role && role.team === 'demon') {
        addTokenReminder({
          text: 'M',
          testId: 'night-reminder-minions',
          className: 'token-reminder--minions night-reminder-button',
          ariaLabel: 'Show minions storyteller message',
          title: 'Show minions',
          onActivate: showMinionOverlay,
          radiusFactor: REMINDER_RADIUS_BASE,
          angleOffset: LEFT_OFFSET + LEFT_DELTA
        });
      } else if (isFirstNight && role && role.team === 'minion') {
        addTokenReminder({
          text: 'D',
          testId: 'night-reminder-demon',
          className: 'token-reminder--demon night-reminder-button',
          ariaLabel: 'Show demon storyteller message',
          title: 'Show demon',
          onActivate: showDemonOverlay,
          radiusFactor: REMINDER_RADIUS_BASE,
          angleOffset: LEFT_OFFSET
        });
      }
    }

    const visibleRemindersCount = renderRemindersForPlayer({ li, grimoireState, playerIndex: i });
    positionRadialStack(li, visibleRemindersCount);
  });
  positionInfoIcons();
  positionTokenReminders();
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
  grimoireState.grimoireLocked = false;
  applyGrimoireLockedState({ grimoireState });

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
    const listItem = createPlayerListItem({
      grimoireState,
      playerIndex: i,
      playerName: player.name,
      setupPlayerNameHandlers
    });
    playerCircle.appendChild(listItem);
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
