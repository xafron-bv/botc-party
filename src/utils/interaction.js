/**
 * Touch handling utilities for iOS compatibility and consistent touch behavior
 */

// WeakMap to store existing touch handlers for each element
// This allows automatic cleanup when setupInteractiveElement is called multiple times on the same element
const elementHandlers = new WeakMap();

/**
 * Standardizes interactive element setup for both mouse and touch.
 * Handles click suppression after touch, long press, and tap events.
 *
 * @param {Object} config
 * @param {HTMLElement} config.element - The element to make interactive
 * @param {Function} config.onTap - Callback for tap/click
 * @param {Function} [config.onLongPress] - Callback for long press/context menu
 * @param {Function} [config.shouldSkip] - Callback to determine if interaction should be skipped
 * @param {boolean} [config.showPressFeedback=false] - Whether to show visual feedback on press
 * @param {number} [config.longPressDelay=500] - Delay for long press
 * @param {boolean} [config.stopClickPropagation=true] - Whether to stop propagation of click events
 * @param {Function} [config.setTouchOccurred] - Optional callback to track touch state
 * @param {number} [config.actionDelay=50] - Delay before triggering tap action
 * @returns {Function} Cleanup function to remove listeners
 */
export function setupInteractiveElement({
  element,
  onTap,
  onLongPress,
  shouldSkip,
  showPressFeedback = false,
  longPressDelay = 500,
  stopClickPropagation = true,
  setTouchOccurred,
  actionDelay = 50
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
      if (existingHandlers.contextmenu) {
        element.removeEventListener('contextmenu', existingHandlers.contextmenu);
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
  let hadTouchStart = false;

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
      hadTouchStart = true;

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
            onTap(e, element);
          }
          hadTouchStart = false;
        }, actionDelay);
      } else if (!isLongPress && element && element.dataset) {
        // Ensure flag stays cleared when no long press occurred
        element.dataset.ignoreNextSyntheticClick = 'false';
        hadTouchStart = false;
      } else {
        hadTouchStart = false;
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
      hadTouchStart = false;
    };

    element.addEventListener('touchcancel', touchCancelHandler);

    const suppressClickHandler = (event) => {
      if (element && element.dataset && element.dataset.ignoreNextSyntheticClick === 'true') {
        event.preventDefault();
        try { event.stopImmediatePropagation(); } catch (_) { }
        event.stopPropagation();
        element.dataset.ignoreNextSyntheticClick = 'false';
        return;
      }
      if (hadTouchStart) {
        event.preventDefault();
        try { event.stopImmediatePropagation(); } catch (_) { }
        event.stopPropagation();
        return;
      }
      if (onTap) {
        if (stopClickPropagation && event && event.stopPropagation) {
          event.stopPropagation();
        }
        onTap(event, element);
        if (element && element.dataset) {
          element.dataset.ignoreNextSyntheticClick = 'false';
        }
      }
    };

    element.addEventListener('click', suppressClickHandler, true);

    let contextMenuFallbackHandler = null;
    if (onLongPress) {
      contextMenuFallbackHandler = (event) => {
        if (shouldSkip && shouldSkip(event)) {
          return;
        }
        try { event.preventDefault(); } catch (_) { }
        try { event.stopPropagation(); } catch (_) { }
        const clientX = (event.clientX !== undefined)
          ? event.clientX
          : ((event.touches && event.touches[0] && event.touches[0].clientX) || 0);
        const clientY = (event.clientY !== undefined)
          ? event.clientY
          : ((event.touches && event.touches[0] && event.touches[0].clientY) || 0);
        if (element && element.dataset) {
          element.dataset.ignoreNextSyntheticClick = 'true';
        }
        hadTouchStart = false;
        onLongPress(event, clientX, clientY);
      };
      element.addEventListener('contextmenu', contextMenuFallbackHandler);
    }

    // Store handlers and timers for cleanup
    const handlers = {
      touchstart: touchStartHandler,
      touchmove: touchMoveHandler,
      touchend: touchEndHandler,
      touchcancel: touchCancelHandler,
      suppressClick: suppressClickHandler,
      contextmenu: contextMenuFallbackHandler,
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
      if (contextMenuFallbackHandler) {
        element.removeEventListener('contextmenu', contextMenuFallbackHandler);
      }

      // Remove from WeakMap
      elementHandlers.delete(element);
    };
  } else {
    // Desktop (mouse) handlers - click for tap, right-click for long press equivalent
    const clickHandler = (e) => {
      // Allow custom skip logic
      if (shouldSkip && shouldSkip(e)) {
        return;
      }

      if (onTap) {
        if (stopClickPropagation && e && e.stopPropagation) {
          e.stopPropagation();
        }
        onTap(e, element);
      }
    };

    element.addEventListener('click', clickHandler, true);

    // Handle right-click (contextmenu) as equivalent to long press
    const contextMenuHandler = (e) => {
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
