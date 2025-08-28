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

    // Handle duplicate IDs by generating new ones
    const existingScriptIds = new Set(history.scriptHistory.map(item => item.id));
    const existingGrimoireIds = new Set(history.grimoireHistory.map(item => item.id));

    const processedScriptHistory = data.scriptHistory.map(item => {
      if (existingScriptIds.has(item.id)) {
        // Generate new ID for duplicate
        return {
          ...item,
          id: `${item.id}_imported_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };
      }
      return item;
    });

    const processedGrimoireHistory = data.grimoireHistory.map(item => {
      if (existingGrimoireIds.has(item.id)) {
        // Generate new ID for duplicate
        return {
          ...item,
          id: `${item.id}_imported_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };
      }
      return item;
    });

    // Merge with existing history
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