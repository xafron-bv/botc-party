import { saveAppState } from '../app.js';
import { loadAllCharacters } from '../character.js';
import {
  decodeSharedScriptParam,
  displayScript,
  loadScriptFile,
  loadScriptFromDataJson,
  loadScriptFromText,
  loadScriptFromUrl,
  processScriptData
} from '../script.js';
import { byId } from '../utils/dom.js';
import { renderSetupInfo } from '../utils/setup.js';

export function initScriptControls({
  grimoireState,
  loadTbBtn,
  loadBmrBtn,
  loadSavBtn,
  loadAllCharsBtn,
  scriptFileInput,
  loadScriptTextBtn,
  scriptTextInput,
  loadScriptUrlBtn,
  scriptUrlInput
}) {
  const builtInScripts = [
    [loadTbBtn, 'tb', 'Trouble Brewing'],
    [loadBmrBtn, 'bmr', 'Bad Moon Rising'],
    [loadSavBtn, 'snv', 'Sects & Violets']
  ];
  builtInScripts.forEach(([button, editionId, name]) => {
    button?.addEventListener('click', async () => {
      grimoireState.scriptMetaName = name;
      renderSetupInfo({ grimoireState });
      await loadScriptFromDataJson({ editionId, grimoireState });
    });
  });

  loadAllCharsBtn?.addEventListener('click', () => {
    grimoireState.scriptMetaName = 'All Characters';
    renderSetupInfo({ grimoireState });
    loadAllCharacters({ grimoireState });
  });
  scriptFileInput?.addEventListener('change', (event) =>
    loadScriptFile({ event, grimoireState })
  );
  loadScriptTextBtn?.addEventListener('click', () =>
    loadScriptFromText({ grimoireState, text: scriptTextInput?.value || '' })
  );
  loadScriptUrlBtn?.addEventListener('click', () =>
    loadScriptFromUrl({ grimoireState, url: scriptUrlInput?.value || '' })
  );

  applySharedScriptFromUrl({ grimoireState }).catch((error) =>
    console.error('Failed to load shared script', error)
  );
}

async function applySharedScriptFromUrl({ grimoireState }) {
  const params = new URLSearchParams(window.location.search);
  const encodedScript = params.get('script');
  const scriptUrl = params.get('scriptUrl');
  if (!encodedScript) {
    if (scriptUrl) await loadScriptFromUrl({ grimoireState, url: scriptUrl });
    return;
  }

  const loadStatus = byId('load-status');
  const updateStatus = (text, className = 'status') => {
    if (!loadStatus) return;
    loadStatus.textContent = text;
    loadStatus.className = className;
  };
  const data = decodeSharedScriptParam(encodedScript);
  if (!data) {
    updateStatus('Could not load shared script (invalid share link).', 'error');
    return;
  }

  updateStatus('Loading shared script...');
  try {
    await processScriptData({ data, addToHistory: true, grimoireState });
    await displayScript({ data: grimoireState.scriptData, grimoireState });
    renderSetupInfo({ grimoireState });
    saveAppState({ grimoireState });
    window.updateButtonStates?.();
    updateStatus('Shared script loaded');
  } catch (error) {
    console.error('Failed to load shared script', error);
    updateStatus('Could not load shared script', 'error');
  }
}
