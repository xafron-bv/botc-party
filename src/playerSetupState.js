import { getRoleById } from '../utils.js';

export function initializePlayerSetupState(grimoireState) {
  grimoireState.playerSetup ||= { bag: [], assignments: [], revealed: false };
  grimoireState.playerSetup.travellerBag ||= [];
  grimoireState.playerSetup.bagCounts ||= {};
  grimoireState.playerSetup.roleOrder ||= {};
}

export function countTravellersInPlay(grimoireState) {
  return (grimoireState.players || []).filter((player) => {
    const role = getRoleById({ grimoireState, roleId: player?.character });
    return role?.team === 'traveller';
  }).length;
}

export function countTravellersInBag(grimoireState) {
  return grimoireState.playerSetup.travellerBag?.length || 0;
}

export function getEffectivePlayerCount(grimoireState) {
  return Math.max(
    0,
    (grimoireState.players?.length || 0) -
      countTravellersInPlay(grimoireState) -
      countTravellersInBag(grimoireState)
  );
}

export function summarizePlayerSetupBag(grimoireState) {
  const travellersInPlay = countTravellersInPlay(grimoireState);
  const travellersInBag = countTravellersInBag(grimoireState);
  const effectivePlayers = getEffectivePlayerCount(grimoireState);
  const bag = grimoireState.playerSetup.bag || [];
  const row = (grimoireState.playerSetupTable || []).find(
    (candidate) => Number(candidate.players) === Number(effectivePlayers)
  );
  const teams = { townsfolk: 0, outsiders: 0, minions: 0, demons: 0 };
  bag.forEach((roleId) => {
    const team = getRoleById({ grimoireState, roleId })?.team;
    if (team === 'townsfolk') teams.townsfolk++;
    else if (team === 'outsider') teams.outsiders++;
    else if (team === 'minion') teams.minions++;
    else if (team === 'demon') teams.demons++;
  });
  const teamMismatch = row
    ? teams.townsfolk !== row.townsfolk ||
      teams.outsiders !== row.outsiders ||
      teams.minions !== row.minions ||
      teams.demons !== row.demons
    : false;
  return {
    bag,
    countMismatch: bag.length !== effectivePlayers,
    effectivePlayers,
    row,
    teamMismatch,
    teams,
    totalTravellers: travellersInPlay + travellersInBag,
    travellersInBag,
    travellersInPlay
  };
}
