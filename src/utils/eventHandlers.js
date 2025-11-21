/**
 * Reusable event handler utilities for consistent event management.
 */

/**
 * Creates a click handler that automatically handles event propagation and default behavior.
 * @param {Function} handler - The function to execute on click
 * @param {Object} options - Configuration options
 * @param {boolean} [options.preventDefault=false] - Whether to call preventDefault()
 * @param {boolean} [options.stopPropagation=true] - Whether to call stopPropagation()
 * @param {Function} [options.shouldSkip] - Optional function that returns true if the handler should be skipped
 * @returns {Function} The wrapped event handler
 */
export function createSafeClickHandler(handler, { preventDefault = false, stopPropagation = true, shouldSkip = null } = {}) {
  return (e) => {
    if (shouldSkip && shouldSkip(e)) {
      return;
    }
    if (e) {
      if (stopPropagation && e.stopPropagation) e.stopPropagation();
      if (preventDefault && e.preventDefault) e.preventDefault();
    }
    return handler(e);
  };
}

/**
 * Creates a touch handler that manages touch interactions, preventing ghost clicks
 * and handling touch movement cancellation.
 * @param {Function} handler - The function to execute on successful tap
 * @param {Object} options - Configuration options
 * @param {boolean} [options.preventDefault=true] - Whether to call preventDefault() on touchend
 * @param {boolean} [options.stopPropagation=true] - Whether to call stopPropagation()
 * @param {boolean} [options.triggerOnStart=false] - Whether to trigger handler on touchstart instead of touchend
 * @returns {Object} An object containing event listeners to attach
 */
export function createTouchHandler(handler, { preventDefault = true, stopPropagation = true, triggerOnStart = false } = {}) {
  let touchMoved = false;
  let lastTouchEnd = 0;

  const onTouchStart = (e) => {
    touchMoved = false;
    if (stopPropagation && e.stopPropagation) e.stopPropagation();
    if (triggerOnStart) {
      handler(e);
    }
  };

  const onTouchMove = (e) => {
    touchMoved = true;
    if (stopPropagation && e.stopPropagation) e.stopPropagation();
  };

  const onTouchEnd = (e) => {
    if (stopPropagation && e.stopPropagation) e.stopPropagation();
    if (preventDefault && e.preventDefault) e.preventDefault();

    if (!touchMoved && !triggerOnStart) {
      lastTouchEnd = Date.now();
      handler(e);
    }
  };

  const onClick = (e) => {
    if (stopPropagation && e.stopPropagation) e.stopPropagation();
    if (preventDefault && e.preventDefault) e.preventDefault();

    const timeSinceTouchEnd = Date.now() - lastTouchEnd;
    // If a touch event recently fired (within 300ms), ignore this click (ghost click)
    // Otherwise, treat it as a legitimate click (e.g. mouse click)
    if (timeSinceTouchEnd > 300) {
      handler(e);
    }
  };

  return {
    touchstart: onTouchStart,
    touchmove: onTouchMove,
    touchend: onTouchEnd,
    click: onClick
  };
}

/**
 * Helper to attach the touch handler events to an element.
 * @param {HTMLElement} element - The element to attach handlers to
 * @param {Function} handler - The function to execute
 * @param {Object} options - Options for createTouchHandler
 */
export function attachTouchHandler(element, handler, options) {
  const handlers = createTouchHandler(handler, options);
  element.addEventListener('touchstart', handlers.touchstart);
  element.addEventListener('touchmove', handlers.touchmove);
  element.addEventListener('touchend', handlers.touchend);
  element.addEventListener('click', handlers.click);
  return handlers;
}
