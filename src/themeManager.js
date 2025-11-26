// Theme management
const THEME_KEY = 'selectedTheme';
const DEFAULT_THEME = 'botc';

export function initThemeSelector() {
  const themeSelect = document.getElementById('theme-select');
  if (!themeSelect) return;

  // Load saved theme
  const savedTheme = loadTheme();
  applyTheme(savedTheme);
  themeSelect.value = savedTheme;

  // Handle theme changes
  themeSelect.addEventListener('change', (e) => {
    const theme = e.target.value;
    applyTheme(theme);
    saveTheme(theme);
  });
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
}

function saveTheme(theme) {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch (e) {
    console.warn('Failed to save theme:', e);
  }
}

function loadTheme() {
  try {
    return localStorage.getItem(THEME_KEY) || DEFAULT_THEME;
  } catch (e) {
    console.warn('Failed to load theme:', e);
    return DEFAULT_THEME;
  }
}
