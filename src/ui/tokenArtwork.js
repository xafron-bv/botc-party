/**
 * Apply background artwork styling to a circular token element.
 * Handles stacking role artwork over the base token image and resets to defaults when no role.
 *
 * @param {Object} params
 * @param {HTMLElement} params.tokenEl - Element to style.
 * @param {string} params.baseImage - URL or path to the base token image.
 * @param {string|null|undefined} [params.roleImage] - Optional role artwork to overlay.
 * @param {string} [params.activeColor='transparent'] - Background color when a role image is present.
 * @param {string} [params.emptyColor='rgba(0,0,0,0.2)'] - Background color when no role image is present.
 * @param {string} [params.roleSize='68% 68%, cover'] - Background-size value when role art is present.
 */
export function applyTokenArtwork({
  tokenEl,
  baseImage,
  roleImage,
  roleSize = '68% 68%, cover'
}) {
  if (!tokenEl || !baseImage) return;

  const baseUrl = wrapUrl(baseImage);
  const roleSizePart = String(roleSize || '').split(',')[0].trim() || '68% 68%';

  const ensureRoleLayer = () => {
    let layer = tokenEl.querySelector(':scope > .token-role-art');
    if (!layer) {
      layer = document.createElement('div');
      layer.className = 'token-role-art';
      layer.setAttribute('aria-hidden', 'true');
      try {
        // Place beneath other token children (labels/icons).
        tokenEl.insertBefore(layer, tokenEl.firstChild);
      } catch (_) {
        tokenEl.appendChild(layer);
      }
    }
    return layer;
  };

  const removeRoleLayer = () => {
    try {
      const layer = tokenEl.querySelector(':scope > .token-role-art');
      if (layer) layer.remove();
    } catch (_) { }
  };

  // Always apply base token image to the element itself.
  tokenEl.style.backgroundImage = baseUrl;
  tokenEl.style.backgroundSize = 'cover';
  tokenEl.style.backgroundPosition = 'center';
  tokenEl.style.backgroundRepeat = 'no-repeat';

  if (roleImage) {
    const roleUrl = wrapUrl(roleImage);
    const layer = ensureRoleLayer();
    layer.style.backgroundImage = roleUrl;
    layer.style.backgroundSize = roleSizePart;
    layer.style.backgroundPosition = 'center';
    layer.style.backgroundRepeat = 'no-repeat';
  } else {
    removeRoleLayer();
  }
  tokenEl.style.backgroundColor = 'transparent';
}

function wrapUrl(url) {
  if (typeof url !== 'string') return 'none';
  if (url.startsWith('url(')) return url;
  return `url('${url}')`;
}
