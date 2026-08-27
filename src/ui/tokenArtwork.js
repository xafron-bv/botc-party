export function applyTokenArtwork({
  tokenEl,
  baseImage,
  roleImage,
  roleSize = '68% 68%, cover'
}) {
  if (!tokenEl || !baseImage) return; const baseUrl = wrapUrl(baseImage); const roleSizePart = String(roleSize || '').split(',')[0].trim() || '68% 68%';
  const ensureRoleLayer = () => {
    let layer = tokenEl.querySelector(':scope > .token-role-art');
    if (!layer) {
      layer = document.createElement('div'); layer.className = 'token-role-art'; layer.setAttribute('aria-hidden', 'true');
      try { tokenEl.insertBefore(layer, tokenEl.firstChild); } catch (_) {
        tokenEl.appendChild(layer);
      }
    }
    return layer;
  };
  const removeRoleLayer = () => {
    try {
      const layer = tokenEl.querySelector(':scope > .token-role-art'); if (layer) layer.remove();
    } catch (_) { }
  }; tokenEl.style.backgroundImage = baseUrl; tokenEl.style.backgroundSize = 'cover'; tokenEl.style.backgroundPosition = 'center'; tokenEl.style.backgroundRepeat = 'no-repeat';
  if (roleImage) {
    const roleUrl = wrapUrl(roleImage); const layer = ensureRoleLayer(); layer.style.backgroundImage = roleUrl; layer.style.backgroundSize = roleSizePart;
    layer.style.backgroundPosition = 'center'; layer.style.backgroundRepeat = 'no-repeat';
  } else { removeRoleLayer(); }
  tokenEl.style.backgroundColor = 'transparent';
}
function wrapUrl(url) { if (typeof url !== 'string') return 'none'; if (url.startsWith('url(')) return url; return `url('${url}')`; }
