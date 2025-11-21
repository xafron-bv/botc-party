import { createCurvedLabelSvg } from './ui/svg.js';
import { showTouchAbilityPopup } from './ui/tooltip.js';
import { populateCharacterGrid, hideCharacterModal } from './character.js';
import { saveAppState } from './app.js';
import { setupTouchHandling } from './utils/touchHandlers.js';
import { createAbilityInfoIcon } from './ui/abilityInfoIcon.js';
import { applyTokenArtwork } from './ui/tokenArtwork.js';
import { resolveAssetPath } from '../utils.js';
import { ensureGrimoireUnlocked } from './grimoireLock.js';

const BLUFF_BASE_TOKEN_IMAGE = resolveAssetPath('./assets/img/token.png');

export function createBluffTokensContainer({ grimoireState }) {
  const container = document.createElement('div');
  container.id = 'bluff-tokens-container';
  container.className = 'bluff-tokens-container';

  for (let i = 0; i < 3; i++) {
    const bluffToken = createBluffToken({ grimoireState, index: i });
    container.appendChild(bluffToken);
  }

  return container;
}

export function createBluffToken({ grimoireState, index }) {
  const token = document.createElement('div');
  token.className = 'bluff-token empty';
  token.dataset.bluffIndex = index;

  applyTokenArtwork({
    tokenEl: token,
    baseImage: BLUFF_BASE_TOKEN_IMAGE,
    roleImage: null
  });
  token.style.position = 'relative';
  token.style.overflow = 'visible';

  const label = document.createElement('div');
  label.className = 'bluff-label';
  label.textContent = `Bluff ${index + 1}`;
  token.appendChild(label);

  let touchOccurred = false;

  const canInteract = () => grimoireState.mode === 'player' || !grimoireState.winner;

  token.addEventListener('click', (e) => {
    if (e.target.closest('.ability-info-icon')) {
      return;
    }
    if (!canInteract()) {
      return;
    }
    if (touchOccurred) {
      touchOccurred = false;
      return;
    }
    e.stopPropagation();
    if (!ensureGrimoireUnlocked({ grimoireState })) return;
    openBluffCharacterModal({ grimoireState, bluffIndex: index });
  });

  setupTouchHandling({
    element: token,
    onTap: () => {
      if (!canInteract()) {
        return;
      }
      if (!ensureGrimoireUnlocked({ grimoireState })) return;
      openBluffCharacterModal({ grimoireState, bluffIndex: index });
    },
    setTouchOccurred: (value) => { touchOccurred = value; },
    shouldSkip: (e) => {
      return !!e.target.closest('.ability-info-icon');
    }
  });

  return token;
}

export function updateBluffToken({ grimoireState, index, updateAttention = true }) {
  const token = document.querySelector(`[data-bluff-index="${index}"]`);
  if (!token) return;

  const character = grimoireState.bluffs?.[index];

  const existingInfoIcon = token.querySelector('.ability-info-icon');
  if (existingInfoIcon) {
    existingInfoIcon.remove();
  }

  if (character && grimoireState.allRoles[character]) {
    const role = grimoireState.allRoles[character];

    token.classList.remove('empty');
    token.classList.add('has-character');
    token.dataset.character = character;

    const characterImage = role.image ? resolveAssetPath(role.image) : null;
    applyTokenArtwork({
      tokenEl: token,
      baseImage: BLUFF_BASE_TOKEN_IMAGE,
      roleImage: characterImage
    });

    let svg = token.querySelector('svg');
    if (svg) {
      svg.remove();
    }
    svg = createCurvedLabelSvg(`bluff-role-arc-${character}`, role.name);
    token.appendChild(svg);

    const label = token.querySelector('.bluff-label');
    if (label) {
      label.style.display = 'none';
    }

    if (role.ability) {
      const infoIcon = createAbilityInfoIcon({
        ariaLabel: `Show ability for ${role.name}`,
        title: `Show ability for ${role.name}`,
        dataset: { bluffIndex: String(index) },
        onActivate: ({ icon }) => {
          showTouchAbilityPopup(icon, role.ability);
        }
      });
      token.appendChild(infoIcon);
    }
  } else {
    token.classList.add('empty');
    token.classList.remove('has-character');
    delete token.dataset.character;

    applyTokenArtwork({
      tokenEl: token,
      baseImage: BLUFF_BASE_TOKEN_IMAGE,
      roleImage: null
    });

    const svg = token.querySelector('svg');
    if (svg) {
      svg.remove();
    }

    const label = token.querySelector('.bluff-label');
    if (label) {
      label.style.display = 'block';
    }
  }

  if (updateAttention) {
    updateBluffAttentionState({ grimoireState });
  }
}

