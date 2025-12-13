import { history, saveHistories } from './index.js';
import { renderGrimoireHistory } from './grimoire.js';
import { renderScriptHistory } from './script.js';
import { exportCurrentGame, importCurrentGame } from '../currentGame/exportImport.js';

function isUserDataExport(data) {
  return !!(data &&
    typeof data === 'object' &&
    !Array.isArray(data) &&
    (Array.isArray(data.scriptHistory) || Array.isArray(data.grimoireHistory)));
}

function isCurrentGameExport(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return false;
  if (data.kind === 'botc-current-game') return true;
  if (data.gameState && typeof data.gameState === 'object') return true;
  return Array.isArray(data.scriptData) && Array.isArray(data.players);
}

/**
 * Export the full history to a JSON file
 */
export function exportUserData() {
  const exportData = {
    version: 1,
    exportDate: new Date().toISOString(),
    scriptHistory: history.scriptHistory || [],
    grimoireHistory: history.grimoireHistory || []
  };

  // Create blob and download
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  // Create download link
  const a = document.createElement('a');
  a.href = url;
  const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
  a.download = `botc-user-data-${date}.json`;

  // Trigger download
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  // Clean up
  URL.revokeObjectURL(url);

  // Show success message
  const importStatus = document.getElementById('import-status');
  if (importStatus) {
    const scriptCount = exportData.scriptHistory.length;
    const grimoireCount = exportData.grimoireHistory.length;

    let message = 'User data exported successfully! ';
    const parts = [];
    if (scriptCount > 0) {
      parts.push(`${scriptCount} script${scriptCount !== 1 ? 's' : ''}`);
    }
    if (grimoireCount > 0) {
      parts.push(`${grimoireCount} grimoire${grimoireCount !== 1 ? 's' : ''}`);
    }

    if (parts.length > 0) {
      message += `Exported ${parts.join(' and ')}.`;
    } else {
      message += 'Exported empty user data.';
    }

    importStatus.textContent = message;
    importStatus.className = 'status';

    // Clear the message after 5 seconds
    setTimeout(() => {
      importStatus.textContent = '';
      importStatus.className = '';
    }, 5000);
  }

  // For testing purposes, store last downloaded file info
  if (window.Cypress) {
    window.lastDownloadedFile = {
      filename: a.download,
      content: JSON.stringify(exportData, null, 2),
      exportDate: exportData.exportDate
    };
  }
}

/**
 * Import user data from a JSON file
 * @param {File} file - The file to import
 * @returns {Promise<void>}
 */
