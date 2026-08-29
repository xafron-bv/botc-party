import { createTokenElement } from './tokenRendering.js';
import { setupKeyboardActivation } from '../utils/interaction.js';
export function createTokenGridItem(options = {}) {
  const {
    id = '',
    image = '',
    baseImage = 'assets/img/token.png',
    label = '',
    title = '',
    onClick = null,
    curvedId = `picker-arc-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    data = {},
    extraClasses = []
  } = options; const tokenEl = createTokenElement({
    tagName: 'button',
    className: ['token', ...extraClasses].join(' ').trim(),
    role: image ? { image, name: label } : null,
    baseImage,
    labelIdPrefix: curvedId,
    showLabel: !!label,
    customLabel: label
  }); tokenEl.type = 'button'; tokenEl.style.position = 'relative'; tokenEl.style.overflow = 'visible'; tokenEl.style.zIndex = '1';
  if (label || title) tokenEl.setAttribute('aria-label', label || title); if (title) tokenEl.title = title; if (id) tokenEl.dataset.tokenId = id;
  if (data && typeof data === 'object') {
    Object.entries(data).forEach(([k, v]) => { if (v !== undefined && v !== null) tokenEl.dataset[k] = String(v); });
  }
  if (typeof onClick === 'function') { tokenEl.addEventListener('click', (e) => onClick(e)); }
  setupKeyboardActivation({ element: tokenEl });
  return tokenEl;
}
