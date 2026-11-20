import { minReminderSize } from '../constants.js';
import { positionInfoIcons, positionTokenReminders } from './tooltip.js';
import { isReminderVisible } from '../dayNightTracking.js';
import { calculateRadialPosition } from '../utils/positioning.js';
import { settleAnimations } from '../utils/dom.js';
export function repositionPlayers({ grimoireState }) {
  const players = grimoireState.players; const count = players.length; if (count === 0) return; let nameGapPx = 20;
  try {
    const rootStyles = getComputedStyle(document.documentElement); const gapStr = rootStyles.getPropertyValue('--player-name-gap'); const parsed = parseFloat(gapStr);
    if (!Number.isNaN(parsed)) nameGapPx = parsed;
  } catch (_) { /* default gap */ }
  const circle = document.getElementById('player-circle'); if (!circle) return; const listItemsForSize = circle.querySelectorAll('li'); if (!listItemsForSize.length) return;
  const sampleToken = listItemsForSize[0].querySelector('.player-token') || listItemsForSize[0]; const tokenDiameterActual = sampleToken.offsetWidth || 100;
  const tokenScale = (() => {
    const scale = grimoireState?.displaySettings?.tokenScale; return Number.isFinite(scale) && scale > 0 ? scale : 1;
  })(); const tokenDiameterBase = tokenDiameterActual / tokenScale; const tokenRadiusBase = tokenDiameterBase / 2; const chordNeeded = tokenDiameterBase * 1.25;
  const minScreenRadius = Math.min(window.innerWidth, window.innerHeight) / 4; const radiusBase = Math.max(minScreenRadius, chordNeeded / (2 * Math.sin(Math.PI / count)));
  const layoutContainer = circle.closest('#center') || circle.parentElement; const parentRect = layoutContainer ? layoutContainer.getBoundingClientRect() : circle.getBoundingClientRect();
  let availableWidth = parentRect.width; let availableHeight = parentRect.height; const margin = 24;
  if (layoutContainer?.id === 'center') {
    const styles = getComputedStyle(layoutContainer); availableWidth -= (parseFloat(styles.paddingLeft) || 0) + (parseFloat(styles.paddingRight) || 0);
    availableHeight -= (parseFloat(styles.paddingTop) || 0) + (parseFloat(styles.paddingBottom) || 0);
  }
  const maxSize = Math.max(160, Math.min(availableWidth, availableHeight) - margin); const requiredContainerSizeBase = Math.ceil(2 * (radiusBase + tokenRadiusBase + 12));
  const containerSizeBase = Math.min(requiredContainerSizeBase, maxSize);
  const circleScale = (() => {
    const scale = grimoireState?.displaySettings?.circleScale; return Number.isFinite(scale) ? scale : 1;
  })(); const containerSize = containerSizeBase * circleScale; const effectiveRadiusBase = Math.max(80, containerSizeBase / 2 - tokenRadiusBase - 12);
  circle.style.width = `${containerSize}px`; circle.style.height = `${containerSize}px`; const circleWidth = containerSize; const circleHeight = containerSize;
  const angleStep = (2 * Math.PI) / count; const positionRadius = Math.min(radiusBase, effectiveRadiusBase) * circleScale; const listItems = circle.querySelectorAll('li');
  listItems.forEach((listItem, i) => {
    const angle = i * angleStep - Math.PI / 2;
    const pos = calculateRadialPosition({
      centerX: circleWidth / 2,
      centerY: circleHeight / 2,
      angle,
      radius: positionRadius
    }); listItem.style.position = 'absolute'; listItem.style.left = pos.left; listItem.style.top = pos.top; listItem.style.transform = 'translate(-50%, -50%)';
    listItem.dataset.angle = String(angle); const playerNameEl = listItem.querySelector('.player-name');
    if (playerNameEl) {
      const yv = Math.sin(angle); const isNorthQuadrant = yv < 0;
      if (isNorthQuadrant) { playerNameEl.classList.add('top-half'); listItem.classList.add('is-north'); listItem.classList.remove('is-south'); } else {
        playerNameEl.classList.remove('top-half'); listItem.classList.add('is-south'); listItem.classList.remove('is-north');
      }
      const mathDeg = angle * 180 / Math.PI; // may be negative early in sequence
      const isTargetArc = mathDeg >= 225 - 90 && mathDeg <= 270 - 90;
      if (isTargetArc) {
        const tangentAngleDeg = mathDeg + 90; // tangent
        playerNameEl.style.setProperty('--name-rotate', `${tangentAngleDeg}deg`); playerNameEl.classList.add('curved-quadrant');
        try {
          const tokenEl = listItem.querySelector('.player-token');
          const tokenSize = tokenEl ? tokenEl.offsetWidth : (parseFloat(getComputedStyle(listItem).getPropertyValue('--player-token-size')) || 64);
          const outward = tokenSize / 2 + nameGapPx;
          const namePos = calculateRadialPosition({
            angle,
            radius: outward,
            usePercentage: true
          }); playerNameEl.style.left = namePos.left; playerNameEl.style.top = namePos.top;
        } catch (_e) { /* ignore positioning errors */ }
      } else {
        playerNameEl.style.setProperty('--name-rotate', '0deg'); playerNameEl.classList.remove('curved-quadrant'); playerNameEl.style.left = ''; playerNameEl.style.top = '';
      }
    }
  }); layoutReminderStacks({ grimoireState }); positionInfoIcons(); positionTokenReminders(); settleAnimations(circle, 320, true);
}
const REMINDER_SELECTOR = '.reminders .icon-reminder, .reminders .text-reminder';
const STACK_OVERLAP_TOLERANCE_PX = 1;
function countVisibleReminders(grimoireState, playerIndex) {
  const player = grimoireState.players[playerIndex]; if (!player || !Array.isArray(player.reminders)) return 0;
  const tracking = grimoireState.dayNightTracking;
  return player.reminders.filter((reminder) => !tracking || !tracking.enabled || isReminderVisible(grimoireState, reminder.reminderId)).length;
}
function measureStack(li, containerRect) {
  const tokenEl = li.querySelector('.player-token') || li; const tokenRadiusPx = tokenEl.offsetWidth / 2;
  const container = li.parentElement; const cRect = containerRect || (container ? container.getBoundingClientRect() : null); const liRect = li.getBoundingClientRect();
  const tRect = tokenEl.getBoundingClientRect(); const centerX = cRect ? cRect.left + cRect.width / 2 : tRect.left + tRect.width / 2;
  const centerY = cRect ? cRect.top + cRect.height / 2 : tRect.top + tRect.height / 2; const tokenCenterX = tRect.left + tRect.width / 2;
  const tokenCenterY = tRect.top + tRect.height / 2; const vx = centerX - tokenCenterX; const vy = centerY - tokenCenterY; const angle = Math.atan2(vy, vx);
  const runtimeRadius = Math.hypot(vx, vy); const reminderDiameter = Math.max(minReminderSize, tokenEl.offsetWidth * 0.4); const reminderRadius = reminderDiameter / 2;
  const plusRadius = (tokenEl.offsetWidth * 0.3) / 2; const edgeGap = Math.max(8, tokenRadiusPx * 0.08); const spacing = reminderDiameter + edgeGap;
  const reminderEls = Array.from(li.querySelectorAll(REMINDER_SELECTOR)); const plus = li.querySelector('.reminder-placeholder');
  return {
    li, tokenRadiusPx, tokenCenterX, tokenCenterY, angle, runtimeRadius, reminderDiameter, reminderRadius, plusRadius, edgeGap, spacing, reminderEls, plus,
    centerOpts: { centerX: tokenCenterX - liRect.left, centerY: tokenCenterY - liRect.top, angle },
    renderedReminderRadii: reminderEls.map((el) => el.offsetWidth / 2), renderedPlusRadius: plus && plus.offsetWidth > 0 ? plus.offsetWidth / 2 : plusRadius
  };
}
// Distances from the token centre, along the line towards the middle of the circle.
function getStackOffsets(stack, count, expanded) {
  const { tokenRadiusPx, edgeGap, reminderRadius, plusRadius, spacing } = stack; const firstReminder = tokenRadiusPx + edgeGap + reminderRadius;
  const step = expanded ? spacing : reminderRadius * 0.3; const smallGap = Math.max(expanded ? 4 : 2, edgeGap * 0.25);
  const plus = count > 0 ? firstReminder + (count - 1) * step + reminderRadius + smallGap + plusRadius : tokenRadiusPx + edgeGap + plusRadius;
  return { firstReminder, step, plus, reminderScale: expanded ? 1 : 0.8, plusScale: expanded ? 1 : 0.9 };
}
// The circles a stack occupies on screen, using the rendered sizes rather than the spacing constants.
function getStackFootprint(stack, count, expanded) {
  const offsets = getStackOffsets(stack, count, expanded); const circles = [];
  for (let idx = 0; idx < count; idx += 1) {
    const rendered = stack.renderedReminderRadii[idx]; const radius = (rendered > 0 ? rendered : stack.reminderRadius) * offsets.reminderScale;
    circles.push({ offset: offsets.firstReminder + idx * offsets.step, radius });
  }
  circles.push({ offset: offsets.plus, radius: stack.renderedPlusRadius * offsets.plusScale, isPlus: true });
  return circles.map((circle) => ({
    ...circle, x: stack.tokenCenterX + Math.cos(stack.angle) * circle.offset, y: stack.tokenCenterY + Math.sin(stack.angle) * circle.offset
  }));
}
function footprintsOverlap(a, b) {
  return a.some((ca) => b.some((cb) => Math.hypot(ca.x - cb.x, ca.y - cb.y) < ca.radius + cb.radius - STACK_OVERLAP_TOLERANCE_PX));
}
function footprintOverlapsRect(footprint, rect) {
  return footprint.some((circle) => {
    const dx = Math.max(rect.left - circle.x, 0, circle.x - rect.right); const dy = Math.max(rect.top - circle.y, 0, circle.y - rect.bottom);
    return Math.hypot(dx, dy) < circle.radius - STACK_OVERLAP_TOLERANCE_PX;
  });
}
// The script name and player counts shown in the middle of the circle.
function getCentreInfoRect() {
  const info = document.getElementById('setup-info'); if (!info) return null; const rect = info.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0 ? rect : null;
}
// Decide which stacks can stay open. A stack stays open when its reminders remain on its own half of the circle and its
// open layout touches neither the info box in the middle nor another player's reminders or plus button. When stacks
// compete for the same space the one hiding the most reminders opens first (seat order breaks ties).
function resolveStackFit(entries, centreInfoRect) {
  const currentFootprint = (entry) => (entry.open ? entry.openFootprint : entry.closedFootprint);
  const staysOnOwnHalf = (entry) => entry.openFootprint.every((circle) => (
    circle.isPlus || circle.offset + circle.radius <= entry.stack.runtimeRadius + STACK_OVERLAP_TOLERANCE_PX
  ));
  const clearsCentreInfo = (entry) => !centreInfoRect || !footprintOverlapsRect(entry.openFootprint, centreInfoRect);
  const fitsOpen = (entry) => entries.every((other) => other === entry || !footprintsOverlap(entry.openFootprint, currentFootprint(other)));
  const candidates = entries.filter((entry) => staysOnOwnHalf(entry) && clearsCentreInfo(entry)).sort((a, b) => b.count - a.count);
  const openNext = () => {
    const next = candidates.find((entry) => !entry.open && fitsOpen(entry)); if (next) next.open = true; return !!next;
  };
  while (openNext()) { /* keep opening stacks until no further one fits */ }
}
function syncExpandedState(li) { li.dataset.expanded = (li.dataset.autoExpanded === '1' || li.dataset.userExpanded === '1') ? '1' : '0'; }
export function isStackExpanded(li) { return !!li && li.dataset.expanded === '1'; }
// Opens (or closes) a stack that does not fit on its own, on the user's request.
export function setStackUserExpanded(li, userExpanded) {
  if (userExpanded) li.dataset.userExpanded = '1'; else delete li.dataset.userExpanded;
  syncExpandedState(li); positionRadialStack(li);
}
export function collapseUserExpandedStacks({ except = null } = {}) {
  let collapsedAny = false;
  document.querySelectorAll('#player-circle li[data-user-expanded="1"]').forEach((li) => {
    if (li === except) return;
    collapsedAny = true; setStackUserExpanded(li, false);
  });
  return collapsedAny;
}
export function layoutReminderStacks({ grimoireState }) {
  const circle = document.getElementById('player-circle'); if (!circle) return; const listItems = Array.from(circle.querySelectorAll('li')); if (!listItems.length) return;
  const containerRect = circle.getBoundingClientRect();
  const entries = listItems.map((li, playerIndex) => {
    const stack = measureStack(li, containerRect); const count = countVisibleReminders(grimoireState, playerIndex);
    return { stack, count, openFootprint: getStackFootprint(stack, count, true), closedFootprint: getStackFootprint(stack, count, false), open: false };
  });
  const measurable = entries.every((entry) => entry.stack.tokenRadiusPx > 0 && entry.stack.runtimeRadius > 0);
  if (measurable) {
    resolveStackFit(entries, getCentreInfoRect());
    entries.forEach(({ stack, open }) => {
      stack.li.dataset.autoExpanded = open ? '1' : '0'; if (open) delete stack.li.dataset.userExpanded; syncExpandedState(stack.li);
    });
  }
  entries.forEach(({ stack, count }) => applyStackLayout(stack, count));
}
export function positionRadialStack(li, count) {
  const stack = measureStack(li); applyStackLayout(stack, Number.isFinite(count) ? count : stack.reminderEls.length);
}
function applyStackLayout(stack, count) {
  const { li, tokenRadiusPx, angle, runtimeRadius, reminderDiameter, edgeGap, reminderEls, centerOpts } = stack; const isExpanded = isStackExpanded(li);
  const remindersContainer = li.querySelector('.reminders');
  if (remindersContainer) {
    const touchUntil = parseInt(li.dataset.touchSuppressUntil || '0', 10); const actionUntil = parseInt(li.dataset.actionSuppressUntil || '0', 10);
    const suppressUntil = Math.max(touchUntil, actionUntil); const inSuppressWindow = Date.now() < suppressUntil;
    remindersContainer.style.pointerEvents = isExpanded && inSuppressWindow ? 'none' : 'auto';
  }
  let hoverZone = li.querySelector('.reminder-hover-zone');
  if (!hoverZone && remindersContainer) { hoverZone = document.createElement('div'); hoverZone.className = 'reminder-hover-zone'; remindersContainer.appendChild(hoverZone); }
  const offsets = getStackOffsets(stack, count, isExpanded);
  reminderEls.forEach((el, idx) => {
    const pos = calculateRadialPosition({ ...centerOpts, radius: offsets.firstReminder + idx * offsets.step }); el.style.left = pos.left; el.style.top = pos.top;
    el.style.transform = isExpanded ? 'translate(-50%, -50%)' : `translate(-50%, -50%) scale(${offsets.reminderScale})`; el.style.zIndex = isExpanded ? '5' : '2';
  });
  if (hoverZone) {
    const hoverZoneStart = tokenRadiusPx + edgeGap; const maxHoverZoneEnd = Math.min(tokenRadiusPx + 200, runtimeRadius - 10);
    const hoverZoneEnd = Math.max(hoverZoneStart + 20, maxHoverZoneEnd); const hoverZoneWidth = hoverZoneEnd - hoverZoneStart; const hoverZoneHeight = reminderDiameter;
    const hoverZoneCenterOffset = (hoverZoneStart + hoverZoneEnd) / 2; const hoverPos = calculateRadialPosition({ ...centerOpts, radius: hoverZoneCenterOffset });
    const rotationAngle = angle * (180 / Math.PI); hoverZone.style.left = hoverPos.left; hoverZone.style.top = hoverPos.top; hoverZone.style.width = `${hoverZoneWidth}px`;
    hoverZone.style.height = `${hoverZoneHeight}px`; hoverZone.style.transform = `translate(-50%, -50%) rotate(${rotationAngle}deg)`;
    hoverZone.style.transformOrigin = 'center center';
  }
  const plus = stack.plus;
  if (plus) {
    const pos = calculateRadialPosition({ ...centerOpts, radius: offsets.plus }); plus.style.left = pos.left; plus.style.top = pos.top;
    plus.style.transform = isExpanded ? 'translate(-50%, -50%)' : `translate(-50%, -50%) scale(${offsets.plusScale})`; plus.style.zIndex = '6';
  } settleAnimations(li, 320, true);
}
