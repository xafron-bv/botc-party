export function isGrimoireLocked(grimoireState) {
  return !!(grimoireState && grimoireState.grimoireLocked);
}

export function ensureGrimoireUnlocked({ grimoireState } = {}) {
  return !isGrimoireLocked(grimoireState);
}
