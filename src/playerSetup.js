import { saveAppState } from './app.js';
import { resetGrimoire, updateGrimoire } from './grimoire.js';
import { createCurvedLabelSvg } from './ui/svg.js';

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
  const bagRandomFillBtn = document.getElementById('bag-random-fill');
  const playerSetupCharacterList = document.getElementById('player-setup-character-list');
  const bagCountWarning = document.getElementById('bag-count-warning');
  const defaultBagWarningText = bagCountWarning ? bagCountWarning.textContent : 'Warning: Selected bag does not match player count configuration.';
  const startSelectionBtn = playerSetupPanel && playerSetupPanel.querySelector('.start-selection');
  const numberPickerOverlay = document.getElementById('number-picker-overlay');
  const numberPickerGrid = document.getElementById('number-picker-grid');
  const closeNumberPickerBtn = document.getElementById('close-number-picker');
  const playerRevealModal = document.getElementById('player-reveal-modal');
  const closePlayerRevealModalBtn = document.getElementById('close-player-reveal-modal');
  const revealCharacterTokenEl = document.getElementById('reveal-character-token');
  const revealAbilityEl = document.getElementById('reveal-ability');
  const revealNameInput = document.getElementById('reveal-name-input');
  const revealConfirmBtn = document.getElementById('reveal-confirm-btn');
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

  if (!grimoireState.playerSetup) {
    grimoireState.playerSetup = { bag: [], assignments: [], revealed: false, travellerBag: [], bagCounts: {} };
  }

  if (!grimoireState.playerSetup.travellerBag) {
    grimoireState.playerSetup.travellerBag = [];
  }

  if (!grimoireState.playerSetup.bagCounts) {
    grimoireState.playerSetup.bagCounts = {};
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
      const header = document.createElement('div');
      header.className = 'team-header';
      header.textContent = team.label;
      playerSetupCharacterList.appendChild(header);
      const grid = document.createElement('div');
      grid.className = 'team-grid';
      groupRoles.forEach(role => {
        const isBagDisabled = Array.isArray(role.special) && role.special.some(s => s && s.name === 'bag-disabled');
        const isTraveller = role.team === 'traveller';

        // If somehow persisted in bag (e.g., older save), purge it.
        if (isBagDisabled && Array.isArray(grimoireState.playerSetup.bag)) {
          const idxInBag = grimoireState.playerSetup.bag.indexOf(role.id);
          if (idxInBag !== -1) grimoireState.playerSetup.bag.splice(idxInBag, 1);
        }

        const tokenEl = document.createElement('div');
        tokenEl.className = 'token role';
        tokenEl.style.backgroundImage = `url('${role.image}'), url('./assets/img/token-BqDQdWeO.webp')`;
        tokenEl.style.backgroundSize = '68% 68%, cover';
        tokenEl.style.position = 'relative';
        tokenEl.style.overflow = 'visible';
        tokenEl.title = role.name;

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

        const updateCount = () => {
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
          saveAppState({ grimoireState });
        };

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

        const toggle = () => {
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

          updateBagWarning();
          saveAppState({ grimoireState });
        };

        checkbox.addEventListener('click', (e) => { e.stopPropagation(); if (isBagDisabled) e.preventDefault(); });
        checkbox.addEventListener('change', (e) => { e.stopPropagation(); if (isBagDisabled) { e.preventDefault(); return; } toggle(); });
        tokenEl.addEventListener('click', () => { if (isBagDisabled) return; checkbox.checked = !checkbox.checked; toggle(); });
        const svg = createCurvedLabelSvg(`setup-role-arc-${role.id}`, role.name);
        tokenEl.appendChild(svg);
        tokenEl.appendChild(checkbox);
        tokenEl.appendChild(countInput);
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

  function randomFillBag() {
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
    saveAppState({ grimoireState });
  }

  function openNumberPicker(forPlayerIndex) {
    if (!numberPickerOverlay || !numberPickerGrid) return;
    numberPickerGrid.innerHTML = '';

    // Add traveller tokens first if any are in the traveller bag
    const travellerBag = grimoireState.playerSetup.travellerBag || [];
    if (travellerBag.length > 0) {
      const travellerSection = document.createElement('div');
      travellerSection.style.gridColumn = '1 / -1';
      travellerSection.style.marginBottom = '12px';

      const travellerLabel = document.createElement('div');
      travellerLabel.textContent = 'Select a Traveller:';
      travellerLabel.style.fontWeight = 'bold';
      travellerLabel.style.marginBottom = '8px';
      travellerLabel.style.textAlign = 'center';
      travellerSection.appendChild(travellerLabel);

      const travellerGrid = document.createElement('div');
      travellerGrid.style.display = 'grid';
      travellerGrid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(80px, 1fr))';
      travellerGrid.style.gap = '8px';
      travellerGrid.style.justifyItems = 'center';

      travellerBag.forEach((roleId) => {
        const role = getRoleFromAnySources(grimoireState, roleId);
        if (!role) return;

        const tokenEl = document.createElement('div');
        tokenEl.className = 'token traveller-token';
        tokenEl.style.width = '80px';
        tokenEl.style.height = '80px';
        tokenEl.style.backgroundImage = `url('${role.image}'), url('./assets/img/token-BqDQdWeO.webp')`;
        tokenEl.style.backgroundSize = '68% 68%, cover';
        tokenEl.style.backgroundPosition = 'center';
        tokenEl.style.cursor = 'pointer';
        tokenEl.style.position = 'relative';
        tokenEl.title = role.name;
        tokenEl.dataset.roleId = roleId;
        tokenEl.dataset.playerIndex = String(forPlayerIndex);

        const svg = createCurvedLabelSvg(`picker-traveller-${roleId}-${Math.random().toString(36).slice(2)}`, role.name);
        tokenEl.appendChild(svg);

        travellerGrid.appendChild(tokenEl);
      });

      travellerSection.appendChild(travellerGrid);
      numberPickerGrid.appendChild(travellerSection);

      // Add separator
      const separator = document.createElement('div');
      separator.style.gridColumn = '1 / -1';
      separator.style.borderTop = '1px solid rgba(255,255,255,0.2)';
      separator.style.margin = '12px 0';
      numberPickerGrid.appendChild(separator);

      const numberLabel = document.createElement('div');
      numberLabel.textContent = 'Or select a number:';
      numberLabel.style.gridColumn = '1 / -1';
      numberLabel.style.fontWeight = 'bold';
      numberLabel.style.marginBottom = '8px';
      numberLabel.style.textAlign = 'center';
      numberPickerGrid.appendChild(numberLabel);
    }

    const n = getEffectivePlayerCount();
    // With simplified approach, bag itself is shuffled at selection start; numbers map 1..n to indices 0..n-1 directly.
    for (let i = 1; i <= n; i++) {
      const btn = document.createElement('button');
      btn.className = 'button number';
      btn.textContent = String(i);
      // Map visible number i to bag index i-1 directly
      const bagIndex = i - 1;
      const alreadyUsed = (grimoireState.playerSetup.assignments || []).includes(bagIndex);
      if (alreadyUsed) btn.classList.add('disabled');
      btn.disabled = alreadyUsed;
      btn.dataset.bagIndex = String(bagIndex);
      btn.dataset.playerIndex = String(forPlayerIndex);
      numberPickerGrid.appendChild(btn);
    }
    numberPickerOverlay.style.display = 'flex';
    // Ensure overlay visually covers the app
    try { numberPickerOverlay.style.position = 'fixed'; numberPickerOverlay.style.inset = '0'; numberPickerOverlay.style.zIndex = '9999'; } catch (_) { }

    if (!isNumberGridHandlerAttached) {
      isNumberGridHandlerAttached = true;
      numberPickerGrid.addEventListener('click', (e) => {
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

          saveAppState({ grimoireState });

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

          // Close picker, open reveal
          numberPickerOverlay.style.display = 'none';

          const role = getRoleFromAnySources(grimoireState, roleId);
          if (playerRevealModal && role) {
            revealCurrentPlayerIndex = forIdx;
            if (revealCharacterTokenEl) {
              revealCharacterTokenEl.innerHTML = '';
              const token = document.createElement('div');
              token.className = 'token has-character';
              token.style.backgroundImage = `url('${role.image}'), url('./assets/img/token-BqDQdWeO.webp')`;
              token.style.backgroundSize = '68% 68%, cover';
              token.style.backgroundPosition = 'center, center';
              token.style.backgroundRepeat = 'no-repeat, no-repeat';
              token.title = role.name || '';
              const svg = createCurvedLabelSvg(`reveal-token-${role.id}-${Math.random().toString(36).slice(2)}`, role.name || '');
              token.appendChild(svg);
              revealCharacterTokenEl.appendChild(token);
            }
            if (revealAbilityEl) revealAbilityEl.textContent = role.ability || '';
            const currentName = (grimoireState.players[forIdx] && grimoireState.players[forIdx].name) || `Player ${forIdx + 1}`;
            if (revealNameInput) {
              revealNameInput.value = currentName;
              try { revealNameInput.focus(); } catch (_) { }
            }
            playerRevealModal.style.display = 'flex';
          }
          return;
        }

        // Original number button handling
        const target = e.target && (e.target.closest && e.target.closest('button.number'));
        if (!target) return;
        if (target.disabled || target.classList.contains('disabled')) return;
        const bagIndexStr = target.getAttribute('data-bag-index');
        const forIdxStr = target.getAttribute('data-player-index');
        const bagIndex = bagIndexStr ? parseInt(bagIndexStr, 10) : NaN;
        const forIdx = forIdxStr ? parseInt(forIdxStr, 10) : NaN;
        if (!Number.isInteger(bagIndex) || !Number.isInteger(forIdx)) return;
        if (bagIndex < 0 || bagIndex >= (grimoireState.playerSetup.bag || []).length) return;

        grimoireState.playerSetup.assignments[forIdx] = bagIndex;
        // Immediately assign the character to the player
        try {
          const bag = grimoireState.playerSetup.bag || [];
          const roleId = bag[bagIndex];
          if (roleId && grimoireState.players && grimoireState.players[forIdx]) {
            grimoireState.players[forIdx].character = roleId;
          }
        } catch (_) { }
        saveAppState({ grimoireState });

        // Disable picked number button
        target.classList.add('disabled');
        target.disabled = true;

        // Update player's overlay
        const playerCircle = document.getElementById('player-circle');
        const li = playerCircle && playerCircle.children && playerCircle.children[forIdx];
        if (li) {
          let overlay = li.querySelector('.number-overlay');
          if (!overlay) {
            overlay = document.createElement('div');
            overlay.className = 'number-overlay';
            li.appendChild(overlay);
          }
          // Visible number is just bag index + 1 in simplified model
          overlay.textContent = String(bagIndex + 1);
          overlay.classList.add('disabled');
          overlay.onclick = null;
        }

        // Close picker, open reveal
        numberPickerOverlay.style.display = 'none';
        try {
          const bag = grimoireState.playerSetup.bag || [];
          const roleId = bag[bagIndex];
          const role = roleId ? getRoleFromAnySources(grimoireState, roleId) : null;
          if (playerRevealModal && role) {
            revealCurrentPlayerIndex = forIdx;
            if (revealCharacterTokenEl) {
              revealCharacterTokenEl.innerHTML = '';
              const token = document.createElement('div');
              token.className = 'token has-character';
              token.style.backgroundImage = `url('${role.image}'), url('./assets/img/token-BqDQdWeO.webp')`;
              token.style.backgroundSize = '68% 68%, cover';
              token.style.backgroundPosition = 'center, center';
              token.style.backgroundRepeat = 'no-repeat, no-repeat';
              token.title = role.name || '';
              const svg = createCurvedLabelSvg(`reveal-token-${role.id}-${Math.random().toString(36).slice(2)}`, role.name || '');
              token.appendChild(svg);
              revealCharacterTokenEl.appendChild(token);
            }
            if (revealAbilityEl) revealAbilityEl.textContent = role.ability || '';
            const currentName = (grimoireState.players[forIdx] && grimoireState.players[forIdx].name) || `Player ${forIdx + 1}`;
            if (revealNameInput) {
              revealNameInput.value = currentName;
              try { revealNameInput.focus(); } catch (_) { }
            }
            playerRevealModal.style.display = 'flex';
          }
        } catch (_) { }
      });
    }
  }

  // Expose a safe opener for other modules (e.g., token clicks)
  try { window.openNumberPickerForSelection = (idx) => openNumberPicker(idx); } catch (_) { }

  if (openPlayerSetupBtn && playerSetupPanel) {
    openPlayerSetupBtn.addEventListener('click', () => {
      if (grimoireState.mode === 'player') return;
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
      // Mark body state for CSS to hide pre-game overlay while configuring bag
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
  if (bagRandomFillBtn) bagRandomFillBtn.addEventListener('click', randomFillBag);

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

  if (startSelectionBtn) startSelectionBtn.addEventListener('click', () => {
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
    // Do NOT reset the grimoire here anymore; just prepare selection overlays.
    // We intentionally keep existing players, characters, reminders until an explicit reset.
    if (playerSetupPanel) {
      playerSetupPanel.style.display = 'none';
      try { document.body.classList.remove('player-setup-open'); } catch (_) { }
    }
    // When starting number selection, consider game not started: show Start, hide End
    try {
      const startGameBtn = document.getElementById('start-game');
      const endGameBtn = document.getElementById('end-game');
      const openPlayerSetupBtn2 = document.getElementById('open-player-setup');
      if (startGameBtn) startGameBtn.style.display = '';
      if (endGameBtn) endGameBtn.style.display = 'none';
      if (openPlayerSetupBtn2) openPlayerSetupBtn2.style.display = '';
      if (window.grimoireState) window.grimoireState.gameStarted = false;
    } catch (_) { }
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
    // Simplified: directly shuffle the bag so numbers 1..N correspond to shuffled characters
    try {
      const list = grimoireState.playerSetup.bag || [];
      for (let i = list.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [list[i], list[j]] = [list[j], list[i]];
      }
    } catch (_) { }
    // Reflect selection active on body for CSS (hide overlay & enable interaction)
    try { document.body.classList.add('selection-active'); } catch (_) { }
    // Restore default overlay text when a new selection session begins
    try {
      const overlayInner = document.querySelector('#pre-game-overlay .overlay-inner');
      if (overlayInner && overlayInner.dataset.initialContent) {
        overlayInner.innerHTML = overlayInner.dataset.initialContent;
      } else if (overlayInner && !overlayInner.dataset.initialContent) {
        overlayInner.dataset.initialContent = overlayInner.innerHTML;
      }
    } catch (_) { }
    // Always reset previously selected numbers for a new selection session (local to selection flow)
    if (!grimoireState.playerSetup) grimoireState.playerSetup = { bag: [], assignments: [], revealed: false };
    grimoireState.playerSetup.assignments = new Array(grimoireState.players.length).fill(null);
    grimoireState.playerSetup.revealed = false;
    saveAppState({ grimoireState });
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
          overlay.textContent = '';
          overlay.classList.add('disabled');
          overlay.onclick = null;
        } else {
          const assigned = Array.isArray(grimoireState.playerSetup.assignments) && grimoireState.playerSetup.assignments[idx] !== null && grimoireState.playerSetup.assignments[idx] !== undefined;
          if (!assigned) {
            overlay.textContent = '?';
            overlay.classList.remove('disabled');
            overlay.onclick = () => openNumberPicker(idx);
          } else {
            overlay.classList.add('disabled');
            overlay.onclick = null;
          }
        }
      });
    }
    try { if (window.updatePreGameOverlayMessage) window.updatePreGameOverlayMessage(); } catch (_) { }
  });
  if (closeNumberPickerBtn && numberPickerOverlay) closeNumberPickerBtn.addEventListener('click', () => { numberPickerOverlay.style.display = 'none'; maybeReopenPanel(); try { if (window.updatePreGameOverlayMessage) window.updatePreGameOverlayMessage(); } catch (_) { } });

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
      if (e.target === numberPickerOverlay) { numberPickerOverlay.style.display = 'none'; maybeReopenPanel(); return; }
      const content = numberPickerOverlay.querySelector('.modal-content');
      if (content && !content.contains(e.target)) { numberPickerOverlay.style.display = 'none'; maybeReopenPanel(); }
    });
  }

  // Reveal modal behavior
  if (playerRevealModal && revealConfirmBtn) {
    revealConfirmBtn.onclick = () => {
      try {
        if (revealCurrentPlayerIndex !== null && grimoireState.players && grimoireState.players[revealCurrentPlayerIndex]) {
          const inputName = (revealNameInput && revealNameInput.value ? revealNameInput.value : '').trim();
          if (inputName) {
            grimoireState.players[revealCurrentPlayerIndex].name = inputName;
            const playerCircle = document.getElementById('player-circle');
            const li = playerCircle && playerCircle.children && playerCircle.children[revealCurrentPlayerIndex];
            if (li) {
              const nameEl = li.querySelector('.player-name');
              if (nameEl) nameEl.textContent = inputName;
            }
            saveAppState({ grimoireState });
          }
        }
      } catch (_) { }
      playerRevealModal.style.display = 'none';
      revealCurrentPlayerIndex = null;

      // After closing a reveal, if all numbers assigned, end selection and show storyteller handoff overlay
      try {
        const sel = grimoireState.playerSetup || {};
        if (sel.selectionActive) {
          const assignments = Array.isArray(sel.assignments) ? sel.assignments : [];
          const allAssigned = assignments.length === grimoireState.players.length && assignments.every(a => a !== null && a !== undefined);
          if (allAssigned) {
            sel.selectionActive = false;
            // Mark selection complete so other UI logic (e.g., updateButtonStates) keeps setup button disabled until reset
            sel.selectionComplete = true;
            try { document.body.classList.remove('selection-active'); } catch (_) { }
            // Update overlay message to storyteller handoff prompt
            const overlayInner = document.querySelector('#pre-game-overlay .overlay-inner');
            if (overlayInner) {
              if (!overlayInner.dataset.initialContent) overlayInner.dataset.initialContent = overlayInner.innerHTML;
              overlayInner.innerHTML = '<h2>Number Selection Complete</h2><p>Hand the device back to the storyteller to finish setup and start the game.</p>';
            }
            // Disable Start Player Setup button until a reset occurs
            try {
              const openSetupBtn = document.getElementById('open-player-setup');
              if (openSetupBtn) {
                openSetupBtn.disabled = true;
                openSetupBtn.title = 'Setup complete. Reset the grimoire to start a new setup.';
              }
            } catch (_) { }
            try { if (window.updatePreGameOverlayMessage) window.updatePreGameOverlayMessage(); } catch (_) { }
          }
        }
      } catch (_) { }
    };
  }

  if (closePlayerRevealModalBtn && playerRevealModal) {
    closePlayerRevealModalBtn.addEventListener('click', () => {
      playerRevealModal.style.display = 'none';
      revealCurrentPlayerIndex = null;
    });
  }

  if (playerRevealModal) {
    playerRevealModal.addEventListener('click', (e) => {
      if (e.target === playerRevealModal) { playerRevealModal.style.display = 'none'; revealCurrentPlayerIndex = null; return; }
      const content = playerRevealModal.querySelector('.modal-content');
      if (content && !content.contains(e.target)) { playerRevealModal.style.display = 'none'; revealCurrentPlayerIndex = null; }
    });
  }
}

// Restore an in-progress number selection session after a page reload.
// Re-applies body classes, hides grimoire, and reconstructs number overlays
// based on persisted playerSetup.assignments when selectionActive is true.
export function restoreSelectionSession({ grimoireState }) {
  try {
    const ps = grimoireState.playerSetup || {};
    if (!ps.selectionActive) return; // Nothing to restore
    if (grimoireState.gameStarted) return; // Ignore if game already started
    // Body class so overlay hides and gating styles apply
    try { document.body.classList.add('selection-active'); } catch (_) { }
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
        overlay.textContent = '';
        overlay.classList.add('disabled');
        overlay.onclick = null;
      } else {
        const assigned = assignments[idx] !== null && assignments[idx] !== undefined;
        if (assigned) {
          overlay.textContent = String(assignments[idx] + 1); // visible numbering
          overlay.classList.add('disabled');
          overlay.onclick = null;
        } else {
          overlay.textContent = '?';
          overlay.classList.remove('disabled');
          overlay.onclick = () => {
            if (window.openNumberPickerForSelection) window.openNumberPickerForSelection(idx);
          };
        }
      }
    });
  } catch (_) { /* swallow restoration errors */ }
}
