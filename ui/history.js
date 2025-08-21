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

export function renderGrimoireHistory({ grimoireHistoryList, history }) {
  if (!grimoireHistoryList) return;
  grimoireHistoryList.innerHTML = '';
  history.grimoireHistory.forEach(entry => {
    const li = document.createElement('li');
    li.dataset.id = entry.id;
    li.className = 'history-item';
    const nameSpan = document.createElement('span');
    nameSpan.className = 'history-name';
    nameSpan.textContent = entry.name || formatDateName(new Date(entry.createdAt || Date.now()));
    // Inline edit input (hidden by default)
    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.className = 'history-edit-input';
    nameInput.value = entry.name || formatDateName(new Date(entry.createdAt || Date.now()));
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
    grimoireHistoryList.appendChild(li);
  });
}

export async function handleScriptHistoryClick({ e, history, scriptHistoryList, processScriptData, displayScript, saveAppState, renderSetupInfo }) {
  const li = e.target.closest('li');
  if (!li) return;
  const id = li.dataset.id;
  const entry = history.scriptHistory.find(x => x.id === id);
  if (!entry) return;
  const clickedDelete = e.target.closest('.icon-btn.delete');
  const clickedRename = e.target.closest('.icon-btn.rename');
  const clickedSave = e.target.closest('.icon-btn.save');
  const clickedInput = e.target.closest('.history-edit-input');
  if (clickedDelete) {
    if (confirm('Delete this script from history?')) {
      history.scriptHistory = history.scriptHistory.filter(x => x.id !== id);
      saveHistories(history);
      renderScriptHistory({ scriptHistoryList, history });
    }
    return;
  }
  if (clickedRename) {
    const nameSpan = li.querySelector('.history-name');
    const input = li.querySelector('.history-edit-input');
    const renameBtn = li.querySelector('.icon-btn.rename');
    const saveBtn = li.querySelector('.icon-btn.save');
    nameSpan.style.display = 'none';
    input.style.display = 'inline-block';
    renameBtn.style.display = 'none';
    saveBtn.style.display = 'inline-block';
    li.classList.add('editing');
    input.focus();
    input.setSelectionRange(0, input.value.length);
    return;
  }
  if (clickedSave) {
    const input = li.querySelector('.history-edit-input');
    const newName = (input.value || '').trim();
    if (newName) {
      entry.name = newName;
      entry.updatedAt = Date.now();
      saveHistories(history);
      renderScriptHistory({ scriptHistoryList, history });
    }
    li.classList.remove('editing');
    return;
  }
  if (clickedInput) return; // don't load when clicking into input
  if (li.classList.contains('editing')) return; // avoid loading while editing
  // Default: clicking the item or name loads the script
  try {
    await processScriptData(entry.data, false);
    scriptMetaName = entry.name || scriptMetaName || '';
    displayScript(scriptData);
    saveAppState();
    renderSetupInfo();
  } catch (err) { console.error(err); }
}

export function handleScriptHistoryOnDown({ e }) {
  const li = e.target.closest('li.history-item');
  if (!li) return;
  if (e.target.closest('.icon-btn') || e.target.closest('.history-edit-input')) return;
  li.classList.add('pressed');
}

export function handleScriptHistoryOnClear() {
  document.querySelectorAll('#script-history-list li.pressed').forEach(el => el.classList.remove('pressed'));
}

export function handleScriptHistoryOnKeyDown({ e, history, scriptHistoryList }) {
  if (!e.target.classList.contains('history-edit-input')) return;
  const li = e.target.closest('li');
  const id = li && li.dataset.id;
  const entry = history.scriptHistory.find(x => x.id === id);
  if (!entry) return;
  if (e.key === 'Enter') {
    const newName = (e.target.value || '').trim();
    if (newName) {
      entry.name = newName;
      entry.updatedAt = Date.now();
      saveHistories(history);
      renderScriptHistory({ scriptHistoryList, history });
    }
  }
}

export function addScriptHistoryListListeners({ scriptHistoryList, history, processScriptData, displayScript, saveAppState, renderSetupInfo }) {
  scriptHistoryList.addEventListener('click', (e) => handleScriptHistoryClick({ e, history, scriptHistoryList, processScriptData, displayScript, saveAppState, renderSetupInfo }));
  scriptHistoryList.addEventListener('pointerdown', (e) => handleScriptHistoryOnDown({ e }));
  scriptHistoryList.addEventListener('pointerup', () => handleScriptHistoryOnClear());
  scriptHistoryList.addEventListener('pointercancel', () => handleScriptHistoryOnClear());
  scriptHistoryList.addEventListener('pointerleave', () => handleScriptHistoryOnClear());
  scriptHistoryList.addEventListener('keydown', (e) => handleScriptHistoryOnKeyDown({ e, history, scriptHistoryList }));
}