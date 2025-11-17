import { getRoleById } from '../grimoire.js';

export function countTravelers({ grimoireState }) {
  let travelerCount = 0;
  grimoireState.players.forEach(player => {
    if (player.character) {
      const role = getRoleById({ grimoireState, roleId: player.character });
      if (role && role.team === 'traveller') {
        travelerCount++;
      }
    }
  });
  return travelerCount;
}

export function lookupCountsForPlayers({ grimoireState, count }) {
  if (!Array.isArray(grimoireState.playerSetupTable)) return null;
  const row = grimoireState.playerSetupTable.find(r => Number(r.players) === Number(count));
  return row || null;
}
export async function loadPlayerSetupTable({ grimoireState }) {
  try {
    const res = await fetch('./player-setup.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    grimoireState.playerSetupTable = Array.isArray(data.player_setup) ? data.player_setup : [];
    renderSetupInfo({ grimoireState });
  } catch (e) {
    console.error('Failed to load player-setup.json', e);
  }
}
export function renderSetupInfo({ grimoireState }) {
  const setupInfoEl = document.getElementById('setup-info');
  if (!setupInfoEl) return;
  const totalPlayers = grimoireState.players.length;
  const travellersInPlay = countTravelers({ grimoireState });
  const playerSetupState = grimoireState.playerSetup || {};
  const travellersAwaitingSelection = playerSetupState.selectionActive
    ? Array.isArray(playerSetupState.travellerBag) ? playerSetupState.travellerBag.length : 0
    : 0;
  const travelerCount = travellersInPlay + travellersAwaitingSelection;
  const adjustedCount = totalPlayers - travelerCount;
  const row = lookupCountsForPlayers({ grimoireState, count: adjustedCount });
  // Prefer parsed meta name; otherwise keep any existing hint
  let scriptName = grimoireState.scriptMetaName || '';
  if (!scriptName && Array.isArray(grimoireState.scriptData)) {
    const meta = grimoireState.scriptData.find(x => x && typeof x === 'object' && x.id === '_meta');
    if (meta && meta.name) scriptName = String(meta.name);
  }
  if (!scriptName) {
    setupInfoEl.textContent = 'Select a script from the sidebar to get started.';
    return;
  }

  // Build display with script name on first line, counts on second line
  let displayHtml = '';
  if (scriptName) {
    displayHtml = `<div>${scriptName}</div>`;
  }

  // Build second line with player counts
  const countsLine = [];

  // Only show alive count if we have a valid role distribution
  if (totalPlayers > 0 && row) {
    const alivePlayers = grimoireState.players.filter(player => !player.dead).length;
    countsLine.push(`${alivePlayers}/${totalPlayers}`);
  }

  if (row) {
    // Add colored role counts
    const roleCountsHtml = [
      `<span class="townsfolk-count">${row.townsfolk}</span>`,
      `<span class="outsider-count">${row.outsiders}</span>`,
      `<span class="minion-count">${row.minions}</span>`,
      `<span class="demon-count">${row.demons}</span>`
    ];

    // Add traveller count if there are any travellers
    if (travelerCount > 0) {
      roleCountsHtml.push(`<span class="traveller-count">${travelerCount}</span>`);
    }

    countsLine.push(roleCountsHtml.join('/'));
  }

  if (countsLine.length > 0) {
    displayHtml += `<div>${countsLine.join('  ')}</div>`;
  }

  setupInfoEl.innerHTML = displayHtml;
  if (grimoireState.winner) {
    const msg = document.createElement('div');
    msg.id = 'winner-message';
    msg.style.marginTop = '8px';
    msg.style.fontWeight = 'bold';
    msg.style.color = grimoireState.winner === 'good' ? '#6bff8a' : '#ff6b6b';
    msg.textContent = `${grimoireState.winner === 'good' ? 'Good' : 'Evil'} has won`;
    setupInfoEl.appendChild(msg);
  }
}
