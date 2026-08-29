import { byIds } from '../utils/dom.js';

export function applyEndGameControlState({ grimoireState }) {
  const [endGameBtn, endGameModal] = byIds('end-game', 'end-game-modal');
  const isStoryteller = grimoireState.mode === 'storyteller';
  if (endGameBtn) endGameBtn.style.display = isStoryteller && !grimoireState.winner ? '' : 'none';
  if (!isStoryteller && endGameModal) endGameModal.style.display = 'none';
}