export function openBluffCharacterModal({ grimoireState, bluffIndex }) {
  if (!ensureGrimoireUnlocked({ grimoireState })) return;
  const characterModal = document.getElementById('character-modal');
  const characterModalPlayerName = document.getElementById('character-modal-player-name');
  const characterSearch = document.getElementById('character-search');

  if (!grimoireState.scriptData) {
    alert('Please load a script first.');
    return;
  }

  grimoireState.selectedBluffIndex = bluffIndex;

  // Set up hide-in-play preference (default to true)
  if (typeof grimoireState.hideInPlayForBluffs !== 'boolean') {
    grimoireState.hideInPlayForBluffs = true;
  }

  const modalTitle = characterModal.querySelector('h3');
  if (modalTitle) {
    modalTitle.textContent = `Select Bluff ${bluffIndex + 1}`;
  }
  if (characterModalPlayerName) {
    characterModalPlayerName.textContent = '';
  }

  // Show and configure hide-in-play checkbox
  const hideContainer = document.getElementById('hide-in-play-container');
  const hideCheckbox = document.getElementById('hide-in-play');
  if (hideContainer && hideCheckbox) {
    hideContainer.style.display = '';
    hideCheckbox.checked = grimoireState.hideInPlayForBluffs;

    // Remove old handler if exists
    if (hideCheckbox._bluffHandler) {
      hideCheckbox.removeEventListener('change', hideCheckbox._bluffHandler);
    }

    // Add new handler
    hideCheckbox._bluffHandler = () => {
      grimoireState.hideInPlayForBluffs = hideCheckbox.checked;
      populateCharacterGrid({ grimoireState });
    };
    hideCheckbox.addEventListener('change', hideCheckbox._bluffHandler);
  }

  populateCharacterGrid({ grimoireState });
  if (characterSearch) {
    characterSearch.value = '';
  }
  characterModal.style.display = 'flex';
  if (characterSearch) {
    characterSearch.focus();
  }
}

export function assignBluffCharacter({ grimoireState, roleId }) {
  if (!ensureGrimoireUnlocked({ grimoireState })) {
    hideCharacterModal({ grimoireState, clearBluffSelection: true });
    return;
  }
  if (grimoireState.selectedBluffIndex !== undefined && grimoireState.selectedBluffIndex > -1) {
    if (!grimoireState.bluffs) {
      grimoireState.bluffs = [null, null, null];
    }

    grimoireState.bluffs[grimoireState.selectedBluffIndex] = roleId;

    updateBluffToken({ grimoireState, index: grimoireState.selectedBluffIndex });

    hideCharacterModal({ grimoireState, clearBluffSelection: true });

    saveAppState({ grimoireState });
  }
}

export function updateAllBluffTokens({ grimoireState }) {
  for (let i = 0; i < 3; i++) {
    updateBluffToken({ grimoireState, index: i, updateAttention: false });
  }
  updateBluffAttentionState({ grimoireState });
}

export function resetBluffTokens({ grimoireState }) {
  grimoireState.bluffs = [null, null, null];
  updateAllBluffTokens({ grimoireState });
}

export function updateBluffAttentionState({ grimoireState }) {
  if (!grimoireState) return;
  const container = document.getElementById('bluff-tokens-container');
  if (!container) return;

  const tokens = container.querySelectorAll('.bluff-token');
  const highlightActive = grimoireState.mode === 'storyteller' && grimoireState.gameStarted && !grimoireState.winner;
  const bluffs = Array.isArray(grimoireState.bluffs) ? grimoireState.bluffs : [];

  tokens.forEach((token) => {
    const index = Number(token.dataset.bluffIndex);
    const hasBluff = index >= 0 && index < bluffs.length && !!bluffs[index];
    if (highlightActive && !hasBluff) {
      token.classList.add('bluff-token-attention');
    } else {
      token.classList.remove('bluff-token-attention');
    }
  });
}
