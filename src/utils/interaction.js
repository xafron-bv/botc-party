/**
 * Touch handling utilities for iOS compatibility and consistent touch behavior
 */
const elementHandlers = new WeakMap();
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
  const existingHandlers = elementHandlers.get(element);
  if (existingHandlers) {
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
    clearTimeout(existingHandlers.longPressTimer);
    clearTimeout(existingHandlers.touchActionTimer);
  }
  let touchActionTimer = null;
  let longPressTimer = null;
  let isLongPress = false;
  let touchStartTime = 0;
  let hadTouchStart = false;
  if (isTouchDevice) {
    const touchStartHandler = (e) => {
      if (shouldSkip && shouldSkip(e)) {
        return;
      }
      if (setTouchOccurred) setTouchOccurred(true);
      touchStartTime = Date.now();
      hadTouchStart = true;
      isLongPress = false;
      if (element && element.dataset) {
        element.dataset.ignoreNextSyntheticClick = 'false';
      }
      const x = e.touches[0].clientX;
      const y = e.touches[0].clientY;
      clearTimeout(longPressTimer);
      clearTimeout(touchActionTimer);
      if (showPressFeedback && onLongPress) {
        try {
          element.classList.add('press-feedback');
        } catch (_) {}
      }
      if (onLongPress) {
        longPressTimer = setTimeout(() => {
          isLongPress = true;
          clearTimeout(touchActionTimer);
          if (showPressFeedback) {
            try {
              element.classList.remove('press-feedback');
            } catch (_) {}
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
      e.stopPropagation();
    };
    element.addEventListener('touchmove', touchMoveHandler);
    const touchEndHandler = (e) => {
      e.preventDefault();
      const touchDuration = Date.now() - touchStartTime;
      clearTimeout(longPressTimer);
      if (showPressFeedback) {
        try {
          element.classList.remove('press-feedback');
        } catch (_) {}
      }
      if (onTap && !isLongPress && touchDuration < longPressDelay) {
        touchActionTimer = setTimeout(() => {
          if (!isLongPress) {
            onTap(e, element);
          }
          hadTouchStart = false;
        }, actionDelay);
      } else if (!isLongPress && element && element.dataset) {
        element.dataset.ignoreNextSyntheticClick = 'false';
        hadTouchStart = false;
      } else {
        hadTouchStart = false;
      }
    };
    element.addEventListener('touchend', touchEndHandler);
    const touchCancelHandler = (_e) => {
      clearTimeout(longPressTimer);
      clearTimeout(touchActionTimer);
      isLongPress = false;
      if (showPressFeedback) {
        try {
          element.classList.remove('press-feedback');
        } catch (_) {}
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
        try {
          event.stopImmediatePropagation();
        } catch (_) {}
        event.stopPropagation();
        element.dataset.ignoreNextSyntheticClick = 'false';
        return;
      }
      if (hadTouchStart) {
        event.preventDefault();
        try {
          event.stopImmediatePropagation();
        } catch (_) {}
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
        try {
          event.preventDefault();
        } catch (_) {}
        try {
          event.stopPropagation();
        } catch (_) {}
        const clientX =
          event.clientX !== undefined
            ? event.clientX
            : (event.touches && event.touches[0] && event.touches[0].clientX) || 0;
        const clientY =
          event.clientY !== undefined
            ? event.clientY
            : (event.touches && event.touches[0] && event.touches[0].clientY) || 0;
        if (element && element.dataset) {
          element.dataset.ignoreNextSyntheticClick = 'true';
        }
        hadTouchStart = false;
        onLongPress(event, clientX, clientY);
      };
      element.addEventListener('contextmenu', contextMenuFallbackHandler);
    }
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
    return () => {
      clearTimeout(longPressTimer);
      clearTimeout(touchActionTimer);
      element.removeEventListener('touchstart', touchStartHandler);
      element.removeEventListener('touchmove', touchMoveHandler);
      element.removeEventListener('touchend', touchEndHandler);
      element.removeEventListener('touchcancel', touchCancelHandler);
      element.removeEventListener('click', suppressClickHandler, true);
      if (contextMenuFallbackHandler) {
        element.removeEventListener('contextmenu', contextMenuFallbackHandler);
      }
      elementHandlers.delete(element);
    };
  } else {
    const clickHandler = (e) => {
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
    const contextMenuHandler = (e) => {
      if (shouldSkip && shouldSkip(e)) {
        return;
      }
      if (onLongPress) {
        e.preventDefault(); // Prevent default context menu
        try {
          e.stopPropagation();
        } catch (_) {}
        const x = e.clientX;
        const y = e.clientY;
        onLongPress(e, x, y);
      }
    };
    if (onLongPress) {
      element.addEventListener('contextmenu', contextMenuHandler);
    }
    const handlers = {
      click: clickHandler,
      contextmenu: onLongPress ? contextMenuHandler : null
    };
    elementHandlers.set(element, handlers);
    return () => {
      element.removeEventListener('click', clickHandler, true);
      if (onLongPress) {
        element.removeEventListener('contextmenu', contextMenuHandler);
      }
      elementHandlers.delete(element);
    };
  }
}
