export const TOUCH_EXPAND_SUPPRESS_MS = 350;
export const CLICK_EXPAND_SUPPRESS_MS = 250;
export const isTouchDevice = (window.matchMedia && window.matchMedia('(hover: none) and (pointer: coarse)').matches) || ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
export const prefersOverlaySidebar = window.matchMedia('(max-width: 900px)');
export const INCLUDE_TRAVELLERS_KEY = 'botcIncludeTravellersV1';
