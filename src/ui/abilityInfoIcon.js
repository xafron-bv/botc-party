/**
 * Utility for creating ability info icons with consistent styling and accessibility.
 * Returns a configured DOM element ready to append to tokens or other UI surfaces.
 *
 * @param {Object} options
 * @param {string} [options.ariaLabel] - Screen reader label
 * @param {string} [options.title] - Optional tooltip text
 * @param {Object} [options.dataset] - Key/value pairs to assign to dataset
 * @param {(context: { icon: HTMLElement, event: Event }) => void} options.onActivate - Callback on click/touch/keyboard
 * @returns {HTMLDivElement}
 */
export function createAbilityInfoIcon({ ariaLabel, title, dataset = {}, onActivate }) {
  const icon = document.createElement('div');
  icon.className = 'ability-info-icon';
  icon.setAttribute('role', 'button');
  icon.setAttribute('tabindex', '0');
  icon.textContent = 'i';

  if (ariaLabel) icon.setAttribute('aria-label', ariaLabel);
  if (title) icon.setAttribute('title', title);

  if (dataset && typeof dataset === 'object') {
    Object.entries(dataset).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        icon.dataset[key] = value;
      }
    });
  }

  const activate = (event) => {
    if (event) {
      event.stopPropagation();
      event.preventDefault();
    }
    if (typeof onActivate === 'function') {
      onActivate({ icon, event });
    }
  };

  icon.addEventListener('click', activate);
  icon.addEventListener('touchstart', activate, { passive: false });
  icon.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      activate(event);
    }
  });

  return icon;
}
