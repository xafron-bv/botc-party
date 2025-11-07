// Modal close button handlers
import { hideCharacterModal } from './character.js';

export function setupModalCloseHandlers({ grimoireState }) {
  // Character modal
  const closeCharacterModalX = document.getElementById('close-character-modal-x');
  if (closeCharacterModalX) {
    closeCharacterModalX.addEventListener('click', () => hideCharacterModal({ grimoireState, clearBluffSelection: true }));
  }

  // Text reminder modal
  const closeTextReminderX = document.getElementById('close-text-reminder-x');
  const textReminderModal = document.getElementById('text-reminder-modal');
  if (closeTextReminderX) {
    closeTextReminderX.addEventListener('click', () => { if (textReminderModal) textReminderModal.style.display = 'none'; });
  }

  // Reminder token modal
  const closeReminderTokenModalX = document.getElementById('close-reminder-token-modal-x');
  const reminderTokenModal = document.getElementById('reminder-token-modal');
  if (closeReminderTokenModalX) {
    closeReminderTokenModalX.addEventListener('click', () => { if (reminderTokenModal) reminderTokenModal.style.display = 'none'; });
  }

  // Player setup panel
  const closePlayerSetup = document.getElementById('close-player-setup');
  const playerSetupPanel = document.getElementById('player-setup-panel');
  const closePlayerSetupHandler = () => {
    if (playerSetupPanel) playerSetupPanel.style.display = 'none';
    try { document.body.classList.remove('player-setup-open'); } catch (_) { }
  };
  if (closePlayerSetup) {
    closePlayerSetup.addEventListener('click', closePlayerSetupHandler);
  }

  // Number picker overlay
  const closeNumberPicker = document.getElementById('close-number-picker');
  const numberPickerOverlay = document.getElementById('number-picker-overlay');
  const closeNumberPickerHandler = () => { if (numberPickerOverlay) numberPickerOverlay.style.display = 'none'; };
  if (closeNumberPicker) {
    closeNumberPicker.addEventListener('click', closeNumberPickerHandler);
  }

  // Player reveal modal
  const closePlayerRevealModal = document.getElementById('close-player-reveal-modal');
  const playerRevealModal = document.getElementById('player-reveal-modal');
  const closePlayerRevealHandler = () => { if (playerRevealModal) playerRevealModal.style.display = 'none'; };
  if (closePlayerRevealModal) {
    closePlayerRevealModal.addEventListener('click', closePlayerRevealHandler);
  }

  // End game modal
  const closeEndGameModal = document.getElementById('close-end-game-modal');
  const endGameModal = document.getElementById('end-game-modal');
  const closeEndGameHandler = () => { if (endGameModal) endGameModal.style.display = 'none'; };
  if (closeEndGameModal) {
    closeEndGameModal.addEventListener('click', closeEndGameHandler);
  }

  // Storyteller message modal
  const closeStorytellerMessage = document.getElementById('close-storyteller-message');
  const storytellerMessageModal = document.getElementById('storyteller-message-modal');
  const closeStorytellerMessageHandler = () => { if (storytellerMessageModal) storytellerMessageModal.style.display = 'none'; };
  if (closeStorytellerMessage) {
    closeStorytellerMessage.addEventListener('click', closeStorytellerMessageHandler);
  }

  // Storyteller message display modal
  const closeStorytellerMessageDisplay = document.getElementById('close-storyteller-message-display');
  const storytellerMessageDisplay = document.getElementById('storyteller-message-display');
  const closeStorytellerMessageDisplayHandler = () => { if (storytellerMessageDisplay) storytellerMessageDisplay.style.display = 'none'; };
  if (closeStorytellerMessageDisplay) {
    closeStorytellerMessageDisplay.addEventListener('click', closeStorytellerMessageDisplayHandler);
  }
}
