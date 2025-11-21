import { resolveAssetPath } from '../utils.js';
import { withStateSave } from './app.js';
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
  const delegatedSelectionHandler = withStateSave((e) => {
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
    } catch (_) { /* ensure modal still closes even if add fails */ }
    try { reminderTokenModal.style.display = 'none'; } catch (_) { }
  });
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
    filtered.forEach((token, idx) => {
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
  if (reminderTokenSearch) reminderTokenSearch.value = '';
  reminderTokenModal.style.display = 'flex';
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

  newSaveBtn.addEventListener('click', withStateSave(() => {
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
    }
    customReminderEditModal.style.display = 'none';
    grimoireState.editingCustomReminder = null;
    customReminderTextInput.removeEventListener('keydown', handleKeyDown);
  }));
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

function applyFontSize(element, text) {
  const textLength = text.length;
  if (textLength > 40) {
    element.style.fontSize = 'clamp(7px, calc(var(--player-token-size) * 0.06), 10px)';
  } else if (textLength > 20) {
    element.style.fontSize = 'clamp(8px, calc(var(--player-token-size) * 0.07), 12px)';
  }
}

export function createReminderElement({
  type = 'text', // 'icon', 'text', 'token'
  label,
  image,
  rotation = 0,
  className = '',
  testId,
  title,
  ariaLabel,
  onClick,
  onLongPress,
  dataset = {},
  timestamp,
  grimoireState,
  // token specific
  radiusFactor,
  angleOffset,
  // icon specific
  isCustomIcon = false,
  playerIndex,
  reminderIndex
}) {
  let element;

  if (type === 'icon') {
    element = document.createElement('div');
    element.className = `icon-reminder ${className}`.trim();
    element.style.transform = `translate(-50%, -50%) rotate(${rotation}deg)`;

    applyTokenArtwork({
      tokenEl: element,
      baseImage: resolveAssetPath('assets/img/token.png'),
      roleImage: image ? resolveAssetPath(image) : null
    });

    if (label) {
      if (isCustomIcon) {
        const textSpan = document.createElement('span');
        textSpan.className = 'icon-reminder-content';
        textSpan.textContent = label;
        applyFontSize(textSpan, label);
        element.appendChild(textSpan);
      } else {
        const svgId = `arc-${playerIndex}-${reminderIndex}`;
        const svg = createCurvedLabelSvg(svgId, label);
        element.appendChild(svg);
      }
    }
  } else if (type === 'text') {
    element = document.createElement('div');
    element.className = `text-reminder ${className}`.trim();
    element.style.transform = 'translate(-50%, -50%)';

    const textSpan = document.createElement('span');
    textSpan.className = 'text-reminder-content';
    textSpan.textContent = label || '';
    applyFontSize(textSpan, label || '');
    element.appendChild(textSpan);
  } else if (type === 'token') {
    element = document.createElement('div');
    element.className = `token-reminder ${className}`.trim();
    if (label) element.textContent = label;

    if (radiusFactor !== undefined) dataset.reminderRadius = String(radiusFactor);
    if (angleOffset !== undefined) dataset.reminderAngleOffset = String(angleOffset);
  }

  if (testId) element.setAttribute('data-testid', testId);
  if (title) element.title = title;
  if (ariaLabel) element.setAttribute('aria-label', ariaLabel);

  Object.entries(dataset).forEach(([k, v]) => {
    element.dataset[k] = v;
  });

  if (timestamp) {
    const timestampEl = document.createElement('span');
    timestampEl.className = 'reminder-timestamp';
    timestampEl.textContent = timestamp;
    element.appendChild(timestampEl);
  }

  if (onClick || onLongPress) {
    setupTouchHandling({
      element,
      onTap: onClick,
      onLongPress: onLongPress,
      setTouchOccurred: (val) => { if (grimoireState) grimoireState.touchOccurred = val; },
      showPressFeedback: true
    });

    element.setAttribute('role', 'button');
    element.setAttribute('tabindex', '0');
    element.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (onClick) onClick(e);
      }
    });
  } else {
    if (type === 'token') {
      element.setAttribute('aria-hidden', 'true');
    }
  }

  return element;
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

    const isCustom = reminder.id === 'custom-note' || reminder.type === 'text';
    const timestamp = (grimoireState.dayNightTracking && grimoireState.dayNightTracking.enabled)
      ? getReminderTimestamp(grimoireState, reminder.reminderId)
      : null;

    const onTap = (e, targetElement) => {
      const parentLi = li;
      const isCollapsed = !!(parentLi && parentLi.dataset.expanded !== '1');
      const element = targetElement || e.currentTarget;

      if (isCollapsed) {
        // First action: expand
        e.stopPropagation();
        try { e.preventDefault(); } catch (_) { }
        parentLi.dataset.expanded = '1';
        parentLi.dataset.actionSuppressUntil = String(Date.now() + CLICK_EXPAND_SUPPRESS_MS);
        positionRadialStack(parentLi, visibleRemindersCount);
        if (element && element.dataset) {
          element.dataset.ignoreNextSyntheticClick = 'true';
        }
      } else if (isCustom) {
        // When expanded: open edit modal for custom reminders (after suppress window)
        e.stopPropagation();
        try { e.preventDefault(); } catch (_) { }
        if (parentLi) {
          const suppressUntil = parseInt(parentLi.dataset.actionSuppressUntil || '0', 10);
          const suppressForTouch = !!grimoireState.touchOccurred;
          if (suppressForTouch && Date.now() < suppressUntil) {
            if (element && element.dataset) {
              element.dataset.ignoreNextSyntheticClick = 'true';
            }
            return;
          }
        }
        if (element && element.dataset) {
          element.dataset.ignoreNextSyntheticClick = 'true';
        }
        openCustomReminderEditModal({
          grimoireState,
          playerIndex,
          reminderIndex: idx,
          existingText: reminder.label || reminder.value || ''
        });
      }
    };

    const onLongPress = (e, x, y) => {
      showReminderContextMenu({ grimoireState, x, y, playerIndex, reminderIndex: idx });
    };

    const reminderEl = createReminderElement({
      type: reminder.type === 'icon' ? 'icon' : 'text',
      label: reminder.label || reminder.value || '',
      image: reminder.image,
      rotation: reminder.rotation,
      isCustomIcon: isCustom,
      timestamp,
      grimoireState,
      playerIndex,
      reminderIndex: idx,
      title: reminder.label || '',
      onClick: onTap,
      onLongPress: onLongPress
    });

    remindersDiv.appendChild(reminderEl);
  });

  return visibleRemindersCount;
}
