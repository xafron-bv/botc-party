import { updateGrimoire } from './grimoire.js';
import { saveAppState } from './app.js';

export function initDayNightTracking(grimoireState) {
  if (!grimoireState.dayNightTracking) {
    grimoireState.dayNightTracking = {
      enabled: false,
      phases: ['N1'],
      currentPhaseIndex: 0,
      reminderTimestamps: {},
      phaseSnapshots: {}
    };
  } else {
    if (!grimoireState.dayNightTracking.phaseSnapshots) {
      grimoireState.dayNightTracking.phaseSnapshots = {};
    }
  }

  const sliderContainer = document.getElementById('day-night-slider');
  if (sliderContainer) {
    sliderContainer.style.display = 'none';
    sliderContainer.classList.remove('open');
  }

  setupDayNightEventListeners(grimoireState);
  updateDayNightUI(grimoireState);
}

function setupDayNightEventListeners(grimoireState) {
  const toggle = document.getElementById('day-night-toggle');
  const slider = document.getElementById('phase-slider');
  const addPhaseBtn = document.getElementById('add-phase-button');

  if (toggle) {
    toggle.addEventListener('click', () => {
      grimoireState.dayNightTracking.enabled = !grimoireState.dayNightTracking.enabled;

      if (grimoireState.dayNightTracking.enabled) {
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
      saveCurrentPhaseState(grimoireState);

      grimoireState.dayNightTracking.currentPhaseIndex = parseInt(e.target.value, 10);

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

function addNextPhase(grimoireState) {
  saveCurrentPhaseState(grimoireState);

  const phases = grimoireState.dayNightTracking.phases;
  const lastPhase = phases[phases.length - 1];

  let nextPhase;
  if (lastPhase.startsWith('N')) {
    const nightNumber = parseInt(lastPhase.substring(1), 10);
    nextPhase = `D${nightNumber}`;
  } else {
    const dayNumber = parseInt(lastPhase.substring(1), 10);
    nextPhase = `N${dayNumber + 1}`;
  }

  phases.push(nextPhase);
  grimoireState.dayNightTracking.currentPhaseIndex = phases.length - 1;

  saveCurrentPhaseState(grimoireState);

  updateDayNightUI(grimoireState);
  updateGrimoire({ grimoireState });
  saveAppState({ grimoireState });
}

export function updateDayNightUI(grimoireState) {
  const toggle = document.getElementById('day-night-toggle');
  const sliderContainer = document.getElementById('day-night-slider');
  const slider = document.getElementById('phase-slider');
  const currentPhaseDiv = document.getElementById('current-phase');
  const phaseLabels = document.getElementById('phase-labels');

  if (!toggle || !sliderContainer) return;

  const { enabled, phases, currentPhaseIndex } = grimoireState.dayNightTracking;

  toggle.classList.toggle('active', enabled);
  toggle.setAttribute('aria-pressed', enabled);

  const icon = toggle.querySelector('i');
  if (icon) {
    const currentPhase = phases[currentPhaseIndex];
    const isNight = currentPhase && currentPhase.startsWith('N');
    icon.className = isNight ? 'fas fa-moon' : 'fas fa-sun';
  }

  if (enabled) {
    sliderContainer.style.display = 'block';
    void sliderContainer.offsetHeight;
    sliderContainer.classList.add('open');
  } else {
    sliderContainer.classList.remove('open');
    setTimeout(() => {
      if (!grimoireState.dayNightTracking.enabled) {
        sliderContainer.style.display = 'none';
      }
    }, 300);
  }

  if (enabled) {
    slider.max = phases.length - 1;
    slider.value = currentPhaseIndex;

    currentPhaseDiv.textContent = phases[currentPhaseIndex];

    phaseLabels.innerHTML = '';
    phases.forEach((phase, index) => {
      const label = document.createElement('div');
      label.className = 'phase-label';
      label.textContent = phase;
      label.style.left = `${(index / (phases.length - 1)) * 100}%`;
      phaseLabels.appendChild(label);
    });
  } else {
    try { currentPhaseDiv.textContent = phases[currentPhaseIndex] || 'N1'; } catch (_) { }
  }
}

export function getCurrentPhase(grimoireState) {
  if (!grimoireState.dayNightTracking.enabled) return null;
  const { phases, currentPhaseIndex } = grimoireState.dayNightTracking;
  return phases[currentPhaseIndex];
}

export function addReminderTimestamp(grimoireState, reminderId) {
  if (!grimoireState.dayNightTracking.enabled) return;

  const currentPhase = getCurrentPhase(grimoireState);
  if (currentPhase) {
    grimoireState.dayNightTracking.reminderTimestamps[reminderId] = currentPhase;
  }
}

export function getReminderTimestamp(grimoireState, reminderId) {
  if (!grimoireState.dayNightTracking.enabled) return null;
  return grimoireState.dayNightTracking.reminderTimestamps[reminderId] || null;
}

export function isReminderVisible(grimoireState, reminderId) {
  if (!grimoireState.dayNightTracking.enabled) return true;

  const reminderPhase = grimoireState.dayNightTracking.reminderTimestamps[reminderId];
  if (!reminderPhase) return true;

  const { phases, currentPhaseIndex } = grimoireState.dayNightTracking;
  const reminderPhaseIndex = phases.indexOf(reminderPhase);

  return reminderPhaseIndex <= currentPhaseIndex;
}

export function generateReminderId() {
  return `reminder-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function calculateNightOrder(grimoireState) {
  if (!grimoireState.dayNightTracking.enabled) return {};

  const currentPhase = getCurrentPhase(grimoireState);
  if (!currentPhase || !currentPhase.startsWith('N')) return {};

  const isFirstNight = currentPhase === 'N1';
  const nightOrderKey = isFirstNight ? 'firstNight' : 'otherNight';

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

  playersWithNightOrder.sort((a, b) => a.nightOrder - b.nightOrder);

  const nightOrderMap = {};
  playersWithNightOrder.forEach((item, index) => {
    nightOrderMap[item.playerIndex] = index + 1;
  });

  return nightOrderMap;
}

export function shouldShowNightOrder(grimoireState) {
  if (!grimoireState.dayNightTracking.enabled) return false;

  const currentPhase = getCurrentPhase(grimoireState);
  return currentPhase && currentPhase.startsWith('N');
}

export function createPhaseSnapshot(grimoireState) {
  return {
    players: JSON.parse(JSON.stringify(grimoireState.players))
  };
}

export function saveCurrentPhaseState(grimoireState) {
  if (!grimoireState.dayNightTracking.enabled) return;

  const currentPhase = getCurrentPhase(grimoireState);
  if (!currentPhase) return;

  if (!grimoireState.dayNightTracking.phaseSnapshots) {
    grimoireState.dayNightTracking.phaseSnapshots = {};
  }

  grimoireState.dayNightTracking.phaseSnapshots[currentPhase] = createPhaseSnapshot(grimoireState);
}

export function restorePhaseState(grimoireState, phase) {
  if (!grimoireState.dayNightTracking.enabled) return;

  if (!grimoireState.dayNightTracking.phaseSnapshots) {
    grimoireState.dayNightTracking.phaseSnapshots = {};
    return;
  }

  const snapshot = grimoireState.dayNightTracking.phaseSnapshots[phase];
  if (!snapshot) return;

  grimoireState.players = JSON.parse(JSON.stringify(snapshot.players));
}
