export function setupModalCloseHandlers({ grimoireState }) {
  const closeTextReminderX = document.getElementById('close-text-reminder-x');
  const textReminderModal = document.getElementById('text-reminder-modal');
  if (closeTextReminderX) {
    closeTextReminderX.addEventListener('click', () => {
      if (textReminderModal) textReminderModal.style.display = 'none';
    });
  }
  const closeReminderTokenModalX = document.getElementById('close-reminder-token-modal-x');
  const reminderTokenModal = document.getElementById('reminder-token-modal');
  if (closeReminderTokenModalX) {
    closeReminderTokenModalX.addEventListener('click', () => {
      if (reminderTokenModal) reminderTokenModal.style.display = 'none';
    });
  }
  const closePlayerSetup = document.getElementById('close-player-setup');
  const playerSetupPanel = document.getElementById('player-setup-panel');
  const closePlayerSetupHandler = () => {
    if (playerSetupPanel) playerSetupPanel.style.display = 'none';
    try {
      document.body.classList.remove('player-setup-open');
    } catch (_) {}
  };
  if (closePlayerSetup) {
    closePlayerSetup.addEventListener('click', closePlayerSetupHandler);
  }
  const closeNumberPicker = document.getElementById('close-number-picker');
  const numberPickerOverlay = document.getElementById('number-picker-overlay');
  const closeNumberPickerHandler = () => {
    if (numberPickerOverlay) numberPickerOverlay.style.display = 'none';
  };
  if (closeNumberPicker) {
    closeNumberPicker.addEventListener('click', closeNumberPickerHandler);
  }
  const closePlayerRevealModal = document.getElementById('close-player-reveal-modal');
  const playerRevealModal = document.getElementById('player-reveal-modal');
  const closePlayerRevealHandler = () => {
    if (playerRevealModal) playerRevealModal.style.display = 'none';
  };
  if (closePlayerRevealModal) {
    closePlayerRevealModal.addEventListener('click', closePlayerRevealHandler);
  }
  const closeEndGameModal = document.getElementById('close-end-game-modal');
  const endGameModal = document.getElementById('end-game-modal');
  const closeEndGameHandler = () => {
    if (endGameModal) endGameModal.style.display = 'none';
  };
  if (closeEndGameModal) {
    closeEndGameModal.addEventListener('click', closeEndGameHandler);
  }
  const closeStorytellerMessage = document.getElementById('close-storyteller-message');
  const storytellerMessageModal = document.getElementById('storyteller-message-modal');
  const closeStorytellerMessageHandler = () => {
    if (storytellerMessageModal) storytellerMessageModal.style.display = 'none';
  };
  if (closeStorytellerMessage) {
    closeStorytellerMessage.addEventListener('click', closeStorytellerMessageHandler);
  }
  const closeStorytellerMessageDisplay = document.getElementById(
    'close-storyteller-message-display'
  );
  const storytellerMessageDisplay = document.getElementById('storyteller-message-display');
  const closeStorytellerMessageDisplayHandler = () => {
    if (storytellerMessageDisplay) storytellerMessageDisplay.style.display = 'none';
  };
  if (closeStorytellerMessageDisplay) {
    closeStorytellerMessageDisplay.addEventListener('click', closeStorytellerMessageDisplayHandler);
  }
  const closeCustomReminderEdit = document.getElementById('close-custom-reminder-edit');
  const customReminderEditModal = document.getElementById('custom-reminder-edit-modal');
  const closeCustomReminderEditHandler = () => {
    if (customReminderEditModal) {
      customReminderEditModal.style.display = 'none';
      if (grimoireState) {
        grimoireState.editingCustomReminder = null;
      }
      const customReminderTextInput = document.getElementById('custom-reminder-text-input');
      if (customReminderTextInput) {
        const clonedInput = customReminderTextInput.cloneNode(true);
        customReminderTextInput.parentNode.replaceChild(clonedInput, customReminderTextInput);
      }
    }
  };
  if (closeCustomReminderEdit) {
    closeCustomReminderEdit.addEventListener('click', closeCustomReminderEditHandler);
  }
}
