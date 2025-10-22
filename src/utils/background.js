import { BG_STORAGE_KEY } from '../constants';

export function applyGrimoireBackground(value) {
  const centerEl = document.getElementById('center');
  if (!centerEl) return;
  const classList = ['bg-dark', 'bg-red-gradient', 'bg-dark-purple', 'bg-wood', 'bg-cosmic'];
  // Remove all variant classes first
  classList.forEach(c => centerEl.classList.remove(c));
  // Legacy mapping: treat missing/none/unknown as 'dark'
  if (!value || value === 'none') value = 'dark';

  switch (value) {
  case 'dark':
    centerEl.classList.add('bg-dark');
    break;
  case 'red-gradient':
    centerEl.classList.add('bg-red-gradient');
    break;
  case 'dark-purple':
    centerEl.classList.add('bg-dark-purple');
    break;
  case 'wood':
    centerEl.classList.add('bg-wood');
    break;
  case 'cosmic':
    centerEl.classList.add('bg-cosmic');
    break;
  default:
    // Fallback: treat as color hex code or CSS color
    centerEl.style.backgroundImage = 'none';
    centerEl.style.backgroundColor = value;
  }
} export function initGrimoireBackground() {
  const centerEl = document.getElementById('center');
  const backgroundSelect = document.getElementById('background-select');
  if (!centerEl) return;
  try {
    let savedBg = localStorage.getItem(BG_STORAGE_KEY) || 'dark';
    if (savedBg === 'none') {
      // Migrate legacy 'none' selection to 'dark'
      savedBg = 'dark';
      try { localStorage.setItem(BG_STORAGE_KEY, 'dark'); } catch (_) { }
    }
    applyGrimoireBackground(savedBg);
    if (backgroundSelect) backgroundSelect.value = savedBg;
  } catch (_) { }
}
export function handleGrimoireBackgroundChange() {
  const backgroundSelect = document.getElementById('background-select');
  const val = backgroundSelect.value;
  applyGrimoireBackground(val);
  try { localStorage.setItem(BG_STORAGE_KEY, val); } catch (_) { }
}

