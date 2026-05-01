/**
 * Centralized validation for opening modals or performing actions.
 * Checks various prerequisites based on the provided options.
 *
 * @param {Object} params
 * @param {Object} params.grimoireState - The current application state.
 * @param {boolean} [params.requiresScript=false] - If true, checks if a script is loaded.
 * @param {boolean} [params.requiresNotHidden=false] - If true, checks if the grimoire is visible.
 * @param {boolean} [params.requiresStorytellerMode=false] - If true, checks if in Storyteller mode.
 * @param {boolean} [params.requiresNoWinner=false] - If true, checks if there is no winner yet.
 * @returns {boolean} True if all checks pass, false otherwise.
 */
export function canOpenModal({
  grimoireState,
  requiresScript = false,
  requiresNotHidden = false,
  requiresStorytellerMode = false,
  requiresNoWinner = false
}) {
  if (!grimoireState) return false;

  if (requiresNotHidden && grimoireState.grimoireHidden) {
    return false;
  }

  if (requiresStorytellerMode && grimoireState.mode === 'player') {
    return false;
  }

  if (requiresNoWinner && grimoireState.winner) {
    return false;
  }

  if (requiresScript && !grimoireState.scriptData) {
    alert('Please load a script first.');
    return false;
  }

  return true;
}
