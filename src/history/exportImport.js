import { history, saveHistories } from './index.js';

/**
 * Export the full history to a JSON file
 */
export function exportHistory() {
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
  a.download = `botc-history-${date}.json`;
  
  // Trigger download
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  
  // Clean up
  URL.revokeObjectURL(url);

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
 * Import history from a JSON file
 * @param {File} file - The file to import
 * @returns {Promise<void>}
 */
export async function importHistory(file) {
  try {
    const text = await file.text();
    const data = JSON.parse(text);

    // Validate the data structure
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid JSON format');
    }

    if (!data.scriptHistory || !data.grimoireHistory || !Array.isArray(data.scriptHistory) || !Array.isArray(data.grimoireHistory)) {
      throw new Error('Invalid history format: missing or invalid scriptHistory/grimoireHistory arrays');
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
        // Skip this entry entirely - it's already in history
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
        // Skip this entry entirely - it's already in history
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
    const { renderScriptHistory } = await import('./script.js');
    const { renderGrimoireHistory } = await import('./grimoire.js');
    
    const scriptHistoryList = document.getElementById('script-history-list');
    const grimoireHistoryList = document.getElementById('grimoire-history-list');
    
    if (scriptHistoryList) {
      renderScriptHistory({ scriptHistoryList });
    }
    if (grimoireHistoryList) {
      renderGrimoireHistory({ grimoireHistoryList });
    }

  } catch (error) {
    console.error('Error importing history:', error);
    alert(`Error importing history: ${error.message}`);
    throw error;
  }
}

/**
 * Initialize export/import functionality
 */
export function initExportImport() {
  const exportBtn = document.getElementById('export-history-btn');
  const importBtn = document.getElementById('import-history-btn');
  const importFileInput = document.getElementById('import-history-file');

  if (exportBtn) {
    exportBtn.addEventListener('click', exportHistory);
  }

  if (importBtn && importFileInput) {
    importBtn.addEventListener('click', () => {
      importFileInput.click();
    });

    importFileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (file) {
        try {
          await importHistory(file);
          // Clear the input so the same file can be selected again
          importFileInput.value = '';
        } catch (error) {
          // Error already handled in importHistory
        }
      }
    });
  }
}