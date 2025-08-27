import { saveHistories, history } from './index.js';
import { generateId } from '../../utils.js';
import { renderSetupInfo } from '../grimoire.js';
import { saveAppState } from '../app.js';
import { displayScript, processScriptData } from '../script.js';

export async function handleScriptHistoryClick({ e, scriptHistoryList, grimoireState }) {
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
      saveHistories();
      renderScriptHistory({ scriptHistoryList });
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
      saveHistories();
      renderScriptHistory({ scriptHistoryList });
    }
    li.classList.remove('editing');
    return;
  }
  if (clickedInput) return; // don't load when clicking into input
  if (li.classList.contains('editing')) return; // avoid loading while editing

  // Default: clicking the item or name loads the script
  try {
    await processScriptData({ data: entry.data, addToHistory: false, grimoireState });
    grimoireState.scriptMetaName = entry.name || grimoireState.scriptMetaName || '';
    await displayScript({ data: grimoireState.scriptData, grimoireState });
    saveAppState({ grimoireState });
    renderSetupInfo({ grimoireState });
  } catch (err) { console.error(err); }
} export function handleScriptHistoryOnDown({ e }) {
  const li = e.target.closest('li.history-item');
  if (!li) return;
  if (e.target.closest('.icon-btn') || e.target.closest('.history-edit-input')) return;
  li.classList.add('pressed');
}
export function handleScriptHistoryOnClear() {
  document.querySelectorAll('#script-history-list li.pressed').forEach(el => el.classList.remove('pressed'));
}
export function handleScriptHistoryOnKeyDown({ e, scriptHistoryList }) {
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
      saveHistories();
      renderScriptHistory({ scriptHistoryList });
    }
  }
}
export function addScriptHistoryListListeners({ scriptHistoryList, grimoireState }) {
  scriptHistoryList.addEventListener('click', (e) => handleScriptHistoryClick({ e, scriptHistoryList, grimoireState }));
  scriptHistoryList.addEventListener('pointerdown', (e) => handleScriptHistoryOnDown({ e }));
  scriptHistoryList.addEventListener('pointerup', () => handleScriptHistoryOnClear());
  scriptHistoryList.addEventListener('pointercancel', () => handleScriptHistoryOnClear());
  scriptHistoryList.addEventListener('pointerleave', () => handleScriptHistoryOnClear());
  scriptHistoryList.addEventListener('keydown', (e) => handleScriptHistoryOnKeyDown({ e, scriptHistoryList }));
}
export function renderScriptHistory({ scriptHistoryList }) {
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

export function addScriptToHistory({ name, data, scriptHistoryList }) {
  const entryName = (name && String(name).trim()) || 'Custom Script';
  // Update existing by name if found, else add new
  const idx = history.scriptHistory.findIndex(e => (e.name || '').toLowerCase() === entryName.toLowerCase());
  if (idx >= 0) {
    history.scriptHistory[idx].data = data;
    history.scriptHistory[idx].updatedAt = Date.now();
  } else {
    history.scriptHistory.unshift({ id: generateId('script'), name: entryName, data, createdAt: Date.now(), updatedAt: Date.now() });
  }
  saveHistories();
  renderScriptHistory({ scriptHistoryList });
}
