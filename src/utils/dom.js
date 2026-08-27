export const byId = (id) => document.getElementById(id);
export const byIds = (...ids) => ids.map(byId);
export function setVisible(element, visible) {
  if (element) element.style.display = visible ? '' : 'none';
}
export function createElement(tag, className = '', text = '') {
  const element = document.createElement(tag);
  if (className) element.className = className;
  element.textContent = text;
  return element;
}
const settleTimers = new WeakMap();
export function settleAnimations(element, delay = 400, subtree = false, after) {
  if (!element) return;
  clearTimeout(settleTimers.get(element));
  settleTimers.set(
    element,
    setTimeout(() => {
      try {
        element.getAnimations?.({ subtree }).forEach((animation) => {
          try {
            animation.finish();
          } catch (_) {
            /* infinite or already removed */
          }
        });
      } catch (_) {
        /* animations unavailable */
      }
      settleTimers.delete(element);
      if (after) after();
    }, delay)
  );
}
