// Layout and grimoire rendering helpers (browser-native ES module)

import { resolveAssetPath } from '../utils.js';
import { createCurvedLabelSvg, createDeathRibbonSvg } from './svg.js';
import { positionTooltip, showTouchAbilityPopup, positionInfoIcons } from './tooltip.js';

export function repositionPlayers(players) {
  const count = players.length;
  if (count === 0) return;
  const circle = document.getElementById('player-circle');
  if (!circle) return;
  const listItemsForSize = circle.querySelectorAll('li');
  if (!listItemsForSize.length) return;
  const sampleToken = listItemsForSize[0].querySelector('.player-token') || listItemsForSize[0];
  const tokenDiameter = sampleToken.offsetWidth || 100;
  const tokenRadius = tokenDiameter / 2;
  const chordNeeded = tokenDiameter * 1.25;
  let radius = Math.max(120, chordNeeded / (2 * Math.sin(Math.PI / count)));
  const parentRect = circle.parentElement ? circle.parentElement.getBoundingClientRect() : circle.getBoundingClientRect();
  const margin = 24;
  const maxSize = Math.max(160, Math.min(parentRect.width, parentRect.height) - margin);
  const requiredContainerSize = Math.ceil(2 * (radius + tokenRadius + 12));
  const containerSize = Math.min(requiredContainerSize, maxSize);
  const effectiveRadius = Math.max(80, containerSize / 2 - tokenRadius - 12);
  circle.style.width = containerSize + 'px';
  circle.style.height = containerSize + 'px';
  const circleWidth = containerSize;
  const circleHeight = containerSize;
  const angleStep = (2 * Math.PI) / count;
  const positionRadius = Math.min(radius, effectiveRadius);
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
    }
    const count = players[i] && players[i].reminders ? players[i].reminders.length : 0;
    positionRadialStack(listItem, count, players);
  });
  positionInfoIcons();
}

export function updateGrimoire(players, allRoles, isTouchDevice) {
  const playerCircle = document.getElementById('player-circle');
  const listItems = playerCircle.querySelectorAll('li');
  listItems.forEach((li, i) => {
    const player = players[i];
    const playerNameEl = li.querySelector('.player-name');
    playerNameEl.textContent = player.name;
    const angle = parseFloat(li.dataset.angle || '0');
    const y = Math.sin(angle);
    const isNorthQuadrant = y < 0;
    if (isNorthQuadrant) {
      playerNameEl.classList.add('top-half');
      li.classList.add('is-north');
      li.classList.remove('is-south');
    } else {
      playerNameEl.classList.remove('top-half');
      li.classList.add('is-south');
      li.classList.remove('is-north');
    }
    const tokenDiv = li.querySelector('.player-token');
    const charNameDiv = li.querySelector('.character-name');
    const existingArc = tokenDiv.querySelector('.icon-reminder-svg');
    if (existingArc) existingArc.remove();
    const oldCircle = tokenDiv.querySelector('.death-overlay');
    if (oldCircle) oldCircle.remove();
    const oldRibbon = tokenDiv.querySelector('.death-ribbon');
    if (oldRibbon) oldRibbon.remove();
    if (player.character && allRoles[player.character]) {
      const role = allRoles[player.character];
      tokenDiv.style.backgroundImage = `url('${resolveAssetPath(role.image)}'), url('${resolveAssetPath('assets/img/token-BqDQdWeO.webp')}')`;
      tokenDiv.style.backgroundSize = '68% 68%, cover';
      tokenDiv.style.backgroundColor = 'transparent';
      tokenDiv.classList.add('has-character');
      if (charNameDiv) charNameDiv.textContent = role.name;
      const svg = createCurvedLabelSvg(`player-arc-${i}`, role.name);
      tokenDiv.appendChild(svg);
      if (!('ontouchstart' in window)) {
        tokenDiv.addEventListener('mouseenter', (e) => {
          if (role.ability) {
            const abilityTooltip = document.getElementById('ability-tooltip');
            abilityTooltip.textContent = role.ability;
            abilityTooltip.classList.add('show');
            positionTooltip(e.target, abilityTooltip);
          }
        });
        tokenDiv.addEventListener('mouseleave', () => {
          const abilityTooltip = document.getElementById('ability-tooltip');
          abilityTooltip.classList.remove('show');
        });
      } else if (role.ability) {
        const infoIcon = document.createElement('div');
        infoIcon.className = 'ability-info-icon';
        infoIcon.innerHTML = '<i class="fas fa-info-circle"></i>';
        infoIcon.dataset.playerIndex = i;
        const handleInfoClick = (e) => {
          e.stopPropagation();
          e.preventDefault();
          showTouchAbilityPopup(infoIcon, role.ability);
        };
        infoIcon.onclick = handleInfoClick;
        infoIcon.addEventListener('touchstart', (e) => { e.stopPropagation(); e.preventDefault(); handleInfoClick(e); });
        li.appendChild(infoIcon);
      }
    } else {
      tokenDiv.style.backgroundImage = `url('${resolveAssetPath('assets/img/token-BqDQdWeO.webp')}')`;
      tokenDiv.style.backgroundSize = 'cover';
      tokenDiv.style.backgroundColor = 'rgba(0,0,0,0.2)';
      tokenDiv.classList.remove('has-character');
      if (charNameDiv) charNameDiv.textContent = '';
      const arc = tokenDiv.querySelector('.icon-reminder-svg');
      if (arc) arc.remove();
    }
    const remindersDiv = li.querySelector('.reminders');
    remindersDiv.innerHTML = '';
    player.reminders.forEach((reminder, idx) => {
      if (reminder.type === 'icon') {
        const iconEl = document.createElement('div');
        iconEl.className = 'icon-reminder';
        iconEl.style.transform = `translate(-50%, -50%) rotate(${reminder.rotation || 0}deg)`;
        iconEl.style.backgroundImage = `url('${resolveAssetPath(reminder.image)}'), url('${resolveAssetPath('assets/img/token-BqDQdWeO.webp')}')`;
        iconEl.title = reminder.label || '';
        remindersDiv.appendChild(iconEl);
      } else {
        const reminderEl = document.createElement('div');
        reminderEl.className = 'text-reminder';
        const displayText = reminder.label || reminder.value || '';
        const textSpan = document.createElement('span');
        textSpan.className = 'text-reminder-content';
        textSpan.textContent = displayText;
        const textLength = displayText.length;
        if (textLength > 40) textSpan.style.fontSize = 'clamp(7px, calc(var(--token-size) * 0.06), 10px)';
        else if (textLength > 20) textSpan.style.fontSize = 'clamp(8px, calc(var(--token-size) * 0.07), 12px)';
        reminderEl.appendChild(textSpan);
        reminderEl.style.transform = 'translate(-50%, -50%)';
        remindersDiv.appendChild(reminderEl);
      }
    });
    positionRadialStack(li, player.reminders.length, players);
  });
  if ('ontouchstart' in window) positionInfoIcons();
}

export function positionRadialStack(li, count, players) {
  const tokenEl = li.querySelector('.player-token') || li;
  const tokenRadiusPx = tokenEl.offsetWidth / 2;
  const angle = parseFloat(li.dataset.angle || '0');
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
  const reminderDiameter = Math.max(40, tokenEl.offsetWidth * 0.4);
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

