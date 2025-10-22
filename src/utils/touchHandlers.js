/**
 * Touch handling utilities for iOS compatibility and consistent touch behavior
 */

// WeakMap to store existing touch handlers for each element
// This allows automatic cleanup when setupTouchHandling is called multiple times on the same element
const elementHandlers = new WeakMap();

/**
 * Sets up unified mouse and touch handling with long press detection.
 * Can handle simple tap/click-only interactions or complex tap/click + long press patterns.
 * Works for both touch devices and desktop (mouse).
 *
 * @param {Object} config Configuration object
 * @param {HTMLElement} config.element - The element to attach handlers to
 * @param {Function} config.onTap - Callback for tap/click actions (< longPressDelay, no movement)
 * @param {Function} [config.onLongPress] - Optional callback for long press/right-click actions (>= longPressDelay, no movement)
 * @param {Function} config.setTouchOccurred - Callback to track touch state for click prevention
 * @param {Function} [config.shouldSkip] - Optional callback to determine if interaction should be skipped
 * @param {number} [config.longPressDelay=500] - Delay in ms before long press triggers
 * @param {boolean} [config.showPressFeedback=false] - Whether to add 'press-feedback' class during long press
 */
export function setupTouchHandling({
  element,
  onTap,
  onLongPress,
  setTouchOccurred,
  shouldSkip,
  longPressDelay = 500,
  actionDelay = 50,
  showPressFeedback = false
}) {
  const isTouchDevice = 'ontouchstart' in window;

  // Clean up any existing handlers for this element
  const existingHandlers = elementHandlers.get(element);
  if (existingHandlers) {
    // Remove existing event listeners
    if (isTouchDevice) {
      element.removeEventListener('touchstart', existingHandlers.touchstart);
      element.removeEventListener('touchmove', existingHandlers.touchmove);
      element.removeEventListener('touchend', existingHandlers.touchend);
      element.removeEventListener('touchcancel', existingHandlers.touchcancel);
      if (existingHandlers.suppressClick) {
        element.removeEventListener('click', existingHandlers.suppressClick, true);
      }
    } else {
      if (existingHandlers.click) {
        element.removeEventListener('click', existingHandlers.click);
      }
      if (existingHandlers.contextmenu) {
        element.removeEventListener('contextmenu', existingHandlers.contextmenu);
      }
    }

    // Clear any existing timers
    clearTimeout(existingHandlers.longPressTimer);
    clearTimeout(existingHandlers.touchActionTimer);
  }

  let touchActionTimer = null;
  let longPressTimer = null;
  let isLongPress = false;
  let touchStartTime = 0;

  if (isTouchDevice) {
    // Touch device handlers
    const touchStartHandler = (e) => {
      // Allow custom skip logic (e.g., for specific child elements)
      if (shouldSkip && shouldSkip(e)) {
        return;
      }

      // Mark that a touch occurred
      if (setTouchOccurred) setTouchOccurred(true);
      touchStartTime = Date.now();

      // Reset flags
      isLongPress = false;

      // Reset synthetic click suppression at the start of each interaction
      if (element && element.dataset) {
        element.dataset.ignoreNextSyntheticClick = 'false';
      }

      // Store touch start position for long press detection
      const x = e.touches[0].clientX;
      const y = e.touches[0].clientY;

      // Clear any existing timers
      clearTimeout(longPressTimer);
      clearTimeout(touchActionTimer);

      // Add press feedback class if enabled
      if (showPressFeedback && onLongPress) {
        try { element.classList.add('press-feedback'); } catch (_) { }
      }

      // Start long press timer if callback provided
      if (onLongPress) {
        longPressTimer = setTimeout(() => {
          isLongPress = true;
          clearTimeout(touchActionTimer);
          // Remove press feedback before calling callback
          if (showPressFeedback) {
            try { element.classList.remove('press-feedback'); } catch (_) { }
          }
          if (element && element.dataset) {
            element.dataset.ignoreNextSyntheticClick = 'true';
          }
          onLongPress(e, x, y);
        }, longPressDelay);
      }
    };

    element.addEventListener('touchstart', touchStartHandler);

    const touchMoveHandler = (e) => {
      // Don't cancel long press on movement - let it complete based on time only
      e.stopPropagation();
    };

    element.addEventListener('touchmove', touchMoveHandler);

    const touchEndHandler = (e) => {
      e.preventDefault();

      // Calculate touch duration
      const touchDuration = Date.now() - touchStartTime;

      // Clear long press timer
      clearTimeout(longPressTimer);

      // Remove press feedback class if enabled
      if (showPressFeedback) {
        try { element.classList.remove('press-feedback'); } catch (_) { }
      }

      // Only trigger tap if it wasn't a long press and was quick enough
      if (onTap && !isLongPress && touchDuration < longPressDelay) {
        // Use a small delay to ensure long press timer is cancelled
        touchActionTimer = setTimeout(() => {
          if (!isLongPress) {
            onTap(e);
          }
        }, actionDelay);
      } else if (!isLongPress && element && element.dataset) {
        // Ensure flag stays cleared when no long press occurred
        element.dataset.ignoreNextSyntheticClick = 'false';
      }
    };

    element.addEventListener('touchend', touchEndHandler);

    const touchCancelHandler = (_e) => {
      // Clear all timers on cancel
      clearTimeout(longPressTimer);
      clearTimeout(touchActionTimer);
      isLongPress = false;

      // Remove press feedback class if enabled
      if (showPressFeedback) {
        try { element.classList.remove('press-feedback'); } catch (_) { }
      }

      if (setTouchOccurred) setTouchOccurred(false);
      if (element && element.dataset) {
        element.dataset.ignoreNextSyntheticClick = 'false';
      }
    };

    element.addEventListener('touchcancel', touchCancelHandler);

    const suppressClickHandler = (event) => {
      if (element && element.dataset && element.dataset.ignoreNextSyntheticClick === 'true') {
        event.preventDefault();
        try { event.stopImmediatePropagation(); } catch (_) { }
        event.stopPropagation();
        element.dataset.ignoreNextSyntheticClick = 'false';
      }
    };

    element.addEventListener('click', suppressClickHandler, true);

    // Store handlers and timers for cleanup
    const handlers = {
      touchstart: touchStartHandler,
      touchmove: touchMoveHandler,
      touchend: touchEndHandler,
      touchcancel: touchCancelHandler,
      suppressClick: suppressClickHandler,
      longPressTimer,
      touchActionTimer
    };
    elementHandlers.set(element, handlers);

    // Return cleanup function
    return () => {
      clearTimeout(longPressTimer);
      clearTimeout(touchActionTimer);

      // Remove event listeners
      element.removeEventListener('touchstart', touchStartHandler);
      element.removeEventListener('touchmove', touchMoveHandler);
      element.removeEventListener('touchend', touchEndHandler);
      element.removeEventListener('touchcancel', touchCancelHandler);
      element.removeEventListener('click', suppressClickHandler, true);

      // Remove from WeakMap
      elementHandlers.delete(element);
    };
  } else {
    // Desktop (mouse) handlers - click for tap, right-click for long press equivalent
    const clickHandler = (e) => {
      // Skip if click is on a child element that stopPropagation (like reminder action buttons)
      if (e.target !== element && e.target.closest && e.target.closest('.reminder-action')) {
        return;
      }

      // Allow custom skip logic
      if (shouldSkip && shouldSkip(e)) {
        return;
      }

      if (onTap) {
        onTap(e);
      }
    };

    element.addEventListener('click', clickHandler, true);

    // Handle right-click (contextmenu) as equivalent to long press
    const contextMenuHandler = (e) => {
      // Skip if right-click is on a child element with its own context menu
      if (e.target !== element && e.target.closest && e.target.closest('.reminder-action')) {
        return;
      }

      // Allow custom skip logic
      if (shouldSkip && shouldSkip(e)) {
        return;
      }

      if (onLongPress) {
        e.preventDefault(); // Prevent default context menu
        // Stop propagation so parent handlers (e.g., listItem contextmenu) don't also fire
        try { e.stopPropagation(); } catch (_) { }
        const x = e.clientX;
        const y = e.clientY;
        onLongPress(e, x, y);
      }
    };

    if (onLongPress) {
      element.addEventListener('contextmenu', contextMenuHandler);
    }

    // Store handlers for cleanup
    const handlers = {
      click: clickHandler,
      contextmenu: onLongPress ? contextMenuHandler : null
    };
    elementHandlers.set(element, handlers);

    // Return cleanup function
    return () => {
      element.removeEventListener('click', clickHandler, true);
      if (onLongPress) {
        element.removeEventListener('contextmenu', contextMenuHandler);
      }
      elementHandlers.delete(element);
    };
  }
}


