export function canOpenModal({
  grimoireState,
  requiresScript = false,
  requiresNotHidden = false,
  requiresStorytellerMode = false
}) {
  if (!grimoireState) return false;
  if (requiresNotHidden && grimoireState.grimoireHidden) {
    return false;
  }
  if (requiresStorytellerMode && grimoireState.mode === 'player') {
    return false;
  }
  if (requiresScript && !grimoireState.scriptData) {
    alert('Please load a script first.');
    return false;
  }
  return true;
}
