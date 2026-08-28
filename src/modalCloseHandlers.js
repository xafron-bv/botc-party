import { closeCustomReminderEditModal } from './reminder.js';

function bindModalCloseButton(buttonId, modalId, onClose) {
  const button = document.getElementById(buttonId); const modal = modalId ? document.getElementById(modalId) : null;
  if (button) { button.addEventListener('click', () => { if (onClose) onClose(); else if (modal) modal.style.display = 'none'; }); }
}

export function setupModalCloseHandlers({ grimoireState }) {
  bindModalCloseButton('close-text-reminder-x', 'text-reminder-modal');
  bindModalCloseButton('close-reminder-token-modal-x', 'reminder-token-modal');
  bindModalCloseButton('close-custom-reminder-edit', null, () => closeCustomReminderEditModal({ grimoireState }));
}
