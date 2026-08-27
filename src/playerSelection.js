import { getRoleById } from '../utils.js';
import { byId, createElement } from './utils/dom.js';
const assigned = (assignments, index) => assignments[index] !== null && assignments[index] !== undefined;
const playerIsTraveller = (grimoireState, player) => {
  const role = player?.character ? getRoleById({ grimoireState, roleId: player.character }) : null; return role?.team === 'traveller';
};
export function findNextSelectable({ grimoireState, fromIndex, assignments = grimoireState.playerSetup?.assignments || [] }) {
  const players = Array.isArray(grimoireState.players) ? grimoireState.players : [];
  for (let offset = 1; offset <= players.length; offset++) {
    const index = (fromIndex + offset) % players.length; if (!assigned(assignments, index) && !playerIsTraveller(grimoireState, players[index])) return index;
  }
  return null;
}
export function clearNextPlayerHighlight(playerCircle = byId('player-circle')) {
  playerCircle?.querySelectorAll('.player-token.next-player').forEach(token => token.classList.remove('next-player'));
}
export function highlightNextPlayer({ grimoireState, fromIndex, assignments, playerCircle = byId('player-circle') }) {
  clearNextPlayerHighlight(playerCircle); const index = findNextSelectable({ grimoireState, fromIndex, assignments });
  playerCircle?.children[index]?.querySelector('.player-token')?.classList.add('next-player'); return index;
}
export function renderSelectionOverlay({ li, state, onPick }) {
  let overlay = li.querySelector('.number-overlay');
  if (!overlay) { overlay = createElement('div', 'number-overlay'); li.appendChild(overlay); }
  const traveller = state === 'traveller'; const selected = state === 'selected'; overlay.textContent = traveller ? 'T' : selected ? '✓' : '?';
  overlay.classList.toggle('disabled', traveller || selected); overlay.classList.toggle('traveller-assigned', traveller); overlay.classList.toggle('number-picked', selected);
  overlay.removeAttribute('data-number'); overlay.onclick = traveller || selected ? null : onPick; return overlay;
}
export function selectionState({ grimoireState, assignments, player, index }) {
  if (playerIsTraveller(grimoireState, player)) return 'traveller'; return assigned(assignments, index) ? 'selected' : 'pending';
}
export function restoreSelectionSession({ grimoireState }) {
  try {
    const setup = grimoireState.playerSetup || {};
    const selectionActive = !!setup.selectionActive;
    const selectionCompletePendingReveal = !!setup.selectionComplete && !setup.revealed;
    if ((!selectionActive && !selectionCompletePendingReveal) || grimoireState.gameStarted) return;
    if (selectionActive) document.body.classList.add('selection-active');
    const assignments = Array.isArray(setup.assignments) ? setup.assignments : [];
    const playerCircle = byId('player-circle'); if (!playerCircle) return;
    Array.from(playerCircle.children).forEach((li, index) => {
      renderSelectionOverlay({
        li,
        state: selectionState({ grimoireState, assignments, player: grimoireState.players[index], index }),
        onPick: () => window.openNumberPickerForSelection?.(index)
      });
    });
    const lastAssignedIndex = assignments.reduce(
      (last, value, index) => value !== null && value !== undefined ? index : last,
      -1
    );
    highlightNextPlayer({ grimoireState, fromIndex: Math.max(-1, lastAssignedIndex), assignments, playerCircle });
    if (selectionCompletePendingReveal) {
      const revealBtn = byId('reveal-selected-characters');
      if (revealBtn) { revealBtn.style.display = setup.revealed ? 'none' : ''; revealBtn.disabled = false; }
      window.updateButtonStates?.();
    }
  } catch (_) { /* Ignore invalid persisted selection data. */ }
}
