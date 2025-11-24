import { resolveAssetPath, getRoleById } from '../../utils.js';
import { createCurvedLabelSvg, createDeathRibbonSvg, createDeathVoteIndicatorSvg } from './svg.js';
import { createAbilityInfoIcon } from './abilityInfoIcon.js';
import { applyTokenArtwork } from './tokenArtwork.js';
import { showTouchAbilityPopup } from './tooltip.js';
import { setupTouchHandling } from '../utils/touchHandlers.js';
import { handlePlayerElementTouch } from './touchHelpers.js';
import { showPlayerContextMenu } from './contextMenu.js';
import { renderRemindersForPlayer, createReminderElement } from '../reminder.js';
import { positionRadialStack } from './layout.js';
import { showStorytellerMessage } from '../storytellerMessages.js';
import { ensureGrimoireUnlocked } from '../grimoireLock.js';
import { withStateSave } from '../app.js';

export function updatePlayerElement({
  li,
  playerIndex,
  grimoireState,
  updateGrimoireFn,
  saveCurrentPhaseStateFn,
  nightOrderMap = {},
  isFirstNight = false,
  showNightReminders = false,
  currentPhase
}) {
  const player = grimoireState.players[playerIndex];
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
  const baseTokenImage = resolveAssetPath('assets/img/token.png');

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
      const svg = createCurvedLabelSvg(`player-arc-${playerIndex}`, role.name);
      tokenDiv.appendChild(svg);
      if (role.ability && shouldShowCharacter) {
        const infoIcon = createAbilityInfoIcon({
          ariaLabel: `Show ability for ${role.name}`,
          title: `Show ability for ${role.name}`,
          dataset: { playerIndex: String(playerIndex) },
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

  const shouldHighlightNightKill = Boolean(
    player &&
    player.dead &&
    player.nightKilledPhase &&
    currentPhase &&
    player.nightKilledPhase === currentPhase
  );
  const ribbon = createDeathRibbonSvg({ highlightNightKill: shouldHighlightNightKill });
  ribbon.classList.add('death-ribbon');
  const handleRibbonToggle = withStateSave((e) => {
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
    const player = grimoireState.players[playerIndex];
    const phaseAtClick = currentPhase;
    const killedDuringNight = !!(phaseAtClick && phaseAtClick.startsWith('N'));
    if (!player.dead) { // Phase 1: Alive -> Dead
      grimoireState.players[playerIndex].dead = true;
      grimoireState.players[playerIndex].deathVote = false; // initialize unused vote
      grimoireState.players[playerIndex].nightKilledPhase = killedDuringNight ? phaseAtClick : null;
    } else if (player.dead && !player.deathVote) { // Phase 2: mark vote used
      grimoireState.players[playerIndex].deathVote = true;
    } else if (player.dead && player.deathVote) { // Phase 3: confirm resurrect
      if (window.confirm('Resurrect this player?')) {
        grimoireState.players[playerIndex].dead = false;
        grimoireState.players[playerIndex].deathVote = false;
        grimoireState.players[playerIndex].nightKilledPhase = null;
      } else {
        return; // abort update/save if cancelled
      }
    }

    if (grimoireState.dayNightTracking && grimoireState.dayNightTracking.enabled) {
      saveCurrentPhaseStateFn(grimoireState);
    }
    updateGrimoireFn({ grimoireState });
  });
  if ('ontouchstart' in window) {
    setupTouchHandling({
      element: ribbon,
      onTap: (e) => {
        handlePlayerElementTouch({
          e,
          listItem: li,
          actionCallback: handleRibbonToggle,
          grimoireState,
          playerIndex
        });
      },
      onLongPress: (e, x, y) => {
        clearTimeout(grimoireState.longPressTimer);
        showPlayerContextMenu({ grimoireState, x, y, playerIndex });
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
    const handleDeathVoteClick = withStateSave((e) => {
      e.stopPropagation();
      if (!ensureGrimoireUnlocked({ grimoireState })) return;
      const player = grimoireState.players[playerIndex];
      if (player.dead && !player.deathVote) {
        grimoireState.players[playerIndex].deathVote = true;
        if (grimoireState.dayNightTracking && grimoireState.dayNightTracking.enabled) {
          saveCurrentPhaseStateFn(grimoireState);
        }
        updateGrimoireFn({ grimoireState });
      }
    });

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
            playerIndex
          });
        },
        onLongPress: (e, x, y) => {
          clearTimeout(grimoireState.longPressTimer);
          showPlayerContextMenu({ grimoireState, x, y, playerIndex });
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
    const reminder = createReminderElement({
      type: 'token',
      label: text,
      testId,
      className,
      ariaLabel,
      title,
      onClick: onActivate ? (e) => {
        e.stopPropagation();
        try { e.preventDefault(); } catch (_) { }
        onActivate(e);
      } : undefined,
      radiusFactor,
      angleOffset,
      dataset: {
        playerIndex: String(playerIndex),
        reminderIndex: String(nextReminderIndex++)
      },
      grimoireState
    });

    if (onActivate) {
      reminder.addEventListener('touchstart', (e) => e.stopPropagation(), { passive: true });
      reminder.addEventListener('mousedown', (e) => e.stopPropagation());
    }

    tokenDiv.appendChild(reminder);
    return reminder;
  };

  const getBluffRoleIds = () => {
    const bluffs = Array.isArray(grimoireState.bluffs) ? grimoireState.bluffs : [];
    const ids = bluffs.slice(0, 3);
    while (ids.length < 3) ids.push(null);
    return ids;
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

  const REMINDER_RADIUS_BASE = 1.26;
  const NIGHT_ORDER_RADIUS = 1.24;
  const RIGHT_OFFSET = Math.PI / 6;
  const LEFT_OFFSET = -Math.PI / 6;
  const LEFT_DELTA = Math.PI / 18;

  const hasNightOrder = !!nightOrderMap[playerIndex];
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
        text: String(nightOrderMap[playerIndex]),
        testId: 'night-order-number',
        className: 'token-reminder--night-order',
        title: `Night order ${nightOrderMap[playerIndex]}`,
        radiusFactor: NIGHT_ORDER_RADIUS,
        angleOffset: RIGHT_OFFSET
      });
      reminder.dataset.playerIndex = playerIndex;
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

  const visibleRemindersCount = renderRemindersForPlayer({ li, grimoireState, playerIndex });
  positionRadialStack(li, visibleRemindersCount);
}
