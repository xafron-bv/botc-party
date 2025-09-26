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
 * @param {number} [config.longPressDelay=600] - Delay in ms before long press triggers
 * @param {number} [config.actionDelay=50] - Delay in ms before quick tap action triggers
 * @param {number} [config.touchResetDelay=300] - Delay in ms before touch flag is reset
 */
export function setupTouchHandling({
  element,
  onTap,
  onLongPress,
  setTouchOccurred,
  shouldSkip,
  longPressDelay = 600,
  actionDelay = 50,
  touchResetDelay = 300
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
  let touchMoved = false;
  let touchStartX = 0;
  let touchStartY = 0;

  // Detect if running in PWA standalone mode
  const isStandalone = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;
  // Use larger movement threshold for PWA standalone mode due to increased touch sensitivity
  const movementThreshold = isStandalone ? 15 : 10;

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
    touchMoved = false;

    // Store touch start position for long press detection and movement calculation
    const x = e.touches[0].clientX;
    const y = e.touches[0].clientY;
    touchStartX = x;
    touchStartY = y;

    // Clear any existing timers
    clearTimeout(longPressTimer);
    clearTimeout(touchActionTimer);

    // Start long press timer if callback provided
    if (onLongPress) {
      longPressTimer = setTimeout(() => {
        if (!touchMoved) {  // Only trigger long press if no movement
          isLongPress = true;
          clearTimeout(touchActionTimer);
          onLongPress(e, x, y);
        }
      }, longPressDelay);
    }
  };

  element.addEventListener('touchstart', touchStartHandler);

  const touchMoveHandler = (e) => {
    // Calculate movement distance from start position
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const deltaX = Math.abs(currentX - touchStartX);
    const deltaY = Math.abs(currentY - touchStartY);
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // Only consider it "moved" if distance exceeds threshold
    if (distance > movementThreshold) {
      touchMoved = true;
      // Cancel long press timer if user moves their finger beyond threshold
      clearTimeout(longPressTimer);
    }

    e.stopPropagation();
  };

  element.addEventListener('touchmove', touchMoveHandler);

  const touchEndHandler = (e) => {
    e.preventDefault();

    // Calculate touch duration
    const touchDuration = Date.now() - touchStartTime;

    // Clear long press timer
    clearTimeout(longPressTimer);

    // Only trigger tap if it wasn't a long press, was quick enough, and didn't involve movement
    if (onTap && !isLongPress && !touchMoved && touchDuration < longPressDelay) {
      // Use a small delay to ensure long press timer is cancelled
      touchActionTimer = setTimeout(() => {
        if (!isLongPress) {
          onTap(e);
        }
      }, actionDelay);
    }

    // Reset touch flag after a delay to handle any delayed click events
    if (setTouchOccurred) {
      setTimeout(() => {
        setTouchOccurred(false);
      }, touchResetDelay);
    }
  };

  element.addEventListener('touchend', touchEndHandler);

  const touchCancelHandler = (_e) => {
    // Clear all timers on cancel
    clearTimeout(longPressTimer);
    clearTimeout(touchActionTimer);
    isLongPress = false;
    touchMoved = false;
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


