// Theme management
const THEME_KEY = 'selectedTheme';
const DEFAULT_THEME = 'blue';
const SUPPORTED_THEMES = ['blue', 'purple'];

export function initThemeSelector() {
  const themeSelect = document.getElementById('theme-select');
  if (!themeSelect) return;

  // Load saved theme
  const savedTheme = loadTheme();
  applyTheme(savedTheme);
  themeSelect.value = savedTheme;
}

export function handleThemeChange() {
  const themeSelect = document.getElementById('theme-select');
  if (!themeSelect) return;
  const theme = themeSelect.value;
  applyTheme(theme);
  saveTheme(theme);
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
    const stored = localStorage.getItem(THEME_KEY);
    const theme = SUPPORTED_THEMES.includes(stored) ? stored : DEFAULT_THEME;
    if (theme !== stored) {
      saveTheme(theme);
    }
    return theme;
  } catch (e) {
    console.warn('Failed to load theme:', e);
    return DEFAULT_THEME;
  }
}
