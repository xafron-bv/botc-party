import { isActivationKey } from '../utils/interaction.js';
export function createAbilityInfoIcon({ ariaLabel, title, dataset = {}, onActivate }) {
  const icon = document.createElement('div'); icon.className = 'ability-info-icon'; icon.setAttribute('role', 'button'); icon.setAttribute('tabindex', '0'); icon.textContent = 'i';
  if (ariaLabel) icon.setAttribute('aria-label', ariaLabel); if (title) icon.setAttribute('title', title);
  if (dataset && typeof dataset === 'object') {
    Object.entries(dataset).forEach(([key, value]) => {
      if (value !== undefined && value !== null) { icon.dataset[key] = value; }
    });
  }
  const activate = (event) => {
    if (event) { event.stopPropagation(); event.preventDefault(); }
    if (typeof onActivate === 'function') { onActivate({ icon, event }); }
  }; icon.addEventListener('click', activate); icon.addEventListener('touchstart', activate, { passive: false });
  icon.addEventListener('keydown', (event) => {
    if (isActivationKey(event)) { activate(event); }
  }); return icon;
}
