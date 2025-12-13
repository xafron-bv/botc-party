function closePanelsForPrint() {
  try {
    const displaySettingsPanel = document.getElementById('display-settings-panel');
    if (displaySettingsPanel) {
      displaySettingsPanel.classList.remove('open');
      displaySettingsPanel.setAttribute('aria-hidden', 'true');
    }
  } catch (_) { }

  try {
    const dayNightSlider = document.getElementById('day-night-slider');
    if (dayNightSlider) {
      dayNightSlider.classList.remove('open');
      dayNightSlider.style.display = 'none';
    }
  } catch (_) { }
}

export function initGrimoirePrintExport() {
  const btn = document.getElementById('export-grimoire-print');
  if (!btn) return;

  btn.addEventListener('click', () => {
    closePanelsForPrint();
    try {
      window.print();
    } catch (error) {
      console.error('Failed to open print dialog:', error);
      alert('Unable to open print dialog in this browser.');
    }
  });
}

