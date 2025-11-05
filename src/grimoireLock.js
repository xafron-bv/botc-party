let lockIndicatorTimer = null;

export function isGrimoireLocked(grimoireState) {
  return !!(grimoireState && grimoireState.grimoireLocked);
}

export function flashGrimoireLockIndicator() {
  if (typeof document === 'undefined') return;
  const btn = document.getElementById('reveal-assignments');
  if (!btn) return;
  btn.classList.add('lock-indicator');
  if (typeof window !== 'undefined' && typeof window.clearTimeout === 'function') {
    window.clearTimeout(lockIndicatorTimer);
  } else {
    clearTimeout(lockIndicatorTimer);
  }
  const timeoutFn = typeof window !== 'undefined' && typeof window.setTimeout === 'function' ? window.setTimeout : setTimeout;
  lockIndicatorTimer = timeoutFn(() => {
    btn.classList.remove('lock-indicator');
  }, 900);
}

export function ensureGrimoireUnlocked({ grimoireState, silent = false } = {}) {
  if (!isGrimoireLocked(grimoireState)) return true;
  if (!silent) flashGrimoireLockIndicator();
  return false;
}
