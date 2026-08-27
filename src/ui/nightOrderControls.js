import { onIncludeTravellersChange } from '../character.js';
import { INCLUDE_TRAVELLERS_KEY } from '../constants.js';
import { displayScript } from '../script.js';

export function initNightOrderControls({
  grimoireState,
  includeTravellersCheckbox,
  nightOrderSortCheckbox,
  nightOrderControls,
  nightPhaseToggleBtn,
  firstNightBtn,
  otherNightsBtn
}) {
  try {
    grimoireState.includeTravellers = localStorage.getItem(INCLUDE_TRAVELLERS_KEY) === '1';
  } catch (_) {
    grimoireState.includeTravellers = false;
  }
  try {
    grimoireState.nightOrderSort = localStorage.getItem('nightOrderSort') === '1';
    grimoireState.nightPhase = localStorage.getItem('nightPhase') || 'first-night';
  } catch (_) {
    grimoireState.nightOrderSort = false;
    grimoireState.nightPhase = 'first-night';
  }

  if (includeTravellersCheckbox) {
    includeTravellersCheckbox.checked = grimoireState.includeTravellers;
    includeTravellersCheckbox.addEventListener('change', () =>
      onIncludeTravellersChange({ grimoireState, includeTravellersCheckbox })
    );
  }

  const nightPhaseContainer = document.querySelector('.night-phase-buttons');
  const syncSortControls = () => {
    const enabled = grimoireState.nightOrderSort;
    nightOrderControls?.classList.toggle('active', enabled);
    if (nightPhaseToggleBtn) nightPhaseToggleBtn.style.display = enabled ? '' : 'none';
    if (nightPhaseContainer) nightPhaseContainer.style.display = enabled ? '' : 'none';
  };
  const syncPhaseControls = () => {
    const firstNight = grimoireState.nightPhase === 'first-night';
    if (firstNightBtn) firstNightBtn.checked = firstNight;
    if (otherNightsBtn) otherNightsBtn.checked = !firstNight;
    if (nightPhaseToggleBtn) {
      nightPhaseToggleBtn.textContent = firstNight ? 'First Night' : 'Other Nights';
    }
  };
  const refreshScript = async () => {
    if (grimoireState.scriptData && grimoireState.nightOrderSort) {
      await displayScript({ data: grimoireState.scriptData, grimoireState });
    }
  };
  const setPhase = async (phase, syncControls = false) => {
    grimoireState.nightPhase = phase;
    try {
      localStorage.setItem('nightPhase', phase);
    } catch (_) {}
    if (syncControls) syncPhaseControls();
    await refreshScript();
  };

  if (nightOrderSortCheckbox) {
    nightOrderSortCheckbox.checked = grimoireState.nightOrderSort;
    nightOrderSortCheckbox.addEventListener('change', async () => {
      grimoireState.nightOrderSort = nightOrderSortCheckbox.checked;
      try {
        localStorage.setItem('nightOrderSort', grimoireState.nightOrderSort ? '1' : '0');
      } catch (_) {}
      syncSortControls();
      if (grimoireState.scriptData) {
        await displayScript({ data: grimoireState.scriptData, grimoireState });
      }
    });
  }

  firstNightBtn?.addEventListener('change', (event) => setPhase(event.target.value));
  otherNightsBtn?.addEventListener('change', (event) => setPhase(event.target.value));
  nightPhaseToggleBtn?.addEventListener('click', () =>
    setPhase(
      grimoireState.nightPhase === 'first-night' ? 'other-nights' : 'first-night',
      true
    )
  );

  syncSortControls();
  syncPhaseControls();
}
