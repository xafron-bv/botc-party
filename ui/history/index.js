export const history = {
  scriptHistory: [],
  grimoireHistory: []
};

export function saveHistories() {
  try { localStorage.setItem('botcScriptHistoryV1', JSON.stringify(history.scriptHistory)); } catch (_) { }
  try { localStorage.setItem('botcGrimoireHistoryV1', JSON.stringify(history.grimoireHistory)); } catch (_) { }
}

export function loadHistories() {
  try {
    const sRaw = localStorage.getItem('botcScriptHistoryV1');
    if (sRaw) history.scriptHistory = JSON.parse(sRaw) || [];
  } catch (_) { history.scriptHistory = []; }
  try {
    const gRaw = localStorage.getItem('botcGrimoireHistoryV1');
    if (gRaw) history.grimoireHistory = JSON.parse(gRaw) || [];
  } catch (_) { history.grimoireHistory = []; }
}
