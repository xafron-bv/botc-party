import { repositionPlayers } from './layout.js';

export const DISPLAY_SETTINGS_STORAGE_KEY = 'botcDisplaySettingsV1';

const DEFAULT_SETTINGS = {
  tokenScale: 1,
  playerNameScale: 1,
  circleScale: 1
};

const DEFAULT_THUMB_SIZE = 18;

const SLIDERS = {
  playerName: {
    elementId: 'player-name-size-slider',
    field: 'playerNameScale',
    min: 0.6,
    max: 1.2,
    valueAttr: 'player-name',
    defaultScale: 1,
    markerValue: 100,
    thumbSize: DEFAULT_THUMB_SIZE
  },
  token: {
    elementId: 'token-size-slider',
    field: 'tokenScale',
    min: 0.6,
    max: 1.6,
    valueAttr: 'token',
    defaultScale: 1,
    markerValue: 100,
    thumbSize: DEFAULT_THUMB_SIZE
  },
  circle: {
    elementId: 'circle-size-slider',
    field: 'circleScale',
    min: 0.6,
    max: 1.6,
    valueAttr: 'circle',
    defaultScale: 1,
    markerValue: 100,
    thumbSize: DEFAULT_THUMB_SIZE
  }
};

const FIELD_TO_CONFIG = {};

Object.keys(SLIDERS).forEach((type) => {
  const cfg = SLIDERS[type];
  cfg.type = type;
  FIELD_TO_CONFIG[cfg.field] = cfg;
});

function parseStoredSettings(raw) {
  const merged = { ...DEFAULT_SETTINGS };
  if (!raw) return merged;
  try {
    const parsed = JSON.parse(raw);
    Object.keys(merged).forEach((field) => {
      const value = Number(parsed[field]);
      if (!Number.isFinite(value)) return;
      const cfg = FIELD_TO_CONFIG[field];
      merged[field] = clampScale(value, cfg);
    });
    return merged;
  } catch (_) {
    return merged;
  }
}

function clampScale(value, config) {
  const defaultScale = Number.isFinite(config?.defaultScale) ? config.defaultScale : 1;
  if (!Number.isFinite(value)) return defaultScale;
  const min = Number.isFinite(config?.min) ? config.min : 0.6;
  const max = Number.isFinite(config?.max) ? config.max : 1.6;
  return Math.min(max, Math.max(min, value));
}

