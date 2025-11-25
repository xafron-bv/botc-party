import { withStateSave } from '../app.js';
import { saveCurrentPhaseState } from '../dayNightTracking.js';
import { rebuildPlayerCircleUiPreserveState, updateGrimoire } from '../grimoire.js';
import { ensureGrimoireUnlocked } from '../grimoireLock.js';
import { openCustomReminderEditModal } from '../reminder.js';
import { createContextMenu, positionContextMenu } from './menuFactory.js';

export function showPlayerContextMenu({ grimoireState, x, y, playerIndex }) {
  if (!ensureGrimoireUnlocked({ grimoireState })) return;
  const menu = ensurePlayerContextMenu({ grimoireState });
  grimoireState.contextMenuTargetIndex = playerIndex;
  grimoireState.menuOpenedAt = Date.now();

  const canAdd = grimoireState.players.length < 20;
  const canRemove = grimoireState.players.length > 5;
  const addBeforeBtn = menu.querySelector('#player-menu-add-before');
  const addAfterBtn = menu.querySelector('#player-menu-add-after');
  const removeBtn = menu.querySelector('#player-menu-remove');
  
  [addBeforeBtn, addAfterBtn, removeBtn].forEach(btn => {
    btn.disabled = false;
    btn.classList.remove('disabled');
  });
  
  if (!canAdd) { 
    addBeforeBtn.disabled = true; 
    addAfterBtn.disabled = true; 
    addBeforeBtn.classList.add('disabled'); 
    addAfterBtn.classList.add('disabled'); 
  }
  if (!canRemove) { 
    removeBtn.disabled = true; 
    removeBtn.classList.add('disabled'); 
  }
  
  positionContextMenu(menu, x, y);
} export function ensureReminderContextMenu({ grimoireState }) {
  if (grimoireState.reminderContextMenu) return grimoireState.reminderContextMenu;

  const buttons = [
    {
      id: 'reminder-menu-edit',
      label: 'Edit Reminder',
      onClick: withStateSave(() => {
        if (!ensureGrimoireUnlocked({ grimoireState })) return;
        const { playerIndex, reminderIndex } = grimoireState.reminderContextTarget;
        hideReminderContextMenu({ grimoireState });
        if (playerIndex < 0 || reminderIndex < 0) return;
        const player = grimoireState.players[playerIndex];
        const reminders = player && player.reminders;
        const rem = (reminders && reminders[reminderIndex]) || null;
        if (!rem) return;

        const isCustomReminder = rem.id === 'custom-note' || rem.type === 'text';
        const current = rem.label || rem.value || '';

        if (isCustomReminder) {
          openCustomReminderEditModal({
            grimoireState,
            playerIndex,
            reminderIndex,
            existingText: current
          });
          return;
        }

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
        }
      })
    },
    {
      id: 'reminder-menu-delete',
      label: 'Delete Reminder',
      onClick: withStateSave(() => {
        if (!ensureGrimoireUnlocked({ grimoireState })) return;
        const { playerIndex, reminderIndex } = grimoireState.reminderContextTarget;
        hideReminderContextMenu({ grimoireState });
        if (playerIndex < 0 || reminderIndex < 0) return;
        if (!grimoireState.players[playerIndex] || !grimoireState.players[playerIndex].reminders) return;
        grimoireState.players[playerIndex].reminders.splice(reminderIndex, 1);

        if (grimoireState.dayNightTracking && grimoireState.dayNightTracking.enabled) {
          saveCurrentPhaseState(grimoireState);
        }

        updateGrimoire({ grimoireState });
      })
    }
  ];

  const menu = createContextMenu({
    id: 'reminder-context-menu',
    buttons
  });

  grimoireState.reminderContextMenu = menu;
  return menu;
}
export function hideReminderContextMenu({ grimoireState }) {
  if (grimoireState.reminderContextMenu) grimoireState.reminderContextMenu.style.display = 'none';
  grimoireState.reminderContextTarget = { playerIndex: -1, reminderIndex: -1 };
  clearTimeout(grimoireState.longPressTimer);
}
export function hidePlayerContextMenu({ grimoireState }) {
  if (grimoireState.playerContextMenu) grimoireState.playerContextMenu.style.display = 'none';
  grimoireState.contextMenuTargetIndex = -1;
  grimoireState.menuOpenedAt = 0;
  clearTimeout(grimoireState.longPressTimer);
}
export function ensurePlayerContextMenu({ grimoireState }) {
  if (grimoireState.playerContextMenu) return grimoireState.playerContextMenu;

  const buttons = [
    {
      id: 'player-menu-add-before',
      label: 'Add Player Before',
      onClick: withStateSave(() => {
        if (!ensureGrimoireUnlocked({ grimoireState })) return;
        const idx = grimoireState.contextMenuTargetIndex;
        hidePlayerContextMenu({ grimoireState });
        if (idx < 0) return;
        if (grimoireState.players.length >= 20) return; // clamp to max
        const newName = `Player ${grimoireState.players.length + 1}`;
        const newPlayer = { name: newName, character: null, reminders: [], dead: false, deathVote: false, nightKilledPhase: null };
        grimoireState.players.splice(idx, 0, newPlayer);
        rebuildPlayerCircleUiPreserveState({ grimoireState });
      })
    },
    {
      id: 'player-menu-add-after',
      label: 'Add Player After',
      onClick: withStateSave(() => {
        if (!ensureGrimoireUnlocked({ grimoireState })) return;
        const idx = grimoireState.contextMenuTargetIndex;
        hidePlayerContextMenu({ grimoireState });
        if (idx < 0) return;
        if (grimoireState.players.length >= 20) return; // clamp to max
        const newName = `Player ${grimoireState.players.length + 1}`;
        const newPlayer = { name: newName, character: null, reminders: [], dead: false, deathVote: false, nightKilledPhase: null };
        grimoireState.players.splice(idx + 1, 0, newPlayer);
        rebuildPlayerCircleUiPreserveState({ grimoireState });
      })
    },
    {
      id: 'player-menu-remove',
      label: 'Remove Player',
      onClick: withStateSave(() => {
        if (!ensureGrimoireUnlocked({ grimoireState })) return;
        const idx = grimoireState.contextMenuTargetIndex;
        hidePlayerContextMenu({ grimoireState });
        if (idx < 0) return;
        if (grimoireState.players.length <= 5) return; // keep within 5..20
        grimoireState.players.splice(idx, 1);
        rebuildPlayerCircleUiPreserveState({ grimoireState });
      })
    }
  ];

  const menu = createContextMenu({
    id: 'player-context-menu',
    buttons
  });

  grimoireState.playerContextMenu = menu;
  return menu;
}
export function showReminderContextMenu({ grimoireState, x, y, playerIndex, reminderIndex }) {
  if (!ensureGrimoireUnlocked({ grimoireState })) return;
  const menu = ensureReminderContextMenu({ grimoireState });
  grimoireState.reminderContextTarget = { playerIndex, reminderIndex };
  positionContextMenu(menu, x, y);
}

export function closeMenusOnOutsideEvent(e) {
  const grimoireState = window.grimoireState;
  if (!grimoireState) return;

  const timeSinceOpen = Date.now() - (grimoireState.menuOpenedAt || 0);

  if (grimoireState.playerContextMenu) {
    const menu = grimoireState.playerContextMenu;
    if (menu.style.display === 'block' && !menu.contains(e.target)) {
      if (timeSinceOpen > 100) hidePlayerContextMenu({ grimoireState });
    }
  }

  if (grimoireState.reminderContextMenu) {
    const menu = grimoireState.reminderContextMenu;
    if (menu.style.display === 'block' && !menu.contains(e.target)) {
      if (timeSinceOpen > 100) hideReminderContextMenu({ grimoireState });
    }
  }
}
