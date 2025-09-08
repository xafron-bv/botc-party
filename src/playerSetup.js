import { saveAppState } from './app.js';
import { resetGrimoire, setGrimoireHidden } from './grimoire.js';
import { createCurvedLabelSvg } from './ui/svg.js';

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
  const revealCharacterNameEl = document.getElementById('reveal-character-name');
  const revealAbilityEl = document.getElementById('reveal-ability');
  const revealNameInput = document.getElementById('reveal-name-input');
  const revealConfirmBtn = document.getElementById('reveal-confirm-btn');
  let revealCurrentPlayerIndex = null;
  let isNumberGridHandlerAttached = false;

  if (!grimoireState.playerSetup) {
    grimoireState.playerSetup = { bag: [], assignments: [], revealed: false };
  }

  function maybeReopenPanel() {
    if (!playerSetupPanel) return;
    if (grimoireState.playerSetup && grimoireState.playerSetup._reopenOnPickerClose) {
      playerSetupPanel.style.display = 'flex';
      try { playerSetupPanel.scrollIntoView({ block: 'center' }); } catch (_) { }
      grimoireState.playerSetup._reopenOnPickerClose = false;
    }
  }

  function updateBagWarning() {
    if (!bagCountWarning) return;
    const totalPlayers = grimoireState.players.length;
    const row = (grimoireState.playerSetupTable || []).find(r => Number(r.players) === Number(totalPlayers));
    if (!row) { bagCountWarning.style.display = 'none'; return; }
    const teams = { townsfolk: 0, outsiders: 0, minions: 0, demons: 0 };
    (grimoireState.playerSetup.bag || []).forEach(roleId => {
      const role = grimoireState.allRoles[roleId];
      if (!role) return;
      if (role.team === 'townsfolk') teams.townsfolk++;
      else if (role.team === 'outsider') teams.outsiders++;
      else if (role.team === 'minion') teams.minions++;
      else if (role.team === 'demon') teams.demons++;
    });
    const mismatch = (teams.townsfolk !== row.townsfolk) || (teams.outsiders !== row.outsiders) || (teams.minions !== row.minions) || (teams.demons !== row.demons);
    const countMismatch = (grimoireState.playerSetup.bag || []).length !== totalPlayers;
    if (countMismatch) {
      bagCountWarning.style.display = 'block';
      bagCountWarning.textContent = `Error: You need exactly ${totalPlayers} characters in the bag (current count: ${grimoireState.playerSetup.bag.length})`;
      bagCountWarning.classList.add('error');
    } else if (mismatch) {
      bagCountWarning.style.display = 'block';
      bagCountWarning.textContent = `Warning: Expected Townsfolk ${row.townsfolk}, Outsiders ${row.outsiders}, Minions ${row.minions}, Demons ${row.demons} for ${totalPlayers} players.`;
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
    const allRoles = Object.values(grimoireState.allRoles || {});
    if (!allRoles.length) {
      const msg = document.createElement('div');
      msg.style.padding = '12px';
      msg.style.textAlign = 'center';
      msg.style.opacity = '0.85';
      msg.textContent = 'Choose a script first';
      playerSetupCharacterList.appendChild(msg);
      return;
    }
    const teamsOrder = [
      { key: 'townsfolk', label: 'Townsfolk' },
      { key: 'outsider', label: 'Outsiders' },
      { key: 'minion', label: 'Minions' },
      { key: 'demon', label: 'Demons' }
    ];
    teamsOrder.forEach((team, idx) => {
      const groupRoles = allRoles.filter(r => (r.team || '').toLowerCase() === team.key);
      if (!groupRoles.length) return;
      const header = document.createElement('div');
      header.className = 'team-header';
      header.textContent = team.label;
      playerSetupCharacterList.appendChild(header);
      const grid = document.createElement('div');
      grid.className = 'team-grid';
      groupRoles.forEach(role => {
        const tokenEl = document.createElement('div');
        tokenEl.className = 'token role';
        tokenEl.style.backgroundImage = `url('${role.image}'), url('./assets/img/token-BqDQdWeO.webp')`;
        tokenEl.style.backgroundSize = '68% 68%, cover';
        tokenEl.style.position = 'relative';
        tokenEl.style.overflow = 'visible';
        tokenEl.title = role.name;
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = (grimoireState.playerSetup.bag || []).includes(role.id);
        checkbox.style.position = 'absolute';
        checkbox.style.top = '6px';
        checkbox.style.left = '6px';
        checkbox.style.zIndex = '2';
        const toggle = () => {
          const list = grimoireState.playerSetup.bag || (grimoireState.playerSetup.bag = []);
          const i = list.indexOf(role.id);
          if (checkbox.checked && i === -1) list.push(role.id);
          if (!checkbox.checked && i !== -1) list.splice(i, 1);
          updateBagWarning();
          saveAppState({ grimoireState });
        };
        checkbox.addEventListener('click', (e) => { e.stopPropagation(); });
        checkbox.addEventListener('change', (e) => { e.stopPropagation(); toggle(); });
        tokenEl.addEventListener('click', () => { checkbox.checked = !checkbox.checked; toggle(); });
        const svg = createCurvedLabelSvg(`setup-role-arc-${role.id}`, role.name);
        tokenEl.appendChild(svg);
        tokenEl.appendChild(checkbox);
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
    const row = (grimoireState.playerSetupTable || []).find(r => Number(r.players) === Number(totalPlayers));
    if (!row) return;
    const groups = { townsfolk: [], outsiders: [], minions: [], demons: [] };
    Object.values(grimoireState.allRoles || {}).forEach(role => {
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
    renderPlayerSetupList();
    updateBagWarning();
    saveAppState({ grimoireState });
  }

  function openNumberPicker(forPlayerIndex) {
    if (!numberPickerOverlay || !numberPickerGrid) return;
    numberPickerGrid.innerHTML = '';
    const n = grimoireState.players.length;
    for (let i = 1; i <= n; i++) {
      const btn = document.createElement('button');
      btn.className = 'button number';
      btn.textContent = String(i);
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
          overlay.textContent = String(bagIndex + 1);
          overlay.classList.add('disabled');
          overlay.onclick = null;
        }

        // Close picker, open reveal
        numberPickerOverlay.style.display = 'none';
        try {
          const bag = grimoireState.playerSetup.bag || [];
          const roleId = bag[bagIndex];
          const role = grimoireState.allRoles && roleId ? grimoireState.allRoles[roleId] : null;
          if (playerRevealModal && role) {
            revealCurrentPlayerIndex = forIdx;
            if (revealCharacterNameEl) revealCharacterNameEl.textContent = role.name || '';
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

  // No name-click handler needed; overlays handle clicks

  // no-op placeholder removed; assignments applied during reveal elsewhere

  if (openPlayerSetupBtn && playerSetupPanel) {
    openPlayerSetupBtn.addEventListener('click', () => {
      if (grimoireState.mode === 'player') return;
      playerSetupPanel.style.display = 'flex';
      renderPlayerSetupList();
      updateBagWarning();
      try { playerSetupPanel.scrollIntoView({ block: 'center' }); } catch (_) { }
    });
  }
  if (closePlayerSetupBtn && playerSetupPanel) {
    closePlayerSetupBtn.addEventListener('click', () => { playerSetupPanel.style.display = 'none'; });
  }
  if (bagRandomFillBtn) bagRandomFillBtn.addEventListener('click', randomFillBag);
  if (startSelectionBtn) startSelectionBtn.addEventListener('click', () => {
    // Prevent starting selection unless bag size matches number of players
    const totalPlayers = grimoireState.players.length;
    const selectedCount = (grimoireState.playerSetup && grimoireState.playerSetup.bag) ? grimoireState.playerSetup.bag.length : 0;
    if (selectedCount !== totalPlayers) {
      if (bagCountWarning) {
        bagCountWarning.textContent = `Error: You need exactly ${totalPlayers} characters in the bag (current count: ${selectedCount})`;
        bagCountWarning.style.display = 'block';
        bagCountWarning.classList.add('error');
        try { bagCountWarning.scrollIntoView({ block: 'nearest' }); } catch (_) { }
      }
      return;
    }
    // Reset grimoire before starting number selection (direct function call)
    const playerCountInput = document.getElementById('player-count');
    const grimoireHistoryList = document.getElementById('grimoire-history-list');
    resetGrimoire({ grimoireState, grimoireHistoryList, playerCountInput });
    if (playerSetupPanel) playerSetupPanel.style.display = 'none';
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
    // Always reset previously selected numbers
    grimoireState.playerSetup.assignments = new Array(grimoireState.players.length).fill(null);
    grimoireState.playerSetup.revealed = false;
    saveAppState({ grimoireState });
    // Hide the grimoire during selection via central state
    setGrimoireHidden({ grimoireState, hidden: true });
    // Render half-opaque overlays on each token for selection
    const playerCircle = document.getElementById('player-circle');
    if (playerCircle) {
      Array.from(playerCircle.children).forEach((li, idx) => {
        let overlay = li.querySelector('.number-overlay');
        if (!overlay) {
          overlay = document.createElement('div');
          overlay.className = 'number-overlay';
          li.appendChild(overlay);
        }
        const assigned = Array.isArray(grimoireState.playerSetup.assignments) && grimoireState.playerSetup.assignments[idx] !== null && grimoireState.playerSetup.assignments[idx] !== undefined;
        if (!assigned) {
          overlay.textContent = '?';
          overlay.classList.remove('disabled');
          overlay.onclick = () => openNumberPicker(idx);
        } else {
          overlay.classList.add('disabled');
          overlay.onclick = null;
        }
      });
    }
  });
  if (closeNumberPickerBtn && numberPickerOverlay) closeNumberPickerBtn.addEventListener('click', () => { numberPickerOverlay.style.display = 'none'; maybeReopenPanel(); });
  // Player Setup no longer directly reveals; sidebar toggle now handles hide/show.

  // Close by clicking outside modal content to match other modals
  if (playerSetupPanel) {
    playerSetupPanel.addEventListener('click', (e) => {
      if (e.target === playerSetupPanel) { playerSetupPanel.style.display = 'none'; return; }
      const content = playerSetupPanel.querySelector('.modal-content');
      if (content && !content.contains(e.target)) { playerSetupPanel.style.display = 'none'; }
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


