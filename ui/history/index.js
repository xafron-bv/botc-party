
export function saveHistories({ scriptHistory, grimoireHistory }) {
  try { localStorage.setItem('botcScriptHistoryV1', JSON.stringify(scriptHistory)); } catch (_) { }
  try { localStorage.setItem('botcGrimoireHistoryV1', JSON.stringify(grimoireHistory)); } catch (_) { }
}

export function loadHistories(history) {
  try {
    const sRaw = localStorage.getItem('botcScriptHistoryV1');
    if (sRaw) history.scriptHistory = JSON.parse(sRaw) || [];
  } catch (_) { history.scriptHistory = []; }
  try {
    const gRaw = localStorage.getItem('botcGrimoireHistoryV1');
    if (gRaw) history.grimoireHistory = JSON.parse(gRaw) || [];
  } catch (_) { history.grimoireHistory = []; }
}
