import { attachTouchHandler } from '../utils/eventHandlers.js';
export function createContextMenu({ id, buttons }) {
  let menu = document.getElementById(id);
  if (menu) return menu;
  menu = document.createElement('div');
  menu.id = id;
  buttons.forEach((config) => {
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
export function positionContextMenu(menu, x, y) {
  menu.style.display = 'block';
  const margin = 6;
  const rect = menu.getBoundingClientRect();
  const viewport = window.visualViewport;
  const width = viewport?.width || document.documentElement.clientWidth;
  const height = viewport?.height || document.documentElement.clientHeight;
  let left = Math.max(margin, x);
  let top = Math.max(margin, y);
  if (left + rect.width > width - margin) left = Math.max(margin, width - rect.width - margin);
  if (top + rect.height > height - margin) top = Math.max(margin, height - rect.height - margin);
  menu.style.left = `${left}px`;
  menu.style.top = `${top}px`;
}
