import { resolveAssetPath } from '../../utils.js';
import { createCurvedLabelSvg } from './svg.js';
import { applyTokenArtwork } from './tokenArtwork.js';
import { createAbilityInfoIcon } from './abilityInfoIcon.js';
import { showTouchAbilityPopup } from './tooltip.js';
export function renderTokenElement({
  tokenElement,
  role,
  baseImage = 'assets/img/token.png',
  labelIdPrefix = 'token-arc',
  showAbilityIcon = false,
  iconContainer = null,
  onAbilityIconClick,
  dataset = {},
  showLabel = true,
  customLabel
}) {
  if (!tokenElement) return;
  const resolvedBase = resolveAssetPath(baseImage);
  const resolvedRoleImage = role && role.image ? resolveAssetPath(role.image) : null;
  applyTokenArtwork({
    tokenEl: tokenElement,
    baseImage: resolvedBase,
    roleImage: resolvedRoleImage
  });
  if (role) {
    tokenElement.classList.add('has-character');
    tokenElement.classList.remove('empty');
    if (role.id) tokenElement.dataset.roleId = role.id;
  } else {
    tokenElement.classList.remove('has-character');
    tokenElement.classList.add('empty');
    delete tokenElement.dataset.roleId;
  }
  Object.entries(dataset).forEach(([k, v]) => {
    tokenElement.dataset[k] = v;
  });
  const existingSvg = tokenElement.querySelector('svg');
  if (existingSvg) existingSvg.remove();
  const existingIconInToken = tokenElement.querySelector('.ability-info-icon');
  if (existingIconInToken) existingIconInToken.remove();
  if (showLabel) {
    const labelText = customLabel || (role ? role.name : dataset.emptyLabel || 'None');
    const uniqueId = `${labelIdPrefix}-${role ? role.id : 'empty'}-${Math.random().toString(36).slice(2)}`;
    const svg = createCurvedLabelSvg(uniqueId, labelText);
    tokenElement.appendChild(svg);
  }
  if (showAbilityIcon && role && role.ability) {
    const infoIcon = createAbilityInfoIcon({
      ariaLabel: `Show ability for ${role.name}`,
      title: `Show ability for ${role.name}`,
      dataset: { roleId: role.id },
      onActivate:
        onAbilityIconClick ||
        (({ icon }) => {
          showTouchAbilityPopup(icon, role.ability);
        })
    });
    const targetContainer = iconContainer || tokenElement;
    targetContainer.appendChild(infoIcon);
  }
}
