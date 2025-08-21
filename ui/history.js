export function renderScriptHistory({ scriptHistoryList, history }) {
  if (!scriptHistoryList) return;
  scriptHistoryList.innerHTML = '';
  history.scriptHistory.forEach(entry => {
    const li = document.createElement('li');
    li.dataset.id = entry.id;
    li.className = 'history-item';
    const nameSpan = document.createElement('span');
    nameSpan.className = 'history-name';
    nameSpan.textContent = entry.name || '(unnamed script)';
    // Inline edit input (hidden by default)
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'history-edit-input';
    nameInput.value = entry.name || '';
    nameInput.style.display = 'none';
    // Icons
    const renameBtn = document.createElement('button');
    renameBtn.className = 'icon-btn rename';
    renameBtn.title = 'Rename';
    renameBtn.innerHTML = '<i class="fa-solid fa-pen"></i>';
    const saveBtn = document.createElement('button');
    saveBtn.className = 'icon-btn save';
    saveBtn.title = 'Save';
    saveBtn.style.display = 'none';
    saveBtn.innerHTML = '<i class="fa-solid fa-check"></i>';
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'icon-btn delete';
    deleteBtn.title = 'Delete';
    deleteBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
    li.appendChild(nameSpan);
    li.appendChild(nameInput);
    li.appendChild(renameBtn);
    li.appendChild(saveBtn);
    li.appendChild(deleteBtn);
    scriptHistoryList.appendChild(li);
  });
}

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
