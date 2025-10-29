// Layout and grimoire rendering helpers (browser-native ES module)

import { minReminderSize } from '../constants.js';
import { positionInfoIcons, positionTokenReminders } from './tooltip.js';
import { isReminderVisible } from '../dayNightTracking.js';

export function repositionPlayers({ grimoireState }) {
  const players = grimoireState.players;
  const count = players.length;
  if (count === 0) return;
  let nameGapPx = 32;
  try {
    const rootStyles = getComputedStyle(document.documentElement);
    const gapStr = rootStyles.getPropertyValue('--player-name-gap');
    const parsed = parseFloat(gapStr);
    if (!Number.isNaN(parsed)) nameGapPx = parsed;
  } catch (_) { /* default gap */ }
  const circle = document.getElementById('player-circle');
  if (!circle) return;
  const listItemsForSize = circle.querySelectorAll('li');
  if (!listItemsForSize.length) return;
  const sampleToken = listItemsForSize[0].querySelector('.player-token') || listItemsForSize[0];
  const tokenDiameterActual = sampleToken.offsetWidth || 100;
  const tokenScale = (() => {
    const scale = grimoireState?.displaySettings?.tokenScale;
    return Number.isFinite(scale) && scale > 0 ? scale : 1;
  })();
  const tokenDiameterBase = tokenDiameterActual / tokenScale;
  const tokenRadiusBase = tokenDiameterBase / 2;
  const chordNeeded = tokenDiameterBase * 1.25;
  const minScreenRadius = Math.min(window.innerWidth, window.innerHeight) / 4;
  const radiusBase = Math.max(minScreenRadius, chordNeeded / (2 * Math.sin(Math.PI / count)));
  const parentRect = circle.parentElement ? circle.parentElement.getBoundingClientRect() : circle.getBoundingClientRect();
  const margin = 24;
  const maxSize = Math.max(160, Math.min(parentRect.width, parentRect.height) - margin);
  const requiredContainerSizeBase = Math.ceil(2 * (radiusBase + tokenRadiusBase + 12));
  const containerSizeBase = Math.min(requiredContainerSizeBase, maxSize);
  const circleScale = (() => {
    const scale = grimoireState?.displaySettings?.circleScale;
    return Number.isFinite(scale) ? scale : 1;
  })();
  const containerSize = containerSizeBase * circleScale;
  const effectiveRadiusBase = Math.max(80, containerSizeBase / 2 - tokenRadiusBase - 12);
  circle.style.width = `${containerSize}px`;
  circle.style.height = `${containerSize}px`;
  const circleWidth = containerSize;
  const circleHeight = containerSize;
  const angleStep = (2 * Math.PI) / count;
  const positionRadius = Math.min(radiusBase, effectiveRadiusBase) * circleScale;
  const listItems = circle.querySelectorAll('li');
  listItems.forEach((listItem, i) => {
    const angle = i * angleStep - Math.PI / 2;
    const x = circleWidth / 2 + positionRadius * Math.cos(angle);
    const y = circleHeight / 2 + positionRadius * Math.sin(angle);
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
          const outward = tokenSize / 2 + nameGapPx;
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
    if (players[i] && players[i].reminders) {
      players[i].reminders.forEach(reminder => {
        if (!grimoireState.dayNightTracking || !grimoireState.dayNightTracking.enabled ||
          isReminderVisible(grimoireState, reminder.reminderId)) {
          visibleCount++;
        }
      });
    }
    positionRadialStack(listItem, visibleCount);
  });
  positionInfoIcons();
  positionTokenReminders();
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
