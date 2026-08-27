export function createSafeClickHandler(handler, { preventDefault = false, stopPropagation = true, shouldSkip = null } = {}) {
  return (e) => {
    if (shouldSkip && shouldSkip(e)) { return; }
    if (e) { if (stopPropagation && e.stopPropagation) e.stopPropagation(); if (preventDefault && e.preventDefault) e.preventDefault(); }
    return handler(e);
  };
}
export function createTouchHandler(handler, { preventDefault = true, stopPropagation = true, triggerOnStart = false } = {}) {
  let touchMoved = false; let lastTouchEnd = 0;
  const onTouchStart = (e) => {
    touchMoved = false; if (stopPropagation && e.stopPropagation) e.stopPropagation();
    if (triggerOnStart) { handler(e); }
  };
  const onTouchMove = (e) => { touchMoved = true; if (stopPropagation && e.stopPropagation) e.stopPropagation(); };
  const onTouchEnd = (e) => {
    if (stopPropagation && e.stopPropagation) e.stopPropagation(); if (preventDefault && e.preventDefault) e.preventDefault();
    if (!touchMoved && !triggerOnStart) { lastTouchEnd = Date.now(); handler(e); }
  };
  const onClick = (e) => {
    if (stopPropagation && e.stopPropagation) e.stopPropagation(); if (preventDefault && e.preventDefault) e.preventDefault(); const timeSinceTouchEnd = Date.now() - lastTouchEnd;
    if (timeSinceTouchEnd > 300) { handler(e); }
  };
  return {
    touchstart: onTouchStart,
    touchmove: onTouchMove,
    touchend: onTouchEnd,
    click: onClick
  };
}
export function attachTouchHandler(element, handler, options) {
  const handlers = createTouchHandler(handler, options); element.addEventListener('touchstart', handlers.touchstart); element.addEventListener('touchmove', handlers.touchmove);
  element.addEventListener('touchend', handlers.touchend); element.addEventListener('click', handlers.click); return handlers;
}
