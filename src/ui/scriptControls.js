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
import { createStatusWriter } from '../utils/dom.js';
import { renderSetupInfo } from '../utils/setup.js';

const writeLoadStatus = createStatusWriter('load-status');

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

  const data = decodeSharedScriptParam(encodedScript);
  if (!data) {
    writeLoadStatus('Could not load shared script (invalid share link).', 'error');
    return;
  }

  writeLoadStatus('Loading shared script...');
  try {
    await processScriptData({ data, addToHistory: true, grimoireState });
    await displayScript({ data: grimoireState.scriptData, grimoireState });
    renderSetupInfo({ grimoireState });
    saveAppState({ grimoireState });
    window.updateButtonStates?.();
    writeLoadStatus('Shared script loaded');
  } catch (error) {
    console.error('Failed to load shared script', error);
    writeLoadStatus('Could not load shared script', 'error');
  }
}
