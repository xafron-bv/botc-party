import { resolveAssetPath } from '../utils.js';
import { updateGrimoire } from './grimoire.js';
import { saveAppState } from './app.js';
import { createCurvedLabelSvg } from './ui/svg.js';
import { generateReminderId, addReminderTimestamp, saveCurrentPhaseState } from './dayNightTracking.js';

export async function populateReminderTokenGrid({ grimoireState }) {
  const reminderTokenGrid = document.getElementById('reminder-token-grid');
  const reminderTokenSearch = document.getElementById('reminder-token-search');
  const reminderTokenModal = document.getElementById('reminder-token-modal');
  if (!reminderTokenGrid) return;
  reminderTokenGrid.innerHTML = '';
  try {
    const res = await fetch('./characters.json?v=reminders', { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to load characters.json');
    const json = await res.json();
    // Base: any tokens supplied by data file
    let reminderTokens = Array.isArray(json.reminderTokens) ? json.reminderTokens : [];
    // Build per-character reminders from the current script: use the character's icon and reminder text as label
    const scriptReminderTokens = [];
    const isPlayerMode = grimoireState && grimoireState.mode === 'player';
    try {
      Object.values(grimoireState.allRoles || {}).forEach(role => {
        const roleImage = resolveAssetPath(role.image);
        if (!isPlayerMode) {
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
        }
      });
    } catch (_) { }
    // Always-available generic tokens
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
          const roleImage = resolveAssetPath(role.image);
          playerModeCharacterTokens.push({ id: `character-${role.id}`, image: roleImage, label: role.name, characterName: role.name, characterId: role.id });
        });
      } catch (_) { }
    }
    // Merge: generic + (per-character reminders or character tokens) + file-provided
    reminderTokens = isPlayerMode
      ? [...genericTokens, ...playerModeCharacterTokens, ...reminderTokens]
      : [...genericTokens, ...scriptReminderTokens, ...reminderTokens];
    const filter = (reminderTokenSearch && reminderTokenSearch.value || '').toLowerCase();
    reminderTokens = reminderTokens.map(t => ({ ...t, image: resolveAssetPath(t.image) }));
    // Put custom option at the top
    const isCustom = (t) => /custom/i.test(t.label || '') || /custom/i.test(t.id || '');
    reminderTokens.sort((a, b) => (isCustom(a) === isCustom(b)) ? 0 : (isCustom(a) ? -1 : 1));
    const filtered = reminderTokens.filter(t => {
      const combined = `${(t.label || '').toLowerCase()} ${(t.characterName || '').toLowerCase()}`.trim();
      if (!filter) return true;
      const terms = filter.split(/\s+/).filter(Boolean);
      return terms.every(term => combined.includes(term));
    });
    (filtered.length ? filtered : reminderTokens).forEach((token, idx) => {
      const tokenEl = document.createElement('div');
      tokenEl.className = 'token';
      tokenEl.style.backgroundImage = `url('${resolveAssetPath(token.image)}'), url('${resolveAssetPath('assets/img/token-BqDQdWeO.webp')}')`;
      tokenEl.style.backgroundSize = 'cover, cover';
      tokenEl.style.position = 'relative';
      tokenEl.style.overflow = 'visible';
      tokenEl.style.zIndex = '1';
      tokenEl.title = token.label || '';
      const handleSelect = (ev) => {
        try { ev.preventDefault(); } catch (_) { }
        ev.stopPropagation();
        let label = token.label;
        if ((label || '').toLowerCase().includes('custom')) {
          const input = prompt('Enter reminder text:', '');
          if (input === null) return;
          label = input;
        }
        const reminderId = generateReminderId();
        grimoireState.players[grimoireState.selectedPlayerIndex].reminders.push({
          type: 'icon',
          id: token.id,
          image: token.image,
          label,
          rotation: 0,
          reminderId
        });
        addReminderTimestamp(grimoireState, reminderId);

        // Save phase state if day/night tracking is enabled
        if (grimoireState.dayNightTracking && grimoireState.dayNightTracking.enabled) {
          saveCurrentPhaseState(grimoireState);
        }

        updateGrimoire({ grimoireState });
        saveAppState({ grimoireState });
        reminderTokenModal.style.display = 'none';
      };
      tokenEl.addEventListener('click', handleSelect);

      // Add curved bottom text to preview
      if (token.label) {
        const svg = createCurvedLabelSvg(`picker-arc-${idx}`, token.label);
        tokenEl.appendChild(svg);
      }
      reminderTokenGrid.appendChild(tokenEl);
    });
  } catch (e) {
    console.error(e);
    // As a last resort, show a simple message
    const msg = document.createElement('div');
    msg.style.color = '#ccc';
    msg.textContent = 'No reminder tokens available.';
    reminderTokenGrid.appendChild(msg);
  }
}


export function openReminderTokenModal({ grimoireState, playerIndex }) {
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
  const reminderTextInput = document.getElementById('reminder-text-input');
  const textReminderModal = document.getElementById('text-reminder-modal');
  grimoireState.editingReminder = { playerIndex, reminderIndex };
  reminderTextInput.value = existingText;
  textReminderModal.style.display = 'flex';
  reminderTextInput.focus();
}
