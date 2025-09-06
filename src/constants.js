export const TOUCH_EXPAND_SUPPRESS_MS = 350;
export const CLICK_EXPAND_SUPPRESS_MS = 250;
// Dynamic touch detection to support testing
export const isTouchDevice = () => {
  return (window.matchMedia && window.matchMedia('(hover: none) and (pointer: coarse)').matches) ||
    ('ontouchstart' in window) ||
    (navigator.maxTouchPoints > 0);
};
export const prefersOverlaySidebar = window.matchMedia('(max-width: 900px)');
export const INCLUDE_TRAVELLERS_KEY = 'botcIncludeTravellersV1';
export const BG_STORAGE_KEY = 'grimoireBackgroundV1';
export const minReminderSize = 28;
export const MODE_STORAGE_KEY = 'botcModeV1';
