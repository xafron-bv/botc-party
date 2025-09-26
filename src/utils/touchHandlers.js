/**
 * Touch handling utilities for iOS compatibility and consistent touch behavior
 */

/**
 * Sets up enhanced touch handling with movement detection for iOS compatibility.
 * Handles the common pattern of: click for quick actions, long press for context menus.
 *
 * @param {Object} config Configuration object
 * @param {HTMLElement} config.element - The element to attach touch handlers to
 * @param {Function} config.onQuickTap - Callback for quick tap actions (< 600ms, no movement)
 * @param {Function} config.onLongPress - Callback for long press actions (>= 600ms, no movement)
 * @param {Function} config.setTouchOccurred - Callback to track touch state for click prevention
 * @param {Function} [config.shouldSkip] - Optional callback to determine if touch should be skipped
 * @param {number} [config.longPressDelay=600] - Delay in ms before long press triggers
 * @param {number} [config.actionDelay=50] - Delay in ms before quick tap action triggers
 * @param {number} [config.touchResetDelay=300] - Delay in ms before touch flag is reset
 */
export function setupEnhancedTouchHandling({
  element,
  onQuickTap,
  onLongPress,
  setTouchOccurred,
  shouldSkip,
  longPressDelay = 600,
  actionDelay = 50,
  touchResetDelay = 300
}) {
  if (!('ontouchstart' in window)) return;

  let touchActionTimer = null;
  let longPressTimer = null;
  let isLongPress = false;
  let touchStartTime = 0;
  let touchMoved = false;

  element.addEventListener('touchstart', (e) => {
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

    // Store touch start position for long press detection
    const x = e.touches[0].clientX;
    const y = e.touches[0].clientY;

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
  });

  element.addEventListener('touchmove', (e) => {
    touchMoved = true;
    // Cancel long press timer if user moves their finger
    clearTimeout(longPressTimer);
    e.stopPropagation();
  });

  element.addEventListener('touchend', (e) => {
    e.preventDefault();

    // Calculate touch duration
    const touchDuration = Date.now() - touchStartTime;

    // Clear long press timer
    clearTimeout(longPressTimer);

    // Only trigger quick tap if it wasn't a long press, was quick enough, and didn't involve movement
    if (onQuickTap && !isLongPress && !touchMoved && touchDuration < longPressDelay) {
      // Use a small delay to ensure long press timer is cancelled
      touchActionTimer = setTimeout(() => {
        if (!isLongPress) {
          onQuickTap(e);
        }
      }, actionDelay);
    }

    // Reset touch flag after a delay to handle any delayed click events
    if (setTouchOccurred) {
      setTimeout(() => {
        setTouchOccurred(false);
      }, touchResetDelay);
    }
  });

  element.addEventListener('touchcancel', (_e) => {
    // Clear all timers on cancel
    clearTimeout(longPressTimer);
    clearTimeout(touchActionTimer);
    isLongPress = false;
    touchMoved = false;
    if (setTouchOccurred) setTouchOccurred(false);
  });

  // Return cleanup function
  return () => {
    clearTimeout(longPressTimer);
    clearTimeout(touchActionTimer);
  };
}

/**
 * Simple touch handling for elements that only need click actions (no long press).
 * Prevents double-click issues and provides iOS-compatible touch behavior.
 *
 * @param {Object} config Configuration object
 * @param {HTMLElement} config.element - The element to attach touch handlers to
 * @param {Function} config.onTap - Callback for tap actions
 * @param {Function} config.setTouchOccurred - Callback to track touch state for click prevention
 * @param {Function} [config.shouldSkip] - Optional callback to determine if touch should be skipped
 * @param {number} [config.touchResetDelay=300] - Delay in ms before touch flag is reset
 */
export function setupSimpleTouchHandling({
  element,
  onTap,
  setTouchOccurred,
  shouldSkip,
  touchResetDelay = 300
}) {
  if (!('ontouchstart' in window)) return;

  let touchMoved = false;

  element.addEventListener('touchstart', (e) => {
    // Allow custom skip logic
    if (shouldSkip && shouldSkip(e)) {
      return;
    }

    // Mark that a touch occurred and reset movement flag
    if (setTouchOccurred) setTouchOccurred(true);
    touchMoved = false;
  });

  element.addEventListener('touchmove', (_e) => {
    touchMoved = true;
  });

  element.addEventListener('touchend', (e) => {
    e.preventDefault();

    // Only trigger action if there was no movement
    if (!touchMoved && onTap) {
      onTap(e);
    }

    // Reset touch flag after a delay
    if (setTouchOccurred) {
      setTimeout(() => {
        setTouchOccurred(false);
      }, touchResetDelay);
    }
  });

  element.addEventListener('touchcancel', (_e) => {
    touchMoved = false;
    if (setTouchOccurred) setTouchOccurred(false);
  });
}
