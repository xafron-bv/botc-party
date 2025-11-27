import { attachTouchHandler } from '../utils/eventHandlers.js';

/**
 * Creates a context menu with the specified buttons.
 * @param {Object} params
 * @param {string} params.id - The DOM ID for the menu.
 * @param {Array<{id: string, label: string, onClick: Function, className?: string}>} params.buttons - Button configurations.
 * @returns {HTMLElement} The created menu element.
 */
export function createContextMenu({ id, buttons }) {
  let menu = document.getElementById(id);
  if (menu) return menu;

  menu = document.createElement('div');
  menu.id = id;

  buttons.forEach(config => {
    const btn = document.createElement('button');
    btn.id = config.id;
    btn.textContent = config.label;
    if (config.className) {
      btn.className = config.className;
    }

    attachTouchHandler(btn, config.onClick);
    menu.appendChild(btn);
  });

  document.body.appendChild(menu);
  return menu;
}

/**
 * Positions a context menu at the specified coordinates, keeping it within viewport bounds.
 * @param {HTMLElement} menu - The menu element.
 * @param {number} x - Target X coordinate.
 * @param {number} y - Target Y coordinate.
 */
export function positionContextMenu(menu, x, y) {
  menu.style.display = 'block';
  const margin = 6;

  requestAnimationFrame(() => {
    const rect = menu.getBoundingClientRect();
    let left = x;
    let top = y;

    if (left + rect.width > window.innerWidth - margin) {
      left = Math.max(margin, window.innerWidth - rect.width - margin);
    }

    if (top + rect.height > window.innerHeight - margin) {
      top = Math.max(margin, window.innerHeight - rect.height - margin);
    }

    menu.style.left = `${left}px`;
    menu.style.top = `${top}px`;
  });
}
