import { generateId, formatDateName, isExcludedScriptName } from './utils.js';

export function createHistoryManager(config) {
  const scriptListEl = config?.elements?.scriptHistoryList || null;
  const grimoireListEl = config?.elements?.grimoireHistoryList || null;

  let scriptHistory = [];
  let grimoireHistory = [];
  let scriptHandlersAttached = false;
  let grimoireHandlersAttached = false;

  function saveHistories() {
    try { localStorage.setItem('botcScriptHistoryV1', JSON.stringify(scriptHistory)); } catch (_) {}
    try { localStorage.setItem('botcGrimoireHistoryV1', JSON.stringify(grimoireHistory)); } catch (_) {}
  }

  function loadHistories() {
    try {
      const sRaw = localStorage.getItem('botcScriptHistoryV1');
      if (sRaw) scriptHistory = JSON.parse(sRaw) || [];
    } catch (_) { scriptHistory = []; }
    try {
      const gRaw = localStorage.getItem('botcGrimoireHistoryV1');
      if (gRaw) grimoireHistory = JSON.parse(gRaw) || [];
    } catch (_) { grimoireHistory = []; }
  }

  function renderScriptHistory() {
    if (!scriptListEl) return;
    scriptListEl.innerHTML = '';
    scriptHistory.forEach(entry => {
      const li = document.createElement('li');
      li.dataset.id = entry.id;
      li.className = 'history-item';
      const nameSpan = document.createElement('span');
      nameSpan.className = 'history-name';
      nameSpan.textContent = entry.name || '(unnamed script)';
      const nameInput = document.createElement('input');
      nameInput.type = 'text';
      nameInput.className = 'history-edit-input';
      nameInput.value = entry.name || '';
      nameInput.style.display = 'none';
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
      scriptListEl.appendChild(li);
    });
  }

  function renderGrimoireHistory() {
    if (!grimoireListEl) return;
    grimoireListEl.innerHTML = '';
    grimoireHistory.forEach(entry => {
      const li = document.createElement('li');
      li.dataset.id = entry.id;
      li.className = 'history-item';
      const nameSpan = document.createElement('span');
      nameSpan.className = 'history-name';
      nameSpan.textContent = entry.name || formatDateName(new Date(entry.createdAt || Date.now()));
      const nameInput = document.createElement('input');
      nameInput.type = 'text';
      nameInput.className = 'history-edit-input';
      nameInput.value = entry.name || formatDateName(new Date(entry.createdAt || Date.now()));
      nameInput.style.display = 'none';
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
      grimoireListEl.appendChild(li);
    });
  }

  function addScriptToHistory(name, data) {
    const entryName = (name && String(name).trim()) || 'Custom Script';
    const idx = scriptHistory.findIndex(e => (e.name || '').toLowerCase() === entryName.toLowerCase());
    if (idx >= 0) {
      scriptHistory[idx].data = data;
      scriptHistory[idx].updatedAt = Date.now();
    } else {
      scriptHistory.unshift({ id: generateId('script'), name: entryName, data, createdAt: Date.now(), updatedAt: Date.now() });
    }
    saveHistories();
    renderScriptHistory();
  }

  function snapshotCurrentGrimoire() {
    try {
      const players = config?.getters?.getPlayers ? config.getters.getPlayers() : [];
      if (!Array.isArray(players) || players.length === 0) return;
      const snapPlayers = JSON.parse(JSON.stringify(players));
      let name = formatDateName(new Date());
      const scriptData = config?.getters?.getScriptData ? config.getters.getScriptData() : null;
      const scriptMetaName = config?.getters?.getScriptMetaName ? config.getters.getScriptMetaName() : '';
      const entry = {
        id: generateId('grimoire'),
        name,
        createdAt: Date.now(),
        players: snapPlayers,
        scriptName: scriptMetaName || (Array.isArray(scriptData) && (scriptData.find(x => x && typeof x === 'object' && x.id === '_meta')?.name || '')) || '',
        scriptData: Array.isArray(scriptData) ? JSON.parse(JSON.stringify(scriptData)) : null
      };
      grimoireHistory.unshift(entry);
      saveHistories();
      renderGrimoireHistory();
    } catch (_) {}
  }

  async function restoreGrimoireFromEntry(entry) {
    if (!entry) return;
    try {
      if (config?.setters?.setIsRestoringState) config.setters.setIsRestoringState(true);
      if (entry.scriptData && config?.callbacks?.processScriptData) {
        await config.callbacks.processScriptData(entry.scriptData, false);
        if (config?.setters?.setScriptMetaName) config.setters.setScriptMetaName(entry.scriptName || (config?.getters?.getScriptMetaName ? config.getters.getScriptMetaName() : ''));
      }
      if (config?.callbacks?.setupGrimoire) config.callbacks.setupGrimoire(((entry.players || []).length) || 0);
      if (config?.setters?.setPlayers) config.setters.setPlayers(JSON.parse(JSON.stringify(entry.players || [])));
      if (config?.callbacks?.updateGrimoire) config.callbacks.updateGrimoire();
      if (config?.callbacks?.repositionPlayers) config.callbacks.repositionPlayers();
      if (config?.callbacks?.saveAppState) config.callbacks.saveAppState();
      if (config?.callbacks?.renderSetupInfo) config.callbacks.renderSetupInfo();
    } catch (e) {
      console.error('Failed to restore grimoire from history:', e);
    } finally {
      if (config?.setters?.setIsRestoringState) config.setters.setIsRestoringState(false);
    }
  }

  function attachScriptHistoryHandlers() {
    if (!scriptListEl || scriptHandlersAttached) return;
    scriptHandlersAttached = true;
    scriptListEl.addEventListener('click', async (e) => {
      const li = e.target.closest('li');
      if (!li) return;
      const id = li.dataset.id;
      const entry = scriptHistory.find(x => x.id === id);
      if (!entry) return;
      const clickedDelete = e.target.closest('.icon-btn.delete');
      const clickedRename = e.target.closest('.icon-btn.rename');
      const clickedSave = e.target.closest('.icon-btn.save');
      const clickedInput = e.target.closest('.history-edit-input');
      if (clickedDelete) {
        if (confirm('Delete this script from history?')) {
          scriptHistory = scriptHistory.filter(x => x.id !== id);
          saveHistories();
          renderScriptHistory();
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
          renderScriptHistory();
        }
        li.classList.remove('editing');
        return;
      }
      if (clickedInput) return;
      if (li.classList.contains('editing')) return;
      try {
        if (config?.callbacks?.processScriptData) {
          await config.callbacks.processScriptData(entry.data, false);
        }
        if (config?.setters?.setScriptMetaName) {
          const currentName = config?.getters?.getScriptMetaName ? config.getters.getScriptMetaName() : '';
          config.setters.setScriptMetaName(entry.name || currentName || '');
        }
        if (config?.callbacks?.displayScript && config?.getters?.getScriptData) {
          config.callbacks.displayScript(config.getters.getScriptData());
        }
        if (config?.callbacks?.saveAppState) config.callbacks.saveAppState();
        if (config?.callbacks?.renderSetupInfo) config.callbacks.renderSetupInfo();
      } catch (err) { console.error(err); }
    });

    const onDown = (e) => {
      const li = e.target.closest('li.history-item');
      if (!li) return;
      if (e.target.closest('.icon-btn') || e.target.closest('.history-edit-input')) return;
      li.classList.add('pressed');
    };
    const onClear = () => {
      document.querySelectorAll('#script-history-list li.pressed').forEach(el => el.classList.remove('pressed'));
    };
    scriptListEl.addEventListener('pointerdown', onDown);
    scriptListEl.addEventListener('pointerup', onClear);
    scriptListEl.addEventListener('pointercancel', onClear);
    scriptListEl.addEventListener('pointerleave', onClear);

    scriptListEl.addEventListener('keydown', (e) => {
      if (!e.target.classList.contains('history-edit-input')) return;
      const li = e.target.closest('li');
      const id = li && li.dataset.id;
      const entry = scriptHistory.find(x => x.id === id);
      if (!entry) return;
      if (e.key === 'Enter') {
        const newName = (e.target.value || '').trim();
        if (newName) {
          entry.name = newName;
          entry.updatedAt = Date.now();
          saveHistories();
          renderScriptHistory();
        }
      }
    });
  }

  function attachGrimoireHistoryHandlers() {
    if (!grimoireListEl || grimoireHandlersAttached) return;
    grimoireHandlersAttached = true;
    grimoireListEl.addEventListener('click', async (e) => {
      const li = e.target.closest('li');
      if (!li) return;
      const id = li.dataset.id;
      const entry = grimoireHistory.find(x => x.id === id);
      if (!entry) return;
      const clickedDelete = e.target.closest('.icon-btn.delete');
      const clickedRename = e.target.closest('.icon-btn.rename');
      const clickedSave = e.target.closest('.icon-btn.save');
      const clickedInput = e.target.closest('.history-edit-input');
      if (clickedDelete) {
        if (confirm('Delete this grimoire snapshot?')) {
          grimoireHistory = grimoireHistory.filter(x => x.id !== id);
          saveHistories();
          renderGrimoireHistory();
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
          renderGrimoireHistory();
        }
        li.classList.remove('editing');
        return;
      }
      if (clickedInput) return;
      if (li.classList.contains('editing')) return;
      await restoreGrimoireFromEntry(entry);
    });

    const onDown = (e) => {
      const li = e.target.closest('li.history-item');
      if (!li) return;
      if (e.target.closest('.icon-btn') || e.target.closest('.history-edit-input')) return;
      li.classList.add('pressed');
    };
    const onClear = () => {
      document.querySelectorAll('#grimoire-history-list li.pressed').forEach(el => el.classList.remove('pressed'));
    };
    grimoireListEl.addEventListener('pointerdown', onDown);
    grimoireListEl.addEventListener('pointerup', onClear);
    grimoireListEl.addEventListener('pointercancel', onClear);
    grimoireListEl.addEventListener('pointerleave', onClear);

    grimoireListEl.addEventListener('keydown', (e) => {
      if (!e.target.classList.contains('history-edit-input')) return;
      const li = e.target.closest('li');
      const id = li && li.dataset.id;
      const entry = grimoireHistory.find(x => x.id === id);
      if (!entry) return;
      if (e.key === 'Enter') {
        const newName = (e.target.value || '').trim();
        if (newName) {
          entry.name = newName;
          entry.updatedAt = Date.now();
          saveHistories();
          renderGrimoireHistory();
        }
      }
    });
  }

  function initialize() {
    loadHistories();
    renderScriptHistory();
    renderGrimoireHistory();
    attachScriptHistoryHandlers();
    attachGrimoireHistoryHandlers();
  }

  return {
    initialize,
    addScriptToHistory,
    snapshotCurrentGrimoire,
    renderScriptHistory,
    renderGrimoireHistory
  };
}