export async function importUserData(file) {
  try {
    const text = await file.text();
    const data = JSON.parse(text);

    // Check if this is a script file instead of a user data file
    if (Array.isArray(data)) {
      // This is likely a script file (array of characters)
      console.error('Script file detected in user data import');
      alert('This appears to be a script file. Please use the "Upload Custom Script" option in the Game Setup section to load it.');
      return;
    }

    // Validate the data structure
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid JSON format');
    }

    // Check for script-like object structures
    if (!('version' in data) && !('scriptHistory' in data) && !('grimoireHistory' in data)) {
      // This doesn't look like a user data file
      console.error('Non-user data file detected in user data import');
      alert('This appears to be a script file. Please use the "Upload Custom Script" option in the Game Setup section to load it.');
      return;
    }

    if (!data.scriptHistory || !data.grimoireHistory || !Array.isArray(data.scriptHistory) || !Array.isArray(data.grimoireHistory)) {
      throw new Error('Invalid user data format: missing or invalid scriptHistory/grimoireHistory arrays');
    }

    // Helper function to check if two history entries are identical
    const areEntriesIdentical = (entry1, entry2) => {
      // Compare all relevant fields
      return entry1.id === entry2.id &&
        entry1.name === entry2.name &&
        JSON.stringify(entry1.data) === JSON.stringify(entry2.data) &&
        entry1.createdAt === entry2.createdAt &&
        entry1.updatedAt === entry2.updatedAt;
    };

    const areGrimoireEntriesIdentical = (entry1, entry2) => {
      // Compare all relevant fields for grimoire entries
      return entry1.id === entry2.id &&
        entry1.name === entry2.name &&
        entry1.playerCount === entry2.playerCount &&
        JSON.stringify(entry1.script) === JSON.stringify(entry2.script) &&
        JSON.stringify(entry1.players) === JSON.stringify(entry2.players) &&
        entry1.createdAt === entry2.createdAt &&
        entry1.updatedAt === entry2.updatedAt;
    };

    // Process imported entries, handling duplicates
    const processedScriptHistory = [];
    const existingScriptIds = new Set(history.scriptHistory.map(item => item.id));

    for (const importedEntry of data.scriptHistory) {
      // Check if this exact entry already exists
      const isDuplicate = history.scriptHistory.some(existingEntry =>
        areEntriesIdentical(existingEntry, importedEntry)
      );

      if (isDuplicate) {
        // Skip this entry entirely - it's already in user data
        continue;
      }

      // If ID exists but content is different, generate new ID
      if (existingScriptIds.has(importedEntry.id)) {
        processedScriptHistory.push({
          ...importedEntry,
          id: `${importedEntry.id}_imported_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        });
      } else {
        // New unique entry
        processedScriptHistory.push(importedEntry);
      }
    }

    // Process grimoire entries similarly
    const processedGrimoireHistory = [];
    const existingGrimoireIds = new Set(history.grimoireHistory.map(item => item.id));

    for (const importedEntry of data.grimoireHistory) {
      // Check if this exact entry already exists
      const isDuplicate = history.grimoireHistory.some(existingEntry =>
        areGrimoireEntriesIdentical(existingEntry, importedEntry)
      );

      if (isDuplicate) {
        // Skip this entry entirely - it's already in user data
        continue;
      }

      // If ID exists but content is different, generate new ID
      if (existingGrimoireIds.has(importedEntry.id)) {
        processedGrimoireHistory.push({
          ...importedEntry,
          id: `${importedEntry.id}_imported_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        });
      } else {
        // New unique entry
        processedGrimoireHistory.push(importedEntry);
      }
    }

    // Merge with existing history (only non-duplicate entries)
    history.scriptHistory = [...history.scriptHistory, ...processedScriptHistory];
    history.grimoireHistory = [...history.grimoireHistory, ...processedGrimoireHistory];

    // Save to localStorage
    saveHistories();

    // Re-render history lists
    const scriptHistoryList = document.getElementById('script-history-list');
    const grimoireHistoryList = document.getElementById('grimoire-history-list');

    if (scriptHistoryList) {
      renderScriptHistory({ scriptHistoryList });
    }
    if (grimoireHistoryList) {
      renderGrimoireHistory({ grimoireHistoryList });
    }

    // Show success message
    const importStatus = document.getElementById('import-status');
    if (importStatus) {
      const scriptCount = processedScriptHistory.length;
      const grimoireCount = processedGrimoireHistory.length;

      let message = 'User data imported successfully! ';
      if (scriptCount > 0 || grimoireCount > 0) {
        const parts = [];
        if (scriptCount > 0) {
          parts.push(`${scriptCount} script${scriptCount !== 1 ? 's' : ''}`);
        }
        if (grimoireCount > 0) {
          parts.push(`${grimoireCount} grimoire${grimoireCount !== 1 ? 's' : ''}`);
        }
        message += `Added ${parts.join(' and ')}.`;
      } else {
        message += 'No new entries added (all were duplicates).';
      }

      importStatus.textContent = message;
      importStatus.className = 'status';

      // Clear the message after 5 seconds
      setTimeout(() => {
        importStatus.textContent = '';
        importStatus.className = '';
      }, 5000);
    }

  } catch (error) {
    console.error('Error importing user data:', error);
    alert(`Error importing user data: ${error.message}`);
    throw error;
  }
}

/**
 * Initialize export/import functionality
 */
export function initExportImport({ grimoireState, grimoireHistoryList } = {}) {
  const exportBtn = document.getElementById('export-data-btn');
  const exportTypeSelect = document.getElementById('export-type-select');
  const importBtn = document.getElementById('import-data-btn');
  const importFileInput = document.getElementById('import-data-file');

  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      const exportType = exportTypeSelect ? String(exportTypeSelect.value || 'full-data') : 'full-data';
      if (exportType === 'current-game') {
        if (!grimoireState) {
          alert('Unable to export current game: missing game state.');
          return;
        }
        exportCurrentGame({ grimoireState });
        return;
      }
      exportUserData();
    });
  }

  if (importBtn && importFileInput) {
    importBtn.addEventListener('click', () => {
      importFileInput.click();
    });

    importFileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (file) {
        // Clear any previous status message
        const importStatus = document.getElementById('import-status');
        if (importStatus) {
          importStatus.textContent = '';
          importStatus.className = '';
        }

        try {
          const raw = await file.text();
          let parsed;
          try {
            parsed = JSON.parse(raw);
          } catch (error) {
            alert('Error importing file: invalid JSON.');
            throw error;
          }

          if (Array.isArray(parsed)) {
            alert('This appears to be a script file. Please use the "Upload Custom Script" option in the Game Setup section to load it.');
          } else if (isUserDataExport(parsed)) {
            await importUserData(file);
          } else if (isCurrentGameExport(parsed)) {
            if (!grimoireState) {
              alert('Unable to import current game: missing game state.');
            } else {
              await importCurrentGame({ file, grimoireState, grimoireHistoryList });
            }
          } else {
            alert('This appears to be a script file. Please use the "Upload Custom Script" option in the Game Setup section to load it.');
          }
          // Clear the input so the same file can be selected again
          importFileInput.value = '';
        } catch (_error) {
          // Error already handled in importHistory
        }
      }
    });
  }
}
