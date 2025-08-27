import { updateGrimoire } from './grimoire.js';
import { saveAppState } from './app.js';

// Initialize day/night tracking state
export function initDayNightTracking(grimoireState) {
  if (!grimoireState.dayNightTracking) {
    grimoireState.dayNightTracking = {
      enabled: false,
      phases: ['N1'], // Always start with Night 1
      currentPhaseIndex: 0,
      reminderTimestamps: {}, // Map of reminder IDs to phase when added
      phaseSnapshots: {} // Store complete grimoire state for each phase
    };
  } else {
    // Ensure phaseSnapshots exists for existing tracking data
    if (!grimoireState.dayNightTracking.phaseSnapshots) {
      grimoireState.dayNightTracking.phaseSnapshots = {};
    }
  }

  // Ensure slider starts hidden
  const sliderContainer = document.getElementById('day-night-slider');
  if (sliderContainer) {
    sliderContainer.style.display = 'none';
    sliderContainer.classList.remove('open');
  }

  setupDayNightEventListeners(grimoireState);
  updateDayNightUI(grimoireState);
}

// Setup event listeners
function setupDayNightEventListeners(grimoireState) {
  const toggle = document.getElementById('day-night-toggle');
  const slider = document.getElementById('phase-slider');
  const addPhaseBtn = document.getElementById('add-phase-button');

  if (toggle) {
    toggle.addEventListener('click', () => {
      grimoireState.dayNightTracking.enabled = !grimoireState.dayNightTracking.enabled;

      // When enabling, capture initial state for N1
      if (grimoireState.dayNightTracking.enabled) {
        // Ensure phaseSnapshots exists before saving
        if (!grimoireState.dayNightTracking.phaseSnapshots) {
          grimoireState.dayNightTracking.phaseSnapshots = {};
        }
        saveCurrentPhaseState(grimoireState);
      }

      updateDayNightUI(grimoireState);
      updateGrimoire({ grimoireState });
      saveAppState({ grimoireState });
    });
  }

  if (slider) {
    slider.addEventListener('input', (e) => {
      // Save current phase state before switching
      saveCurrentPhaseState(grimoireState);

      // Update phase index
      grimoireState.dayNightTracking.currentPhaseIndex = parseInt(e.target.value, 10);

      // Restore state for the new phase
      const newPhase = grimoireState.dayNightTracking.phases[grimoireState.dayNightTracking.currentPhaseIndex];
      restorePhaseState(grimoireState, newPhase);

      updateDayNightUI(grimoireState);
      updateGrimoire({ grimoireState });
      saveAppState({ grimoireState });
    });
  }

  if (addPhaseBtn) {
    addPhaseBtn.addEventListener('click', () => {
      addNextPhase(grimoireState);
    });
  }
}

// Add next phase (alternates between day and night)
function addNextPhase(grimoireState) {
  // Save current phase state before adding new phase
  saveCurrentPhaseState(grimoireState);

  const phases = grimoireState.dayNightTracking.phases;
  const lastPhase = phases[phases.length - 1];

  let nextPhase;
  if (lastPhase.startsWith('N')) {
    // After night comes day
    const nightNumber = parseInt(lastPhase.substring(1), 10);
    nextPhase = `D${nightNumber}`;
  } else {
    // After day comes night
    const dayNumber = parseInt(lastPhase.substring(1), 10);
    nextPhase = `N${dayNumber + 1}`;
  }

  phases.push(nextPhase);
  grimoireState.dayNightTracking.currentPhaseIndex = phases.length - 1;

  // Copy current state to new phase as initial state
  saveCurrentPhaseState(grimoireState);

  updateDayNightUI(grimoireState);
  updateGrimoire({ grimoireState });
  saveAppState({ grimoireState });
}

// Update UI based on current state
export function updateDayNightUI(grimoireState) {
  const toggle = document.getElementById('day-night-toggle');
  const sliderContainer = document.getElementById('day-night-slider');
  const slider = document.getElementById('phase-slider');
  const currentPhaseDiv = document.getElementById('current-phase');
  const phaseLabels = document.getElementById('phase-labels');

  if (!toggle || !sliderContainer) return;

  const { enabled, phases, currentPhaseIndex } = grimoireState.dayNightTracking;

  // Update toggle button
  toggle.classList.toggle('active', enabled);
  toggle.setAttribute('aria-pressed', enabled);

  // Update icon to show current phase
  const icon = toggle.querySelector('i');
  if (icon) {
    const currentPhase = phases[currentPhaseIndex];
    const isNight = currentPhase && currentPhase.startsWith('N');
    icon.className = isNight ? 'fas fa-moon' : 'fas fa-sun';
  }

  // Show/hide slider with animation
  if (enabled) {
    sliderContainer.style.display = 'block';
    // Force reflow to ensure the display change is applied before adding the class
    void sliderContainer.offsetHeight;
    sliderContainer.classList.add('open');
  } else {
    sliderContainer.classList.remove('open');
    // Wait for animation to complete before hiding
    setTimeout(() => {
      if (!grimoireState.dayNightTracking.enabled) {
        sliderContainer.style.display = 'none';
      }
    }, 300);
  }

  if (enabled) {
    // Update slider
    slider.max = phases.length - 1;
    slider.value = currentPhaseIndex;

    // Update current phase display
    currentPhaseDiv.textContent = phases[currentPhaseIndex];

    // Update phase labels
    phaseLabels.innerHTML = '';
    phases.forEach((phase, index) => {
      const label = document.createElement('div');
      label.className = 'phase-label';
      label.textContent = phase;
      label.style.left = `${(index / (phases.length - 1)) * 100}%`;
      phaseLabels.appendChild(label);
    });
  }
}

