import { normalizeKey, resolveAssetPath } from '../utils.js';

let gameDataPromise;

export async function loadGameData() {
  if (!gameDataPromise) {
    gameDataPromise = fetch('./data.json', { cache: 'no-store' }).then(async (response) => {
      if (!response.ok) throw new Error(`Failed to load data.json: ${response.status}`);
      return response.json();
    });
  }
  try {
    return await gameDataPromise;
  } catch (error) {
    gameDataPromise = null;
    throw error;
  }
}

export function normalizeRole(role) {
  if (!role?.id) return null;
  const team = String(role.team || '').toLowerCase();
  return {
    ...role,
    team,
    image: resolveAssetPath(role.image || `/build/img/icons/${team}/${role.id}.webp`)
  };
}

export function indexRoles(roles) {
  const byId = {};
  const idByNormalizedKey = {};
  (Array.isArray(roles) ? roles : []).forEach((candidate) => {
    const role = normalizeRole(candidate);
    if (!role) return;
    byId[role.id] = role;
    [role.id, role.name].forEach((value) => {
      const key = normalizeKey(value);
      if (key) idByNormalizedKey[key] = role.id;
    });
  });
  return { byId, idByNormalizedKey };
}

export function createCustomRole(source, { includeSetupData = true } = {}) {
  if (!source?.id || !source.name || !source.team || !source.ability) return null;
  let image = source.image;
  if (Array.isArray(image)) image = image.find(value => typeof value === 'string' && value.trim()) || null;
  const role = {
    id: source.id,
    name: source.name,
    team: String(source.team).toLowerCase(),
    ability: source.ability,
    image: image ? resolveAssetPath(image) : './assets/img/token.png'
  };
  ['firstNight', 'otherNight'].forEach((key) => {
    if (typeof source[key] === 'number') role[key] = source[key];
  });
  ['firstNightReminder', 'otherNightReminder'].forEach((key) => {
    if (typeof source[key] === 'string') role[key] = source[key];
  });
  if (includeSetupData) {
    ['reminders', 'remindersGlobal', 'jinxes'].forEach((key) => {
      if (source[key]) role[key] = source[key];
    });
    if (source.setup !== undefined) role.setup = source.setup;
  }
  return role;
}
