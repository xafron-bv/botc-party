// Layout and grimoire rendering helpers (browser-native ES module)

import { minReminderSize } from '../constants.js';
import { positionInfoIcons, positionNightOrderNumbers } from './tooltip.js';
import { isReminderVisible } from '../dayNightTracking.js';

function getCurrentLayout() {
  try {
    return localStorage.getItem('botcLayoutV1') || 'circle';
  } catch {
    return 'circle';
  }
}

function calculateToiletBowlPosition(index, count, containerWidth, containerHeight, _tokenRadius) {
  // Create a toilet bowl shape like a square but with very round edges
  // This creates a rounded rectangle that better utilizes mobile screen space

  const centerX = containerWidth / 2;
  const centerY = containerHeight / 2;

  // Adjust dimensions based on container aspect ratio
  const aspectRatio = containerWidth / containerHeight;
  const isMobileAspect = aspectRatio < 1.2; // Detect mobile-like aspect ratios

  // Create a rounded square/rectangle shape
  const width = isMobileAspect ? containerWidth * 0.7 : containerWidth * 0.6;
  const height = containerHeight * 0.75;

  // Corner radius for the rounded edges - make them very round
  const cornerRadius = Math.min(width, height) * 0.3;

  // Calculate the rectangle bounds
  const left = centerX - width / 2;
  const right = centerX + width / 2;
  const top = centerY - height / 2;
  const bottom = centerY + height / 2;

  // Simplified approach: divide perimeter into 4 sides and rounded corners
  // Distribute players proportionally across each section

  // Calculate side lengths (excluding corner radius)
  const topBottomLength = width - 2 * cornerRadius;
  const leftRightLength = height - 2 * cornerRadius;
  const cornerArc = Math.PI * cornerRadius / 2; // Quarter circle arc length

  const totalPerimeter = 2 * topBottomLength + 2 * leftRightLength + 4 * cornerArc;
  const stepLength = totalPerimeter / count;
  const position = index * stepLength;

  let x, y;

  // Top edge (left to right)
  if (position < topBottomLength) {
    x = left + cornerRadius + position;
    y = top;
  } else if (position < topBottomLength + cornerArc) {
    // Top-right corner
    const cornerProgress = (position - topBottomLength) / cornerArc;
    const angle = -Math.PI / 2 + cornerProgress * Math.PI / 2;
    x = right - cornerRadius + cornerRadius * Math.cos(angle);
    y = top + cornerRadius + cornerRadius * Math.sin(angle);
  } else if (position < topBottomLength + cornerArc + leftRightLength) {
    // Right edge (top to bottom)
    const edgeProgress = position - topBottomLength - cornerArc;
    x = right;
    y = top + cornerRadius + edgeProgress;
  } else if (position < topBottomLength + 2 * cornerArc + leftRightLength) {
    // Bottom-right corner
    const cornerProgress = (position - topBottomLength - cornerArc - leftRightLength) / cornerArc;
    const angle = cornerProgress * Math.PI / 2;
    x = right - cornerRadius + cornerRadius * Math.cos(angle);
    y = bottom - cornerRadius + cornerRadius * Math.sin(angle);
  } else if (position < 2 * topBottomLength + 2 * cornerArc + leftRightLength) {
    // Bottom edge (right to left)
    const edgeProgress = position - topBottomLength - 2 * cornerArc - leftRightLength;
    x = right - cornerRadius - edgeProgress;
    y = bottom;
  } else if (position < 2 * topBottomLength + 3 * cornerArc + leftRightLength) {
    // Bottom-left corner
    const cornerProgress = (position - 2 * topBottomLength - 2 * cornerArc - leftRightLength) / cornerArc;
    const angle = Math.PI / 2 + cornerProgress * Math.PI / 2;
    x = left + cornerRadius + cornerRadius * Math.cos(angle);
    y = bottom - cornerRadius + cornerRadius * Math.sin(angle);
  } else if (position < 2 * topBottomLength + 3 * cornerArc + 2 * leftRightLength) {
    // Left edge (bottom to top)
    const edgeProgress = position - 2 * topBottomLength - 3 * cornerArc - leftRightLength;
    x = left;
    y = bottom - cornerRadius - edgeProgress;
  } else {
    // Top-left corner
    const cornerProgress = (position - 2 * topBottomLength - 3 * cornerArc - 2 * leftRightLength) / cornerArc;
    const angle = Math.PI + cornerProgress * Math.PI / 2;
    x = left + cornerRadius + cornerRadius * Math.cos(angle);
    y = top + cornerRadius + cornerRadius * Math.sin(angle);
  }

  return { x, y };
}