// Get current phase
export function getCurrentPhase(grimoireState) {
  if (!grimoireState.dayNightTracking.enabled) return null;
  const { phases, currentPhaseIndex } = grimoireState.dayNightTracking;
  return phases[currentPhaseIndex];
}

// Add timestamp to a reminder
export function addReminderTimestamp(grimoireState, reminderId) {
  if (!grimoireState.dayNightTracking.enabled) return;

  const currentPhase = getCurrentPhase(grimoireState);
  if (currentPhase) {
    grimoireState.dayNightTracking.reminderTimestamps[reminderId] = currentPhase;
  }
}

// Get timestamp for a reminder
export function getReminderTimestamp(grimoireState, reminderId) {
  if (!grimoireState.dayNightTracking.enabled) return null;
  return grimoireState.dayNightTracking.reminderTimestamps[reminderId] || null;
}

// Check if a reminder should be visible based on current phase
export function isReminderVisible(grimoireState, reminderId) {
  if (!grimoireState.dayNightTracking.enabled) return true;

  const reminderPhase = grimoireState.dayNightTracking.reminderTimestamps[reminderId];
  if (!reminderPhase) return true; // Show reminders without timestamps

  const { phases, currentPhaseIndex } = grimoireState.dayNightTracking;
  const reminderPhaseIndex = phases.indexOf(reminderPhase);

  // Show reminder if it was added in current phase or earlier
  return reminderPhaseIndex <= currentPhaseIndex;
}

// Generate unique ID for reminders
export function generateReminderId() {
  return `reminder-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Calculate night order for all players
export function calculateNightOrder(grimoireState) {
  if (!grimoireState.dayNightTracking.enabled) return {};

  const currentPhase = getCurrentPhase(grimoireState);
  if (!currentPhase || !currentPhase.startsWith('N')) return {};

  const isFirstNight = currentPhase === 'N1';
  const nightOrderKey = isFirstNight ? 'firstNight' : 'otherNight';

  // Get all players with their night orders
  const playersWithNightOrder = [];
  grimoireState.players.forEach((player, index) => {
    if (player.character) {
      const role = grimoireState.allRoles[player.character] ||
                   grimoireState.baseRoles[player.character] ||
                   grimoireState.extraTravellerRoles[player.character];
      if (role && role[nightOrderKey] && role[nightOrderKey] > 0) {
        playersWithNightOrder.push({
          playerIndex: index,
          nightOrder: role[nightOrderKey],
          characterId: player.character
        });
      }
    }
  });

  // Sort by night order value
  playersWithNightOrder.sort((a, b) => a.nightOrder - b.nightOrder);

  // Assign sequential numbers starting from 1
  const nightOrderMap = {};
  playersWithNightOrder.forEach((item, index) => {
    nightOrderMap[item.playerIndex] = index + 1;
  });

  return nightOrderMap;
}

// Check if night order should be displayed
export function shouldShowNightOrder(grimoireState) {
  if (!grimoireState.dayNightTracking.enabled) return false;

  const currentPhase = getCurrentPhase(grimoireState);
  return currentPhase && currentPhase.startsWith('N');
}

// Create a snapshot of current grimoire state
export function createPhaseSnapshot(grimoireState) {
  // Deep clone the players array to capture current state
  return {
    players: JSON.parse(JSON.stringify(grimoireState.players))
  };
}

// Save current state to current phase
export function saveCurrentPhaseState(grimoireState) {
  if (!grimoireState.dayNightTracking.enabled) return;

  const currentPhase = getCurrentPhase(grimoireState);
  if (!currentPhase) return;

  // Ensure phaseSnapshots exists
  if (!grimoireState.dayNightTracking.phaseSnapshots) {
    grimoireState.dayNightTracking.phaseSnapshots = {};
  }

  // Save current state to the phase
  grimoireState.dayNightTracking.phaseSnapshots[currentPhase] = createPhaseSnapshot(grimoireState);
}

// Restore state from a specific phase
export function restorePhaseState(grimoireState, phase) {
  if (!grimoireState.dayNightTracking.enabled) return;

  // Ensure phaseSnapshots exists
  if (!grimoireState.dayNightTracking.phaseSnapshots) {
    grimoireState.dayNightTracking.phaseSnapshots = {};
    return;
  }

  const snapshot = grimoireState.dayNightTracking.phaseSnapshots[phase];
  if (!snapshot) return;

  // Restore players state from snapshot
  grimoireState.players = JSON.parse(JSON.stringify(snapshot.players));
}
