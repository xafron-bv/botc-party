import { withStateSave } from './app.js';
import { resetGrimoire, updateGrimoire } from './grimoire.js';
import { renderTokenElement } from './ui/tokenRendering.js';
import { resolveAssetPath } from '../utils.js';
import { canOpenModal } from './utils/validation.js';

function getRoleFromAnySources(grimoireState, roleId) {
  if (grimoireState.allRoles && grimoireState.allRoles[roleId]) {
    return grimoireState.allRoles[roleId];
  }
  if (grimoireState.baseRoles && grimoireState.baseRoles[roleId]) {
    return grimoireState.baseRoles[roleId];
  }
  if (grimoireState.scriptTravellerRoles && grimoireState.scriptTravellerRoles[roleId]) {
    return grimoireState.scriptTravellerRoles[roleId];
  }
  if (grimoireState.extraTravellerRoles && grimoireState.extraTravellerRoles[roleId]) {
    return grimoireState.extraTravellerRoles[roleId];
  }
  return null;
}

export function initPlayerSetup({ grimoireState }) {
  const openPlayerSetupBtn = document.getElementById('open-player-setup');
  const playerSetupPanel = document.getElementById('player-setup-panel');
  const closePlayerSetupBtn = document.getElementById('close-player-setup');
  const shuffleCharactersBtn = document.getElementById('bag-shuffle');
  const playerSetupCharacterList = document.getElementById('player-setup-character-list');
  const bagCountWarning = document.getElementById('bag-count-warning');
  const defaultBagWarningText = bagCountWarning ? bagCountWarning.textContent : 'Warning: Selected bag does not match player count configuration.';
  const startSelectionBtn = playerSetupPanel && playerSetupPanel.querySelector('.start-selection');
  const numberPickerOverlay = document.getElementById('number-picker-overlay');
  const numberPickerGrid = document.getElementById('number-picker-grid');
  const closeNumberPickerBtn = document.getElementById('close-number-picker');
  const selectionPickerTitle = document.getElementById('selection-picker-title');
  const selectionPickerInstructions = document.getElementById('selection-picker-instructions');
  const selectionRevealBtn = document.getElementById('selection-reveal-btn');
  const playerRevealModal = document.getElementById('player-reveal-modal');
  const closePlayerRevealModalBtn = document.getElementById('close-player-reveal-modal');
  const confirmPlayerRevealBtn = document.getElementById('confirm-player-reveal');
  const revealCharacterTokenEl = document.getElementById('reveal-character-token');
  const revealAbilityEl = document.getElementById('reveal-ability');
  const revealNameInput = document.getElementById('reveal-name-input');
  const includeTravellersCheckbox = document.getElementById('include-travellers-in-bag');
  const playerSetupCountsContainer = document.getElementById('player-setup-counts');
  const teamCountElements = {};
  ['townsfolk', 'outsiders', 'minions', 'demons', 'travellers'].forEach((teamKey) => {
    const root = playerSetupCountsContainer ? playerSetupCountsContainer.querySelector(`[data-team="${teamKey}"]`) : null;
    teamCountElements[teamKey] = {
      root,
      selected: root ? root.querySelector('.selected-count') : null,
      required: root ? root.querySelector('.required-count') : null
    };
  });
  let revealCurrentPlayerIndex = null;
  let isNumberGridHandlerAttached = false;
  let isRevealButtonHandlerAttached = false;

  // Helper function to clear next-player highlighting
  function clearNextPlayerHighlight() {
    const playerCircle = document.getElementById('player-circle');
    if (!playerCircle) return;
    Array.from(playerCircle.children).forEach((li) => {
      const token = li.querySelector('.player-token');
      if (token) token.classList.remove('next-player');
    });
  }

  // Helper function to find next unassigned player clockwise from a given index
  function findNextUnassignedPlayer(fromIndex) {
    if (!Array.isArray(grimoireState.players)) return null;
    const totalPlayers = grimoireState.players.length;
    if (totalPlayers === 0) return null;

    const assignments = Array.isArray(grimoireState.playerSetup?.assignments)
      ? grimoireState.playerSetup.assignments
      : [];

    // Start searching from the next player clockwise
    for (let offset = 1; offset <= totalPlayers; offset++) {
      const idx = (fromIndex + offset) % totalPlayers;
      const player = grimoireState.players[idx];

      // Skip if already assigned
      if (assignments[idx] !== null && assignments[idx] !== undefined) continue;

      // Skip if traveller
      const role = player?.character ? getRoleFromAnySources(grimoireState, player.character) : null;
      if (role && role.team === 'traveller') continue;

      // Found next unassigned non-traveller player
      return idx;
    }

    return null; // All players assigned
  }

  // Helper function to highlight the next player
  function highlightNextPlayer(lastAssignedIndex) {
    clearNextPlayerHighlight();

    const nextIdx = findNextUnassignedPlayer(lastAssignedIndex);
    if (nextIdx === null) return; // All done

    const playerCircle = document.getElementById('player-circle');
    if (!playerCircle) return;

    const li = playerCircle.children[nextIdx];
    if (!li) return;

    const token = li.querySelector('.player-token');
    if (token) {
      token.classList.add('next-player');
    }
  }

  if (!grimoireState.playerSetup) {
    grimoireState.playerSetup = { bag: [], assignments: [], revealed: false, travellerBag: [], bagCounts: {} };
  }

  if (!grimoireState.playerSetup.travellerBag) {
    grimoireState.playerSetup.travellerBag = [];
  }

  if (!grimoireState.playerSetup.bagCounts) {
    grimoireState.playerSetup.bagCounts = {};
  }
  if (!grimoireState.playerSetup.roleOrder) {
    grimoireState.playerSetup.roleOrder = {};
  }

  function maybeReopenPanel() {
    if (!playerSetupPanel) return;
    if (grimoireState.playerSetup && grimoireState.playerSetup._reopenOnPickerClose) {
      playerSetupPanel.style.display = 'flex';
      try { playerSetupPanel.scrollIntoView({ block: 'center' }); } catch (_) { }
      grimoireState.playerSetup._reopenOnPickerClose = false;
    }
  }

  function countTravellersInPlay() {
    if (!Array.isArray(grimoireState.players)) return 0;
    let travellerCount = 0;
    grimoireState.players.forEach((player) => {
      if (!player || !player.character) return;
      const role = getRoleFromAnySources(grimoireState, player.character);
      if (role && role.team === 'traveller') travellerCount++;
    });
    return travellerCount;
  }

  function countTravellersInBag() {
    const travellerBag = grimoireState.playerSetup.travellerBag || [];
    return travellerBag.length;
  }

  function getEffectivePlayerCount() {
    const totalPlayers = Array.isArray(grimoireState.players) ? grimoireState.players.length : 0;
    const travellersInPlay = countTravellersInPlay();
    const travellersInBag = countTravellersInBag();
    const totalTravellers = travellersInPlay + travellersInBag;
    const effective = totalPlayers - totalTravellers;
    return effective > 0 ? effective : 0;
  }

  function updateSetupCountsDisplay({ teams, row }) {
    if (!playerSetupCountsContainer) return;
    const teamKeys = ['townsfolk', 'outsiders', 'minions', 'demons'];
    teamKeys.forEach((teamKey) => {
      const elements = teamCountElements[teamKey];
      if (!elements || !elements.root) return;
      const selectedValue = teams && typeof teams[teamKey] === 'number' ? teams[teamKey] : 0;
      const requiredValue = row && typeof row[teamKey] === 'number' ? row[teamKey] : 0;
      if (elements.selected) elements.selected.textContent = String(selectedValue);
      if (elements.required) elements.required.textContent = String(requiredValue);
      if (selectedValue !== requiredValue) {
        elements.root.classList.add('count-mismatch');
        elements.root.setAttribute('data-mismatch', 'true');
      } else {
        elements.root.classList.remove('count-mismatch');
        elements.root.removeAttribute('data-mismatch');
      }
    });

    const travellersElements = teamCountElements.travellers;
    if (travellersElements && travellersElements.root) {
      const travellerSelected = countTravellersInBag();
      const shouldShow = travellerSelected > 0 || (includeTravellersCheckbox && includeTravellersCheckbox.checked);
      travellersElements.root.style.display = shouldShow ? 'flex' : 'none';
      if (travellersElements.selected) travellersElements.selected.textContent = String(travellerSelected);
    }

    updateGrimoire({ grimoireState });
  }

  function updateBagWarning() {
    const travellersInPlay = countTravellersInPlay();
    const travellersInBag = countTravellersInBag();
    const totalTravellers = travellersInPlay + travellersInBag;
    const effectivePlayers = getEffectivePlayerCount();
    const expectedBagCount = effectivePlayers;
    const selectedCount = (grimoireState.playerSetup.bag || []).length;
    const row = (grimoireState.playerSetupTable || []).find(r => Number(r.players) === Number(effectivePlayers));
    const teams = { townsfolk: 0, outsiders: 0, minions: 0, demons: 0 };
    (grimoireState.playerSetup.bag || []).forEach(roleId => {
      const role = getRoleFromAnySources(grimoireState, roleId);
      if (!role) return;
      if (role.team === 'townsfolk') teams.townsfolk++;
      else if (role.team === 'outsider') teams.outsiders++;
      else if (role.team === 'minion') teams.minions++;
      else if (role.team === 'demon') teams.demons++;
    });
    const mismatch = row ? (teams.townsfolk !== row.townsfolk) || (teams.outsiders !== row.outsiders) || (teams.minions !== row.minions) || (teams.demons !== row.demons) : false;
    const countMismatch = selectedCount !== expectedBagCount;

    updateSetupCountsDisplay({ teams, row });

    if (!bagCountWarning) return;

    let travellerSuffix = '';
    if (totalTravellers > 0) {
      const parts = [];
      if (travellersInPlay > 0) parts.push(`${travellersInPlay} assigned`);
      if (travellersInBag > 0) parts.push(`${travellersInBag} in bag`);
      travellerSuffix = ` (excluding ${totalTravellers} traveller${totalTravellers === 1 ? '' : 's'}: ${parts.join(', ')})`;
    }

    if (countMismatch) {
      bagCountWarning.style.display = 'block';
      bagCountWarning.textContent = `Error: You need exactly ${expectedBagCount} characters in the bag${travellerSuffix} (current count: ${selectedCount})`;
      bagCountWarning.classList.add('error');
      return;
    }
    if (!row) {
      bagCountWarning.style.display = 'none';
      bagCountWarning.textContent = defaultBagWarningText;
      bagCountWarning.classList.remove('error');
      return;
    }
    if (mismatch) {
      bagCountWarning.style.display = 'block';
      const nonTravellerLabel = effectivePlayers === 1 ? 'non-traveller player' : 'non-traveller players';

      let travellerNote = '';
      if (totalTravellers > 0) {
        const parts = [];
        if (travellersInPlay > 0) parts.push(`${travellersInPlay} assigned`);
        if (travellersInBag > 0) parts.push(`${travellersInBag} in bag`);
        travellerNote = ` (travellers: ${parts.join(', ')})`;
      }

      bagCountWarning.textContent = `Warning: Expected Townsfolk ${row.townsfolk}, Outsiders ${row.outsiders}, Minions ${row.minions}, Demons ${row.demons} for ${effectivePlayers} ${nonTravellerLabel}${travellerNote}.`;
      bagCountWarning.classList.remove('error');
    } else {
      bagCountWarning.style.display = 'none';
      bagCountWarning.textContent = defaultBagWarningText;
      bagCountWarning.classList.remove('error');
    }
  }

  function getOrderedRolesForTeam({ teamKey, roles }) {
    if (!grimoireState.playerSetup.roleOrder) grimoireState.playerSetup.roleOrder = {};
    const roleIds = roles.map(role => role.id);
    const existingOrder = Array.isArray(grimoireState.playerSetup.roleOrder[teamKey])
      ? grimoireState.playerSetup.roleOrder[teamKey].filter(roleId => roleIds.includes(roleId))
      : [];
    const missingRoles = roleIds.filter(roleId => !existingOrder.includes(roleId));
    const finalOrder = [...existingOrder, ...missingRoles];
    grimoireState.playerSetup.roleOrder[teamKey] = finalOrder;
    const orderMap = new Map(finalOrder.map((roleId, index) => [roleId, index]));
    return roles.slice().sort((a, b) => {
      const aIndex = orderMap.get(a.id) ?? Number.MAX_SAFE_INTEGER;
      const bIndex = orderMap.get(b.id) ?? Number.MAX_SAFE_INTEGER;
      if (aIndex !== bIndex) return aIndex - bIndex;
      return a.name.localeCompare(b.name);
    });
  }

  function renderPlayerSetupList() {
    if (!playerSetupCharacterList) return;
    playerSetupCharacterList.innerHTML = '';

    const baseRoles = Object.values(grimoireState.baseRoles || {});

    const scriptTravellers = Object.values(grimoireState.scriptTravellerRoles || {});

    const extraTravellers = Object.values(grimoireState.extraTravellerRoles || {});

    const allRoles = [...baseRoles, ...scriptTravellers, ...extraTravellers];

    if (!allRoles.length) {
      const msg = document.createElement('div');
      msg.style.padding = '12px';
      msg.style.textAlign = 'center';
      msg.style.opacity = '0.85';
      msg.textContent = 'Choose a script first';
      playerSetupCharacterList.appendChild(msg);
      return;
    }

    const includeTravellersCheckbox = document.getElementById('include-travellers-in-bag');
    const includeTravellers = includeTravellersCheckbox && includeTravellersCheckbox.checked;

    const teamsOrder = [
      { key: 'townsfolk', label: 'Townsfolk' },
      { key: 'outsider', label: 'Outsiders' },
      { key: 'minion', label: 'Minions' },
      { key: 'demon', label: 'Demons' }
    ];

    if (includeTravellers) {
      teamsOrder.push({ key: 'traveller', label: 'Travellers' });
    }

    teamsOrder.forEach((team, idx) => {
      const groupRoles = allRoles
        .filter(r => (r.team || '').toLowerCase() === team.key);
      if (!groupRoles.length) return;
      const orderedRoles = getOrderedRolesForTeam({ teamKey: team.key, roles: groupRoles });
      const header = document.createElement('div');
      header.className = 'team-header';
      header.textContent = team.label;
      playerSetupCharacterList.appendChild(header);
      const grid = document.createElement('div');
      grid.className = 'team-grid';
      orderedRoles.forEach(role => {
        const isBagDisabled = Array.isArray(role.special) && role.special.some(s => s && s.name === 'bag-disabled');
        const isTraveller = role.team === 'traveller';

        // If somehow persisted in bag (e.g., older save), purge it.
        if (isBagDisabled && Array.isArray(grimoireState.playerSetup.bag)) {
          const idxInBag = grimoireState.playerSetup.bag.indexOf(role.id);
          if (idxInBag !== -1) grimoireState.playerSetup.bag.splice(idxInBag, 1);
        }

        const tokenEl = document.createElement('label');
        tokenEl.className = 'token role';
        renderTokenElement({
          tokenElement: tokenEl,
          role,
          baseImage: BASE_TOKEN_IMAGE,
          labelIdPrefix: 'setup-role-arc'
        });
        tokenEl.style.position = 'relative';
        tokenEl.style.overflow = 'visible';
        tokenEl.title = role.name;
        tokenEl.dataset.roleId = role.id;
        tokenEl.dataset.team = (role.team || '').toLowerCase();

        const shouldShowSetupWarning = !!(role && role.setup);
        let setupWarningEl = null;
        if (shouldShowSetupWarning) {
          setupWarningEl = document.createElement('div');
          setupWarningEl.className = 'player-setup-warning-icon';
          setupWarningEl.setAttribute('role', 'img');
          setupWarningEl.setAttribute('aria-label', 'Setup-modifying character selected');
          setupWarningEl.setAttribute('aria-hidden', 'true');
          setupWarningEl.title = 'This character modifies the standard setup';
          setupWarningEl.style.display = 'none';
          const icon = document.createElement('i');
          icon.className = 'fas fa-triangle-exclamation';
          setupWarningEl.appendChild(icon);
        }

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';

        const bagToCheck = isTraveller ? (grimoireState.playerSetup.travellerBag || []) : (grimoireState.playerSetup.bag || []);
        checkbox.checked = bagToCheck.includes(role.id) && !isBagDisabled;

        checkbox.style.position = 'absolute';
        checkbox.style.top = '6px';
        checkbox.style.left = '6px';
        checkbox.style.zIndex = '2';
        if (isBagDisabled) {
          checkbox.disabled = true;
          checkbox.classList.add('bag-disabled');
          tokenEl.classList.add('bag-disabled');
        }

        const countInput = document.createElement('input');
        countInput.type = 'number';
        countInput.className = 'character-count-input';
        countInput.min = '1';
        countInput.max = '99';
        countInput.style.position = 'absolute';
        countInput.style.bottom = '4px';
        countInput.style.right = '4px';
        countInput.style.width = '28px';
        countInput.style.height = '20px';
        countInput.style.textAlign = 'center';
        countInput.style.fontSize = '12px';
        countInput.style.fontWeight = 'bold';
        countInput.style.zIndex = '2';
        countInput.style.borderRadius = '3px';
        countInput.style.border = '1px solid rgba(255,255,255,0.3)';
        countInput.style.backgroundColor = 'rgba(0,0,0,0.7)';
        countInput.style.color = '#fff';
        countInput.style.padding = '0';
        countInput.style.margin = '0';
        countInput.style.MozAppearance = 'textfield';
        countInput.style.WebkitAppearance = 'none';
        countInput.style.appearance = 'none';

        const bagCounts = grimoireState.playerSetup.bagCounts || {};
        const currentCount = bagCounts[role.id] || 1;
        countInput.value = currentCount;

        countInput.style.display = (checkbox.checked && !isBagDisabled) ? 'block' : 'none';

        const isRoleCurrentlySelected = () => {
          if (isBagDisabled) return false;
          const currentBag = isTraveller ? (grimoireState.playerSetup.travellerBag || []) : (grimoireState.playerSetup.bag || []);
          return currentBag.includes(role.id);
        };

        const updateSetupWarningVisibility = () => {
          if (!setupWarningEl) return;
          const shouldDisplay = isRoleCurrentlySelected();
          setupWarningEl.style.display = shouldDisplay ? 'flex' : 'none';
          setupWarningEl.setAttribute('aria-hidden', shouldDisplay ? 'false' : 'true');
        };
        updateSetupWarningVisibility();

        const updateCount = withStateSave(() => {
          if (isBagDisabled) return;
          let newCount = parseInt(countInput.value, 10);
          if (isNaN(newCount) || newCount < 1) {
            newCount = 1;
            countInput.value = '1';
          }

          if (!grimoireState.playerSetup.bagCounts) grimoireState.playerSetup.bagCounts = {};
          grimoireState.playerSetup.bagCounts[role.id] = newCount;

          if (isTraveller) {
            const list = grimoireState.playerSetup.travellerBag || (grimoireState.playerSetup.travellerBag = []);
            while (list.includes(role.id)) {
              const idx = list.indexOf(role.id);
              list.splice(idx, 1);
            }
            for (let i = 0; i < newCount; i++) {
              list.push(role.id);
            }
          } else {
            const list = grimoireState.playerSetup.bag || (grimoireState.playerSetup.bag = []);
            while (list.includes(role.id)) {
              const idx = list.indexOf(role.id);
              list.splice(idx, 1);
            }
            for (let i = 0; i < newCount; i++) {
              list.push(role.id);
            }
          }

          updateBagWarning();
        });

        countInput.addEventListener('change', (e) => {
          e.stopPropagation();
          if (isBagDisabled) { e.preventDefault(); return; }
          updateCount();
        });

        countInput.addEventListener('blur', (e) => {
          e.stopPropagation();
          if (isBagDisabled) { e.preventDefault(); return; }
          updateCount();
        });

        countInput.addEventListener('click', (e) => {
          e.stopPropagation();
        });

        const toggle = withStateSave(() => {
          if (isBagDisabled) return; // no-op for disabled roles

          if (isTraveller) {
            const list = grimoireState.playerSetup.travellerBag || (grimoireState.playerSetup.travellerBag = []);
            if (checkbox.checked) {
              const count = grimoireState.playerSetup.bagCounts?.[role.id] || 1;
              for (let i = 0; i < count; i++) {
                list.push(role.id);
              }
              countInput.style.display = 'block';
            } else {
              while (list.includes(role.id)) {
                const idx = list.indexOf(role.id);
                list.splice(idx, 1);
              }
              countInput.style.display = 'none';
            }
          } else {
            const list = grimoireState.playerSetup.bag || (grimoireState.playerSetup.bag = []);
            if (checkbox.checked) {
              const count = grimoireState.playerSetup.bagCounts?.[role.id] || 1;
              for (let i = 0; i < count; i++) {
                list.push(role.id);
              }
              countInput.style.display = 'block';
            } else {
              while (list.includes(role.id)) {
                const idx = list.indexOf(role.id);
                list.splice(idx, 1);
              }
              countInput.style.display = 'none';
              if (grimoireState.playerSetup.bagCounts) {
                grimoireState.playerSetup.bagCounts[role.id] = 1;
              }
              countInput.value = '1';
            }
          }

          updateSetupWarningVisibility();
          updateBagWarning();
        });

        checkbox.addEventListener('change', (e) => { e.stopPropagation(); if (isBagDisabled) { e.preventDefault(); return; } toggle(); });
        tokenEl.appendChild(checkbox);
        tokenEl.appendChild(countInput);
        if (setupWarningEl) tokenEl.appendChild(setupWarningEl);
        grid.appendChild(tokenEl);
      });
      playerSetupCharacterList.appendChild(grid);
      if (idx < teamsOrder.length - 1) {
        const sep = document.createElement('div');
        sep.className = 'team-separator';
        playerSetupCharacterList.appendChild(sep);
      }
    });
  }

  const fillBagWithStandardSetup = withStateSave(() => {
    const totalPlayers = grimoireState.players.length;
    const travellerCount = countTravellersInPlay();
    const effectivePlayers = getEffectivePlayerCount();
    if (totalPlayers === 0) {
      if (bagCountWarning) {
        bagCountWarning.textContent = 'Error: No players in grimoire. Please add players first.';
        bagCountWarning.style.display = 'block';
        bagCountWarning.classList.add('error');
        try { bagCountWarning.scrollIntoView({ block: 'nearest' }); } catch (_) { }
      }
      return;
    }
    const row = (grimoireState.playerSetupTable || []).find(r => Number(r.players) === Number(effectivePlayers));
    if (!row) {
      if (bagCountWarning) {
        const travellerSuffix = travellerCount > 0 ? ` after excluding ${travellerCount} traveller${travellerCount === 1 ? '' : 's'}` : '';
        bagCountWarning.style.display = 'block';
        bagCountWarning.textContent = `Warning: No standard setup found for ${effectivePlayers} players${travellerSuffix}. Adjust the bag manually.`;
        bagCountWarning.classList.remove('error');
      }
      return;
    }
    const groups = { townsfolk: [], outsiders: [], minions: [], demons: [] };
    Object.values(grimoireState.allRoles || {}).forEach(role => {
      if (role && Array.isArray(role.special) && role.special.some(s => s && s.name === 'bag-disabled')) return;
      if (role.team === 'townsfolk') groups.townsfolk.push(role.id);
      else if (role.team === 'outsider') groups.outsiders.push(role.id);
      else if (role.team === 'minion') groups.minions.push(role.id);
      else if (role.team === 'demon') groups.demons.push(role.id);
    });
    function pick(arr, n) {
      const a = arr.slice();
      for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]]; }
      return a.slice(0, Math.max(0, Math.min(n, a.length)));
    }
    const bag = [
      ...pick(groups.townsfolk, row.townsfolk),
      ...pick(groups.outsiders, row.outsiders),
      ...pick(groups.minions, row.minions),
      ...pick(groups.demons, row.demons)
    ];
    grimoireState.playerSetup.bag = bag;
    grimoireState.playerSetup.assignments = new Array(grimoireState.players.length).fill(null);
    grimoireState.playerSetup.revealed = false;

    // Reset bagCounts to 1 for all selected characters
    grimoireState.playerSetup.bagCounts = {};
    const uniqueRoles = [...new Set(bag)];
    uniqueRoles.forEach(roleId => {
      grimoireState.playerSetup.bagCounts[roleId] = 1;
    });

    renderPlayerSetupList();
    updateBagWarning();
  });

  const shuffleCharacterOrderWithinTeams = withStateSave(() => {
    const baseRoles = Object.values(grimoireState.baseRoles || {});
    const scriptTravellers = Object.values(grimoireState.scriptTravellerRoles || {});
    const extraTravellers = Object.values(grimoireState.extraTravellerRoles || {});
    const allRoles = [...baseRoles, ...scriptTravellers, ...extraTravellers];
    const teamsToShuffle = ['townsfolk', 'outsider', 'minion', 'demon', 'traveller'];
    let didShuffle = false;

    teamsToShuffle.forEach((teamKey) => {
      const roles = allRoles.filter(role => (role.team || '').toLowerCase() === teamKey);
      if (!roles.length) return;
      const orderedRoles = getOrderedRolesForTeam({ teamKey, roles });
      if (orderedRoles.length < 2) return;
      const ids = orderedRoles.map(role => role.id);
      const shuffled = ids.slice();
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      grimoireState.playerSetup.roleOrder[teamKey] = shuffled;
      didShuffle = true;
    });

    if (!didShuffle) return;

    renderPlayerSetupList();
    updateBagWarning();
  });

  const markSelectionCompleteIfDone = () => {
    try {
      const sel = grimoireState.playerSetup || {};
      const assignments = Array.isArray(sel.assignments) ? sel.assignments : [];
      const allAssigned = (grimoireState.players || []).every((p, idx) => {
        const role = p && p.character ? getRoleFromAnySources(grimoireState, p.character) : null;
        const isTraveller = role && role.team === 'traveller';
        if (isTraveller) return true;
        return assignments[idx] !== null && assignments[idx] !== undefined;
      });

      if (!allAssigned) return false;

      sel.selectionActive = false;
      sel.selectionComplete = true;
      try { document.body.classList.remove('selection-active'); } catch (_) { }
      clearNextPlayerHighlight();
      const openSetupBtn = document.getElementById('open-player-setup');
      if (openSetupBtn) {
        openSetupBtn.disabled = true;
        openSetupBtn.title = 'Setup complete. Reset the grimoire to start a new setup.';
      }
      const revealBtn = document.getElementById('reveal-selected-characters');
      if (revealBtn) {
        revealBtn.style.display = sel.revealed ? 'none' : '';
        revealBtn.disabled = !!(window.grimoireState && window.grimoireState.winner);
      }
      try { if (window.updateButtonStates) window.updateButtonStates(); } catch (_) { }
      return true;
    } catch (_) {
      return false;
    }
  };

  const openRevealModalForRole = ({ forIdx, role }) => {
    try {
      if (!playerRevealModal || !role) return;
      revealCurrentPlayerIndex = forIdx;
      if (revealCharacterTokenEl) {
        revealCharacterTokenEl.innerHTML = '';
        const token = document.createElement('div');
        token.className = 'token';
        renderTokenElement({
          tokenElement: token,
          role,
          baseImage: BASE_TOKEN_IMAGE,
          labelIdPrefix: 'reveal-token'
        });
        token.title = role.name || '';
        revealCharacterTokenEl.appendChild(token);
      }
      if (revealAbilityEl) revealAbilityEl.textContent = role.ability || '';
      const currentName = (grimoireState.players[forIdx] && grimoireState.players[forIdx].name) || `Player ${forIdx + 1}`;
      if (revealNameInput) {
        revealNameInput.value = currentName;
        try { revealNameInput.focus(); } catch (_) { }
      }
      // Configure close button handoff text
      if (confirmPlayerRevealBtn) {
        const nextIdx = findNextUnassignedPlayer(forIdx);
        if (nextIdx === null) {
          confirmPlayerRevealBtn.textContent = 'Close and give to the Storyteller';
        } else {
          const nextPlayerName = (grimoireState.players[nextIdx] && grimoireState.players[nextIdx].name) || `Player ${nextIdx + 1}`;
          confirmPlayerRevealBtn.textContent = `Close then hand to ${nextPlayerName}`;
        }
      }

      playerRevealModal.style.display = 'flex';
    } catch (_) { }
  };

  function openNumberPicker(forPlayerIndex) {
    if (!numberPickerOverlay || !numberPickerGrid) return;
    const assignments = Array.isArray(grimoireState.playerSetup.assignments) ? grimoireState.playerSetup.assignments : [];
    const existingPlayer = Array.isArray(grimoireState.players) ? grimoireState.players[forPlayerIndex] : null;
    const hasNumberAssignment = assignments[forPlayerIndex] !== null && assignments[forPlayerIndex] !== undefined;
    const hasCharacter = !!(existingPlayer && existingPlayer.character);
    if (hasNumberAssignment || hasCharacter) return;

    const playerName = (existingPlayer && existingPlayer.name) ? existingPlayer.name : `Player ${forPlayerIndex + 1}`;
    if (selectionPickerTitle) selectionPickerTitle.textContent = playerName
    if (selectionPickerInstructions) selectionPickerInstructions.textContent = `If you're not ${playerName}, do not tap Reveal.`;

    numberPickerGrid.innerHTML = '';

    // Add traveller tokens first if any are in the traveller bag
    const travellerBag = grimoireState.playerSetup.travellerBag || [];
    if (travellerBag.length > 0) {
      const travellerLabel = document.createElement('div');
      travellerLabel.className = 'selection-section-title';
      travellerLabel.textContent = 'Or choose a Traveller:';

      const travellerGrid = document.createElement('div');
      travellerGrid.className = 'traveller-picker-grid';
      travellerBag.forEach((roleId) => {
        const role = getRoleFromAnySources(grimoireState, roleId);
        if (!role) return;

        const tokenEl = document.createElement('div');
        tokenEl.className = 'traveller-token token';
        renderTokenElement({
          tokenElement: tokenEl,
          role,
          baseImage: BASE_TOKEN_IMAGE,
          labelIdPrefix: 'picker-traveller'
        });
        tokenEl.style.cursor = 'pointer';
        tokenEl.style.position = 'relative';
        tokenEl.title = role.name;
        tokenEl.dataset.roleId = roleId;
        tokenEl.dataset.playerIndex = String(forPlayerIndex);

        travellerGrid.appendChild(tokenEl);
      });
      numberPickerGrid.appendChild(travellerLabel);
      numberPickerGrid.appendChild(travellerGrid);
    }

    // Configure reveal button state based on remaining non-traveller characters in bag.
    const bag = grimoireState.playerSetup.bag || [];
    const used = new Set((assignments || []).filter(a => a !== null && a !== undefined));
    const remainingBagCount = Math.max(0, bag.length - used.size);
    const canRevealFromBag = remainingBagCount > 0;
    if (selectionRevealBtn) {
      selectionRevealBtn.dataset.playerIndex = String(forPlayerIndex);
      if (canRevealFromBag) {
        selectionRevealBtn.disabled = false;
        selectionRevealBtn.textContent = 'Reveal';
      } else {
        selectionRevealBtn.disabled = true;
        selectionRevealBtn.textContent = travellerBag.length > 0 ? 'Choose a Traveller below' : 'No characters left';
        if (selectionPickerInstructions && travellerBag.length > 0) {
          selectionPickerInstructions.textContent = `Only ${playerName} should continue. Choose a Traveller below.`;
        }
      }
    }
    numberPickerOverlay.style.display = 'flex';
    // Ensure overlay visually covers the app
    try { numberPickerOverlay.style.position = 'fixed'; numberPickerOverlay.style.inset = '0'; numberPickerOverlay.style.zIndex = '9999'; } catch (_) { }

    if (!isNumberGridHandlerAttached) {
      isNumberGridHandlerAttached = true;
      numberPickerGrid.addEventListener('click', withStateSave((e) => {
        // Check if clicked on a traveller token
        const travellerToken = e.target && e.target.closest && e.target.closest('.traveller-token');
        if (travellerToken) {
          const roleId = travellerToken.dataset.roleId;
          const forIdxStr = travellerToken.dataset.playerIndex;
          const forIdx = forIdxStr ? parseInt(forIdxStr, 10) : NaN;

          if (!roleId || !Number.isInteger(forIdx)) return;

          // Assign traveller to player
          if (grimoireState.players && grimoireState.players[forIdx]) {
            grimoireState.players[forIdx].character = roleId;
          }

          // Remove traveller from bag so it can't be assigned again
          const travellerBag = grimoireState.playerSetup.travellerBag || [];
          const idx = travellerBag.indexOf(roleId);
          if (idx !== -1) {
            travellerBag.splice(idx, 1);
          }

          // Update grimoire display to show the traveller character
          updateGrimoire({ grimoireState });

          // Update player's overlay to show it's a traveller
          const playerCircle = document.getElementById('player-circle');
          const li = playerCircle && playerCircle.children && playerCircle.children[forIdx];
          if (li) {
            let overlay = li.querySelector('.number-overlay');
            if (!overlay) {
              overlay = document.createElement('div');
              overlay.className = 'number-overlay';
              li.appendChild(overlay);
            }
            overlay.textContent = 'T'; // Mark as traveller
            overlay.classList.add('disabled');
            overlay.classList.add('traveller-assigned');
            overlay.onclick = null;
          }

          // Highlight next player for selection
          highlightNextPlayer(forIdx);

          // Close picker, open reveal
          numberPickerOverlay.style.display = 'none';

          const role = getRoleFromAnySources(grimoireState, roleId);
          openRevealModalForRole({ forIdx, role });
          markSelectionCompleteIfDone();

        }
      }));
    }

    if (selectionRevealBtn && !isRevealButtonHandlerAttached) {
      isRevealButtonHandlerAttached = true;
      selectionRevealBtn.addEventListener('click', withStateSave(() => {
        const forIdxStr = selectionRevealBtn.dataset.playerIndex;
        const forIdx = forIdxStr ? parseInt(forIdxStr, 10) : NaN;
        if (!Number.isInteger(forIdx)) return;

        const assignments = Array.isArray(grimoireState.playerSetup.assignments) ? grimoireState.playerSetup.assignments : [];
        const hasNumberAssignment = assignments[forIdx] !== null && assignments[forIdx] !== undefined;
        const existingPlayer = Array.isArray(grimoireState.players) ? grimoireState.players[forIdx] : null;
        const hasCharacter = !!(existingPlayer && existingPlayer.character);
        if (hasNumberAssignment || hasCharacter) return;

        const bag = grimoireState.playerSetup.bag || [];
        const used = new Set((grimoireState.playerSetup.assignments || []).filter(a => a !== null && a !== undefined));
        const available = [];
        for (let i = 0; i < bag.length; i++) {
          if (!used.has(i)) available.push(i);
        }
        if (available.length === 0) {
          numberPickerOverlay.style.display = 'none';
          markSelectionCompleteIfDone();
          return;
        }

        const bagIndex = available[Math.floor(Math.random() * available.length)];
        grimoireState.playerSetup.assignments[forIdx] = bagIndex;

        const roleId = bag[bagIndex];
        const role = roleId ? getRoleFromAnySources(grimoireState, roleId) : null;

        // Update player's overlay to show "drawn"
        const playerCircle = document.getElementById('player-circle');
        const li = playerCircle && playerCircle.children && playerCircle.children[forIdx];
        if (li) {
          let overlay = li.querySelector('.number-overlay');
          if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'number-overlay';
            li.appendChild(overlay);
          }
          overlay.textContent = '✓';
          overlay.classList.add('disabled');
          overlay.classList.add('number-picked');
          overlay.classList.remove('traveller-assigned');
          overlay.removeAttribute('data-number');
          overlay.onclick = null;
        }

        // Highlight next player for selection
        highlightNextPlayer(forIdx);

        // Close picker, open reveal
        numberPickerOverlay.style.display = 'none';
        openRevealModalForRole({ forIdx, role });
        markSelectionCompleteIfDone();
      }));
    }
  }

  // Expose a safe opener for other modules (e.g., token clicks)
  try { window.openNumberPickerForSelection = (idx) => openNumberPicker(idx); } catch (_) { }

  if (openPlayerSetupBtn && playerSetupPanel) {
    openPlayerSetupBtn.addEventListener('click', () => {
      if (!canOpenModal({ grimoireState, requiresStorytellerMode: true })) return;
      // Model B: Ensure a clean baseline when entering player setup before game start.
      // Only reset if game has not started (avoid wiping mid-game accidentally) and players exist.
      try {
        if (!grimoireState.gameStarted) {
          const playerCountInput = document.getElementById('player-count');
          const grimoireHistoryList = document.getElementById('grimoire-history-list');
          resetGrimoire({ grimoireState, grimoireHistoryList, playerCountInput });
        }
      } catch (_) { }
      playerSetupPanel.style.display = 'flex';
      renderPlayerSetupList();
      updateBagWarning();
      try { playerSetupPanel.scrollIntoView({ block: 'center' }); } catch (_) { }
      // Mark body state for CSS while configuring bag
      try { document.body.classList.add('player-setup-open'); } catch (_) { }
    });
  }
  if (closePlayerSetupBtn && playerSetupPanel) {
    closePlayerSetupBtn.addEventListener('click', () => {
      playerSetupPanel.style.display = 'none';
      try { document.body.classList.remove('player-setup-open'); } catch (_) { }
      try { if (window.updatePreGameOverlayMessage) window.updatePreGameOverlayMessage(); } catch (_) { }
    });
  }
  if (shuffleCharactersBtn) shuffleCharactersBtn.addEventListener('click', shuffleCharacterOrderWithinTeams);

  if (typeof window !== 'undefined' && window.Cypress) {
    try {
      window.__BOTCPARTY_TEST_API = window.__BOTCPARTY_TEST_API || {};
      window.__BOTCPARTY_TEST_API.fillBagWithStandardSetup = () => {
        fillBagWithStandardSetup();
      };
    } catch (_) { }
  }

  // Add listener for include travellers checkbox
  if (includeTravellersCheckbox) {
    includeTravellersCheckbox.addEventListener('change', () => {
      // Clear traveller bag when checkbox is unchecked
      if (!includeTravellersCheckbox.checked) {
        grimoireState.playerSetup.travellerBag = [];
      }
      renderPlayerSetupList();
      updateBagWarning();
    });
  }

  if (startSelectionBtn) startSelectionBtn.addEventListener('click', withStateSave(() => {
    // Prevent starting selection if no players exist
    const totalPlayers = grimoireState.players.length;
    const travellerCount = countTravellersInPlay();
    const effectivePlayers = getEffectivePlayerCount();
    if (totalPlayers === 0) {
      if (bagCountWarning) {
        bagCountWarning.textContent = 'Error: No players in grimoire. Please add players first.';
        bagCountWarning.style.display = 'block';
        bagCountWarning.classList.add('error');
        try { bagCountWarning.scrollIntoView({ block: 'nearest' }); } catch (_) { }
      }
      return;
    }
    // Prevent starting selection unless bag size matches number of players
    const selectedCount = (grimoireState.playerSetup && grimoireState.playerSetup.bag) ? grimoireState.playerSetup.bag.length : 0;
    if (selectedCount !== effectivePlayers) {
      if (bagCountWarning) {
        const travellerLabel = travellerCount === 1 ? 'traveller' : 'travellers';
        const travellerSuffix = travellerCount > 0 ? ` (excluding ${travellerCount} ${travellerLabel})` : '';
        bagCountWarning.textContent = `Error: You need exactly ${effectivePlayers} characters in the bag${travellerSuffix} (current count: ${selectedCount})`;
        bagCountWarning.style.display = 'block';
        bagCountWarning.classList.add('error');
        try { bagCountWarning.scrollIntoView({ block: 'nearest' }); } catch (_) { }
      }
      return;
    }
    // Reset grimoire before starting number selection (direct function call)
    // We reset the grimoire to ensure a clean state (clearing tokens, reminders, etc.)
    // but we PRESERVE the bag we just built so it can be distributed.
    const playerCountInput = document.getElementById('player-count');
    const grimoireHistoryList = document.getElementById('grimoire-history-list');
    resetGrimoire({ grimoireState, grimoireHistoryList, playerCountInput, preserveBag: true });

    if (playerSetupPanel) {
      playerSetupPanel.style.display = 'none';
      try { document.body.classList.remove('player-setup-open'); } catch (_) { }
    }
    if (window.grimoireState) window.grimoireState.gameStarted = false;
    // Collapse sidebar to immediately show the grimoire area
    try {
      document.body.classList.add('sidebar-collapsed');
      const sidebarBackdrop = document.getElementById('sidebar-backdrop');
      if (sidebarBackdrop) sidebarBackdrop.style.display = 'none';
      const sidebarToggleBtn = document.getElementById('sidebar-toggle');
      if (sidebarToggleBtn) sidebarToggleBtn.style.display = 'inline-block';
      localStorage.setItem('sidebarCollapsed', '1');
    } catch (_) { }
    if (!grimoireState.playerSetup) grimoireState.playerSetup = {};
    grimoireState.playerSetup._reopenOnPickerClose = false;
    grimoireState.playerSetup.selectionActive = true;
    grimoireState.playerSetup.selectionComplete = false;
    // Shuffle the bag so character draws are random
    try {
      const list = grimoireState.playerSetup.bag || [];
      for (let i = list.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [list[i], list[j]] = [list[j], list[i]];
      }
    } catch (_) { }
    // Reflect selection active on body for CSS (hide overlay & enable interaction)
    try { document.body.classList.add('selection-active'); } catch (_) { }
    // Always reset previously selected draws for a new selection session (local to selection flow)
    if (!grimoireState.playerSetup) grimoireState.playerSetup = { bag: [], assignments: [], revealed: false };
    grimoireState.playerSetup.assignments = new Array(grimoireState.players.length).fill(null);
    grimoireState.playerSetup.revealed = false;
    grimoireState.playerSetup.selectionComplete = false;
    updateBagWarning();
    // Do not auto-hide the grimoire; sidebar button controls visibility
    // Render half-opaque overlays on each token for selection
    const playerCircle = document.getElementById('player-circle');
    if (playerCircle) {
      Array.from(playerCircle.children).forEach((li, idx) => {
        const player = grimoireState.players[idx];
        const role = player && player.character ? getRoleFromAnySources(grimoireState, player.character) : null;
        const isTraveller = role && role.team === 'traveller';

        let overlay = li.querySelector('.number-overlay');
        if (!overlay) {
          overlay = document.createElement('div');
          overlay.className = 'number-overlay';
          li.appendChild(overlay);
        }

        if (isTraveller) {
          // Travellers don't participate in number selection
          overlay.textContent = 'T';
          overlay.classList.add('disabled');
          overlay.classList.add('traveller-assigned');
          overlay.classList.remove('number-picked');
          overlay.onclick = null;
        } else {
          const assigned = Array.isArray(grimoireState.playerSetup.assignments) && grimoireState.playerSetup.assignments[idx] !== null && grimoireState.playerSetup.assignments[idx] !== undefined;
          if (!assigned) {
            overlay.textContent = '?';
            overlay.classList.remove('disabled');
            overlay.onclick = () => openNumberPicker(idx);
          } else {
            overlay.textContent = '✓';
            overlay.classList.add('disabled');
            overlay.classList.add('number-picked');
            overlay.onclick = null;
          }
        }
      });
    }

    // Highlight the first unassigned player to start the selection flow
    // Start from player -1 so findNextUnassignedPlayer finds player 0 (or next available)
    highlightNextPlayer(-1);
    const firstIdx = findNextUnassignedPlayer(-1);
    if (firstIdx !== null) {
      openNumberPicker(firstIdx);
    }

    try { if (window.updatePreGameOverlayMessage) window.updatePreGameOverlayMessage(); } catch (_) { }
  }));
  if (closeNumberPickerBtn && numberPickerOverlay) closeNumberPickerBtn.addEventListener('click', () => {
    numberPickerOverlay.style.display = 'none';
    maybeReopenPanel();
    try { if (window.updatePreGameOverlayMessage) window.updatePreGameOverlayMessage(); } catch (_) { }
  });

  // Close by clicking outside modal content to match other modals
  if (playerSetupPanel) {
    playerSetupPanel.addEventListener('click', (e) => {
      if (e.target === playerSetupPanel) { playerSetupPanel.style.display = 'none'; try { document.body.classList.remove('player-setup-open'); } catch (_) { } return; }
      const content = playerSetupPanel.querySelector('.modal-content');
      if (content && !content.contains(e.target)) { playerSetupPanel.style.display = 'none'; try { document.body.classList.remove('player-setup-open'); } catch (_) { } }
    });
  }

  if (numberPickerOverlay) {
    numberPickerOverlay.addEventListener('click', (e) => {
      if (e.target === numberPickerOverlay) {
        numberPickerOverlay.style.display = 'none';
        maybeReopenPanel();
        return;
      }
      const content = numberPickerOverlay.querySelector('.modal-content');
      if (content && !content.contains(e.target)) {
        numberPickerOverlay.style.display = 'none';
        maybeReopenPanel();
      }
    });
  }

  // Reveal modal behavior - only handle X button close, name update is automatic
  if (playerRevealModal) {
    // Name input auto-save on input change
    if (revealNameInput) {
      revealNameInput.addEventListener('input', withStateSave(() => {
        try {
          if (revealCurrentPlayerIndex !== null && grimoireState.players && grimoireState.players[revealCurrentPlayerIndex]) {
            const inputName = (revealNameInput.value || '').trim();
            if (inputName) {
              grimoireState.players[revealCurrentPlayerIndex].name = inputName;
              const playerCircle = document.getElementById('player-circle');
              const li = playerCircle && playerCircle.children && playerCircle.children[revealCurrentPlayerIndex];
              if (li) {
                const nameEl = li.querySelector('.player-name');
                if (nameEl) nameEl.textContent = inputName;
              }
            }
          }
        } catch (_) { }
      }));
    }
  }

  const closePlayerRevealAndAdvance = withStateSave(() => {
    if (!playerRevealModal) return;
    playerRevealModal.style.display = 'none';
    revealCurrentPlayerIndex = null;

    // Ensure selection completion state is consistent (supports travellers)
    markSelectionCompleteIfDone();
    try { if (window.updatePreGameOverlayMessage) window.updatePreGameOverlayMessage(); } catch (_) { }
  });

  const confirmPlayerRevealAndAdvance = withStateSave(() => {
    if (!playerRevealModal) return;
    const currentIdx = revealCurrentPlayerIndex;
    const nextIdx = Number.isInteger(currentIdx) ? findNextUnassignedPlayer(currentIdx) : null;
    playerRevealModal.style.display = 'none';
    revealCurrentPlayerIndex = null;

    // Ensure selection completion state is consistent (supports travellers)
    markSelectionCompleteIfDone();
    try { if (window.updatePreGameOverlayMessage) window.updatePreGameOverlayMessage(); } catch (_) { }

    // Immediately prompt the next player instead of bouncing back to the grimoire
    if (nextIdx !== null) {
      openNumberPicker(nextIdx);
    }
  });

  if (closePlayerRevealModalBtn) closePlayerRevealModalBtn.addEventListener('click', closePlayerRevealAndAdvance);
  if (confirmPlayerRevealBtn) confirmPlayerRevealBtn.addEventListener('click', confirmPlayerRevealAndAdvance);
}

