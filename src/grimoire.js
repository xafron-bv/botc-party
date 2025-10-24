import { resolveAssetPath } from '../utils.js';
import { saveAppState } from './app.js';
import { createBluffTokensContainer, updateAllBluffTokens } from './bluffTokens.js';
import { calculateNightOrder, saveCurrentPhaseState, shouldShowNightOrder, updateDayNightUI } from './dayNightTracking.js';
import { snapshotCurrentGrimoire } from './history/grimoire.js';
import { openReminderTokenModal, renderRemindersForPlayer } from './reminder.js';
import { showPlayerContextMenu, closeMenusOnOutsideEvent, hidePlayerContextMenu, hideReminderContextMenu } from './ui/contextMenu.js';
import { positionRadialStack, repositionPlayers } from './ui/layout.js';
import { createCurvedLabelSvg, createDeathRibbonSvg, createDeathVoteIndicatorSvg } from './ui/svg.js';
import { positionInfoIcons, positionNightOrderNumbers, positionTooltip, showTouchAbilityPopup } from './ui/tooltip.js';
import { renderSetupInfo } from './utils/setup.js';
import { setupTouchHandling } from './utils/touchHandlers.js';
import { handlePlayerElementTouch } from './ui/touchHelpers.js';
import { createPlayerListItem } from './ui/playerCircle.js';

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

    const visibleRemindersCount = renderRemindersForPlayer({ li, grimoireState, playerIndex: i });
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
