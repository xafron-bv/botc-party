import { saveHistories, history } from './index.js';
import { generateId } from '../../utils.js';
import { renderSetupInfo } from '../utils/setup.js';
import { withStateSave } from '../app.js';
import { displayScript, processScriptData } from '../script.js';
import { downloadJson } from '../utils/jsonFiles.js';
import { setupKeyboardActivation } from '../utils/interaction.js';
function encodeScriptForShare(data) {
  try { const json = JSON.stringify(data); return btoa(unescape(encodeURIComponent(json))); } catch (_) {
    return '';
  }
}
export const handleScriptHistoryClick = withStateSave(async ({ e, scriptHistoryList, grimoireState }) => {
  const li = e.target.closest('li'); if (!li) return; const id = li.dataset.id; const entry = history.scriptHistory.find(x => x.id === id); if (!entry) return;
  const clickedLoad = e.target.closest('.history-load');
  const clickedDelete = e.target.closest('.icon-btn.delete'); const clickedRename = e.target.closest('.icon-btn.rename'); const clickedSave = e.target.closest('.icon-btn.save');
  const clickedDownload = e.target.closest('.icon-btn.download'); const clickedShare = e.target.closest('.icon-btn.share');
  const clickedInput = e.target.closest('.history-edit-input');
  if (clickedDelete) {
    if (confirm('Delete this script from history?')) {
      history.scriptHistory = history.scriptHistory.filter(x => x.id !== id); saveHistories(); renderScriptHistory({ scriptHistoryList });
    }
    return;
  }
  if (clickedRename) {
    const nameSpan = li.querySelector('.history-name'); const input = li.querySelector('.history-edit-input'); const renameBtn = li.querySelector('.icon-btn.rename');
    const saveBtn = li.querySelector('.icon-btn.save'); nameSpan.style.display = 'none'; input.style.display = 'inline-block'; renameBtn.style.display = 'none';
    saveBtn.style.display = 'inline-block'; li.classList.add('editing'); input.focus(); input.setSelectionRange(0, input.value.length); return;
  }
  if (clickedSave) {
    const input = li.querySelector('.history-edit-input'); const newName = (input.value || '').trim();
    if (newName) { entry.name = newName; entry.updatedAt = Date.now(); saveHistories(); renderScriptHistory({ scriptHistoryList }); }
    li.classList.remove('editing'); return;
  }
  if (clickedDownload) {
    const safeName = (entry.name || 'script').replace(/[^a-z0-9_-]+/gi, '_'); downloadJson({ filename: `${safeName}.json`, data: entry.data, revokeDelay: 250 }); return;
  }
  if (clickedShare) {
    const encoded = encodeScriptForShare(entry.data); if (!encoded) return; const base = `${window.location.origin}${window.location.pathname}`;
    const shareUrl = `${base}?script=${encodeURIComponent(encoded)}`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(shareUrl).catch(() => { window.prompt('Copy this link to share:', shareUrl); });
    } else { window.prompt('Copy this link to share:', shareUrl); }
    return;
  }
  if (clickedInput) return; // don't load when clicking into input
  if (li.classList.contains('editing')) return; // avoid loading while editing
  if (!clickedLoad) return;
  try {
    await processScriptData({ data: entry.data, addToHistory: false, grimoireState }); grimoireState.scriptMetaName = entry.name || grimoireState.scriptMetaName || '';
    await displayScript({ data: grimoireState.scriptData, grimoireState }); renderSetupInfo({ grimoireState });
  } catch (err) { console.error(err); }
}); export function handleScriptHistoryOnDown({ e }) {
  const li = e.target.closest('li.history-item'); if (!li) return; if (e.target.closest('.icon-btn') || e.target.closest('.history-edit-input')) return;
  if (!e.target.closest('.history-load')) return;
  li.classList.add('pressed');
}
export function handleScriptHistoryOnClear() { document.querySelectorAll('#script-history-list li.pressed').forEach(el => el.classList.remove('pressed')); }
export function handleScriptHistoryOnKeyDown({ e, scriptHistoryList }) {
  if (!e.target.classList.contains('history-edit-input')) return; const li = e.target.closest('li'); const id = li && li.dataset.id;
  const entry = history.scriptHistory.find(x => x.id === id); if (!entry) return;
  if (e.key === 'Enter') {
    const newName = (e.target.value || '').trim();
    if (newName) { entry.name = newName; entry.updatedAt = Date.now(); saveHistories(); renderScriptHistory({ scriptHistoryList }); }
  }
}
export function addScriptHistoryListListeners({ scriptHistoryList, grimoireState }) {
  scriptHistoryList.addEventListener('click', (e) => handleScriptHistoryClick({ e, scriptHistoryList, grimoireState }));
  scriptHistoryList.addEventListener('pointerdown', (e) => handleScriptHistoryOnDown({ e })); scriptHistoryList.addEventListener('pointerup', () => handleScriptHistoryOnClear());
  scriptHistoryList.addEventListener('pointercancel', () => handleScriptHistoryOnClear()); scriptHistoryList.addEventListener('pointerleave', () => handleScriptHistoryOnClear());
  scriptHistoryList.addEventListener('keydown', (e) => handleScriptHistoryOnKeyDown({ e, scriptHistoryList }));
}
export function renderScriptHistory({ scriptHistoryList }) {
  if (!scriptHistoryList) return; scriptHistoryList.innerHTML = '';
  history.scriptHistory.forEach(entry => {
    const entryName = entry.name || '(unnamed script)'; const li = document.createElement('li'); li.dataset.id = entry.id; li.className = 'history-item';
    const loadBtn = document.createElement('button'); loadBtn.type = 'button'; loadBtn.className = 'history-load';
    loadBtn.setAttribute('aria-label', `Load script ${entryName}`); const nameSpan = document.createElement('span'); nameSpan.className = 'history-name';
    nameSpan.textContent = entryName; loadBtn.appendChild(nameSpan); const nameInput = document.createElement('input'); nameInput.type = 'text';
    nameInput.className = 'history-edit-input'; nameInput.value = entry.name || ''; nameInput.style.display = 'none'; const renameBtn = document.createElement('button');
    renameBtn.type = 'button'; renameBtn.className = 'icon-btn rename'; renameBtn.title = 'Rename'; renameBtn.innerHTML = '<i class="fa-solid fa-pen"></i>'; const saveBtn = document.createElement('button');
    saveBtn.type = 'button'; saveBtn.className = 'icon-btn save'; saveBtn.title = 'Save'; saveBtn.style.display = 'none'; saveBtn.innerHTML = '<i class="fa-solid fa-check"></i>';
    const downloadBtn = document.createElement('button'); downloadBtn.type = 'button'; downloadBtn.className = 'icon-btn download'; downloadBtn.title = 'Download JSON';
    downloadBtn.innerHTML = '<i class="fa-solid fa-download"></i>'; const shareBtn = document.createElement('button'); shareBtn.className = 'icon-btn share';
    shareBtn.type = 'button'; shareBtn.title = 'Copy share link'; shareBtn.innerHTML = '<i class="fa-solid fa-link"></i>'; const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button'; deleteBtn.className = 'icon-btn delete'; deleteBtn.title = 'Delete'; deleteBtn.innerHTML = '<i class="fa-solid fa-trash"></i>'; li.appendChild(loadBtn);
    li.appendChild(nameInput); li.appendChild(renameBtn); li.appendChild(saveBtn); li.appendChild(downloadBtn); li.appendChild(shareBtn); li.appendChild(deleteBtn);
    [loadBtn, renameBtn, saveBtn, downloadBtn, shareBtn, deleteBtn].forEach(element => setupKeyboardActivation({ element }));
    scriptHistoryList.appendChild(li);
  });
}
export function addScriptToHistory({ name, data, scriptHistoryList }) {
  const entryName = (name && String(name).trim()) || 'Custom Script'; const idx = history.scriptHistory.findIndex(e => (e.name || '').toLowerCase() === entryName.toLowerCase());
  if (idx >= 0) { history.scriptHistory[idx].data = data; history.scriptHistory[idx].updatedAt = Date.now(); } else {
    history.scriptHistory.unshift({ id: generateId('script'), name: entryName, data, createdAt: Date.now(), updatedAt: Date.now() });
  }
  saveHistories(); renderScriptHistory({ scriptHistoryList });
}
