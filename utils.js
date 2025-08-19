// Utility functions used across the app (browser-native ES module)

export function generateId(prefix) {
  try {
    if (crypto && crypto.randomUUID) return `${prefix || 'id'}_${crypto.randomUUID()}`;
  } catch (_) {}
  return `${prefix || 'id'}_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
}

export function formatDateName(date = new Date()) {
  try {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${d} ${hh}:${mm}`;
  } catch (_) {
    return String(date);
  }
}

export function isExcludedScriptName(name) {
  if (!name) return false;
  const n = String(name).trim().toLowerCase();
  return (
    n === 'trouble brewing' ||
    n === 'bad moon rising' ||
    n === 'sects & violets' ||
    n === 'sects and violets' ||
    n === 'all characters'
  );
}

export function resolveAssetPath(path) {
  if (!path) return path;
  if (/^https?:\/\//.test(path)) return path;
  if (path.startsWith('/')) return `.${path}`;
  return path;
}

export function normalizeKey(value) {
  if (typeof value !== 'string') return '';
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

