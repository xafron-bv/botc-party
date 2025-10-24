// Touch helper utilities for player elements

function getAccurateRect(element) {
  const rect = element.getBoundingClientRect();

  if (window.visualViewport) {
    const scale = window.visualViewport.scale || 1;
    const offsetLeft = window.visualViewport.offsetLeft || 0;
    const offsetTop = window.visualViewport.offsetTop || 0;

    return {
      left: rect.left * scale + offsetLeft,
      right: rect.right * scale + offsetLeft,
      top: rect.top * scale + offsetTop,
      bottom: rect.bottom * scale + offsetTop,
      width: rect.width * scale,
      height: rect.height * scale
    };
  }

  return rect;
}

function isPlayerOverlapping({ listItem }) {
  const rect1 = getAccurateRect(listItem);
  const allPlayers = document.querySelectorAll('#player-circle li');

  for (let i = 0; i < allPlayers.length; i++) {
    const otherPlayer = allPlayers[i];
    if (otherPlayer === listItem) continue;

    const rect2 = getAccurateRect(otherPlayer);

    const overlap = !(rect1.right < rect2.left ||
      rect1.left > rect2.right ||
      rect1.bottom < rect2.top ||
      rect1.top > rect2.bottom);

    if (overlap) {
      const zIndex1 = parseInt(listItem.style.zIndex || window.getComputedStyle(listItem).zIndex, 10) || 0;
      const zIndex2 = parseInt(otherPlayer.style.zIndex || window.getComputedStyle(otherPlayer).zIndex, 10) || 0;

      if (zIndex2 >= zIndex1) {
        return true;
      }
    }
  }

  return false;
}

export function handlePlayerElementTouch({ e, listItem, actionCallback }) {
  if (!('ontouchstart' in window)) return;

  e.stopPropagation();
  e.preventDefault();

  document.querySelectorAll('#player-circle li[data-raised="true"]').forEach(el => {
    if (el !== listItem) {
      delete el.dataset.raised;
      el.style.zIndex = el.dataset.originalLiZIndex || '';
      delete el.dataset.originalLiZIndex;
    }
  });

  const wasRaised = listItem.dataset.raised === 'true';

  const isOverlapping = isPlayerOverlapping({ listItem });

  if (isOverlapping && !wasRaised) {
    listItem.dataset.raised = 'true';
    listItem.dataset.originalLiZIndex = listItem.style.zIndex || '';
    listItem.style.zIndex = '200';
    return;
  }
  if (actionCallback) {
    actionCallback(e);
  }
}

// Export utilities in case other modules need them later
export const __test = { getAccurateRect, isPlayerOverlapping };
