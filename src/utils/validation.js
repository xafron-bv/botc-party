import { ensureGrimoireUnlocked } from '../grimoireLock.js';

/**
 * Centralized validation for opening modals or performing actions.
 * Checks various prerequisites based on the provided options.
 *
 * @param {Object} params
 * @param {Object} params.grimoireState - The current application state.
 * @param {boolean} [params.requiresUnlocked=true] - If true, checks if the grimoire is unlocked.
 * @param {boolean} [params.requiresScript=false] - If true, checks if a script is loaded.
 * @param {boolean} [params.requiresNotHidden=false] - If true, checks if the grimoire is visible.
 * @param {boolean} [params.requiresStorytellerMode=false] - If true, checks if in Storyteller mode.
 * @param {boolean} [params.requiresNoWinner=false] - If true, checks if there is no winner yet.
 * @returns {boolean} True if all checks pass, false otherwise.
 */
export function canOpenModal({
  grimoireState,
  requiresUnlocked = true,
  requiresScript = false,
  requiresNotHidden = false,
  requiresStorytellerMode = false,
  requiresNoWinner = false
}) {
  if (!grimoireState) return false;

  if (requiresNotHidden && grimoireState.grimoireHidden) {
    return false;
  }

  if (requiresUnlocked && !ensureGrimoireUnlocked({ grimoireState })) {
    return false;
  }

  if (requiresStorytellerMode && grimoireState.mode === 'player') {
    return false;
  }

  if (requiresNoWinner && grimoireState.winner) {
    // If we are in player mode, we might still want to allow interaction?
    // The original logic in bluffTokens was: grimoireState.mode === 'player' || !grimoireState.winner
    // So if storyteller, requires no winner.
    // Let's handle this logic at the call site or make the flag more specific.
    // For now, strict check.
    return false;
  }

  if (requiresScript && !grimoireState.scriptData) {
    alert('Please load a script first.');
    return false;
  }

  return true;
}