// Restore an in-progress number selection session after a page reload.
// Re-applies body classes, hides grimoire, and reconstructs number overlays
// based on persisted playerSetup.assignments when selectionActive is true.
export function restoreSelectionSession({ grimoireState }) {
  try {
    const ps = grimoireState.playerSetup || {};
    const selectionActive = !!ps.selectionActive;
    const selectionCompletePendingReveal = !!ps.selectionComplete && !ps.revealed;
    if (!selectionActive && !selectionCompletePendingReveal) return; // Nothing to restore
    if (grimoireState.gameStarted) return; // Ignore if game already started
    // Body class so overlay hides and gating styles apply
    if (selectionActive) {
      try { document.body.classList.add('selection-active'); } catch (_) { }
    }
    // Do not auto-hide the grimoire during restore; sidebar button controls visibility
    const assignments = Array.isArray(ps.assignments) ? ps.assignments : [];
    const playerCircle = document.getElementById('player-circle');
    if (!playerCircle) return;
    Array.from(playerCircle.children).forEach((li, idx) => {
      const player = grimoireState.players[idx];
      const role = player && player.character ? getRoleFromAnySources(grimoireState, player.character) : null;
      const isTraveller = role && role.team === 'traveller';

      let overlay = li.querySelector('.number-overlay');
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'number-overlay';
        li.appendChild(overlay);
      }

      if (isTraveller) {
        // Travellers don't participate in number selection
        overlay.textContent = 'T';
        overlay.classList.add('disabled');
        overlay.classList.add('traveller-assigned');
        overlay.classList.remove('number-picked');
        overlay.removeAttribute('data-number');
        overlay.onclick = null;
      } else {
        const assigned = assignments[idx] !== null && assignments[idx] !== undefined;
        if (assigned) {
          overlay.textContent = '✓';
          overlay.classList.add('disabled');
          overlay.classList.add('number-picked');
          overlay.classList.remove('traveller-assigned');
          overlay.removeAttribute('data-number');
          overlay.onclick = null;
        } else {
          overlay.textContent = '?';
          overlay.classList.remove('disabled');
          overlay.classList.remove('number-picked');
          overlay.classList.remove('traveller-assigned');
          overlay.removeAttribute('data-number');
          overlay.onclick = () => {
            if (window.openNumberPickerForSelection) window.openNumberPickerForSelection(idx);
          };
        }
      }
    });

    // Restore next-player highlighting
    // Find the last assigned player and highlight the next one
    const lastAssignedIndex = assignments.reduce((last, val, idx) => {
      return (val !== null && val !== undefined) ? idx : last;
    }, -1);

    // Helper to find next unassigned in restore context
    const findNext = (fromIdx) => {
      const totalPlayers = grimoireState.players.length;
      for (let offset = 1; offset <= totalPlayers; offset++) {
        const idx = (fromIdx + offset) % totalPlayers;
        const player = grimoireState.players[idx];

        // Skip if already assigned
        if (assignments[idx] !== null && assignments[idx] !== undefined) continue;

        // Skip if traveller
        const role = player?.character ? getRoleFromAnySources(grimoireState, player.character) : null;
        if (role && role.team === 'traveller') continue;

        return idx;
      }
      return null;
    };

    if (lastAssignedIndex >= 0) {
      // We have at least one assignment, highlight next from last assigned
      const nextIdx = findNext(lastAssignedIndex);
      if (nextIdx !== null) {
        const li = playerCircle.children[nextIdx];
        if (li) {
          const token = li.querySelector('.player-token');
          if (token) token.classList.add('next-player');
        }
      }
    } else {
      // No assignments yet, highlight first unassigned (from position -1)
      const nextIdx = findNext(-1);
      if (nextIdx !== null) {
        const li = playerCircle.children[nextIdx];
        if (li) {
          const token = li.querySelector('.player-token');
          if (token) token.classList.add('next-player');
        }
      }
    }

    // Ensure reveal button is visible when selection is done but unrevealed after a restore
    if (selectionCompletePendingReveal) {
      try {
        const revealBtn = document.getElementById('reveal-selected-characters');
        if (revealBtn) {
          revealBtn.style.display = ps.revealed ? 'none' : '';
          revealBtn.disabled = !!(grimoireState && grimoireState.winner);
        }
      } catch (_) { }
      try { if (window.updateButtonStates) window.updateButtonStates(); } catch (_) { }
    }
  } catch (_) { /* swallow restoration errors */ }
}
const BASE_TOKEN_IMAGE = resolveAssetPath('./assets/img/token.png');
