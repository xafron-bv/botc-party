import { saveAppState } from '../app';
import { saveCurrentPhaseState } from '../dayNightTracking';
import { rebuildPlayerCircleUiPreserveState, updateGrimoire } from '../grimoire';

export function showPlayerContextMenu({ grimoireState, x, y, playerIndex }) {
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
  if (!canAdd) { addBeforeBtn.disabled = true; addAfterBtn.disabled = true; addBeforeBtn.classList.add('disabled'); addAfterBtn.classList.add('disabled'); }
  if (!canRemove) { removeBtn.disabled = true; removeBtn.classList.add('disabled'); }
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
} export function ensureReminderContextMenu({ grimoireState }) {
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
}
export function hidePlayerContextMenu({ grimoireState }) {
  if (grimoireState.playerContextMenu) grimoireState.playerContextMenu.style.display = 'none';
  grimoireState.contextMenuTargetIndex = -1;
  grimoireState.menuOpenedAt = 0;
  clearTimeout(grimoireState.longPressTimer);
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
export function showReminderContextMenu({ grimoireState, x, y, playerIndex, reminderIndex }) {
  const menu = ensureReminderContextMenu({ grimoireState });
  grimoireState.reminderContextTarget = { playerIndex, reminderIndex };
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

