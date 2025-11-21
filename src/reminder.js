import { resolveAssetPath } from '../utils.js';
import { saveAppState } from './app.js';
import { addReminderTimestamp, generateReminderId, getReminderTimestamp, isReminderVisible, saveCurrentPhaseState } from './dayNightTracking.js';
import { updateGrimoire } from './grimoire.js';
import { createTokenGridItem } from './ui/tokenGridItem.js';
import { CLICK_EXPAND_SUPPRESS_MS } from './constants.js';
import { positionRadialStack } from './ui/layout.js';
import { createCurvedLabelSvg } from './ui/svg.js';
import { showReminderContextMenu } from './ui/contextMenu.js';
import { setupTouchHandling } from './utils/touchHandlers.js';
import { applyTokenArtwork } from './ui/tokenArtwork.js';
import { ensureGrimoireUnlocked } from './grimoireLock.js';

export async function populateReminderTokenGrid({ grimoireState }) {
  const reminderTokenGrid = document.getElementById('reminder-token-grid');
  const reminderTokenSearch = document.getElementById('reminder-token-search');
  const reminderTokenModal = document.getElementById('reminder-token-modal');
  if (!reminderTokenGrid) return;
  reminderTokenGrid.innerHTML = '';
  // Install a single delegated click handler in capture phase to handle selection
  // robustly without attaching per-token listeners. Re-bind cleanly each time.
  if (reminderTokenGrid._delegatedSelectionHandler) {
    try { reminderTokenGrid.removeEventListener('click', reminderTokenGrid._delegatedSelectionHandler, true); } catch (_) { }
    reminderTokenGrid._delegatedSelectionHandler = null;
  }
  const delegatedSelectionHandler = (e) => {
    const tokenEl = e.target && (e.target.closest && e.target.closest('#reminder-token-grid .token'));
    if (!tokenEl) return;
    try { e.preventDefault(); } catch (_) { }
    try { e.stopPropagation(); } catch (_) { }
    if (!ensureGrimoireUnlocked({ grimoireState })) return;

    const label = tokenEl.dataset.tokenLabel || '';

    const id = tokenEl.dataset.tokenId || '';
    const image = tokenEl.dataset.tokenImage || '';
    if ((label || '').toLowerCase().includes('custom')) {
      // Close the token modal first
      try { reminderTokenModal.style.display = 'none'; } catch (_) { }
      // Open the custom reminder edit modal for creating new reminder
      openCustomReminderEditModal({
        grimoireState,
        playerIndex: grimoireState.selectedPlayerIndex,
        reminderIndex: -1, // -1 indicates creating new reminder
        existingText: ''
      });
      return;
    }
    const reminderId = generateReminderId();
    try {
      grimoireState.players[grimoireState.selectedPlayerIndex].reminders.push({
        type: 'icon', id, image, label, rotation: 0, reminderId
      });
      addReminderTimestamp(grimoireState, reminderId);
      if (grimoireState.dayNightTracking && grimoireState.dayNightTracking.enabled) {
        saveCurrentPhaseState(grimoireState);
      }
      updateGrimoire({ grimoireState });
      saveAppState({ grimoireState });
    } catch (_) { /* ensure modal still closes even if add fails */ }
    try { reminderTokenModal.style.display = 'none'; } catch (_) { }
  };
  reminderTokenGrid.addEventListener('click', delegatedSelectionHandler, true);
  reminderTokenGrid._delegatedSelectionHandler = delegatedSelectionHandler;
  try {
    const res = await fetch('./data.json?v=reminders', { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to load data.json');
    const data = await res.json();
    const json = { roles: data.roles, reminderTokens: data.reminderTokens || [] };
    let reminderTokens = Array.isArray(json.reminderTokens) ? json.reminderTokens : [];
    const scriptReminderTokens = [];
    const isPlayerMode = grimoireState && grimoireState.mode === 'player';
    try {
      Object.values(grimoireState.allRoles || {}).forEach(role => {
        const imagePath = role.image || `/build/img/icons/${role.team}/${role.id}.webp`;
        const roleImage = resolveAssetPath(imagePath);
        if (role && Array.isArray(role.reminders) && role.reminders.length) {
          role.reminders.forEach(rem => {
            const label = String(rem || '').trim();
            if (!label) return;
            const norm = label.toLowerCase().replace(/[^a-z0-9]+/g, '');
            const id = `${role.id}-${norm}`;
            scriptReminderTokens.push({ id, image: roleImage, label, characterName: role.name, characterId: role.id });
          });
        }
        if (role && Array.isArray(role.remindersGlobal) && role.remindersGlobal.length) {
          role.remindersGlobal.forEach(rem => {
            const label = String(rem || '').trim();
            if (!label) return;
            const norm = label.toLowerCase().replace(/[^a-z0-9]+/g, '');
            const id = `${role.id}-global-${norm}`;
            scriptReminderTokens.push({ id, image: roleImage, label, characterName: role.name, characterId: role.id });
          });
        }
      });
    } catch (_) { }
    const genericTokens = [
      { id: 'townsfolk-townsfolk', image: './assets/reminders/good-D9wGdnv9.webp', label: 'Townsfolk' },
      { id: 'wrong-wrong', image: './assets/reminders/evil-CDY3e2Qm.webp', label: 'Wrong' },
      { id: 'drunk-isthedrunk', image: './assets/reminders/drunk_g--QNmv0ZY.webp', label: 'Is The Drunk' },
      { id: 'good-good', image: './assets/reminders/good-D9wGdnv9.webp', label: 'Good' },
      { id: 'evil-evil', image: './assets/reminders/evil-CDY3e2Qm.webp', label: 'Evil' },
      { id: 'custom-note', image: './assets/reminders/custom-CLofFTEi.webp', label: 'Custom note' },
      { id: 'virgin-noability', image: './assets/reminders/virgin_g-DfRSMLSj.webp', label: 'No Ability' }
    ];
    // In player mode, instead of character-specific reminders, add each character as a token by name
    const playerModeCharacterTokens = [];
    if (isPlayerMode) {
      try {
        Object.values(grimoireState.allRoles || {}).forEach(role => {
          const imagePath = role.image || `/build/img/icons/${role.team}/${role.id}.webp`;
          const roleImage = resolveAssetPath(imagePath);
          playerModeCharacterTokens.push({ id: `character-${role.id}`, image: roleImage, label: role.name, characterName: role.name, characterId: role.id });
        });
      } catch (_) { }
    }
    reminderTokens = [
      ...genericTokens,
      ...playerModeCharacterTokens,
      ...scriptReminderTokens,
      ...reminderTokens
    ];
    const filter = (reminderTokenSearch && reminderTokenSearch.value || '').toLowerCase();
    reminderTokens = reminderTokens.map(t => ({ ...t, image: resolveAssetPath(t.image) }));
    const isCustom = (t) => /custom/i.test(t.label || '') || /custom/i.test(t.id || '');
    reminderTokens.sort((a, b) => (isCustom(a) === isCustom(b)) ? 0 : (isCustom(a) ? -1 : 1));
    const filtered = reminderTokens.filter(t => {
      const combined = `${(t.label || '').toLowerCase()} ${(t.characterName || '').toLowerCase()}`.trim();
      if (!filter) return true;
      const terms = filter.split(/\s+/).filter(Boolean);
      return terms.every(term => combined.includes(term));
    });
    (filtered.length ? filtered : reminderTokens).forEach((token, idx) => {
      const tokenEl = createTokenGridItem({
        id: token.id || '',
        image: resolveAssetPath(token.image),
        baseImage: 'assets/img/token.png',
        label: token.label || '',
        title: token.label || '',
        curvedId: `picker-arc-${idx}`,
        // Rely on delegated handler; no onClick passed
        data: {
          tokenLabel: token.label || '',
          tokenImage: resolveAssetPath(token.image)
        }
      });
      reminderTokenGrid.appendChild(tokenEl);
    });
  } catch (e) {
    console.error(e);
    const msg = document.createElement('div');
    msg.style.color = '#ccc';
    msg.textContent = 'No reminder tokens available.';
    reminderTokenGrid.appendChild(msg);
  }
}


export function openReminderTokenModal({ grimoireState, playerIndex }) {
  if (!ensureGrimoireUnlocked({ grimoireState })) return;

  const reminderTokenModal = document.getElementById('reminder-token-modal');
  const reminderTokenSearch = document.getElementById('reminder-token-search');
  const reminderTokenModalPlayerName = reminderTokenModal.querySelector('.modal-player-name');
  if (!reminderTokenModal) return;
  grimoireState.selectedPlayerIndex = playerIndex;
  if (reminderTokenModalPlayerName) reminderTokenModalPlayerName.textContent = grimoireState.players[playerIndex].name;
  reminderTokenModal.style.display = 'flex';
  if (reminderTokenSearch) reminderTokenSearch.value = '';
  populateReminderTokenGrid({ grimoireState });
}

export function openTextReminderModal({ grimoireState, playerIndex, reminderIndex = -1, existingText = '' }) {
  if (!ensureGrimoireUnlocked({ grimoireState })) return;

  const reminderTextInput = document.getElementById('reminder-text-input');
  const textReminderModal = document.getElementById('text-reminder-modal');
  grimoireState.editingReminder = { playerIndex, reminderIndex };
  reminderTextInput.value = existingText;
  textReminderModal.style.display = 'flex';
  reminderTextInput.focus();
}

export function openCustomReminderEditModal({ grimoireState, playerIndex, reminderIndex, existingText = '' }) {
  if (!ensureGrimoireUnlocked({ grimoireState })) return;

  const customReminderTextInput = document.getElementById('custom-reminder-text-input');
  const customReminderEditModal = document.getElementById('custom-reminder-edit-modal');
  const saveCustomReminderBtn = document.getElementById('save-custom-reminder-btn');
  const modalTitle = document.getElementById('custom-reminder-modal-title');

  if (!customReminderEditModal || !customReminderTextInput || !saveCustomReminderBtn) return;

  grimoireState.editingCustomReminder = { playerIndex, reminderIndex };
  customReminderTextInput.textContent = existingText;
  customReminderEditModal.style.display = 'flex';
  customReminderTextInput.focus();

  // Handle Escape key to close modal
  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      customReminderEditModal.style.display = 'none';
      grimoireState.editingCustomReminder = null;
      customReminderTextInput.removeEventListener('keydown', handleKeyDown);
    }
  };
  customReminderTextInput.addEventListener('keydown', handleKeyDown);

  // Set title based on whether we're creating or editing
  if (modalTitle) {
    modalTitle.textContent = reminderIndex === -1 ? 'Add Custom Reminder' : 'Edit Custom Reminder';
  }

  // Remove any existing save handler and add new one
  const newSaveBtn = saveCustomReminderBtn.cloneNode(true);
  saveCustomReminderBtn.parentNode.replaceChild(newSaveBtn, saveCustomReminderBtn);

  newSaveBtn.addEventListener('click', () => {
    const newText = customReminderTextInput.textContent.trim();
    if (!newText) {
      customReminderEditModal.style.display = 'none';
      grimoireState.editingCustomReminder = null;
      customReminderTextInput.removeEventListener('keydown', handleKeyDown);
      return;
    }

    if (grimoireState.editingCustomReminder) {
      const { playerIndex: pIdx, reminderIndex: rIdx } = grimoireState.editingCustomReminder;

      // If reminderIndex is -1, we're creating a new reminder
      if (rIdx === -1) {
        // Create new custom reminder
        const reminderId = generateReminderId();
        grimoireState.players[pIdx].reminders.push({
          type: 'icon',
          id: 'custom-note',
          image: resolveAssetPath('assets/reminders/custom-CLofFTEi.webp'),
          label: newText,
          rotation: 0,
          reminderId
        });
        addReminderTimestamp(grimoireState, reminderId);
        if (grimoireState.dayNightTracking && grimoireState.dayNightTracking.enabled) {
          saveCurrentPhaseState(grimoireState);
        }
      } else {
        // Edit existing reminder
        if (grimoireState.players[pIdx] && grimoireState.players[pIdx].reminders[rIdx]) {
          grimoireState.players[pIdx].reminders[rIdx].label = newText;
        }
      }

      updateGrimoire({ grimoireState });
      saveAppState({ grimoireState });
    }
    customReminderEditModal.style.display = 'none';
    grimoireState.editingCustomReminder = null;
    customReminderTextInput.removeEventListener('keydown', handleKeyDown);
  });
} export function getVisibleRemindersCount({ grimoireState, playerIndex }) {
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

// Render all reminders for a player list item, returns count of visible reminders
export function renderRemindersForPlayer({ li, grimoireState, playerIndex }) {
  const remindersDiv = li.querySelector('.reminders');
  if (!remindersDiv) return 0;
  remindersDiv.innerHTML = '';
  let visibleRemindersCount = 0;

  const player = grimoireState.players[playerIndex];
  if (!player || !Array.isArray(player.reminders)) return 0;

  player.reminders.forEach((reminder, idx) => {
    if (!isReminderVisible(grimoireState, reminder.reminderId)) {
      return; // Skip this reminder
    }
    visibleRemindersCount++;

    if (reminder.type === 'icon') {
      const iconEl = document.createElement('div');
      iconEl.className = 'icon-reminder';
      iconEl.style.transform = `translate(-50%, -50%) rotate(${reminder.rotation || 0}deg)`;
      applyTokenArtwork({
        tokenEl: iconEl,
        baseImage: resolveAssetPath('assets/img/token.png'),
        roleImage: reminder.image ? resolveAssetPath(reminder.image) : null
      });
      iconEl.title = (reminder.label || '');

      if (reminder.label) {
        const isCustom = reminder.id === 'custom-note';

        if (isCustom) {
          const textSpan = document.createElement('span');
          textSpan.className = 'icon-reminder-content';
          textSpan.textContent = reminder.label;
          const textLength = reminder.label.length;
          if (textLength > 40) {
            textSpan.style.fontSize = 'clamp(7px, calc(var(--player-token-size) * 0.06), 10px)';
          } else if (textLength > 20) {
            textSpan.style.fontSize = 'clamp(8px, calc(var(--player-token-size) * 0.07), 12px)';
          }

          iconEl.appendChild(textSpan);
        } else {
          const svg = createCurvedLabelSvg(`arc-${playerIndex}-${idx}`, reminder.label);
          iconEl.appendChild(svg);
        }
      }

      const isCustomReminder = reminder.id === 'custom-note';

      setupTouchHandling({
        element: iconEl,
        onTap: (e) => {
          const parentLi = iconEl.closest('li');
          const isCollapsed = !!(parentLi && parentLi.dataset.expanded !== '1');

          if (isCollapsed) {
            // First action: expand
            e.stopPropagation();
            try { e.preventDefault(); } catch (_) { }
            parentLi.dataset.expanded = '1';
            parentLi.dataset.actionSuppressUntil = String(Date.now() + CLICK_EXPAND_SUPPRESS_MS);
            positionRadialStack(parentLi, visibleRemindersCount);
            if (iconEl && iconEl.dataset) {
              iconEl.dataset.ignoreNextSyntheticClick = 'true';
            }
          } else if (isCustomReminder) {
            // When expanded: open edit modal for custom reminders (after suppress window)
            e.stopPropagation();
            try { e.preventDefault(); } catch (_) { }
            if (parentLi) {
              const suppressUntil = parseInt(parentLi.dataset.actionSuppressUntil || '0', 10);
              const suppressForTouch = !!grimoireState.touchOccurred;
              if (suppressForTouch && Date.now() < suppressUntil) {
                if (iconEl && iconEl.dataset) {
                  iconEl.dataset.ignoreNextSyntheticClick = 'true';
                }
                return;
              }
            }
            if (iconEl && iconEl.dataset) {
              iconEl.dataset.ignoreNextSyntheticClick = 'true';
            }
            openCustomReminderEditModal({
              grimoireState,
              playerIndex,
              reminderIndex: idx,
              existingText: reminder.label || ''
            });
          }
        },
        onLongPress: (e, x, y) => {
          showReminderContextMenu({ grimoireState, x, y, playerIndex, reminderIndex: idx });
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
        textSpan.style.fontSize = 'clamp(7px, calc(var(--player-token-size) * 0.06), 10px)';
      } else if (textLength > 20) {
        textSpan.style.fontSize = 'clamp(8px, calc(var(--player-token-size) * 0.07), 12px)';
      }

      reminderEl.appendChild(textSpan);

      reminderEl.style.transform = 'translate(-50%, -50%)';

      setupTouchHandling({
        element: reminderEl,
        onTap: (e) => {
          const parentLi = reminderEl.closest('li');
          const isCollapsed = !!(parentLi && parentLi.dataset.expanded !== '1');

          if (isCollapsed) {
            // First action: expand
            e.stopPropagation();
            if (parentLi) {
              parentLi.dataset.expanded = '1';
              parentLi.dataset.actionSuppressUntil = String(Date.now() + CLICK_EXPAND_SUPPRESS_MS);
              positionRadialStack(parentLi, visibleRemindersCount);
            }
            if (reminderEl && reminderEl.dataset) {
              reminderEl.dataset.ignoreNextSyntheticClick = 'true';
            }
          } else {
            // When expanded: open edit modal once suppress window expires
            e.stopPropagation();
            try { e.preventDefault(); } catch (_) { }
            if (parentLi) {
              const suppressUntil = parseInt(parentLi.dataset.actionSuppressUntil || '0', 10);
              const suppressForTouch = !!grimoireState.touchOccurred;
              if (suppressForTouch && Date.now() < suppressUntil) {
                if (reminderEl && reminderEl.dataset) {
                  reminderEl.dataset.ignoreNextSyntheticClick = 'true';
                }
                return;
              }
            }
            if (reminderEl && reminderEl.dataset) {
              reminderEl.dataset.ignoreNextSyntheticClick = 'true';
            }
            openCustomReminderEditModal({
              grimoireState,
              playerIndex,
              reminderIndex: idx,
              existingText: displayText || ''
            });
          }
        },
        onLongPress: (e, x, y) => {
          showReminderContextMenu({ grimoireState, x, y, playerIndex, reminderIndex: idx });
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

  return visibleRemindersCount;
}
