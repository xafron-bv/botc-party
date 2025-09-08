import { populateCharacterGrid } from './character.js';
import { createCurvedLabelSvg } from './ui/svg.js';
import { hideGrimoire } from './grimoire.js';

export function initStorytellerMessages({ grimoireState }) {
  const openStorytellerMessageBtn = document.getElementById('open-storyteller-message');
  const storytellerMessageModal = document.getElementById('storyteller-message-modal');
  const closeStorytellerMessageBtn = document.getElementById('close-storyteller-message');
  const storytellerMessagePicker = document.getElementById('storyteller-message-picker');
  const storytellerMessageEdit = document.getElementById('storyteller-message-edit');
  const closeStorytellerMessageEditBtn = document.getElementById('close-storyteller-message-edit');
  const storytellerMessageInput = document.getElementById('storyteller-message-input');
  const showStorytellerMessageBtn = document.getElementById('show-storyteller-message');
  const toggleBluffsViewBtn = document.getElementById('toggle-bluffs-view');
  const messageSlotsEl = document.getElementById('storyteller-message-slots');
  const roleGridEl = document.getElementById('storyteller-role-grid');

  function buildMessagePicker() {
    if (!storytellerMessagePicker) return;
    storytellerMessagePicker.innerHTML = '';
    const table = grimoireState.playerSetupTableRaw || {};
    const msgs = Array.isArray(table.storyteller_messages) ? table.storyteller_messages : [];
    msgs.forEach((entry) => {
      const label = typeof entry === 'string' ? entry : entry.text;
      const btn = document.createElement('button');
      btn.className = 'button';
      btn.textContent = label;
      btn.addEventListener('click', () => {
        if (storytellerMessageModal) storytellerMessageModal.style.display = 'none';
        if (storytellerMessageEdit) storytellerMessageEdit.style.display = 'flex';
        storytellerMessageInput.value = label;
        if (toggleBluffsViewBtn) toggleBluffsViewBtn.style.display = (label === 'THESE CHARACTERS ARE NOT IN PLAY') ? '' : 'none';
        renderMessageSlots(typeof entry === 'object' ? (entry.slots || 0) : 0);
        if (typeof entry === 'object' && entry.freeText) {
          storytellerMessageInput.value = '';
          storytellerMessageInput.placeholder = 'Type your message...';
        } else {
          storytellerMessageInput.placeholder = '';
        }
      });
      storytellerMessagePicker.appendChild(btn);
    });
  }

  let currentSlotTargets = [];
  let currentMessageSlotCount = 0;

  function applyRoleLookToToken(tokenEl, roleId) {
    if (!tokenEl) return;
    // Remove any existing curved label
    const existingSvg = tokenEl.querySelector('svg');
    if (existingSvg) existingSvg.remove();

    // Match view/edit message token size (2x standard)
    tokenEl.style.width = 'calc(var(--token-size) * 2)';
    tokenEl.style.height = 'calc(var(--token-size) * 2)';
    tokenEl.style.border = '4px solid #D4AF37';
    tokenEl.style.boxShadow = '0 0 20px rgba(212, 175, 55, 0.6), inset 0 0 20px rgba(0, 0, 0, 0.3)';
    tokenEl.style.borderRadius = '50%';

    if (roleId && grimoireState.allRoles[roleId]) {
      const role = grimoireState.allRoles[roleId];
      tokenEl.classList.remove('empty');
      tokenEl.classList.add('has-character');
      const characterImage = role.image || './assets/img/token-BqDQdWeO.webp';
      tokenEl.style.backgroundImage = `url('${characterImage}'), url('./assets/img/token-BqDQdWeO.webp')`;
      tokenEl.style.backgroundSize = '68% 68%, cover';
      tokenEl.style.backgroundPosition = 'center, center';
      tokenEl.style.backgroundRepeat = 'no-repeat, no-repeat';
      tokenEl.style.backgroundColor = 'transparent';
      const svg = createCurvedLabelSvg(`story-msg-slot-${roleId}-${Math.random().toString(36).slice(2)}`, role.name);
      tokenEl.appendChild(svg);
    } else {
      tokenEl.classList.add('empty');
      tokenEl.classList.remove('has-character');
      tokenEl.style.backgroundImage = "url('./assets/img/token-BqDQdWeO.webp')";
      tokenEl.style.backgroundSize = 'cover';
      tokenEl.style.backgroundPosition = 'center';
      tokenEl.style.backgroundRepeat = 'no-repeat';
      // Optional curved label to match character picker empty token
      const svg = createCurvedLabelSvg('story-msg-slot-empty', 'None');
      tokenEl.appendChild(svg);
    }
  }

  function renderMessageSlots(count) {
    if (!messageSlotsEl) return;
    messageSlotsEl.innerHTML = '';
    currentSlotTargets = new Array(Math.max(0, count)).fill(null);
    currentMessageSlotCount = count;
    // If switching to a message with different slot count, reset any temp selections
    if (!Array.isArray(grimoireState.storytellerTempSlots) || grimoireState.storytellerTempSlots.length !== count) {
      grimoireState.storytellerTempSlots = new Array(Math.max(0, count)).fill(null);
    }
    if (count > 0) {
      messageSlotsEl.style.display = 'flex';
      for (let i = 0; i < count; i++) {
        const slot = document.createElement('div');
        slot.className = 'bluff-token empty';
        applyRoleLookToToken(slot, null);
        slot.addEventListener('click', () => openRoleGridForSlot(i));
        messageSlotsEl.appendChild(slot);
      }
    } else {
      messageSlotsEl.style.display = 'none';
    }
  }

  function openRoleGridForSlot(slotIndex) {
    if (!roleGridEl) return;
    const characterModal = document.getElementById('character-modal');
    const characterSearch = document.getElementById('character-search');
    if (!grimoireState.scriptData) { alert('Please load a script first.'); return; }
    grimoireState._tempStorytellerSlotIndex = slotIndex;
    const modalTitle = characterModal.querySelector('h3');
    if (modalTitle) modalTitle.textContent = 'Select a Character';
    populateCharacterGrid({ grimoireState });
    if (storytellerMessageEdit) storytellerMessageEdit.style.display = 'flex';
    characterModal.style.display = 'flex';
    characterSearch.value = '';
    characterSearch.focus();
  }

  async function loadStorytellerMessages() {
    try {
      const res = await fetch('./player-setup.json');
      const data = await res.json();
      grimoireState.playerSetupTableRaw = data || {};
      buildMessagePicker();
    } catch (_) { /* ignore */ }
  }

  if (openStorytellerMessageBtn && storytellerMessageModal) {
    openStorytellerMessageBtn.addEventListener('click', () => {
      if (grimoireState.mode === 'player') return;
      storytellerMessageModal.style.display = 'flex';
      if (storytellerMessageEdit) storytellerMessageEdit.style.display = 'none';
      buildMessagePicker();
      try { storytellerMessageModal.scrollIntoView({ block: 'center' }); } catch (_) { }
    });
  }
  if (closeStorytellerMessageBtn && storytellerMessageModal) {
    closeStorytellerMessageBtn.addEventListener('click', () => { storytellerMessageModal.style.display = 'none'; });
  }
  if (closeStorytellerMessageEditBtn && storytellerMessageEdit) {
    closeStorytellerMessageEditBtn.addEventListener('click', () => { storytellerMessageEdit.style.display = 'none'; });
  }

  // Close edit modal by clicking outside content
  if (storytellerMessageEdit) {
    storytellerMessageEdit.addEventListener('click', (e) => {
      const content = storytellerMessageEdit.querySelector('.modal-content');
      if (e.target === storytellerMessageEdit) { storytellerMessageEdit.style.display = 'none'; return; }
      if (content && !content.contains(e.target)) { storytellerMessageEdit.style.display = 'none'; }
    }, true);
  }

  // Close list modal by clicking outside content for consistent behavior
  if (storytellerMessageModal) {
    storytellerMessageModal.addEventListener('click', (e) => {
      if (e.target === storytellerMessageModal) { storytellerMessageModal.style.display = 'none'; return; }
      const content = storytellerMessageModal.querySelector('.modal-content');
      if (content && !content.contains(e.target)) { storytellerMessageModal.style.display = 'none'; }
    });
  }

  // Esc key closes the top-most custom modals
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (storytellerMessageEdit && storytellerMessageEdit.style.display === 'flex') {
        storytellerMessageEdit.style.display = 'none';
        return;
      }
      if (storytellerMessageModal && storytellerMessageModal.style.display === 'flex') {
        storytellerMessageModal.style.display = 'none';
      }
    }
  });

  const messageDisplayModal = document.getElementById('storyteller-message-display');
  const closeMessageDisplayBtn = document.getElementById('close-storyteller-message-display');

  function showStorytellerOverlay(text) {
    if (!messageDisplayModal) return;
    const textDiv = messageDisplayModal.querySelector('.message-text');
    const bluffsDiv = messageDisplayModal.querySelector('.bluffs-container');
    if (textDiv) textDiv.textContent = text || '';
    if (bluffsDiv) bluffsDiv.style.display = 'none';
    const slotsDisplay = document.getElementById('storyteller-slots-display');
    if (slotsDisplay) {
      slotsDisplay.innerHTML = '';
      const count = currentMessageSlotCount || 0;
      if (count > 0) {
        const selectedSlots = (Array.isArray(grimoireState.storytellerTempSlots) && grimoireState.storytellerTempSlots.length === count)
          ? grimoireState.storytellerTempSlots
          : new Array(count).fill(null);
        selectedSlots.forEach((roleId) => {
          const slot = document.createElement('div');
          slot.className = 'bluff-token';
          applyRoleLookToToken(slot, roleId || null);
          slotsDisplay.appendChild(slot);
        });
      }
    }
    messageDisplayModal.style.display = 'flex';
    hideGrimoire({ grimoireState });
  }
  function hideStorytellerOverlay() {
    if (!messageDisplayModal) return;
    messageDisplayModal.style.display = 'none';
    const bluffsDiv = messageDisplayModal.querySelector('.bluffs-container');
    if (bluffsDiv) bluffsDiv.style.display = 'none';
  }

  if (messageDisplayModal) {
    messageDisplayModal.addEventListener('click', (e) => {
      if (e.target === messageDisplayModal) hideStorytellerOverlay();
      const content = messageDisplayModal.querySelector('.modal-content');
      if (content && !content.contains(e.target)) hideStorytellerOverlay();
    });
  }
  if (closeMessageDisplayBtn) closeMessageDisplayBtn.addEventListener('click', hideStorytellerOverlay);

  if (showStorytellerMessageBtn) {
    showStorytellerMessageBtn.addEventListener('click', () => {
      if (!Array.isArray(grimoireState.storytellerTempSlots) || !grimoireState.storytellerTempSlots.length) {
        try { grimoireState.storytellerTempSlots = (currentSlotTargets || []).slice(); } catch (_) { }
      }
      showStorytellerOverlay(storytellerMessageInput.value.trim());
      if (storytellerMessageModal) storytellerMessageModal.style.display = 'none';
      if (storytellerMessageEdit) storytellerMessageEdit.style.display = 'none';
    });
  }

  if (toggleBluffsViewBtn) {
    toggleBluffsViewBtn.addEventListener('click', () => {
      const bluffsDiv = messageDisplayModal.querySelector('.bluffs-container');
      const textDiv = messageDisplayModal.querySelector('.message-text');
      if (messageDisplayModal.style.display !== 'flex') {
        showStorytellerOverlay('');
      }
      const showingBluffs = bluffsDiv.style.display !== 'none';
      if (showingBluffs) {
        bluffsDiv.style.display = 'none';
        textDiv.style.display = '';
        toggleBluffsViewBtn.textContent = 'Show bluffs';
      } else {
        bluffsDiv.innerHTML = '';
        const currentBluffs = (grimoireState.bluffs || [null, null, null]).slice();
        currentBluffs.forEach((roleId, idx) => {
          const btn = document.createElement('button');
          btn.className = 'button';
          btn.textContent = roleId ? (grimoireState.allRoles[roleId]?.name || 'Unknown') : 'Select Bluff';
          btn.addEventListener('click', () => {
            const pick = prompt('Enter character id for temporary bluff:', roleId || '');
            if (pick) {
              currentBluffs[idx] = pick;
              btn.textContent = grimoireState.allRoles[pick]?.name || pick;
            }
          });
          bluffsDiv.appendChild(btn);
        });
        textDiv.style.display = 'none';
        bluffsDiv.style.display = 'flex';
        toggleBluffsViewBtn.textContent = 'Show message';
      }
    });
  }

  // Initial load
  loadStorytellerMessages();
}


