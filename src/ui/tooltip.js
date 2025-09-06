// Tooltip and touch ability popup helpers (browser-native ES module)

export function positionTooltip(targetElement, tooltip) {
  const rect = targetElement.getBoundingClientRect();
  const tooltipRect = tooltip.getBoundingClientRect();

  // Position above the element by default
  let top = rect.top - tooltipRect.height - 10;
  let left = rect.left + (rect.width - tooltipRect.width) / 2;

  // Adjust if tooltip would go off screen
  if (top < 10) {
    // Position below instead
    top = rect.bottom + 10;
  }

  if (left < 10) {
    left = 10;
  } else if (left + tooltipRect.width > window.innerWidth - 10) {
    left = window.innerWidth - tooltipRect.width - 10;
  }

  tooltip.style.top = `${top}px`;
  tooltip.style.left = `${left}px`;
}

export function showTouchAbilityPopup(targetElement, ability) {
  const popup = document.getElementById('touch-ability-popup');
  if (!popup) return;
  popup.textContent = ability;
  popup.classList.add('show');

  // If targetElement is the info icon, find the nearest token element for better positioning
  const isInfoIcon = targetElement.classList.contains('ability-info-icon');
  const parent = targetElement.parentElement;
  const referenceElement = isInfoIcon
    ? (parent && (parent.querySelector('.player-token, .bluff-token') || parent))
    : targetElement;

  const rect = referenceElement.getBoundingClientRect();
  const popupRect = popup.getBoundingClientRect();

  // Position above the token
  let top = rect.top - popupRect.height - 20;
  let left = rect.left + (rect.width - popupRect.width) / 2;

  // Adjust if popup would go off screen
  if (top < 10) {
    // Position below instead
    top = rect.bottom + 20;
  }

  if (left < 10) {
    left = 10;
  } else if (left + popupRect.width > window.innerWidth - 10) {
    left = window.innerWidth - popupRect.width - 10;
  }

  popup.style.top = `${top}px`;
  popup.style.left = `${left}px`;
}

export function hideTouchAbilityPopup() {
  const touchAbilityPopup = document.getElementById('touch-ability-popup');
  if (touchAbilityPopup) {
    touchAbilityPopup.classList.remove('show');
  }
}

// Hide touch popup when clicking outside
document.addEventListener('click', (e) => {
  if (!e.target.closest('.ability-info-icon') && !e.target.closest('.touch-ability-popup')) {
    hideTouchAbilityPopup();
  }
});

// Position info icons on a larger circle outside the character tokens
export function positionInfoIcons() {
  const circle = document.getElementById('player-circle');
  if (!circle) return;

  // Get all info icons
  const infoIcons = circle.querySelectorAll('.ability-info-icon');

  infoIcons.forEach((icon) => {
    const li = icon.parentElement;
    const angle = parseFloat(li.dataset.angle || '0');

    // Calculate radius for info icons (add 20% of token radius)
    const tokenEl = li.querySelector('.player-token');
    const tokenRadius = tokenEl ? tokenEl.offsetWidth / 2 : 50;
    const infoRadius = tokenRadius * 1.2;

    // Calculate position on the outer circle
    const x = infoRadius * Math.cos(angle);
    const y = infoRadius * Math.sin(angle);

    // Position the info icon
    icon.style.left = `calc(50% + ${x}px)`;
    icon.style.top = `calc(50% + ${y}px)`;
  });
}

export function positionNightOrderNumbers() {
  const circle = document.getElementById('player-circle');
  if (!circle) return;

  // Get all night order numbers
  const nightOrders = circle.querySelectorAll('.night-order-number');

  nightOrders.forEach((orderDiv) => {
    const li = orderDiv.parentElement.parentElement; // parent is token, grandparent is li
    const angle = parseFloat(li.dataset.angle || '0');

    // Calculate radius for night order numbers
    const tokenEl = li.querySelector('.player-token');
    const tokenRadius = tokenEl ? tokenEl.offsetWidth / 2 : 50;

    // Check if there's an info icon for this player
    const hasInfoIcon = li.querySelector('.ability-info-icon');

    if (hasInfoIcon && 'ontouchstart' in window) {
      // In touch mode with info icon, position at different angle
      // Position 45 degrees counter-clockwise from the character's angle
      const offsetAngle = angle - Math.PI / 4;
      const nightOrderRadius = tokenRadius * 1.35;

      const x = nightOrderRadius * Math.cos(offsetAngle);
      const y = nightOrderRadius * Math.sin(offsetAngle);

      orderDiv.style.left = `calc(50% + ${x}px)`;
      orderDiv.style.top = `calc(50% + ${y}px)`;
    } else {
      // No info icon or not in touch mode, use default position
      orderDiv.style.left = '';
      orderDiv.style.top = '';
    }
  });
}

