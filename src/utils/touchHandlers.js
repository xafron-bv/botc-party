/**
 * Touch handling utilities for iOS compatibility and consistent touch behavior
 */

// WeakMap to store existing touch handlers for each element
// This allows automatic cleanup when setupTouchHandling is called multiple times on the same element
const elementHandlers = new WeakMap();

/**
 * Sets up touch handling with movement detection for iOS compatibility.
 * Can handle simple tap-only interactions or complex tap + long press patterns.
 *
 * @param {Object} config Configuration object
 * @param {HTMLElement} config.element - The element to attach touch handlers to
 * @param {Function} config.onTap - Callback for tap actions (< longPressDelay, no movement)
 * @param {Function} [config.onLongPress] - Optional callback for long press actions (>= longPressDelay, no movement)
 * @param {Function} config.setTouchOccurred - Callback to track touch state for click prevention
 * @param {Function} [config.shouldSkip] - Optional callback to determine if touch should be skipped
 * @param {number} [config.longPressDelay=500] - Delay in ms before long press triggers
 * @param {number} [config.actionDelay=50] - Delay in ms before quick tap action triggers
 */
export function setupTouchHandling({
  element,
  onTap,
  onLongPress,
  setTouchOccurred,
  shouldSkip,
  longPressDelay = 500,
  actionDelay = 50,
}) {
  if (!('ontouchstart' in window)) return;

  // Clean up any existing handlers for this element
  const existingHandlers = elementHandlers.get(element);
  if (existingHandlers) {
    // Remove existing event listeners
    element.removeEventListener('touchstart', existingHandlers.touchstart);
    element.removeEventListener('touchmove', existingHandlers.touchmove);
    element.removeEventListener('touchend', existingHandlers.touchend);
    element.removeEventListener('touchcancel', existingHandlers.touchcancel);

    // Clear any existing timers
    clearTimeout(existingHandlers.longPressTimer);
    clearTimeout(existingHandlers.touchActionTimer);
  }

  let touchActionTimer = null;
  let longPressTimer = null;
  let isLongPress = false;
  let touchStartTime = 0;

  // Create handler functions that will be stored for cleanup
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

    // Store touch start position for long press detection
    const x = e.touches[0].clientX;
    const y = e.touches[0].clientY;

    // Clear any existing timers
    clearTimeout(longPressTimer);
    clearTimeout(touchActionTimer);

    // Start long press timer if callback provided
    if (onLongPress) {
      longPressTimer = setTimeout(() => {
        isLongPress = true;
        clearTimeout(touchActionTimer);
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

    // Only trigger tap if it wasn't a long press and was quick enough
    if (onTap && !isLongPress && touchDuration < longPressDelay) {
      // Use a small delay to ensure long press timer is cancelled
      touchActionTimer = setTimeout(() => {
        if (!isLongPress) {
          onTap(e);
        }
      }, actionDelay);
    }
  };

  element.addEventListener('touchend', touchEndHandler);

  const touchCancelHandler = (_e) => {
    // Clear all timers on cancel
    clearTimeout(longPressTimer);
    clearTimeout(touchActionTimer);
    isLongPress = false;
    if (setTouchOccurred) setTouchOccurred(false);
  };

  element.addEventListener('touchcancel', touchCancelHandler);

  // Store handlers and timers for cleanup
  const handlers = {
    touchstart: touchStartHandler,
    touchmove: touchMoveHandler,
    touchend: touchEndHandler,
    touchcancel: touchCancelHandler,
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

    // Remove from WeakMap
    elementHandlers.delete(element);
  };
}