function saveSettings(settings) {
  try {
    localStorage.setItem(DISPLAY_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (_) { /* ignore storage errors */ }
}

function updateValueDisplay({ config, scale, panel }) {
  if (!panel || !config) return;
  const attr = config.valueAttr || config.type || config.field;
  const span = panel.querySelector(`.display-settings-value[data-settings-value="${attr}"]`);
  if (!span) return;
  span.textContent = `${Math.round(scale * 100)}%`;
}

function updateMarkerPosition(cfg) {
  if (!cfg?.element) return;
  const markerValue = Number.isFinite(cfg.markerValue) ? cfg.markerValue : 100;
  const min = Number(cfg.element.min || 0);
  const max = Number(cfg.element.max || 100);
  let clamped = 0.5;
  if (Number.isFinite(min) && Number.isFinite(max) && max > min) {
    const ratio = (markerValue - min) / (max - min);
    clamped = Math.min(1, Math.max(0, ratio));
  }
  const thumbSize = Number.isFinite(cfg.thumbSize) ? cfg.thumbSize : DEFAULT_THUMB_SIZE;
  const sliderEl = cfg.element;
  const rect = sliderEl.getBoundingClientRect();
  const trackWidth = rect.width || sliderEl.clientWidth || sliderEl.offsetWidth || 0;
  if (trackWidth <= 0) {
    sliderEl.style.setProperty('--marker-position-px', '50%');
    return;
  }
  const usableWidth = Math.max(0, trackWidth - thumbSize);
  const offset = (usableWidth * clamped) + thumbSize / 2;
  sliderEl.style.setProperty('--marker-position-px', `${offset}px`);
  if (cfg.markerElement) {
    cfg.markerElement.style.display = 'none';
  }
}

export function applyDisplaySettings({ grimoireState, settings }) {
  const merged = { ...DEFAULT_SETTINGS, ...(settings || {}) };
  document.documentElement.style.setProperty('--player-token-scale', String(merged.tokenScale));
  document.documentElement.style.setProperty('--player-name-scale', String(merged.playerNameScale));
  document.documentElement.style.setProperty('--circle-scale', String(merged.circleScale));

  if (grimoireState) {
    grimoireState.displaySettings = { ...merged };
  }

  try {
    if (grimoireState) {
      repositionPlayers({ grimoireState });
    }
  } catch (_) {
    /* repositioning can fail if player circle not ready; safe to ignore */
  }
}

export function initDisplaySettings({ grimoireState }) {
  const toggle = document.getElementById('display-settings-toggle');
  const panel = document.getElementById('display-settings-panel');
  if (!toggle || !panel) return;

  const stored = parseStoredSettings(localStorage.getItem(DISPLAY_SETTINGS_STORAGE_KEY));
  applyDisplaySettings({ grimoireState, settings: stored });

  const sliderConfigs = Object.values(SLIDERS).map((config) => {
    const element = document.getElementById(config.elementId);
    const attr = config.valueAttr || config.type || config.field;
    let markerElement = null;
    if (element && element.parentElement) {
      markerElement = element.parentElement.querySelector(`.slider-marker[data-settings-marker="${attr}"]`);
    }
    const defaultMinPercent = element ? Number(element.min || '0') : 0;
    const defaultMaxPercent = element ? Number(element.max || '100') : 100;
    return {
      ...config,
      element,
      markerElement,
      defaultMinPercent,
      defaultMaxPercent
    };
  });

  sliderConfigs.forEach((cfg) => {
    if (!cfg.element) return;
    const scale = clampScale(stored[cfg.field] ?? cfg.defaultScale, cfg);
    stored[cfg.field] = scale;
    cfg.element.value = String(Math.round(scale * 100));
    updateValueDisplay({ config: cfg, scale, panel });
    updateMarkerPosition(cfg);
  });

  let isOpen = false;
  let boundsUpdateScheduled = false;

  const recalcMarkers = () => {
    const run = () => sliderConfigs.forEach((cfg) => updateMarkerPosition(cfg));
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(run);
    } else {
      setTimeout(run, 16);
    }
  };
  const openPanel = () => {
    if (isOpen) return;
    panel.classList.add('open');
    panel.setAttribute('aria-hidden', 'false');
    toggle.classList.add('active');
    toggle.setAttribute('aria-pressed', 'true');
    isOpen = true;
    recalcMarkers();
  };
  const closePanel = () => {
    if (!isOpen) return;
    panel.classList.remove('open');
    panel.setAttribute('aria-hidden', 'true');
    toggle.classList.remove('active');
    toggle.setAttribute('aria-pressed', 'false');
    isOpen = false;
  };

  toggle.addEventListener('click', (e) => {
    e.preventDefault();
    if (isOpen) {
      closePanel();
    } else {
      openPanel();
    }
  });

  panel.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closePanel();
      toggle.focus();
    }
  });

  document.addEventListener('pointerdown', (event) => {
    if (!isOpen) return;
    const target = event.target;
    if (!target) return;
    if (panel.contains(target) || toggle.contains(target)) return;
    closePanel();
  });

  const onSliderInput = (cfg) => (event) => {
    const slider = event.target;
    const rawPercent = Number(slider.value);
    const scale = clampScale(rawPercent / 100, cfg);
    const percent = Math.round(scale * 100);
    if (percent !== rawPercent) {
      slider.value = String(percent);
    }
    stored[cfg.field] = scale;
    updateValueDisplay({ config: cfg, scale, panel });
    saveSettings(stored);
    applyDisplaySettings({ grimoireState, settings: stored });
    updateMarkerPosition(cfg);
  };

  sliderConfigs.forEach((cfg) => {
    if (!cfg.element) return;
    cfg.element.addEventListener('input', onSliderInput(cfg));
    cfg.element.addEventListener('change', onSliderInput(cfg));
  });

  window.addEventListener('resize', recalcMarkers);
}
