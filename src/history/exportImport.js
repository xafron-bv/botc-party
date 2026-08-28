import { history, saveHistories } from './index.js';
import { renderGrimoireHistory } from './grimoire.js';
import { renderScriptHistory } from './script.js';
import { exportCurrentGame, importCurrentGame } from '../currentGame/exportImport.js';
import { downloadJson, readJsonFile } from '../utils/jsonFiles.js';
import { createStatusWriter } from '../utils/dom.js';

const writeImportStatus = createStatusWriter('import-status', 5000);
const HISTORY_ENTRY_SCHEMAS = {
  script: [['id'], ['name'], ['data', JSON.stringify], ['createdAt'], ['updatedAt']],
  grimoire: [['id'], ['name'], ['playerCount'], ['script', JSON.stringify], ['players', JSON.stringify], ['createdAt'], ['updatedAt']]
};

function areHistoryEntriesIdentical(entry1, entry2, schema) {
  return schema.every(([field, serialize]) =>
    (serialize ? serialize(entry1[field]) : entry1[field]) ===
    (serialize ? serialize(entry2[field]) : entry2[field]));
}

function prepareImportedHistoryEntries({ existingEntries, importedEntries, schema }) {
  const existingIds = new Set(existingEntries.map(item => item.id));
  return importedEntries.reduce((processedEntries, importedEntry) => {
    if (existingEntries.some(existingEntry =>
      areHistoryEntriesIdentical(existingEntry, importedEntry, schema))) { return processedEntries; }
    processedEntries.push(existingIds.has(importedEntry.id)
      ? {
        ...importedEntry,
        id: `${importedEntry.id}_imported_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }
      : importedEntry);
    return processedEntries;
  }, []);
}

function isUserDataExport(data) {
  return !!(data &&
    typeof data === 'object' &&
    !Array.isArray(data) &&
    (Array.isArray(data.scriptHistory) || Array.isArray(data.grimoireHistory)));
}
function isCurrentGameExport(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false; if (data.kind === 'botc-current-game') return true;
  if (data.gameState && typeof data.gameState === 'object') return true; return Array.isArray(data.scriptData) && Array.isArray(data.players);
}
export function exportUserData() {
  const exportData = {
    version: 1,
    exportDate: new Date().toISOString(),
    scriptHistory: history.scriptHistory || [],
    grimoireHistory: history.grimoireHistory || []
  };
  const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  const download = downloadJson({ filename: `botc-user-data-${date}.json`, data: exportData });
  const scriptCount = exportData.scriptHistory.length; const grimoireCount = exportData.grimoireHistory.length; let message = 'User data exported successfully! ';
  const parts = [];
  if (scriptCount > 0) { parts.push(`${scriptCount} script${scriptCount !== 1 ? 's' : ''}`); }
  if (grimoireCount > 0) { parts.push(`${grimoireCount} grimoire${grimoireCount !== 1 ? 's' : ''}`); }
  if (parts.length > 0) { message += `Exported ${parts.join(' and ')}.`; } else {
    message += 'Exported empty user data.';
  }
  writeImportStatus(message);
  if (window.Cypress) {
    window.lastDownloadedFile = {
      ...download,
      exportDate: exportData.exportDate
    };
  }
}
export async function importUserData(data) {
  try {
    if (Array.isArray(data)) {
      console.error('Script file detected in user data import');
      alert('This appears to be a script file. Please use the "Upload Custom Script" option in the Game Setup section to load it.'); return;
    }
    if (!data || typeof data !== 'object') { throw new Error('Invalid JSON format'); }
    if (!('version' in data) && !('scriptHistory' in data) && !('grimoireHistory' in data)) {
      console.error('Non-user data file detected in user data import');
      alert('This appears to be a script file. Please use the "Upload Custom Script" option in the Game Setup section to load it.'); return;
    }
    if (!data.scriptHistory || !data.grimoireHistory || !Array.isArray(data.scriptHistory) || !Array.isArray(data.grimoireHistory)) {
      throw new Error('Invalid user data format: missing or invalid scriptHistory/grimoireHistory arrays');
    }
    const processedScriptHistory = prepareImportedHistoryEntries({
      existingEntries: history.scriptHistory,
      importedEntries: data.scriptHistory,
      schema: HISTORY_ENTRY_SCHEMAS.script
    });
    const processedGrimoireHistory = prepareImportedHistoryEntries({
      existingEntries: history.grimoireHistory,
      importedEntries: data.grimoireHistory,
      schema: HISTORY_ENTRY_SCHEMAS.grimoire
    });
    history.scriptHistory = [...history.scriptHistory, ...processedScriptHistory]; history.grimoireHistory = [...history.grimoireHistory, ...processedGrimoireHistory];
    saveHistories(); const scriptHistoryList = document.getElementById('script-history-list'); const grimoireHistoryList = document.getElementById('grimoire-history-list');
    if (scriptHistoryList) { renderScriptHistory({ scriptHistoryList }); }
    if (grimoireHistoryList) { renderGrimoireHistory({ grimoireHistoryList }); }
    const scriptCount = processedScriptHistory.length; const grimoireCount = processedGrimoireHistory.length; let message = 'User data imported successfully! ';
    if (scriptCount > 0 || grimoireCount > 0) {
      const parts = [];
      if (scriptCount > 0) { parts.push(`${scriptCount} script${scriptCount !== 1 ? 's' : ''}`); }
      if (grimoireCount > 0) { parts.push(`${grimoireCount} grimoire${grimoireCount !== 1 ? 's' : ''}`); }
      message += `Added ${parts.join(' and ')}.`;
    } else { message += 'No new entries added (all were duplicates).'; }
    writeImportStatus(message);
  } catch (error) { console.error('Error importing user data:', error); alert(`Error importing user data: ${error.message}`); throw error; }
}
export function initExportImport({ grimoireState, grimoireHistoryList } = {}) {
  const exportBtn = document.getElementById('export-data-btn'); const exportTypeSelect = document.getElementById('export-type-select');
  const importBtn = document.getElementById('import-data-btn'); const importFileInput = document.getElementById('import-data-file');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      const exportType = exportTypeSelect ? String(exportTypeSelect.value || 'full-data') : 'full-data';
      if (exportType === 'current-game') {
        if (!grimoireState) { alert('Unable to export current game: missing game state.'); return; }
        exportCurrentGame({ grimoireState }); return;
      }
      exportUserData();
    });
  }
  if (importBtn && importFileInput) {
    importBtn.addEventListener('click', () => { importFileInput.click(); });
    importFileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (file) {
        writeImportStatus('');
        try {
          let parsed;
          try { parsed = await readJsonFile(file); } catch (error) {
            alert('Error importing file: invalid JSON.'); throw error;
          }
          if (Array.isArray(parsed)) {
            alert('This appears to be a script file. Please use the "Upload Custom Script" option in the Game Setup section to load it.');
          } else if (isUserDataExport(parsed)) {
            await importUserData(parsed);
          } else if (isCurrentGameExport(parsed)) {
            if (!grimoireState) { alert('Unable to import current game: missing game state.'); } else {
              await importCurrentGame({ data: parsed, grimoireState, grimoireHistoryList });
            }
          } else { alert('This appears to be a script file. Please use the "Upload Custom Script" option in the Game Setup section to load it.'); }
          importFileInput.value = '';
        } catch (_error) {
        }
      }
    });
  }
}
