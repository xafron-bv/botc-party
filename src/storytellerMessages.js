import { populateCharacterGrid } from './character.js';
import { createCurvedLabelSvg } from './ui/svg.js';
// Note: Do not auto-hide/show grimoire from this module; the sidebar button controls it explicitly.

export function initStorytellerMessages({ grimoireState }) {
  const openStorytellerMessageBtn = document.getElementById('open-storyteller-message');
  const storytellerMessageModal = document.getElementById('storyteller-message-modal');
  const closeStorytellerMessageBtn = document.getElementById('close-storyteller-message');
  const storytellerMessagePicker = document.getElementById('storyteller-message-picker');
  const slotsDisplayEl = document.getElementById('storyteller-slots-display');
  const messageDisplayModal = document.getElementById('storyteller-message-display');
  const closeMessageDisplayBtn = document.getElementById('close-storyteller-message-display');
  const closeMessageDisplayBtnBottom = document.getElementById('close-storyteller-message-display-bottom');
  const messageTextEl = messageDisplayModal ? messageDisplayModal.querySelector('.message-text') : null;

  let currentMessageSlotCount = 0;

  if (messageTextEl) {
    messageTextEl.setAttribute('contenteditable', 'true');
    messageTextEl.setAttribute('spellcheck', 'false');
    messageTextEl.setAttribute('role', 'textbox');
    messageTextEl.setAttribute('aria-label', 'Storyteller message');
    messageTextEl.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') event.stopPropagation();
    });
  }

  function focusMessageText() {
    if (!messageTextEl) return;
    try {
      const selection = window.getSelection();
      if (!selection) return;
      const range = document.createRange();
      range.selectNodeContents(messageTextEl);
      selection.removeAllRanges();
      selection.addRange(range);
    } catch (_) { /* ignore selection errors */ }
    try { messageTextEl.focus(); } catch (_) { /* ignore focus errors */ }
  }

  function applyRoleLookToToken(tokenEl, roleId) {
    if (!tokenEl) return;
    const existingSvg = tokenEl.querySelector('svg');
    if (existingSvg) existingSvg.remove();

    tokenEl.style.width = 'calc(var(--token-size) * 1.5)';
    tokenEl.style.height = 'calc(var(--token-size) * 1.5)';
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
      const svg = createCurvedLabelSvg('story-msg-slot-empty', 'None');
      tokenEl.appendChild(svg);
    }
  }

  function clearSlot(index) {
    if (!Array.isArray(grimoireState.storytellerTempSlots)) return;
    if (index < 0 || index >= grimoireState.storytellerTempSlots.length) return;
    grimoireState.storytellerTempSlots[index] = null;
    const slotEl = slotsDisplayEl && slotsDisplayEl.children ? slotsDisplayEl.children[index] : null;
    applyRoleLookToToken(slotEl, null);
  }

  function renderSlotTokens() {
    if (!slotsDisplayEl) return;
    slotsDisplayEl.innerHTML = '';
    if (currentMessageSlotCount <= 0) {
      slotsDisplayEl.style.display = 'none';
      return;
    }

    const slots = Array.isArray(grimoireState.storytellerTempSlots)
      ? grimoireState.storytellerTempSlots.slice(0, currentMessageSlotCount)
      : new Array(currentMessageSlotCount).fill(null);

    slotsDisplayEl.style.display = 'flex';
    slots.forEach((roleId, index) => {
      const slot = document.createElement('div');
      slot.className = 'token';
      slot.dataset.storySlotIndex = String(index);
      slot.tabIndex = 0;
      applyRoleLookToToken(slot, roleId || null);
      slot.addEventListener('click', () => openRoleGridForSlot(index));
      slot.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openRoleGridForSlot(index);
        }
        if (event.key === 'Backspace' || event.key === 'Delete') {
          event.preventDefault();
          clearSlot(index);
        }
      });
      slot.addEventListener('contextmenu', (event) => {
        event.preventDefault();
        clearSlot(index);
      });
      slotsDisplayEl.appendChild(slot);
    });
  }

  function openRoleGridForSlot(slotIndex) {
    const characterModal = document.getElementById('character-modal');
    const characterSearch = document.getElementById('character-search');
    if (!characterModal || !characterSearch) return;
    if (!grimoireState.scriptData) { alert('Please load a script first.'); return; }

    grimoireState._tempStorytellerSlotIndex = slotIndex;
    const modalTitle = characterModal.querySelector('h3');
    if (modalTitle) modalTitle.textContent = 'Select a Character';
    populateCharacterGrid({ grimoireState });
    characterModal.style.display = 'flex';
    try {
      characterSearch.value = '';
      characterSearch.focus();
    } catch (_) { /* ignore */ }
  }

  function showStorytellerOverlay(initialText, slotCount) {
    if (!messageDisplayModal) return;
    currentMessageSlotCount = Math.max(0, slotCount || 0);
    if (!Array.isArray(grimoireState.storytellerTempSlots) || grimoireState.storytellerTempSlots.length !== currentMessageSlotCount) {
      grimoireState.storytellerTempSlots = new Array(currentMessageSlotCount).fill(null);
    }

    renderSlotTokens();
    if (messageTextEl) messageTextEl.textContent = initialText || '';

    messageDisplayModal.style.display = 'flex';
    if (messageTextEl) requestAnimationFrame(() => focusMessageText());
  }

  function hideStorytellerOverlay() {
    if (!messageDisplayModal) return;
    messageDisplayModal.style.display = 'none';
  }

  if (openStorytellerMessageBtn && storytellerMessageModal) {
    openStorytellerMessageBtn.addEventListener('click', async () => {
      if (grimoireState.mode === 'player') return;
      // Ensure messages are loaded before showing picker to avoid race conditions in tests
      if (!Array.isArray(grimoireState.storytellerMessages) || grimoireState.storytellerMessages.length === 0) {
        try { await loadStorytellerMessages(); } catch (_) { /* ignore */ }
      }
      storytellerMessageModal.style.display = 'flex';
      buildMessagePicker();
      try { storytellerMessageModal.scrollIntoView({ block: 'center' }); } catch (_) { /* ignore */ }
    });
  }

  if (closeStorytellerMessageBtn && storytellerMessageModal) {
    closeStorytellerMessageBtn.addEventListener('click', () => {
      storytellerMessageModal.style.display = 'none';
    });
  }

  if (messageDisplayModal) {
    messageDisplayModal.addEventListener('click', (e) => {
      if (e.target === messageDisplayModal) { hideStorytellerOverlay(); return; }
      const content = messageDisplayModal.querySelector('.modal-content');
      if (content && !content.contains(e.target)) hideStorytellerOverlay();
    });
  }

  if (closeMessageDisplayBtn) closeMessageDisplayBtn.addEventListener('click', hideStorytellerOverlay);
  if (closeMessageDisplayBtnBottom) closeMessageDisplayBtnBottom.addEventListener('click', hideStorytellerOverlay);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (messageDisplayModal && messageDisplayModal.style.display === 'flex') {
        hideStorytellerOverlay();
        return;
      }
      if (storytellerMessageModal && storytellerMessageModal.style.display === 'flex') {
        storytellerMessageModal.style.display = 'none';
      }
    }
  });

  loadStorytellerMessages();
  function buildMessagePicker() {
    if (!storytellerMessagePicker) return;
    const list = Array.isArray(grimoireState.storytellerMessages) ? grimoireState.storytellerMessages : [];
    storytellerMessagePicker.innerHTML = '';
    list.forEach((msg) => {
      const btn = document.createElement('button');
      btn.className = 'button';
      btn.textContent = msg.text;
      btn.addEventListener('click', () => {
        // Close picker and open viewer directly
        if (storytellerMessageModal) storytellerMessageModal.style.display = 'none';
        showStorytellerOverlay(msg.text, msg.slots || 0);
      });
      storytellerMessagePicker.appendChild(btn);
    });
  }

  async function loadStorytellerMessages() {
    // If already loaded, just (re)build
    if (Array.isArray(grimoireState.storytellerMessages) && grimoireState.storytellerMessages.length) {
      buildMessagePicker();
      return;
    }
    try {
      const res = await fetch('./player-setup.json', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const msgs = Array.isArray(data.storyteller_messages) ? data.storyteller_messages : [];
      // Normalize to { text, slots }
      grimoireState.storytellerMessages = msgs.map(m => ({ text: String(m.text || ''), slots: Number(m.slots || 0) }));
      buildMessagePicker();
    } catch (e) {
      console.error('Failed to load storyteller messages:', e);
      grimoireState.storytellerMessages = [
        { text: 'YOU ARE', slots: 1 },
        { text: 'THIS IS THE DEMON', slots: 0 }
      ];
      buildMessagePicker();
    }
  }

  // When character modal closes (after selecting/clearing), refresh slot visuals in the viewer
  const characterModal = document.getElementById('character-modal');
  if (characterModal) {
    characterModal.addEventListener('botc:character-modal-hidden', () => {
      if (messageDisplayModal && messageDisplayModal.style.display === 'flex') {
        renderSlotTokens();
      }
    });
  }


}