export function repositionPlayers({ grimoireState }) {
  const players = grimoireState.players;
  const count = players.length;
  if (count === 0) return;
  const circle = document.getElementById('player-circle');
  if (!circle) return;
  const listItemsForSize = circle.querySelectorAll('li');
  if (!listItemsForSize.length) return;
  const sampleToken = listItemsForSize[0].querySelector('.player-token') || listItemsForSize[0];
  const tokenDiameter = sampleToken.offsetWidth || 100;
  const tokenRadius = tokenDiameter / 2;

  const currentLayout = getCurrentLayout();

  if (currentLayout === 'toilet') {
    repositionPlayersToiletBowl({ players, circle, listItemsForSize, tokenRadius, grimoireState });
  } else {
    repositionPlayersCircle({ players, circle, listItemsForSize, tokenRadius, count, grimoireState });
  }

  positionInfoIcons();
  positionNightOrderNumbers();
}

function repositionPlayersCircle({ players, circle, _listItemsForSize, tokenRadius, count, grimoireState }) {
  const chordNeeded = (tokenRadius * 2) * 1.25;
  const minScreenRadius = Math.min(window.innerWidth, window.innerHeight) / 4;
  const radius = Math.max(minScreenRadius, chordNeeded / (2 * Math.sin(Math.PI / count)));
  const parentRect = circle.parentElement ? circle.parentElement.getBoundingClientRect() : circle.getBoundingClientRect();
  const margin = 24;
  const maxSize = Math.max(160, Math.min(parentRect.width, parentRect.height) - margin);
  const requiredContainerSize = Math.ceil(2 * (radius + tokenRadius + 12));
  const containerSize = Math.min(requiredContainerSize, maxSize);
  const effectiveRadius = Math.max(80, containerSize / 2 - tokenRadius - 12);
  circle.style.width = `${containerSize}px`;
  circle.style.height = `${containerSize}px`;
  const circleWidth = containerSize;
  const circleHeight = containerSize;
  const angleStep = (2 * Math.PI) / count;
  const positionRadius = Math.min(radius, effectiveRadius);
  const listItems = circle.querySelectorAll('li');
  listItems.forEach((listItem, i) => {
    const angle = i * angleStep - Math.PI / 2;
    const x = circleWidth / 2 + positionRadius * Math.cos(angle);
    const y = circleHeight / 2 + positionRadius * Math.sin(angle);
    positionPlayerToken(listItem, x, y, angle, players[i], grimoireState);
  });
}

