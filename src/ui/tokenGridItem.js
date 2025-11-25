import { resolveAssetPath } from '../../utils.js';
import { renderTokenElement } from './tokenRendering.js';

/**
 * Create a reusable token grid item element used by character and reminder pickers.
 * Options:
 * - id: string (data-token-id)
 * - image: string (foreground icon URL)
 * - baseImage: string (base token URL, defaults to assets/img/token.png)
 * - label: string (curved text rendered inside token)
 * - title: string (tooltip)
 * - onClick: function (optional click handler)
 * - curvedId: string (unique id prefix for curved text path)
 * - data: object (additional data-* attributes to apply)
 * - showCheckbox: boolean (render checkbox UI)
 * - checkboxLabel: string (label text for checkbox)
 * - checkboxChecked: boolean (initial checked state)
 * - onCheckboxChange: function(checked)
 * - extraClasses: string[] (additional classes on the token div)
 */
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
    showCheckbox = false,
    checkboxLabel = '',
    checkboxChecked = false,
    onCheckboxChange = null,
    extraClasses = []
  } = options;

  const tokenEl = document.createElement('div');
  tokenEl.className = ['token', ...extraClasses].join(' ').trim();

  renderTokenElement({
    tokenElement: tokenEl,
    role: image ? { image, name: label } : null,
    baseImage: resolveAssetPath(baseImage),
    labelIdPrefix: curvedId,
    showLabel: !!label,
    customLabel: label,
    activeColor: 'transparent'
  });

  tokenEl.style.position = 'relative';
  tokenEl.style.overflow = 'visible';
  tokenEl.style.zIndex = '1';
  if (title) tokenEl.title = title;

  // Apply data-* attributes
  if (id) tokenEl.dataset.tokenId = id;
  if (data && typeof data === 'object') {
    Object.entries(data).forEach(([k, v]) => {
      if (v !== undefined && v !== null) tokenEl.dataset[k] = String(v);
    });
  }

  if (typeof onClick === 'function') {
    tokenEl.addEventListener('click', (e) => onClick(e));
  }

  // Optional checkbox UI. By default not used in pickers, but supported.
  if (showCheckbox) {
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = !!checkboxChecked;
    checkbox.style.position = 'absolute';
    checkbox.style.left = '6px';
    checkbox.style.top = '6px';
    checkbox.style.zIndex = '3';
    checkbox.setAttribute('aria-label', checkboxLabel || 'toggle');

    if (typeof onCheckboxChange === 'function') {
      checkbox.addEventListener('change', () => onCheckboxChange(checkbox.checked));
    }
    tokenEl.appendChild(checkbox);

    if (checkboxLabel) {
      const labelEl = document.createElement('div');
      labelEl.textContent = checkboxLabel;
      labelEl.style.position = 'absolute';
      labelEl.style.left = '26px';
      labelEl.style.top = '6px';
      labelEl.style.color = '#eee';
      labelEl.style.fontSize = '12px';
      labelEl.style.textShadow = '0 1px 2px rgba(0,0,0,0.6)';
      labelEl.style.zIndex = '3';
      tokenEl.appendChild(labelEl);
    }
  }

  return tokenEl;
}
