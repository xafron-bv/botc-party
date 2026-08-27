import { withStateSave } from './app.js';
import { resetGrimoire, updateGrimoire } from './grimoire.js';
import { renderTokenElement } from './ui/tokenRendering.js';
import { resolveAssetPath, getRoleById } from '../utils.js';
import { canOpenModal } from './utils/validation.js';
import { rebuildAllRoles } from './character.js';
import { byId, byIds, createElement } from './utils/dom.js';
import { clearNextPlayerHighlight, findNextSelectable, highlightNextPlayer, renderSelectionOverlay, selectionState } from './playerSelection.js';
import { countTravellersInBag, countTravellersInPlay, getEffectivePlayerCount, initializePlayerSetupState, summarizePlayerSetupBag } from './playerSetupState.js';
export function initPlayerSetup({ grimoireState, collapseSidebar }) {
  const [openPlayerSetupBtn, playerSetupPanel, closePlayerSetupBtn, shuffleCharactersBtn,
    playerSetupCharacterList, bagCountWarning, numberPickerOverlay, numberPickerGrid, closeNumberPickerBtn,
    selectionPickerTitle, selectionPickerInstructions, selectionRevealBtn, playerRevealModal,
    closePlayerRevealModalBtn, confirmPlayerRevealBtn, revealCharacterTokenEl, revealHandoffLabelEl,
    revealHandoffNameEl, includeTravellersCheckbox, playerSetupCountsContainer] = byIds(
    'open-player-setup', 'player-setup-panel', 'close-player-setup', 'bag-shuffle', 'player-setup-character-list',
    'bag-count-warning', 'number-picker-overlay', 'number-picker-grid', 'close-number-picker',
    'selection-picker-title', 'selection-picker-instructions', 'selection-reveal-btn', 'player-reveal-modal',
    'close-player-reveal-modal', 'confirm-player-reveal', 'reveal-character-token', 'reveal-handoff-label',
    'reveal-handoff-name', 'include-travellers-in-bag', 'player-setup-counts'
  ); const defaultBagWarningText = bagCountWarning ? bagCountWarning.textContent : 'Warning: Selected bag does not match player count configuration.';
  const startSelectionBtn = playerSetupPanel && playerSetupPanel.querySelector('.start-selection'); const teamCountElements = {};
  ['townsfolk', 'outsiders', 'minions', 'demons', 'travellers'].forEach((teamKey) => {
    const root = playerSetupCountsContainer ? playerSetupCountsContainer.querySelector(`[data-team="${teamKey}"]`) : null;
    teamCountElements[teamKey] = {
      root,
      selected: root ? root.querySelector('.selected-count') : null,
      required: root ? root.querySelector('.required-count') : null
    };
  }); let revealCurrentPlayerIndex = null; let isNumberGridHandlerAttached = false; let isRevealButtonHandlerAttached = false;
  const findNextUnassignedPlayer = fromIndex => findNextSelectable({ grimoireState, fromIndex });
  const highlightNext = fromIndex => highlightNextPlayer({ grimoireState, fromIndex }); initializePlayerSetupState(grimoireState);
  function maybeReopenPanel() {
    if (!playerSetupPanel) return;
    if (grimoireState.playerSetup && grimoireState.playerSetup._reopenOnPickerClose) {
      playerSetupPanel.style.display = 'flex';
      try { playerSetupPanel.scrollIntoView({ block: 'center' }); } catch (_) { }
      grimoireState.playerSetup._reopenOnPickerClose = false;
    }
  }
  const travellerCountInPlay = () => countTravellersInPlay(grimoireState);
  const travellerCountInBag = () => countTravellersInBag(grimoireState);
  const effectivePlayerCount = () => getEffectivePlayerCount(grimoireState);
  function updateSetupCountsDisplay({ teams, row }) {
    if (!playerSetupCountsContainer) return; const teamKeys = ['townsfolk', 'outsiders', 'minions', 'demons'];
    teamKeys.forEach((teamKey) => {
      const elements = teamCountElements[teamKey]; if (!elements || !elements.root) return; const selectedValue = teams && typeof teams[teamKey] === 'number' ? teams[teamKey] : 0;
      const requiredValue = row && typeof row[teamKey] === 'number' ? row[teamKey] : 0; if (elements.selected) elements.selected.textContent = String(selectedValue);
      if (elements.required) elements.required.textContent = String(requiredValue);
      if (selectedValue !== requiredValue) { elements.root.classList.add('count-mismatch'); elements.root.setAttribute('data-mismatch', 'true'); } else {
        elements.root.classList.remove('count-mismatch'); elements.root.removeAttribute('data-mismatch');
      }
    }); const travellersElements = teamCountElements.travellers;
    if (travellersElements && travellersElements.root) {
      const travellerSelected = travellerCountInBag(); const shouldShow = travellerSelected > 0 || (includeTravellersCheckbox && includeTravellersCheckbox.checked);
      travellersElements.root.style.display = shouldShow ? 'flex' : 'none'; if (travellersElements.selected) travellersElements.selected.textContent = String(travellerSelected);
    }
    updateGrimoire({ grimoireState });
  }
  function updateBagWarning() {
    const { countMismatch, effectivePlayers, row, teamMismatch, teams, totalTravellers, travellersInBag, travellersInPlay } = summarizePlayerSetupBag(grimoireState);
    const selectedCount = grimoireState.playerSetup.bag.length;
    updateSetupCountsDisplay({ teams, row }); if (!bagCountWarning) return; let travellerSuffix = '';
    if (totalTravellers > 0) {
      const parts = []; if (travellersInPlay > 0) parts.push(`${travellersInPlay} assigned`); if (travellersInBag > 0) parts.push(`${travellersInBag} in bag`);
      travellerSuffix = ` (excluding ${totalTravellers} traveller${totalTravellers === 1 ? '' : 's'}: ${parts.join(', ')})`;
    }
    if (countMismatch) {
      bagCountWarning.style.display = 'block';
      bagCountWarning.textContent = `Error: You need exactly ${effectivePlayers} characters in the bag${travellerSuffix} (current count: ${selectedCount})`;
      bagCountWarning.classList.add('error'); return;
    }
    if (!row) { bagCountWarning.style.display = 'none'; bagCountWarning.textContent = defaultBagWarningText; bagCountWarning.classList.remove('error'); return; }
    if (teamMismatch) {
      bagCountWarning.style.display = 'block'; const nonTravellerLabel = effectivePlayers === 1 ? 'non-traveller player' : 'non-traveller players'; let travellerNote = '';
      if (totalTravellers > 0) {
        const parts = []; if (travellersInPlay > 0) parts.push(`${travellersInPlay} assigned`); if (travellersInBag > 0) parts.push(`${travellersInBag} in bag`);
        travellerNote = ` (travellers: ${parts.join(', ')})`;
      }
      bagCountWarning.textContent = `Warning: Expected Townsfolk ${row.townsfolk}, Outsiders ${row.outsiders}, Minions ${row.minions}, Demons ${row.demons} for ${effectivePlayers} ${nonTravellerLabel}${travellerNote}.`;
      bagCountWarning.classList.remove('error');
    } else { bagCountWarning.style.display = 'none'; bagCountWarning.textContent = defaultBagWarningText; bagCountWarning.classList.remove('error'); }
  }
  function getOrderedRolesForTeam({ teamKey, roles }) {
    if (!grimoireState.playerSetup.roleOrder) grimoireState.playerSetup.roleOrder = {}; const roleIds = roles.map(role => role.id);
    const existingOrder = Array.isArray(grimoireState.playerSetup.roleOrder[teamKey])
      ? grimoireState.playerSetup.roleOrder[teamKey].filter(roleId => roleIds.includes(roleId))
      : [];
    const missingRoles = roleIds.filter(roleId => !existingOrder.includes(roleId)); const finalOrder = [...existingOrder, ...missingRoles];
    grimoireState.playerSetup.roleOrder[teamKey] = finalOrder; const orderMap = new Map(finalOrder.map((roleId, index) => [roleId, index]));
    return roles.slice().sort((a, b) => {
      const aIndex = orderMap.get(a.id) ?? Number.MAX_SAFE_INTEGER; const bIndex = orderMap.get(b.id) ?? Number.MAX_SAFE_INTEGER; if (aIndex !== bIndex) return aIndex - bIndex;
      return a.name.localeCompare(b.name);
    });
  }
  function renderPlayerSetupList() {
    if (!playerSetupCharacterList) return; playerSetupCharacterList.innerHTML = ''; const baseRoles = Object.values(grimoireState.baseRoles || {});
    const scriptTravellers = Object.values(grimoireState.scriptTravellerRoles || {}); const extraTravellers = Object.values(grimoireState.extraTravellerRoles || {});
    const allRoles = [...baseRoles, ...scriptTravellers, ...extraTravellers];
    if (!allRoles.length) {
      const msg = createElement('div', '', 'Choose a script first'); msg.style.padding = '12px'; msg.style.textAlign = 'center'; msg.style.opacity = '0.85';
      playerSetupCharacterList.appendChild(msg); return;
    }
    const includeTravellers = includeTravellersCheckbox && includeTravellersCheckbox.checked;
    const teamsOrder = [
      { key: 'townsfolk', label: 'Townsfolk' },
      { key: 'outsider', label: 'Outsiders' },
      { key: 'minion', label: 'Minions' },
      { key: 'demon', label: 'Demons' }
    ];
    if (includeTravellers) { teamsOrder.push({ key: 'traveller', label: 'Travellers' }); }
    teamsOrder.forEach((team, idx) => {
      const groupRoles = allRoles
        .filter(r => (r.team || '').toLowerCase() === team.key);
      if (!groupRoles.length) return; const orderedRoles = getOrderedRolesForTeam({ teamKey: team.key, roles: groupRoles });
      const header = createElement('div', 'team-header', team.label); playerSetupCharacterList.appendChild(header); const grid = document.createElement('div');
      grid.className = 'team-grid';
      orderedRoles.forEach(role => {
        const isBagDisabled = Array.isArray(role.special) && role.special.some(s => s && s.name === 'bag-disabled'); const isTraveller = role.team === 'traveller';
        if (isBagDisabled && Array.isArray(grimoireState.playerSetup.bag)) {
          const idxInBag = grimoireState.playerSetup.bag.indexOf(role.id); if (idxInBag !== -1) grimoireState.playerSetup.bag.splice(idxInBag, 1);
        }
        const tokenEl = document.createElement('label'); tokenEl.className = 'token role';
        renderTokenElement({
          tokenElement: tokenEl,
          role,
          baseImage: BASE_TOKEN_IMAGE,
          labelIdPrefix: 'setup-role-arc'
        }); tokenEl.style.position = 'relative'; tokenEl.style.overflow = 'visible'; tokenEl.title = role.name; tokenEl.dataset.roleId = role.id;
        tokenEl.dataset.team = (role.team || '').toLowerCase(); const shouldShowSetupWarning = !!(role && role.setup); let setupWarningEl = null;
        if (shouldShowSetupWarning) {
          setupWarningEl = document.createElement('div'); setupWarningEl.className = 'player-setup-warning-icon'; setupWarningEl.setAttribute('role', 'img');
          setupWarningEl.setAttribute('aria-label', 'Setup-modifying character selected'); setupWarningEl.setAttribute('aria-hidden', 'true');
          setupWarningEl.title = 'This character modifies the standard setup'; setupWarningEl.style.display = 'none'; const icon = document.createElement('i');
          icon.className = 'fas fa-triangle-exclamation'; setupWarningEl.appendChild(icon);
        }
        const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; const bagKey = isTraveller ? 'travellerBag' : 'bag';
        const getBag = () => grimoireState.playerSetup[bagKey] || (grimoireState.playerSetup[bagKey] = []);
        const setRoleCount = (count) => {
          const bag = getBag(); bag.splice(0, bag.length, ...bag.filter(id => id !== role.id), ...Array(count).fill(role.id));
        }; checkbox.checked = getBag().includes(role.id) && !isBagDisabled; Object.assign(checkbox.style, { position: 'absolute', top: '6px', left: '6px', zIndex: '2' });
        if (isBagDisabled) { checkbox.disabled = true; checkbox.classList.add('bag-disabled'); tokenEl.classList.add('bag-disabled'); }
        const countInput = document.createElement('input'); countInput.type = 'number'; countInput.className = 'character-count-input'; countInput.min = '1'; countInput.max = '99';
        Object.assign(countInput.style, {
          position: 'absolute', bottom: '4px', right: '4px', width: '28px', height: '20px', textAlign: 'center',
          fontSize: '12px', fontWeight: 'bold', zIndex: '2', borderRadius: '3px', border: '1px solid rgba(255,255,255,0.3)',
          backgroundColor: 'rgba(0,0,0,0.7)', color: '#fff', padding: '0', margin: '0', MozAppearance: 'textfield',
          WebkitAppearance: 'none', appearance: 'none'
        }); const bagCounts = grimoireState.playerSetup.bagCounts || {}; const currentCount = bagCounts[role.id] || 1; countInput.value = currentCount;
        countInput.style.display = (checkbox.checked && !isBagDisabled) ? 'block' : 'none';
        const isRoleCurrentlySelected = () => {
          if (isBagDisabled) return false; const currentBag = isTraveller ? (grimoireState.playerSetup.travellerBag || []) : (grimoireState.playerSetup.bag || []);
          return currentBag.includes(role.id);
        };
        const updateSetupWarningVisibility = () => {
          if (!setupWarningEl) return; const shouldDisplay = isRoleCurrentlySelected(); setupWarningEl.style.display = shouldDisplay ? 'flex' : 'none';
          setupWarningEl.setAttribute('aria-hidden', shouldDisplay ? 'false' : 'true');
        }; updateSetupWarningVisibility();
        const updateCount = withStateSave(() => {
          if (isBagDisabled) return; let newCount = parseInt(countInput.value, 10);
          if (isNaN(newCount) || newCount < 1) { newCount = 1; countInput.value = '1'; }
          if (!grimoireState.playerSetup.bagCounts) grimoireState.playerSetup.bagCounts = {}; grimoireState.playerSetup.bagCounts[role.id] = newCount; setRoleCount(newCount);
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
        countInput.addEventListener('click', (e) => { e.stopPropagation(); });
        const toggle = withStateSave(() => {
          if (isBagDisabled) return; // no-op for disabled roles
          if (checkbox.checked) { setRoleCount(grimoireState.playerSetup.bagCounts?.[role.id] || 1); countInput.style.display = 'block'; } else {
            setRoleCount(0); countInput.style.display = 'none';
            if (!isTraveller) { if (grimoireState.playerSetup.bagCounts) grimoireState.playerSetup.bagCounts[role.id] = 1; countInput.value = '1'; }
          }
          updateSetupWarningVisibility(); updateBagWarning();
        }); checkbox.addEventListener('change', (e) => { e.stopPropagation(); if (isBagDisabled) { e.preventDefault(); return; } toggle(); }); tokenEl.appendChild(checkbox);
        tokenEl.appendChild(countInput); if (setupWarningEl) tokenEl.appendChild(setupWarningEl); grid.appendChild(tokenEl);
      }); playerSetupCharacterList.appendChild(grid);
      if (idx < teamsOrder.length - 1) { const sep = createElement('div', 'team-separator'); playerSetupCharacterList.appendChild(sep); }
    });
  }
  const fillBagWithStandardSetup = withStateSave(() => {
    const totalPlayers = grimoireState.players.length; const travellerCount = travellerCountInPlay(); const effectivePlayers = effectivePlayerCount();
    if (totalPlayers === 0) {
      if (bagCountWarning) {
        bagCountWarning.textContent = 'Error: No players in grimoire. Please add players first.'; bagCountWarning.style.display = 'block'; bagCountWarning.classList.add('error');
        try { bagCountWarning.scrollIntoView({ block: 'nearest' }); } catch (_) { }
      }
      return;
    }
    const row = (grimoireState.playerSetupTable || []).find(r => Number(r.players) === Number(effectivePlayers));
    if (!row) {
      if (bagCountWarning) {
        const travellerSuffix = travellerCount > 0 ? ` after excluding ${travellerCount} traveller${travellerCount === 1 ? '' : 's'}` : ''; bagCountWarning.style.display = 'block';
        bagCountWarning.textContent = `Warning: No standard setup found for ${effectivePlayers} players${travellerSuffix}. Adjust the bag manually.`;
        bagCountWarning.classList.remove('error');
      }
      return;
    }
    const groups = { townsfolk: [], outsiders: [], minions: [], demons: [] };
    Object.values(grimoireState.allRoles || {}).forEach(role => {
      if (role && Array.isArray(role.special) && role.special.some(s => s && s.name === 'bag-disabled')) return; if (role.team === 'townsfolk') groups.townsfolk.push(role.id);
      else if (role.team === 'outsider') groups.outsiders.push(role.id); else if (role.team === 'minion') groups.minions.push(role.id);
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
    ]; grimoireState.playerSetup.bag = bag; grimoireState.playerSetup.assignments = new Array(grimoireState.players.length).fill(null); grimoireState.playerSetup.revealed = false;
    grimoireState.playerSetup.bagCounts = {}; const uniqueRoles = [...new Set(bag)];
    uniqueRoles.forEach(roleId => {
      grimoireState.playerSetup.bagCounts[roleId] = 1;
    }); renderPlayerSetupList(); updateBagWarning();
  });
  const shuffleCharacterOrderWithinTeams = withStateSave(() => {
    const baseRoles = Object.values(grimoireState.baseRoles || {}); const scriptTravellers = Object.values(grimoireState.scriptTravellerRoles || {});
    const extraTravellers = Object.values(grimoireState.extraTravellerRoles || {}); const allRoles = [...baseRoles, ...scriptTravellers, ...extraTravellers];
    const teamsToShuffle = ['townsfolk', 'outsider', 'minion', 'demon', 'traveller']; let didShuffle = false;
    teamsToShuffle.forEach((teamKey) => {
      const roles = allRoles.filter(role => (role.team || '').toLowerCase() === teamKey); if (!roles.length) return;
      const orderedRoles = getOrderedRolesForTeam({ teamKey, roles }); if (orderedRoles.length < 2) return; const ids = orderedRoles.map(role => role.id);
      const shuffled = ids.slice();
      for (let i = shuffled.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]; }
      grimoireState.playerSetup.roleOrder[teamKey] = shuffled; didShuffle = true;
    }); if (!didShuffle) return; renderPlayerSetupList(); updateBagWarning();
  });
  const markSelectionCompleteIfDone = () => {
    try {
      const sel = grimoireState.playerSetup || {}; const assignments = Array.isArray(sel.assignments) ? sel.assignments : [];
      const allAssigned = (grimoireState.players || []).every((p, idx) => {
        const role = p && p.character ? getRoleById({ grimoireState, roleId: p.character }) : null; const isTraveller = role && role.team === 'traveller';
        if (isTraveller) return true; return assignments[idx] !== null && assignments[idx] !== undefined;
      }); if (!allAssigned) return false; sel.selectionActive = false; sel.selectionComplete = true;
      try { document.body.classList.remove('selection-active'); } catch (_) { }
      clearNextPlayerHighlight(); const openSetupBtn = byId('open-player-setup');
      if (openSetupBtn) { openSetupBtn.disabled = true; openSetupBtn.title = 'Setup complete. Reset the grimoire to start a new setup.'; }
      const revealBtn = byId('reveal-selected-characters');
      if (revealBtn) { revealBtn.style.display = sel.revealed ? 'none' : ''; revealBtn.disabled = false; }
      try { if (window.updateButtonStates) window.updateButtonStates(); } catch (_) { }
      return true;
    } catch (_) { return false; }
  };
  const openRevealModalForRole = ({ forIdx, role }) => {
    try {
      if (!playerRevealModal || !role) return; revealCurrentPlayerIndex = forIdx;
      if (revealCharacterTokenEl) {
        revealCharacterTokenEl.innerHTML = ''; const token = document.createElement('div'); token.className = 'token';
        renderTokenElement({
          tokenElement: token,
          role,
          baseImage: BASE_TOKEN_IMAGE,
          labelIdPrefix: 'reveal-token'
        }); token.title = role.name || ''; revealCharacterTokenEl.appendChild(token);
      }
      const nextIdx = findNextUnassignedPlayer(forIdx); const handoffLabel = nextIdx === null ? 'Give to' : 'Hand to';
      const handoffName = nextIdx === null
        ? 'Storyteller'
        : ((grimoireState.players[nextIdx] && grimoireState.players[nextIdx].name) || `Player ${nextIdx + 1}`);
      if (confirmPlayerRevealBtn) confirmPlayerRevealBtn.textContent = 'Close'; if (revealHandoffLabelEl) revealHandoffLabelEl.textContent = handoffLabel;
      if (revealHandoffNameEl) revealHandoffNameEl.textContent = handoffName; playerRevealModal.style.display = 'flex';
    } catch (_) { }
  };
  function openNumberPicker(forPlayerIndex) {
    if (!numberPickerOverlay || !numberPickerGrid) return; const assignments = Array.isArray(grimoireState.playerSetup.assignments) ? grimoireState.playerSetup.assignments : [];
    const existingPlayer = Array.isArray(grimoireState.players) ? grimoireState.players[forPlayerIndex] : null;
    const hasNumberAssignment = assignments[forPlayerIndex] !== null && assignments[forPlayerIndex] !== undefined;
    const hasCharacter = !!(existingPlayer && existingPlayer.character); if (hasNumberAssignment || hasCharacter) return;
    const playerName = (existingPlayer && existingPlayer.name) ? existingPlayer.name : `Player ${forPlayerIndex + 1}`;
    if (selectionPickerTitle) selectionPickerTitle.textContent = playerName;
    if (selectionPickerInstructions) selectionPickerInstructions.textContent = `If you're not ${playerName}, do not tap Reveal.`; numberPickerGrid.innerHTML = '';
    const travellerBag = grimoireState.playerSetup.travellerBag || [];
    if (travellerBag.length > 0) {
      const travellerLabel = document.createElement('div'); travellerLabel.className = 'selection-section-title'; travellerLabel.textContent = 'Or choose a Traveller:';
      const travellerGrid = document.createElement('div'); travellerGrid.className = 'traveller-picker-grid';
      travellerBag.forEach((roleId) => {
        const role = getRoleById({ grimoireState, roleId }); if (!role) return; const tokenEl = document.createElement('div'); tokenEl.className = 'traveller-token token';
        renderTokenElement({
          tokenElement: tokenEl,
          role,
          baseImage: BASE_TOKEN_IMAGE,
          labelIdPrefix: 'picker-traveller'
        }); tokenEl.style.cursor = 'pointer'; tokenEl.style.position = 'relative'; tokenEl.title = role.name; tokenEl.dataset.roleId = roleId;
        tokenEl.dataset.playerIndex = String(forPlayerIndex); travellerGrid.appendChild(tokenEl);
      }); numberPickerGrid.appendChild(travellerLabel); numberPickerGrid.appendChild(travellerGrid);
    }
    const bag = grimoireState.playerSetup.bag || []; const used = new Set((assignments || []).filter(a => a !== null && a !== undefined));
    const remainingBagCount = Math.max(0, bag.length - used.size); const canRevealFromBag = remainingBagCount > 0;
    if (selectionRevealBtn) {
      selectionRevealBtn.dataset.playerIndex = String(forPlayerIndex);
      if (canRevealFromBag) { selectionRevealBtn.disabled = false; selectionRevealBtn.textContent = 'Reveal'; } else {
        selectionRevealBtn.disabled = true; selectionRevealBtn.textContent = travellerBag.length > 0 ? 'Choose a Traveller below' : 'No characters left';
        if (selectionPickerInstructions && travellerBag.length > 0) { selectionPickerInstructions.textContent = `Only ${playerName} should continue. Choose a Traveller below.`; }
      }
    }
    numberPickerOverlay.style.display = 'flex';
    try { numberPickerOverlay.style.position = 'fixed'; numberPickerOverlay.style.inset = '0'; numberPickerOverlay.style.zIndex = '9999'; } catch (_) { }
    if (!isNumberGridHandlerAttached) {
      isNumberGridHandlerAttached = true;
      numberPickerGrid.addEventListener('click', withStateSave((e) => {
        const travellerToken = e.target && e.target.closest && e.target.closest('.traveller-token');
        if (travellerToken) {
          const roleId = travellerToken.dataset.roleId; const forIdxStr = travellerToken.dataset.playerIndex; const forIdx = forIdxStr ? parseInt(forIdxStr, 10) : NaN;
          if (!roleId || !Number.isInteger(forIdx)) return;
          if (grimoireState.players && grimoireState.players[forIdx]) { grimoireState.players[forIdx].character = roleId; rebuildAllRoles({ grimoireState }); }
          const travellerBag = grimoireState.playerSetup.travellerBag || []; const idx = travellerBag.indexOf(roleId);
          if (idx !== -1) { travellerBag.splice(idx, 1); }
          updateGrimoire({ grimoireState }); const li = byId('player-circle')?.children[forIdx]; if (li) renderSelectionOverlay({ li, state: 'traveller' }); highlightNext(forIdx);
          numberPickerOverlay.style.display = 'none'; const role = getRoleById({ grimoireState, roleId }); openRevealModalForRole({ forIdx, role }); markSelectionCompleteIfDone();
        }
      }));
    }
    if (selectionRevealBtn && !isRevealButtonHandlerAttached) {
      isRevealButtonHandlerAttached = true;
      selectionRevealBtn.addEventListener('click', withStateSave(() => {
        const forIdxStr = selectionRevealBtn.dataset.playerIndex; const forIdx = forIdxStr ? parseInt(forIdxStr, 10) : NaN; if (!Number.isInteger(forIdx)) return;
        const assignments = Array.isArray(grimoireState.playerSetup.assignments) ? grimoireState.playerSetup.assignments : [];
        const hasNumberAssignment = assignments[forIdx] !== null && assignments[forIdx] !== undefined;
        const existingPlayer = Array.isArray(grimoireState.players) ? grimoireState.players[forIdx] : null; const hasCharacter = !!(existingPlayer && existingPlayer.character);
        if (hasNumberAssignment || hasCharacter) return; const bag = grimoireState.playerSetup.bag || [];
        const used = new Set((grimoireState.playerSetup.assignments || []).filter(a => a !== null && a !== undefined)); const available = [];
        for (let i = 0; i < bag.length; i++) { if (!used.has(i)) available.push(i); }
        if (available.length === 0) { numberPickerOverlay.style.display = 'none'; markSelectionCompleteIfDone(); return; }
        const bagIndex = available[Math.floor(Math.random() * available.length)]; grimoireState.playerSetup.assignments[forIdx] = bagIndex; const roleId = bag[bagIndex];
        const role = roleId ? getRoleById({ grimoireState, roleId }) : null; const li = byId('player-circle')?.children[forIdx];
        if (li) renderSelectionOverlay({ li, state: 'selected' }); highlightNext(forIdx); numberPickerOverlay.style.display = 'none'; openRevealModalForRole({ forIdx, role });
        markSelectionCompleteIfDone();
      }));
    }
  }
  try { window.openNumberPickerForSelection = (idx) => openNumberPicker(idx); } catch (_) { }
  if (openPlayerSetupBtn && playerSetupPanel) {
    openPlayerSetupBtn.addEventListener('click', () => {
      if (!canOpenModal({ grimoireState, requiresStorytellerMode: true })) return;
      try {
        if (!grimoireState.gameStarted) {
          const [playerCountInput, grimoireHistoryList] = byIds('player-count', 'grimoire-history-list'); resetGrimoire({ grimoireState, grimoireHistoryList, playerCountInput });
        }
      } catch (_) { }
      playerSetupPanel.style.display = 'flex'; renderPlayerSetupList(); updateBagWarning();
      try { playerSetupPanel.scrollIntoView({ block: 'center' }); } catch (_) { }
      try { document.body.classList.add('player-setup-open'); } catch (_) { }
    });
  }
  if (closePlayerSetupBtn && playerSetupPanel) {
    closePlayerSetupBtn.addEventListener('click', () => {
      playerSetupPanel.style.display = 'none';
      try { document.body.classList.remove('player-setup-open'); } catch (_) { }
    });
  }
  if (shuffleCharactersBtn) shuffleCharactersBtn.addEventListener('click', shuffleCharacterOrderWithinTeams);
  if (typeof window !== 'undefined' && window.Cypress) {
    try {
      window.__BOTCPARTY_TEST_API = window.__BOTCPARTY_TEST_API || {};
      window.__BOTCPARTY_TEST_API.fillBagWithStandardSetup = () => { fillBagWithStandardSetup(); };
    } catch (_) { }
  }
  if (includeTravellersCheckbox) {
    includeTravellersCheckbox.addEventListener('change', () => {
      if (!includeTravellersCheckbox.checked) { grimoireState.playerSetup.travellerBag = []; }
      renderPlayerSetupList(); updateBagWarning();
    });
  }
  if (startSelectionBtn) startSelectionBtn.addEventListener('click', withStateSave(() => {
    const totalPlayers = grimoireState.players.length; const travellerCount = travellerCountInPlay(); const effectivePlayers = effectivePlayerCount();
    if (totalPlayers === 0) {
      if (bagCountWarning) {
        bagCountWarning.textContent = 'Error: No players in grimoire. Please add players first.'; bagCountWarning.style.display = 'block'; bagCountWarning.classList.add('error');
        try { bagCountWarning.scrollIntoView({ block: 'nearest' }); } catch (_) { }
      }
      return;
    }
    const selectedCount = (grimoireState.playerSetup && grimoireState.playerSetup.bag) ? grimoireState.playerSetup.bag.length : 0;
    if (selectedCount !== effectivePlayers) {
      if (bagCountWarning) {
        const travellerLabel = travellerCount === 1 ? 'traveller' : 'travellers';
        const travellerSuffix = travellerCount > 0 ? ` (excluding ${travellerCount} ${travellerLabel})` : '';
        bagCountWarning.textContent = `Error: You need exactly ${effectivePlayers} characters in the bag${travellerSuffix} (current count: ${selectedCount})`;
        bagCountWarning.style.display = 'block'; bagCountWarning.classList.add('error');
        try { bagCountWarning.scrollIntoView({ block: 'nearest' }); } catch (_) { }
      }
      return;
    }
    const [playerCountInput, grimoireHistoryList] = byIds('player-count', 'grimoire-history-list');
    resetGrimoire({ grimoireState, grimoireHistoryList, playerCountInput, preserveBag: true });
    if (playerSetupPanel) {
      playerSetupPanel.style.display = 'none';
      try { document.body.classList.remove('player-setup-open'); } catch (_) { }
    }
    if (window.grimoireState) window.grimoireState.gameStarted = false; collapseSidebar?.(true); if (!grimoireState.playerSetup) grimoireState.playerSetup = {};
    grimoireState.playerSetup._reopenOnPickerClose = false; grimoireState.playerSetup.selectionActive = true; grimoireState.playerSetup.selectionComplete = false;
    try {
      const list = grimoireState.playerSetup.bag || [];
      for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; }
    } catch (_) { }
    try { document.body.classList.add('selection-active'); } catch (_) { }
    if (!grimoireState.playerSetup) grimoireState.playerSetup = { bag: [], assignments: [], revealed: false };
    grimoireState.playerSetup.assignments = new Array(grimoireState.players.length).fill(null); grimoireState.playerSetup.revealed = false;
    grimoireState.playerSetup.selectionComplete = false; updateBagWarning(); const playerCircle = byId('player-circle');
    if (playerCircle) {
      Array.from(playerCircle.children).forEach((li, idx) => {
        const player = grimoireState.players[idx]; const assignments = grimoireState.playerSetup.assignments || [];
        const state = selectionState({ grimoireState, assignments, player, index: idx }); renderSelectionOverlay({ li, state, onPick: () => openNumberPicker(idx) });
      });
    }
    highlightNext(-1); const firstIdx = findNextUnassignedPlayer(-1);
    if (firstIdx !== null) { openNumberPicker(firstIdx); }
  }));
  if (closeNumberPickerBtn && numberPickerOverlay) closeNumberPickerBtn.addEventListener('click', () => { numberPickerOverlay.style.display = 'none'; maybeReopenPanel(); });
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
  const closePlayerRevealAndAdvance = withStateSave(() => {
    if (!playerRevealModal) return; playerRevealModal.style.display = 'none'; revealCurrentPlayerIndex = null; markSelectionCompleteIfDone();
  });
  const confirmPlayerRevealAndAdvance = withStateSave(() => {
    if (!playerRevealModal) return; const currentIdx = revealCurrentPlayerIndex; const nextIdx = Number.isInteger(currentIdx) ? findNextUnassignedPlayer(currentIdx) : null;
    playerRevealModal.style.display = 'none'; revealCurrentPlayerIndex = null; markSelectionCompleteIfDone();
    if (nextIdx !== null) { openNumberPicker(nextIdx); }
  }); if (closePlayerRevealModalBtn) closePlayerRevealModalBtn.addEventListener('click', closePlayerRevealAndAdvance);
  if (confirmPlayerRevealBtn) confirmPlayerRevealBtn.addEventListener('click', confirmPlayerRevealAndAdvance);
}
const BASE_TOKEN_IMAGE = resolveAssetPath('./assets/img/token.png');