function repositionPlayersToiletBowl({ players, circle, _listItemsForSize, tokenRadius, grimoireState }) {
  const count = players.length;
  const parentRect = circle.parentElement ? circle.parentElement.getBoundingClientRect() : circle.getBoundingClientRect();
  const margin = 24;

  // Calculate container size for toilet bowl - optimize for mobile aspect ratios
  const maxWidth = Math.max(200, parentRect.width - margin);
  const maxHeight = Math.max(300, parentRect.height - margin);

  // Use wider aspect ratio for toilet bowl to better utilize screen space
  const aspectRatio = maxWidth / maxHeight;
  let containerWidth, containerHeight;

  if (aspectRatio > 0.8) {
    // Wider screens - use more width
    containerWidth = Math.min(maxWidth, maxHeight * 1.3);
    containerHeight = maxHeight;
  } else {
    // Narrow screens - maintain proportions
    containerWidth = maxWidth;
    containerHeight = Math.min(maxHeight, maxWidth * 1.4);
  }

  circle.style.width = `${containerWidth}px`;
  circle.style.height = `${containerHeight}px`;

  const listItems = circle.querySelectorAll('li');
  listItems.forEach((listItem, i) => {
    const position = calculateToiletBowlPosition(i, count, containerWidth, containerHeight, tokenRadius);
    // Calculate angle from center for name positioning
    const centerX = containerWidth / 2;
    const centerY = containerHeight / 2;
    const angle = Math.atan2(position.y - centerY, position.x - centerX);
    positionPlayerToken(listItem, position.x, position.y, angle, players[i], grimoireState);
  });
}

function positionPlayerToken(listItem, x, y, angle, player, grimoireState) {
  listItem.style.position = 'absolute';
  listItem.style.left = `${x}px`;
  listItem.style.top = `${y}px`;
  listItem.style.transform = 'translate(-50%, -50%)';
  listItem.dataset.angle = String(angle);
  const playerNameEl = listItem.querySelector('.player-name');
  if (playerNameEl) {
    const yv = Math.sin(angle);
    const isNorthQuadrant = yv < 0;
    if (isNorthQuadrant) {
      playerNameEl.classList.add('top-half');
      listItem.classList.add('is-north');
      listItem.classList.remove('is-south');
    } else {
      playerNameEl.classList.remove('top-half');
      listItem.classList.add('is-south');
      listItem.classList.remove('is-north');
    }

    const mathDeg = angle * 180 / Math.PI; // may be negative early in sequence
    const isTargetArc = mathDeg >= 225 - 90 && mathDeg <= 270 - 90;
    if (isTargetArc) {
      const tangentAngleDeg = mathDeg + 90; // tangent
      playerNameEl.style.setProperty('--name-rotate', `${tangentAngleDeg}deg`);
      playerNameEl.classList.add('curved-quadrant');
      try {
        const tokenEl = listItem.querySelector('.player-token');
        const tokenSize = tokenEl ? tokenEl.offsetWidth : (parseFloat(getComputedStyle(listItem).getPropertyValue('--token-size')) || 64);
        const baseOffset = tokenSize * 0.7; // tuned outward distance
        const outward = baseOffset;
        const dx = Math.cos(angle) * outward;
        const dy = Math.sin(angle) * outward;
        playerNameEl.style.left = `calc(50% + ${dx}px)`;
        playerNameEl.style.top = `calc(50% + ${dy}px)`;
      } catch (_e) { /* ignore positioning errors */ }
    } else {
      playerNameEl.style.setProperty('--name-rotate', '0deg');
      playerNameEl.classList.remove('curved-quadrant');
      playerNameEl.style.left = '';
      playerNameEl.style.top = '';
    }
  }
  let visibleCount = 0;
  if (player && player.reminders) {
    player.reminders.forEach(reminder => {
      if (!grimoireState.dayNightTracking || !grimoireState.dayNightTracking.enabled ||
          isReminderVisible(grimoireState, reminder.reminderId)) {
        visibleCount++;
      }
    });
  }
  positionRadialStack(listItem, visibleCount);
}

export function toggleLayout() {
  const currentLayout = getCurrentLayout();
  const newLayout = currentLayout === 'circle' ? 'toilet' : 'circle';
  try {
    localStorage.setItem('botcLayoutV1', newLayout);
  } catch {
    // Ignore storage errors
  }
  return newLayout;
}

export function getLayoutDisplayName(layout) {
  return layout === 'toilet' ? 'Toilet Bowl' : 'Circle';
}

