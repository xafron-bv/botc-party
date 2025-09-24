import { saveAppState } from './app.js';
import { setGrimoireHidden, resetGrimoire } from './grimoire.js';
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
  const revealCharacterTokenEl = document.getElementById('reveal-character-token');
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
        checkbox.checked = (grimoireState.playerSetup.bag || []).includes(role.id) && !isBagDisabled;
        checkbox.style.position = 'absolute';
        checkbox.style.top = '6px';
        checkbox.style.left = '6px';
        checkbox.style.zIndex = '2';
        if (isBagDisabled) {
          checkbox.disabled = true;
          checkbox.classList.add('bag-disabled');
          tokenEl.classList.add('bag-disabled');
        }
        const toggle = () => {
          if (isBagDisabled) return; // no-op for disabled roles
          const list = grimoireState.playerSetup.bag || (grimoireState.playerSetup.bag = []);
          const i = list.indexOf(role.id);
          if (checkbox.checked && i === -1) list.push(role.id);
          if (!checkbox.checked && i !== -1) list.splice(i, 1);
          updateBagWarning();
          saveAppState({ grimoireState });
        };
        checkbox.addEventListener('click', (e) => { e.stopPropagation(); if (isBagDisabled) e.preventDefault(); });
        checkbox.addEventListener('change', (e) => { e.stopPropagation(); if (isBagDisabled) { e.preventDefault(); return; } toggle(); });
        tokenEl.addEventListener('click', () => { if (isBagDisabled) return; checkbox.checked = !checkbox.checked; toggle(); });
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
    if (totalPlayers === 0) {
      if (bagCountWarning) {
        bagCountWarning.textContent = 'Error: No players in grimoire. Please add players first.';
        bagCountWarning.style.display = 'block';
        bagCountWarning.classList.add('error');
        try { bagCountWarning.scrollIntoView({ block: 'nearest' }); } catch (_) { }
      }
      return;
    }
    const row = (grimoireState.playerSetupTable || []).find(r => Number(r.players) === Number(totalPlayers));
    if (!row) return;
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
    renderPlayerSetupList();
    updateBagWarning();
    saveAppState({ grimoireState });
  }

  function openNumberPicker(forPlayerIndex) {
    if (!numberPickerOverlay || !numberPickerGrid) return;
    numberPickerGrid.innerHTML = '';
    const n = grimoireState.players.length;
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
          const role = grimoireState.allRoles && roleId ? grimoireState.allRoles[roleId] : null;
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

  // No name-click handler needed; overlays handle clicks

  // no-op placeholder removed; assignments applied during reveal elsewhere

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
  if (startSelectionBtn) startSelectionBtn.addEventListener('click', () => {
    // Prevent starting selection if no players exist
    const totalPlayers = grimoireState.players.length;
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
    try { if (window.updatePreGameOverlayMessage) window.updatePreGameOverlayMessage(); } catch (_) { }
  });
  if (closeNumberPickerBtn && numberPickerOverlay) closeNumberPickerBtn.addEventListener('click', () => { numberPickerOverlay.style.display = 'none'; maybeReopenPanel(); try { if (window.updatePreGameOverlayMessage) window.updatePreGameOverlayMessage(); } catch (_) { } });
  // Player Setup no longer directly reveals; sidebar toggle now handles hide/show.

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
    // Hide grimoire for privacy during selection
    try { setGrimoireHidden({ grimoireState, hidden: true }); } catch (_) { }
    const assignments = Array.isArray(ps.assignments) ? ps.assignments : [];
    const playerCircle = document.getElementById('player-circle');
    if (!playerCircle) return;
    Array.from(playerCircle.children).forEach((li, idx) => {
      let overlay = li.querySelector('.number-overlay');
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'number-overlay';
        li.appendChild(overlay);
      }
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
    });
  } catch (_) { /* swallow restoration errors */ }
}


