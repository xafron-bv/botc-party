import { saveAppState } from './app.js';
import { updateGrimoire } from './grimoire.js';
import { createCurvedLabelSvg } from './ui/svg.js';

export function initPlayerSetup({ grimoireState }) {
  const openPlayerSetupBtn = document.getElementById('open-player-setup');
  const playerSetupPanel = document.getElementById('player-setup-panel');
  const closePlayerSetupBtn = document.getElementById('close-player-setup');
  const bagRandomFillBtn = document.getElementById('bag-random-fill');
  const playerSetupCharacterList = document.getElementById('player-setup-character-list');
  const bagCountWarning = document.getElementById('bag-count-warning');
  const startSelectionBtn = playerSetupPanel && playerSetupPanel.querySelector('.start-selection');
  const numberPickerOverlay = document.getElementById('number-picker-overlay');
  const numberPickerGrid = document.getElementById('number-picker-grid');
  const closeNumberPickerBtn = document.getElementById('close-number-picker');

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
    bagCountWarning.style.display = mismatch ? 'block' : 'none';
  }

  function renderPlayerSetupList() {
    if (!playerSetupCharacterList) return;
    playerSetupCharacterList.innerHTML = '';
    try {
      playerSetupCharacterList.style.display = 'grid';
      playerSetupCharacterList.style.gridTemplateColumns = 'repeat(auto-fill, minmax(90px, 1fr))';
      playerSetupCharacterList.style.gap = '10px';
    } catch (_) { }
    const roles = Object.values(grimoireState.allRoles || {});
    roles.forEach(role => {
      const tokenEl = document.createElement('div');
      tokenEl.className = 'token role';
      tokenEl.style.backgroundImage = `url('${role.image}'), url('./assets/img/token-BqDQdWeO.webp')`;
      tokenEl.style.backgroundSize = '68% 68%, cover';
      tokenEl.style.position = 'relative';
      tokenEl.style.overflow = 'visible';
      tokenEl.title = role.name;

      // Checkbox overlay
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = (grimoireState.playerSetup.bag || []).includes(role.id);
      checkbox.style.position = 'absolute';
      checkbox.style.top = '6px';
      checkbox.style.left = '6px';
      checkbox.style.zIndex = '2';

      const toggle = () => {
        const list = grimoireState.playerSetup.bag || (grimoireState.playerSetup.bag = []);
        const idx = list.indexOf(role.id);
        if (checkbox.checked && idx === -1) list.push(role.id);
        if (!checkbox.checked && idx !== -1) list.splice(idx, 1);
        updateBagWarning();
        saveAppState({ grimoireState });
      };

      checkbox.addEventListener('change', (e) => {
        e.stopPropagation();
        toggle();
      });

      tokenEl.addEventListener('click', () => {
        checkbox.checked = !checkbox.checked;
        toggle();
      });

      const svg = createCurvedLabelSvg(`setup-role-arc-${role.id}`, role.name);
      tokenEl.appendChild(svg);
      tokenEl.appendChild(checkbox);
      playerSetupCharacterList.appendChild(tokenEl);
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
      btn.addEventListener('click', () => {
        if (btn.disabled) return;
        if (bagIndex >= 0 && bagIndex < (grimoireState.playerSetup.bag || []).length) {
          grimoireState.playerSetup.assignments[forPlayerIndex] = bagIndex;
          saveAppState({ grimoireState });
        }
        // Mark this number as used before closing overlay
        btn.classList.add('disabled');
        btn.disabled = true;
        numberPickerOverlay.style.display = 'none';
        maybeReopenPanel();
      });
      numberPickerGrid.appendChild(btn);
    }
    numberPickerOverlay.style.display = 'flex';
    // Ensure overlay visually covers the app
    try { numberPickerOverlay.style.position = 'fixed'; numberPickerOverlay.style.inset = '0'; numberPickerOverlay.style.zIndex = '9999'; } catch (_) { }
  }

  function installSelectionHandler() {
    const playerCircle = document.getElementById('player-circle');
    if (!playerCircle) return;
    const handler = (e) => {
      const li = e.target.closest && e.target.closest('li');
      if (!li) return;
      e.stopPropagation();
      e.preventDefault();
      const index = Array.from(playerCircle.children).indexOf(li);
      openNumberPicker(index);
      playerCircle.removeEventListener('click', handler, true);
    };
    playerCircle.addEventListener('click', handler, true);
  }

  function revealAssignments() {
    grimoireState.playerSetup.revealed = true;
    (grimoireState.playerSetup.assignments || []).forEach((bagIdx, playerIdx) => {
      if (bagIdx !== null && bagIdx !== undefined) {
        const roleId = (grimoireState.playerSetup.bag || [])[bagIdx];
        if (roleId) {
          grimoireState.players[playerIdx].character = roleId;
        }
      }
    });
    updateGrimoire({ grimoireState });
    saveAppState({ grimoireState });
  }

  if (openPlayerSetupBtn && playerSetupPanel) {
    openPlayerSetupBtn.addEventListener('click', () => {
      if (grimoireState.mode === 'player') return;
      // Make modal overlay fully cover UI and ensure visibility
      try { playerSetupPanel.style.position = 'fixed'; playerSetupPanel.style.inset = '0'; playerSetupPanel.style.zIndex = '9998'; } catch (_) { }
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
    if (playerSetupPanel) playerSetupPanel.style.display = 'none';
    if (!grimoireState.playerSetup) grimoireState.playerSetup = {};
    grimoireState.playerSetup._reopenOnPickerClose = true;
    installSelectionHandler();
  });
  if (closeNumberPickerBtn && numberPickerOverlay) closeNumberPickerBtn.addEventListener('click', () => { numberPickerOverlay.style.display = 'none'; maybeReopenPanel(); });
  const revealBtn = document.getElementById('reveal-assignments');
  if (revealBtn) revealBtn.addEventListener('click', revealAssignments);
}