export function positionRadialStack(li, count) {
  const tokenEl = li.querySelector('.player-token') || li;
  const tokenRadiusPx = tokenEl.offsetWidth / 2;
  const isExpanded = li.dataset.expanded === '1';
  const remindersContainer = li.querySelector('.reminders');
  if (remindersContainer) {
    const touchUntil = parseInt(li.dataset.touchSuppressUntil || '0', 10);
    const actionUntil = parseInt(li.dataset.actionSuppressUntil || '0', 10);
    const suppressUntil = Math.max(touchUntil, actionUntil);
    const inSuppressWindow = Date.now() < suppressUntil;
    remindersContainer.style.pointerEvents = isExpanded && inSuppressWindow ? 'none' : 'auto';
  }
  const container = li.parentElement;
  const cRect = container ? container.getBoundingClientRect() : null;
  const liRect = li.getBoundingClientRect();
  const tRect = tokenEl.getBoundingClientRect();
  const centerX = cRect ? cRect.left + cRect.width / 2 : tRect.left + tRect.width / 2;
  const centerY = cRect ? cRect.top + cRect.height / 2 : tRect.top + tRect.height / 2;
  const tokenCenterX = tRect.left + tRect.width / 2;
  const tokenCenterY = tRect.top + tRect.height / 2;
  const vx = centerX - tokenCenterX;
  const vy = centerY - tokenCenterY;
  const runtimeRadius = Math.hypot(vx, vy);
  const ux = vx / (runtimeRadius || 1);
  const uy = vy / (runtimeRadius || 1);
  const reminderDiameter = Math.max(minReminderSize, tokenEl.offsetWidth * 0.4);
  const reminderRadius = reminderDiameter / 2;
  const plusRadius = (tokenEl.offsetWidth * 0.3) / 2;
  const edgeGap = Math.max(8, tokenRadiusPx * 0.08);
  const spacing = reminderDiameter + edgeGap;
  const reminderEls = li.querySelectorAll('.reminders .icon-reminder, .reminders .text-reminder');
  let hoverZone = li.querySelector('.reminder-hover-zone');
  if (!hoverZone) {
    hoverZone = document.createElement('div');
    hoverZone.className = 'reminder-hover-zone';
    li.querySelector('.reminders').appendChild(hoverZone);
  }
  if (isExpanded) {
    const firstReminderOffsetFromToken = tokenRadiusPx + edgeGap + reminderRadius;
    reminderEls.forEach((el, idx) => {
      const offset = firstReminderOffsetFromToken + idx * spacing;
      const absX = tokenCenterX + ux * offset;
      const absY = tokenCenterY + uy * offset;
      const cx = absX - liRect.left;
      const cy = absY - liRect.top;
      el.style.left = `${cx}px`;
      el.style.top = `${cy}px`;
      el.style.transform = 'translate(-50%, -50%)';
      el.style.zIndex = '5';
    });
    const hoverZoneStart = tokenRadiusPx + edgeGap;
    const maxHoverZoneEnd = Math.min(tokenRadiusPx + 200, runtimeRadius - 10);
    const hoverZoneEnd = Math.max(hoverZoneStart + 20, maxHoverZoneEnd);
    const hoverZoneWidth = hoverZoneEnd - hoverZoneStart;
    const hoverZoneHeight = reminderDiameter;
    const hoverZoneCenterOffset = (hoverZoneStart + hoverZoneEnd) / 2;
    const hoverZoneCenterX = tokenCenterX + ux * hoverZoneCenterOffset;
    const hoverZoneCenterY = tokenCenterY + uy * hoverZoneCenterOffset;
    const rotationAngle = Math.atan2(uy, ux) * (180 / Math.PI);
    const hx = hoverZoneCenterX - liRect.left;
    const hy = hoverZoneCenterY - liRect.top;
    hoverZone.style.left = `${hx - hoverZoneWidth / 2}px`;
    hoverZone.style.top = `${hy - hoverZoneHeight / 2}px`;
    hoverZone.style.width = `${hoverZoneWidth}px`;
    hoverZone.style.height = `${hoverZoneHeight}px`;
    hoverZone.style.transform = `translate(0, 0) rotate(${rotationAngle}deg)`;
    hoverZone.style.transformOrigin = 'center center';
  } else {
    const collapsedOffset = tokenRadiusPx + edgeGap + reminderRadius;
    const collapsedSpacing = reminderRadius * 0.3;
    reminderEls.forEach((el, idx) => {
      const offset = collapsedOffset + idx * collapsedSpacing;
      const absX = tokenCenterX + ux * offset;
      const absY = tokenCenterY + uy * offset;
      const cx = absX - liRect.left;
      const cy = absY - liRect.top;
      el.style.left = `${cx}px`;
      el.style.top = `${cy}px`;
      el.style.transform = 'translate(-50%, -50%) scale(0.8)';
      el.style.zIndex = '2';
    });
    const hoverZoneStart = tokenRadiusPx + edgeGap;
    const maxHoverZoneEnd = Math.min(tokenRadiusPx + 200, runtimeRadius - 10);
    const hoverZoneEnd = Math.max(hoverZoneStart + 20, maxHoverZoneEnd);
    const hoverZoneWidth = hoverZoneEnd - hoverZoneStart;
    const hoverZoneHeight = reminderDiameter;
    const hoverZoneCenterOffset = (hoverZoneStart + hoverZoneEnd) / 2;
    const hoverZoneCenterX = tokenCenterX + ux * hoverZoneCenterOffset;
    const hoverZoneCenterY = tokenCenterY + uy * hoverZoneCenterOffset;
    const rotationAngle = Math.atan2(uy, ux) * (180 / Math.PI);
    const hx = hoverZoneCenterX - liRect.left;
    const hy = hoverZoneCenterY - liRect.top;
    hoverZone.style.left = `${hx - hoverZoneWidth / 2}px`;
    hoverZone.style.top = `${hy - hoverZoneHeight / 2}px`;
    hoverZone.style.width = `${hoverZoneWidth}px`;
    hoverZone.style.height = `${hoverZoneHeight}px`;
    hoverZone.style.transform = `translate(0, 0) rotate(${rotationAngle}deg)`;
    hoverZone.style.transformOrigin = 'center center';
  }
  const plus = li.querySelector('.reminder-placeholder');
  if (plus) {
    if (isExpanded) {
      const smallGap = Math.max(4, edgeGap * 0.25);
      let offsetFromEdge = tokenRadiusPx + edgeGap + plusRadius;
      if (count > 0) {
        offsetFromEdge = tokenRadiusPx + edgeGap + reminderRadius + (count - 1) * spacing + reminderRadius + smallGap + plusRadius;
      }
      const targetOffset = offsetFromEdge;
      const absPX = tokenCenterX + ux * targetOffset;
      const absPY = tokenCenterY + uy * targetOffset;
      const px = absPX - liRect.left;
      const py = absPY - liRect.top;
      plus.style.left = `${px}px`;
      plus.style.top = `${py}px`;
      plus.style.transform = 'translate(-50%, -50%)';
      plus.style.zIndex = '6';
    } else {
      const collapsedSpacing = reminderRadius * 0.3;
      const smallGap = Math.max(2, edgeGap * 0.25);
      let collapsedOffset = tokenRadiusPx + edgeGap + plusRadius;
      if (count > 0) {
        const firstCenter = tokenRadiusPx + edgeGap + reminderRadius;
        const lastCenter = firstCenter + (count - 1) * collapsedSpacing;
        collapsedOffset = lastCenter + reminderRadius + smallGap + plusRadius;
      }
      const absPX = tokenCenterX + ux * collapsedOffset;
      const absPY = tokenCenterY + uy * collapsedOffset;
      const px = absPX - liRect.left;
      const py = absPY - liRect.top;
      plus.style.left = `${px}px`;
      plus.style.top = `${py}px`;
      plus.style.transform = 'translate(-50%, -50%) scale(0.9)';
      plus.style.zIndex = '6';
    }
  }
}

