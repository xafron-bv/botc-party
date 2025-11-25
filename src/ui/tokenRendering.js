import { resolveAssetPath } from '../../utils.js';
import { createCurvedLabelSvg } from './svg.js';
import { applyTokenArtwork } from './tokenArtwork.js';
import { createAbilityInfoIcon } from './abilityInfoIcon.js';
import { showTouchAbilityPopup } from './tooltip.js';

/**
 * Renders a token element with artwork, label, and optional ability icon.
 * Unified logic for player tokens, bluff tokens, storyteller slots, and setup tokens.
 *
 * @param {Object} options
 * @param {HTMLElement} options.tokenElement - The element to apply styles and append content to.
 * @param {Object} [options.role] - The role object (id, name, image, ability). If null, renders empty state.
 * @param {string} [options.baseImage='assets/img/token.png'] - Base token image path.
 * @param {string} [options.labelIdPrefix='token-arc'] - Prefix for the curved label SVG ID.
 * @param {boolean} [options.showAbilityIcon=false] - Whether to create and append the ability info icon.
 * @param {HTMLElement} [options.iconContainer] - Optional container for the ability icon (defaults to tokenElement).
 * @param {Function} [options.onAbilityIconClick] - Custom handler for ability icon click.
 * @param {Object} [options.dataset] - Additional data attributes to set on the token element.
 * @param {boolean} [options.showLabel=true] - Whether to render the curved label SVG.
 * @param {string} [options.customLabel] - Custom text for the label (overrides role.name).
 */
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

  // Apply artwork
  applyTokenArtwork({
    tokenEl: tokenElement,
    baseImage: resolvedBase,
    roleImage: resolvedRoleImage
  });

  // Update classes
  if (role) {
    tokenElement.classList.add('has-character');
    tokenElement.classList.remove('empty');
    if (role.id) tokenElement.dataset.roleId = role.id;
  } else {
    tokenElement.classList.remove('has-character');
    tokenElement.classList.add('empty');
    delete tokenElement.dataset.roleId;
  }

  // Apply additional dataset
  Object.entries(dataset).forEach(([k, v]) => {
    tokenElement.dataset[k] = v;
  });

  // Remove existing SVG label
  const existingSvg = tokenElement.querySelector('svg');
  if (existingSvg) existingSvg.remove();

  // Remove existing ability icon (check both tokenElement and iconContainer)
  const existingIconInToken = tokenElement.querySelector('.ability-info-icon');
  if (existingIconInToken) existingIconInToken.remove();

  if (iconContainer && iconContainer !== tokenElement) {
    // This is a bit risky if the container has other icons, but usually we want to replace the one for this token.
    // In playerUpdate.js, it does: li.querySelectorAll('.ability-info-icon').forEach((node) => node.remove());
    // So we should probably let the caller handle cleanup of external containers if it's complex,
    // or we assume we are the sole manager of the icon in that container for this context.
    // For now, let's assume the caller cleans up external containers if needed, or we can try to find specific ones.
    // But wait, renderTokenElement is supposed to be the "one stop shop".
    // Let's just append the new one. The caller should have cleared the container if needed.
  }

  // Create and append new SVG label
  if (showLabel) {
    const labelText = customLabel || (role ? role.name : (dataset.emptyLabel || 'None'));
    // Use a unique ID to prevent collisions
    const uniqueId = `${labelIdPrefix}-${role ? role.id : 'empty'}-${Math.random().toString(36).slice(2)}`;
    const svg = createCurvedLabelSvg(uniqueId, labelText);
    tokenElement.appendChild(svg);
  }

  // Create and append ability icon
  if (showAbilityIcon && role && role.ability) {
    const infoIcon = createAbilityInfoIcon({
      ariaLabel: `Show ability for ${role.name}`,
      title: `Show ability for ${role.name}`,
      dataset: { roleId: role.id },
      onActivate: onAbilityIconClick || (({ icon }) => {
        showTouchAbilityPopup(icon, role.ability);
      })
    });

    const targetContainer = iconContainer || tokenElement;
    targetContainer.appendChild(infoIcon);
  }
}
