if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js')
      .then(registration => {
        console.log('Service worker registered successfully:', registration);
        
        // Suppress update prompt only on first standalone launch (A2HS first open)
        const isStandalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || (window.navigator.standalone === true);
        const FIRST_LAUNCH_KEY = 'pwa_first_standalone_launch_done';
        let suppressUpdatePrompt = false;
        if (isStandalone && !localStorage.getItem(FIRST_LAUNCH_KEY)) {
          suppressUpdatePrompt = true;
          localStorage.setItem(FIRST_LAUNCH_KEY, '1');
        }
        
        // Check for updates on page load
        registration.update();
        
        // Check for updates periodically (every hour)
        setInterval(() => {
          registration.update();
        }, 60 * 60 * 1000);
        
        // Handle service worker updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          console.log('Service worker update found!');
          
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed') {
              // Only prompt if there's an existing controller (i.e., this is an update, not first install)
              if (navigator.serviceWorker.controller) {
                console.log('New service worker installed (update available)');
                if (!suppressUpdatePrompt) {
                  if (confirm('A new version is available! Reload to update?')) {
                    window.location.reload();
                  }
                } else {
                  console.log('Suppressing update prompt on first standalone launch');
                }
              } else {
                console.log('Service worker installed for the first time');
              }
            }
          });
        });
      })
      .catch(error => {
        console.error('Service worker registration failed:', error);
      });
  });
  
  // Handle controller change (when skipWaiting is called)
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const startGameBtn = document.getElementById('start-game');
  const loadTbBtn = document.getElementById('load-tb');
  const loadBmrBtn = document.getElementById('load-bmr');
  const loadSavBtn = document.getElementById('load-sav');
  const loadAllCharsBtn = document.getElementById('load-all-chars');
  const scriptFileInput = document.getElementById('script-file');
  const playerCountInput = document.getElementById('player-count');
  const playerCircle = document.getElementById('player-circle');
  const setupInfoEl = document.getElementById('setup-info');
  const characterSheet = document.getElementById('character-sheet');
  const loadStatus = document.getElementById('load-status');
  
  const characterModal = document.getElementById('character-modal');
  const closeCharacterModalBtn = document.getElementById('close-character-modal');
  const characterGrid = document.getElementById('character-grid');
  const characterSearch = document.getElementById('character-search');
  const characterModalPlayerName = document.getElementById('character-modal-player-name');

  const textReminderModal = document.getElementById('text-reminder-modal');
  const reminderTextInput = document.getElementById('reminder-text-input');
  const saveReminderBtn = document.getElementById('save-reminder-btn');
  const cancelReminderBtn = document.getElementById('cancel-reminder-btn');
  const sidebarResizer = document.getElementById('sidebar-resizer');
  
  // Ability tooltip elements
  const abilityTooltip = document.getElementById('ability-tooltip');
  const touchAbilityPopup = document.getElementById('touch-ability-popup');
  const sidebarEl = document.getElementById('sidebar');
  const reminderTokenModal = document.getElementById('reminder-token-modal');
  const closeReminderTokenModalBtn = document.getElementById('close-reminder-token-modal');
  const reminderTokenGrid = document.getElementById('reminder-token-grid');
  const reminderTokenSearch = document.getElementById('reminder-token-search');
  const reminderTokenModalPlayerName = document.getElementById('reminder-token-modal-player-name');
  const sidebarToggleBtn = document.getElementById('sidebar-toggle');
  const sidebarCloseBtn = document.getElementById('sidebar-close');
  const sidebarBackdrop = document.getElementById('sidebar-backdrop');
  const scriptHistoryList = document.getElementById('script-history-list');
  const grimoireHistoryList = document.getElementById('grimoire-history-list');

  const backgroundSelect = document.getElementById('background-select');
  const centerEl = document.getElementById('center');

  const BG_STORAGE_KEY = 'grimoireBackgroundV1';
  function applyGrimoireBackground(value) {
    if (!centerEl) return;
    if (!value || value === 'none') {
      centerEl.style.backgroundImage = 'none';
    } else {
      const url = `./assets/img/${value}`;
      centerEl.style.backgroundImage = `url('${url}')`;
      centerEl.style.backgroundSize = 'cover';
      centerEl.style.backgroundPosition = 'center';
    }
  }

  // Initialize background from localStorage
  try {
    const savedBg = localStorage.getItem(BG_STORAGE_KEY) || 'background4-C7TzDZ7M.webp';
    applyGrimoireBackground(savedBg);
    if (backgroundSelect) backgroundSelect.value = savedBg === 'none' ? 'none' : savedBg;
  } catch(_) {}

  if (backgroundSelect) {
    backgroundSelect.addEventListener('change', () => {
      const val = backgroundSelect.value;
      applyGrimoireBackground(val);
      try { localStorage.setItem(BG_STORAGE_KEY, val); } catch(_) {}
    });
  }
  
  let scriptData = null;
  let scriptMetaName = '';
  let playerSetupTable = [];
  let allRoles = {};
  let players = [];
  let selectedPlayerIndex = -1;
  let editingReminder = { playerIndex: -1, reminderIndex: -1 };
  const isTouchDevice = (window.matchMedia && window.matchMedia('(hover: none) and (pointer: coarse)').matches) || ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  const TOUCH_EXPAND_SUPPRESS_MS = 350;
  const CLICK_EXPAND_SUPPRESS_MS = 250;
  let outsideCollapseHandlerInstalled = false;
  const prefersOverlaySidebar = window.matchMedia('(max-width: 900px)');
  let scriptHistory = [];
  let grimoireHistory = [];
  let isRestoringState = false;

  function generateId(prefix) {
    try {
      if (crypto && crypto.randomUUID) return `${prefix || 'id'}_${crypto.randomUUID()}`;
    } catch(_) {}
    return `${prefix || 'id'}_${Date.now()}_${Math.floor(Math.random()*1e6)}`;
  }

  function formatDateName(date = new Date()) {
    try {
      const y = date.getFullYear();
      const m = String(date.getMonth()+1).padStart(2,'0');
      const d = String(date.getDate()).padStart(2,'0');
      const hh = String(date.getHours()).padStart(2,'0');
      const mm = String(date.getMinutes()).padStart(2,'0');
      return `${y}-${m}-${d} ${hh}:${mm}`;
    } catch(_) {
      return String(date);
    }
  }

  function isExcludedScriptName(name) {
    if (!name) return false;
    const n = String(name).trim().toLowerCase();
    return n === 'trouble brewing' ||
           n === 'bad moon rising' ||
           n === 'sects & violets' ||
           n === 'sects and violets' ||
           n === 'all characters';
  }

  function saveHistories() {
    try { localStorage.setItem('botcScriptHistoryV1', JSON.stringify(scriptHistory)); } catch(_) {}
    try { localStorage.setItem('botcGrimoireHistoryV1', JSON.stringify(grimoireHistory)); } catch(_) {}
  }

  function loadHistories() {
    try {
      const sRaw = localStorage.getItem('botcScriptHistoryV1');
      if (sRaw) scriptHistory = JSON.parse(sRaw) || [];
    } catch(_) { scriptHistory = []; }
    try {
      const gRaw = localStorage.getItem('botcGrimoireHistoryV1');
      if (gRaw) grimoireHistory = JSON.parse(gRaw) || [];
    } catch(_) { grimoireHistory = []; }
  }

  function renderScriptHistory() {
    if (!scriptHistoryList) return;
    scriptHistoryList.innerHTML = '';
    scriptHistory.forEach(entry => {
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

  function renderGrimoireHistory() {
    // Ensure unique "Current game" appears on top if present
    grimoireHistory = Array.isArray(grimoireHistory) ? grimoireHistory.reduce((acc, cur) => {
      const exists = acc.find(x => x.id === cur.id);
      if (!exists) acc.push(cur);
      return acc;
    }, []) : [];
    // Move current-session to top if present
    const idxCur = grimoireHistory.findIndex(x => x.id === 'current-session');
    if (idxCur > 0) {
      const [cur] = grimoireHistory.splice(idxCur, 1);
      grimoireHistory.unshift(cur);
    }

    if (!grimoireHistoryList) return;
    grimoireHistoryList.innerHTML = '';
    grimoireHistory.forEach(entry => {
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

  function addScriptToHistory(name, data) {
    const entryName = (name && String(name).trim()) || 'Custom Script';
    // Update existing by name if found, else add new
    const idx = scriptHistory.findIndex(e => (e.name || '').toLowerCase() === entryName.toLowerCase());
    if (idx >= 0) {
      scriptHistory[idx].data = data;
      scriptHistory[idx].updatedAt = Date.now();
    } else {
      scriptHistory.unshift({ id: generateId('script'), name: entryName, data, createdAt: Date.now(), updatedAt: Date.now() });
    }
    saveHistories();
    renderScriptHistory();
    // ensure grimoire history shows "Current game" at top without user having to start new
    try { saveAppState(); } catch(_) {}
  }

  function snapshotCurrentGrimoire() {
    try {
      if (!Array.isArray(players) || players.length === 0) return;
      const snapPlayers = JSON.parse(JSON.stringify(players));
      let name = formatDateName(new Date());
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
    } catch(_) {}
  }

  async function restoreGrimoireFromEntry(entry) {
    if (!entry) return;
    try {
      isRestoringState = true;
      if (entry.scriptData) {
        await processScriptData(entry.scriptData, false);
        scriptMetaName = entry.scriptName || scriptMetaName;
      }
      setupGrimoire((entry.players || []).length || 0);
      players = JSON.parse(JSON.stringify(entry.players || []));
      updateGrimoire();
      repositionPlayers();
      saveAppState();
      renderSetupInfo();
    } catch (e) {
      console.error('Failed to restore grimoire from history:', e);
    } finally {
      isRestoringState = false;
    }
  }

  // Event delegation for history lists
  if (scriptHistoryList) {
    // Click-to-load and icon actions
    scriptHistoryList.addEventListener('click', async (e) => {
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
    });
    // Press feedback
    const pressHandlers = (ul) => {
      const onDown = (e) => {
        const li = e.target.closest('li.history-item');
        if (!li) return;
        if (e.target.closest('.icon-btn') || e.target.closest('.history-edit-input')) return;
        li.classList.add('pressed');
      };
      const onClear = (e) => {
        document.querySelectorAll('#script-history-list li.pressed').forEach(el => el.classList.remove('pressed'));
      };
      ul.addEventListener('pointerdown', onDown);
      ul.addEventListener('pointerup', onClear);
      ul.addEventListener('pointercancel', onClear);
      ul.addEventListener('pointerleave', onClear);
    };
    pressHandlers(scriptHistoryList);
    // Save on Enter when editing
    scriptHistoryList.addEventListener('keydown', (e) => {
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

  if (grimoireHistoryList) {
    // Click-to-load and icon actions
    grimoireHistoryList.addEventListener('click', async (e) => {
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
      if (clickedInput) return; // don't load when clicking into input
      if (li.classList.contains('editing')) return; // avoid loading while editing
      // Default: clicking the item or name loads the grimoire
      await restoreGrimoireFromEntry(entry);
      // When loading a snapshot, reuse players on setup
      try { setupGrimoire(players.length, true); } catch(_) {}
    });
    // Press feedback
    const pressHandlersG = (ul) => {
      const onDown = (e) => {
        const li = e.target.closest('li.history-item');
        if (!li) return;
        if (e.target.closest('.icon-btn') || e.target.closest('.history-edit-input')) return;
        li.classList.add('pressed');
      };
      const onClear = () => {
        document.querySelectorAll('#grimoire-history-list li.pressed').forEach(el => el.classList.remove('pressed'));
      };
      ul.addEventListener('pointerdown', onDown);
      ul.addEventListener('pointerup', onClear);
      ul.addEventListener('pointercancel', onClear);
      ul.addEventListener('pointerleave', onClear);
    };
    pressHandlersG(grimoireHistoryList);
    // Save on Enter when editing
    grimoireHistoryList.addEventListener('keydown', (e) => {
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

  function saveAppState() {
    try {
      const state = { scriptData, players, scriptName: scriptMetaName };
      localStorage.setItem('botcAppStateV1', JSON.stringify(state));
      // Also keep last session as the default grimoire in history for quick access
      if (Array.isArray(players) && players.length) {
        const entry = {
          id: 'current-session',
          name: 'Current game',
          createdAt: Date.now(),
          players: JSON.parse(JSON.stringify(players)),
          scriptName: scriptMetaName || '',
          scriptData: Array.isArray(scriptData) ? JSON.parse(JSON.stringify(scriptData)) : null
        };
        // replace or insert at the top
        const idx = grimoireHistory.findIndex(x => x.id === 'current-session');
        if (idx >= 0) { grimoireHistory[idx] = entry; } else { grimoireHistory.unshift(entry); }
        saveHistories();
        renderGrimoireHistory();
      }
    } catch (_) {}
  }

     async function loadAppState() {
     try {
       isRestoringState = true;
       const raw = localStorage.getItem('botcAppStateV1');
       if (!raw) return;
       const saved = JSON.parse(raw);
       if (saved && Array.isArray(saved.scriptData) && saved.scriptData.length) {
         await processScriptData(saved.scriptData, false);
         if (saved.scriptName) { scriptMetaName = String(saved.scriptName); }
       }
       if (saved && Array.isArray(saved.players) && saved.players.length) {
         setupGrimoire(saved.players.length, true);
         players = saved.players;
         updateGrimoire();
         repositionPlayers();
         renderSetupInfo();
       }
     } catch (_) {} finally { isRestoringState = false; }
   }

  function resolveAssetPath(path) {
      if (!path) return path;
      if (/^https?:\/\//.test(path)) return path;
      if (path.startsWith('/')) return `.${path}`;
      return path;
  }

  function normalizeKey(value) {
    if (typeof value !== 'string') return '';
    return value.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  async function loadAllCharacters() {
    try {
      loadStatus.textContent = 'Loading all characters...';
      loadStatus.className = 'status';
      
      // Load tokens.json directly
      const response = await fetch('./tokens.json');
      if (!response.ok) {
        throw new Error(`Failed to load tokens.json: ${response.status}`);
      }
      
      const tokens = await response.json();
      console.log('Loading all characters from tokens.json');
      
      // Reset allRoles
      allRoles = {};
      
      // Process all teams including fabled and travellers
      const allTeams = ['townsfolk', 'outsider', 'minion', 'demon', 'travellers', 'fabled'];
      let characterIds = [];
      
      allTeams.forEach(teamName => {
        if (tokens[teamName] && Array.isArray(tokens[teamName])) {
          tokens[teamName].forEach(role => {
            const image = resolveAssetPath(role.image);
            allRoles[role.id] = { ...role, image, team: teamName };
            characterIds.push(role.id);
          });
        }
      });
      
      console.log(`Loaded ${Object.keys(allRoles).length} characters from all teams`);
      
      // Create a pseudo-script data array with all character IDs
      scriptData = [{ id: '_meta', name: 'All Characters', author: 'System' }, ...characterIds];
      
      displayScript(scriptData);
      saveAppState();
      
      loadStatus.textContent = `Loaded ${Object.keys(allRoles).length} characters successfully`;
      loadStatus.className = 'status';
      
    } catch (error) {
      console.error('Failed to load all characters:', error);
      loadStatus.textContent = `Failed to load all characters: ${error.message}`;
      loadStatus.className = 'error';
    }
  }

  async function loadScriptFromFile(path) {
    try {
      loadStatus.textContent = `Loading script from ${path}...`;
      loadStatus.className = 'status';
      // Pre-set a best-effort name from the filename so UI updates immediately
      try {
        const match = String(path).match(/([^/]+)\.json$/i);
        if (match) {
          const base = match[1].replace(/\s*&\s*/g, ' & ');
          scriptMetaName = base;
          renderSetupInfo();
        }
      } catch (_) {}
      const res = await fetch(path, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      await processScriptData(json, true);
      loadStatus.textContent = 'Script loaded successfully!';
      loadStatus.className = 'status';
    } catch (e) {
      console.error('Failed to load script:', e);
      loadStatus.textContent = `Failed to load ${path}: ${e.message}`;
      loadStatus.className = 'error';
    }
  }
  loadTbBtn && loadTbBtn.addEventListener('click', () => { scriptMetaName = 'Trouble Brewing'; renderSetupInfo(); loadScriptFromFile('./Trouble Brewing.json'); });
  loadBmrBtn && loadBmrBtn.addEventListener('click', () => { scriptMetaName = 'Bad Moon Rising'; renderSetupInfo(); loadScriptFromFile('./Bad Moon Rising.json'); });
  loadSavBtn && loadSavBtn.addEventListener('click', () => { scriptMetaName = 'Sects & Violets'; renderSetupInfo(); loadScriptFromFile('./Sects and Violets.json'); });
  loadAllCharsBtn && loadAllCharsBtn.addEventListener('click', () => { scriptMetaName = 'All Characters'; renderSetupInfo(); loadAllCharacters(); });

  scriptFileInput.addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    console.log('File selected:', file.name, 'Size:', file.size);
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        console.log('Parsing uploaded file...');
        const json = JSON.parse(e.target.result);
        console.log('Uploaded script parsed successfully:', json);
        
        await processScriptData(json, true);
        loadStatus.textContent = 'Custom script loaded successfully!';
        loadStatus.className = 'status';
      } catch (error) { 
        console.error('Error parsing uploaded file:', error);
        loadStatus.textContent = `Invalid JSON file: ${error.message}`;
        loadStatus.className = 'error';
      }
    };
    
    reader.onerror = (error) => {
      console.error('File reading error:', error);
      loadStatus.textContent = 'Error reading file';
      loadStatus.className = 'error';
    };
    
    reader.readAsText(file);
  });

  // Load player setup JSON once
  (async function loadPlayerSetupTable() {
    try {
      const res = await fetch('./player-setup.json', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      playerSetupTable = Array.isArray(data.player_setup) ? data.player_setup : [];
      renderSetupInfo();
    } catch (e) {
      console.error('Failed to load player-setup.json', e);
    }
  })();

  function lookupCountsForPlayers(count) {
    if (!Array.isArray(playerSetupTable)) return null;
    const row = playerSetupTable.find(r => Number(r.players) === Number(count));
    return row || null;
  }

  function renderSetupInfo() {
    if (!setupInfoEl) return;
    const count = players.length;
    const row = lookupCountsForPlayers(count);
    // Prefer parsed meta name; otherwise keep any existing hint
    let scriptName = scriptMetaName || '';
    if (!scriptName && Array.isArray(scriptData)) {
      const meta = scriptData.find(x => x && typeof x === 'object' && x.id === '_meta');
      if (meta && meta.name) scriptName = String(meta.name);
    }
    if (!row && !scriptName) { setupInfoEl.textContent = ''; return; }
    const parts = [];
    if (scriptName) parts.push(scriptName);
    if (row) parts.push(`${row.townsfolk}/${row.outsiders}/${row.minions}/${row.demons}`);
    setupInfoEl.textContent = parts.join(' ');
  }

  async function processScriptData(data, addToHistory = false) {
      console.log('Processing script data:', data);
      scriptData = data;
      allRoles = {};
      // Extract metadata name if present
      try {
        const meta = Array.isArray(data) ? data.find(x => x && typeof x === 'object' && x.id === '_meta') : null;
        scriptMetaName = meta && meta.name ? String(meta.name) : '';
      } catch (_) { scriptMetaName = ''; }
      
      if (Array.isArray(data)) {
          console.log('Processing script with', data.length, 'characters');
          await processScriptCharacters(data);
      } else {
          console.error('Unexpected script format:', typeof data);
          return;
      }
      
      console.log('Total roles processed:', Object.keys(allRoles).length);
      displayScript(data);
       saveAppState();
       renderSetupInfo();
       if (addToHistory) {
         const histName = scriptMetaName || (Array.isArray(data) && (data.find(x => x && typeof x === 'object' && x.id === '_meta')?.name || 'Custom Script')) || 'Custom Script';
         if (!isExcludedScriptName(histName)) {
           addScriptToHistory(histName, data);
         }
       }
  }

  async function processScriptCharacters(characterIds) {
      try {
          console.log('Loading tokens.json to resolve character IDs...');
          const response = await fetch('./tokens.json');
          if (!response.ok) {
              throw new Error(`Failed to load tokens.json: ${response.status}`);
          }
          
          const tokens = await response.json();
          console.log('Tokens.json loaded successfully');
          
          // Create canonical lookups and a normalization index
          const roleLookup = {};
          const normalizedToCanonicalId = {};
          Object.entries(tokens).forEach(([teamName, teamArray]) => {
              if (Array.isArray(teamArray)) {
                  teamArray.forEach(role => {
                      const image = resolveAssetPath(role.image);
                      const canonical = { ...role, image, team: teamName };
                      roleLookup[role.id] = canonical;
                      const normId = normalizeKey(role.id);
                      const normName = normalizeKey(role.name);
                      if (normId) normalizedToCanonicalId[normId] = role.id;
                      if (normName) normalizedToCanonicalId[normName] = role.id;
                  });
              }
          });
          
          console.log('Role lookup created with', Object.keys(roleLookup).length, 'roles');
          
          // Process the character IDs from the script using normalization
          characterIds.forEach((characterItem) => {
              if (typeof characterItem === 'string' && characterItem !== '_meta') {
                  const key = normalizeKey(characterItem);
                  const canonicalId = normalizedToCanonicalId[key];
                  if (canonicalId && roleLookup[canonicalId]) {
                      allRoles[canonicalId] = roleLookup[canonicalId];
                      console.log(`Resolved character ${characterItem} -> ${canonicalId} (${roleLookup[canonicalId].name})`);
                  } else {
                      console.warn(`Character not found: ${characterItem}`);
                  }
              } else if (typeof characterItem === 'object' && characterItem !== null && characterItem.id && characterItem.id !== '_meta') {
                  const idKey = normalizeKey(characterItem.id);
                  const nameKey = normalizeKey(characterItem.name || '');
                  const canonicalId = normalizedToCanonicalId[idKey] || normalizedToCanonicalId[nameKey];
                  if (canonicalId && roleLookup[canonicalId]) {
                      allRoles[canonicalId] = roleLookup[canonicalId];
                      console.log(`Resolved object character ${characterItem.id} -> ${canonicalId} (${roleLookup[canonicalId].name})`);
                  } else if (characterItem.name && characterItem.team && characterItem.ability) {
                      const customRole = {
                          id: characterItem.id,
                          name: characterItem.name,
                          team: characterItem.team,
                          ability: characterItem.ability,
                          image: characterItem.image ? resolveAssetPath(characterItem.image) : './assets/img/token-BqDQdWeO.webp'
                      };
                      if (characterItem.reminders) customRole.reminders = characterItem.reminders;
                      if (characterItem.remindersGlobal) customRole.remindersGlobal = characterItem.remindersGlobal;
                      if (characterItem.setup !== undefined) customRole.setup = characterItem.setup;
                      if (characterItem.jinxes) customRole.jinxes = characterItem.jinxes;
                      allRoles[characterItem.id] = customRole;
                      console.log(`Added custom character ${characterItem.id} (${characterItem.name})`);
                  } else {
                      console.warn(`Invalid custom character object:`, characterItem);
                  }
              }
          });
          
          console.log('Script processing completed');
           
       } catch (error) {
           console.error('Error processing script:', error);
           characterIds.forEach((characterItem) => {
               if (typeof characterItem === 'string' && characterItem !== '_meta') {
                   allRoles[characterItem] = {
                       id: characterItem,
                       name: characterItem.charAt(0).toUpperCase() + characterItem.slice(1),
                       image: './assets/img/token-BqDQdWeO.webp',
                       team: 'unknown'
                   };
               } else if (typeof characterItem === 'object' && characterItem !== null && characterItem.id && characterItem.id !== '_meta') {
                   // Handle custom character objects even in error case
                   if (characterItem.name && characterItem.team && characterItem.ability) {
                       allRoles[characterItem.id] = {
                           id: characterItem.id,
                           name: characterItem.name,
                           team: characterItem.team,
                           ability: characterItem.ability,
                           image: characterItem.image ? resolveAssetPath(characterItem.image) : './assets/img/token-BqDQdWeO.webp'
                       };
                   }
               }
           });
       }
  }

  startGameBtn.addEventListener('click', () => {
    const playerCount = parseInt(playerCountInput.value, 10);
    if (playerCount >= 5 && playerCount <= 20) {
      setupGrimoire(playerCount);
    } else {
      alert('Player count must be an integer from 5 to 20.');
    }
  });

  function setupGrimoire(count, reuse = false) {
              try {
         if (!isRestoringState) {
           const idxCur = grimoireHistory.findIndex(x => x.id === 'current-session');
           if (idxCur >= 0) {
             const entry = grimoireHistory[idxCur];
             entry.id = generateId('grimoire');
             entry.name = formatDateName(new Date(entry.createdAt || Date.now()));
             entry.updatedAt = Date.now();
             saveHistories();
             renderGrimoireHistory();
           }
         }
       } catch(_) {}
       console.log('Setting up grimoire with', count, 'players');
        playerCircle.innerHTML = '';
        const previous = Array.isArray(players) ? JSON.parse(JSON.stringify(players)) : [];
        players = Array.from({ length: count }, (_, i) => {
            const prev = previous[i] || null;
            return {
                name: prev && prev.name ? prev.name : `Player ${i + 1}`,
                character: null,
                reminders: [],
                dead: false
            };
        });
      
      players.forEach((player, i) => {
          const listItem = document.createElement('li');
          listItem.innerHTML = `
              <div class="reminders"></div>
              <div class="player-token" title="Assign character"></div>
               <div class="character-name" aria-live="polite"></div>
              <div class="player-name" title="Edit name">${player.name}</div>
              <div class="reminder-placeholder" title="Add text reminder">+</div>
          `;
          playerCircle.appendChild(listItem);

          // Only the main token area opens the character modal; ribbon handles dead toggle
                     // Open character modal on left click only when seat menu is not open
           listItem.querySelector('.player-token').addEventListener('click', (e) => {
               const hasMenu = !!listItem.querySelector('.seat-menu');
               if (hasMenu) return;
               const target = e.target;
               if (target && (target.closest('.death-ribbon') || target.classList.contains('death-ribbon'))) {
                   return; // handled by ribbon click
               }
               if (target && target.classList.contains('ability-info-icon')) {
                   return; // handled by info icon
               }
               openCharacterModal(i);
           });
           // Prevent OS context menu and open seat menu on right-click
           listItem.querySelector('.player-token').addEventListener('contextmenu', (e) => {
             e.preventDefault(); e.stopPropagation();
             document.querySelectorAll('.seat-menu').forEach(m => m.remove());
             const menu = document.createElement('div');
             menu.className = 'seat-menu';
             const addBefore = document.createElement('button'); addBefore.textContent = '+ before';
             const addAfter = document.createElement('button'); addAfter.textContent = '+ after';
             const removeHere = document.createElement('button'); removeHere.textContent = 'remove';
             addBefore.onclick = (ev) => { ev.stopPropagation(); const newPlayer = { name: `Player ${players.length + 1}`, character: null, reminders: [], dead: false }; players.splice(i, 0, newPlayer); setupGrimoire(players.length); updateGrimoire(); repositionPlayers(); saveAppState(); menu.remove(); };
             addAfter.onclick = (ev) => { ev.stopPropagation(); const newPlayer = { name: `Player ${players.length + 1}`, character: null, reminders: [], dead: false }; players.splice(i + 1, 0, newPlayer); setupGrimoire(players.length); updateGrimoire(); repositionPlayers(); saveAppState(); menu.remove(); };
             removeHere.onclick = (ev) => { ev.stopPropagation(); if (players.length <= 5) { alert('Minimum 5 players.'); return; } players.splice(i, 1); setupGrimoire(players.length); updateGrimoire(); repositionPlayers(); saveAppState(); menu.remove(); };
             menu.appendChild(addBefore); menu.appendChild(addAfter); menu.appendChild(removeHere);
             listItem.appendChild(menu);
           });
          // Long-press to manage seats near this position (insert/remove)
          let pressTimer;
          const openSeatMenu = () => {
              // remove any existing menus
              document.querySelectorAll('.seat-menu').forEach(m => m.remove());
              const menu = document.createElement('div');
              menu.className = 'seat-menu';
              const addBefore = document.createElement('button'); addBefore.textContent = '+ before';
              const addAfter = document.createElement('button'); addAfter.textContent = '+ after';
              const removeHere = document.createElement('button'); removeHere.textContent = 'remove';
              addBefore.onclick = (ev) => { ev.stopPropagation();
                const newPlayer = { name: `Player ${players.length + 1}`, character: null, reminders: [], dead: false };
                players.splice(i, 0, newPlayer);
                setupGrimoire(players.length); // names preserved
                updateGrimoire(); repositionPlayers(); saveAppState(); menu.remove(); };
              addAfter.onclick = (ev) => { ev.stopPropagation();
                const newPlayer = { name: `Player ${players.length + 1}`, character: null, reminders: [], dead: false };
                players.splice(i + 1, 0, newPlayer);
                setupGrimoire(players.length); updateGrimoire(); repositionPlayers(); saveAppState(); menu.remove(); };
              removeHere.onclick = (ev) => { ev.stopPropagation();
                if (players.length <= 5) { alert('Minimum 5 players.'); return; }
                players.splice(i, 1);
                setupGrimoire(players.length); updateGrimoire(); repositionPlayers(); saveAppState(); menu.remove(); };
              menu.appendChild(addBefore); menu.appendChild(addAfter); menu.appendChild(removeHere);
              listItem.appendChild(menu);
            };
          const tokenEl = listItem.querySelector('.player-token');
          tokenEl.addEventListener('mousedown', () => { pressTimer = setTimeout(openSeatMenu, 600); });
          tokenEl.addEventListener('mouseup', () => { clearTimeout(pressTimer); });
          tokenEl.addEventListener('mouseleave', () => { clearTimeout(pressTimer); });
          tokenEl.addEventListener('touchstart', () => { pressTimer = setTimeout(openSeatMenu, 600); }, { passive: true });
          tokenEl.addEventListener('touchend', () => { clearTimeout(pressTimer); });
          document.addEventListener('click', (ev) => { if (!listItem.contains(ev.target)) { document.querySelectorAll('.seat-menu').forEach(m => m.remove()); } }, true);
          listItem.querySelector('.player-name').onclick = (e) => {
              e.stopPropagation();
              const newName = prompt("Enter player name:", player.name);
              if (newName) {
                  players[i].name = newName;
                  updateGrimoire();
                  saveAppState();
              }
          };
                     // Open reminder token modal on click; Alt+click opens text reminder (desktop convenience)
           listItem.querySelector('.reminder-placeholder').addEventListener('click', (e) => {
               e.stopPropagation();
               if (e.altKey && !isTouchDevice) {
                   openTextReminderModal(i);
               } else {
                   openReminderTokenModal(i);
               }
           }, true);

          // Hover expand/collapse for reminder stack positioning
          listItem.dataset.expanded = '0';
          const expand = () => {
            const wasExpanded = listItem.dataset.expanded === '1';
            const allLis = document.querySelectorAll('#player-circle li');
            allLis.forEach(el => {
              if (el !== listItem && el.dataset.expanded === '1') {
                el.dataset.expanded = '0';
                const idx = Array.from(allLis).indexOf(el);
                positionRadialStack(el, (players[idx]?.reminders || []).length);
              }
            });
            listItem.dataset.expanded = '1';
            // Only set suppression on touch, and only when changing from collapsed -> expanded
            if (isTouchDevice && !wasExpanded) {
              listItem.dataset.actionSuppressUntil = String(Date.now() + CLICK_EXPAND_SUPPRESS_MS);
            }
            positionRadialStack(listItem, players[i].reminders.length);
          };
          const collapse = () => { listItem.dataset.expanded = '0'; positionRadialStack(listItem, players[i].reminders.length); };
          if (!isTouchDevice) {
            listItem.addEventListener('mouseenter', expand);
            listItem.addEventListener('mouseleave', collapse);
            // Pointer events for broader device support
            listItem.addEventListener('pointerenter', expand);
            listItem.addEventListener('pointerleave', collapse);
          }
          // Touch: expand on any tap; only suppress synthetic click if tap started on reminders
          listItem.addEventListener('touchstart', (e) => {
              const target = e.target;
              const tappedReminders = !!(target && target.closest('.reminders'));
              if (tappedReminders) {
                  try { e.preventDefault(); } catch(_) {}
                  listItem.dataset.touchSuppressUntil = String(Date.now() + TOUCH_EXPAND_SUPPRESS_MS);
              }
              expand();
              positionRadialStack(listItem, players[i].reminders.length);
          }, { passive: false });

          // (desktop) no extra mousedown handler; rely on hover/pointerenter and explicit clicks on reminders

          // Install one-time outside click/tap collapse for touch devices
          if (isTouchDevice && !outsideCollapseHandlerInstalled) {
            outsideCollapseHandlerInstalled = true;
            const maybeCollapseOnOutside = (ev) => {
              const target = ev.target;
              // Do nothing if target is inside any expanded list item
              const allLis = document.querySelectorAll('#player-circle li');
              let clickedInsideExpanded = false;
              allLis.forEach(el => {
                if (el.dataset.expanded === '1' && el.contains(target)) {
                  clickedInsideExpanded = true;
                }
              });
              if (clickedInsideExpanded) return;
              // Collapse all expanded items
              allLis.forEach(el => {
                if (el.dataset.expanded === '1') {
                  el.dataset.expanded = '0';
                  positionRadialStack(el, (players[Array.from(allLis).indexOf(el)]?.reminders || []).length);
                }
              });
            };
            document.addEventListener('click', maybeCollapseOnOutside, true);
            document.addEventListener('touchstart', maybeCollapseOnOutside, { passive: true, capture: true });
          }

          // No capture intercepts; rely on pointer-events gating and the touchstart handler above
      });
      
      // Use requestAnimationFrame to ensure DOM is fully rendered
             requestAnimationFrame(() => {
           repositionPlayers();
           updateGrimoire();
           saveAppState();
           renderSetupInfo();
       });
               // (simplified) no auto-snapshot on setup; current-session will be renamed on next setup
  }

  function repositionPlayers() {
      const count = players.length;
      if (count === 0) return;
      
      const circle = document.getElementById('player-circle');
      if (!circle) {
          console.error('Player circle element not found');
          return;
      }
            // Compute token size and a radius that guarantees non-overlap for given count
      const listItemsForSize = circle.querySelectorAll('li');
      if (!listItemsForSize.length) return;
      const sampleToken = listItemsForSize[0].querySelector('.player-token') || listItemsForSize[0];
      const tokenDiameter = sampleToken.offsetWidth || 100;
      const tokenRadius = tokenDiameter / 2;
      // Small margin so names/labels have breathing room
      const chordNeeded = tokenDiameter * 1.25;
      // r >= chord / (2 * sin(pi/count)) ensures neighboring chords >= token size
      let radius = Math.max(120, chordNeeded / (2 * Math.sin(Math.PI / count)));
      // Size the circle container to fully contain tokens, but clamp to viewport/container
      const parentRect = circle.parentElement ? circle.parentElement.getBoundingClientRect() : circle.getBoundingClientRect();
      const margin = 24;
      const maxSize = Math.max(160, Math.min(parentRect.width, parentRect.height) - margin);
      const requiredContainerSize = Math.ceil(2 * (radius + tokenRadius + 12));
      const containerSize = Math.min(requiredContainerSize, maxSize);
      const effectiveRadius = Math.max(80, (containerSize / 2) - tokenRadius - 12);
      circle.style.width = containerSize + 'px';
      circle.style.height = containerSize + 'px';
      
      const circleWidth = containerSize;
      const circleHeight = containerSize;
      const angleStep = (2 * Math.PI) / count;
      const positionRadius = Math.min(radius, effectiveRadius);

      const listItems = circle.querySelectorAll('li');
      listItems.forEach((listItem, i) => {
          const angle = i * angleStep - (Math.PI / 2);
          const x = (circleWidth / 2) + positionRadius * Math.cos(angle);
          const y = (circleHeight / 2) + positionRadius * Math.sin(angle);
          
          listItem.style.position = 'absolute';
          listItem.style.left = `${x}px`;
          listItem.style.top = `${y}px`;
          listItem.style.transform = 'translate(-50%, -50%)';
          listItem.dataset.angle = String(angle);

          // keep default CSS centering behavior for token
          
          // Apply top-half class to player names in NW and NE quadrants
          const playerNameEl = listItem.querySelector('.player-name');
          if (playerNameEl) {
              // Calculate the actual x,y position to determine quadrant
              const x = Math.cos(angle);
              const y = Math.sin(angle);
              
              // Names go on top for NW (x<0, y<0) and NE (x>0, y<0) quadrants
              const isNorthQuadrant = y < 0;
              
              if (isNorthQuadrant) {
                  playerNameEl.classList.add('top-half');
                  listItem.classList.add('is-north');
                  listItem.classList.remove('is-south');
              } else {
                  playerNameEl.classList.remove('top-half');
                  listItem.classList.add('is-south');
                  listItem.classList.remove('is-north');
              }
          }

          // Reposition the player's reminder stack and plus button to match new angle
          const count = (players[i] && players[i].reminders) ? players[i].reminders.length : 0;
          positionRadialStack(listItem, count);

          // Debug visuals removed
      });
      
      // Position info icons on outer circle
      positionInfoIcons();

      // Draw guide lines from each token to the center after positioning
      // drawRadialGuides(); // Commented out to hide radial guides

      console.log('Player positioning completed');
  }

  function updateGrimoire() {
      const listItems = playerCircle.querySelectorAll('li');
      listItems.forEach((li, i) => {
          const player = players[i];
          const playerNameEl = li.querySelector('.player-name');
          playerNameEl.textContent = player.name;
          
          // Check if player is in NW or NE quadrant
          const angle = parseFloat(li.dataset.angle || '0');
          
          // Calculate the actual x,y position to determine quadrant
          const x = Math.cos(angle);
          const y = Math.sin(angle);
          
          // Names go on top for NW (x<0, y<0) and NE (x>0, y<0) quadrants
          const isNorthQuadrant = y < 0;
          
          if (isNorthQuadrant) {
              playerNameEl.classList.add('top-half');
              li.classList.add('is-north');
              li.classList.remove('is-south');
          } else {
              playerNameEl.classList.remove('top-half');
              li.classList.add('is-south');
              li.classList.remove('is-north');
          }
          
          const tokenDiv = li.querySelector('.player-token');
           const charNameDiv = li.querySelector('.character-name');
            // Remove any previous arc label overlay
            const existingArc = tokenDiv.querySelector('.icon-reminder-svg');
            if (existingArc) existingArc.remove();
            // Remove any previous death UI
            const oldCircle = tokenDiv.querySelector('.death-overlay');
            if (oldCircle) oldCircle.remove();
            const oldRibbon = tokenDiv.querySelector('.death-ribbon');
            if (oldRibbon) oldRibbon.remove();
          
            if (player.character && allRoles[player.character]) {
            const role = allRoles[player.character];
             tokenDiv.style.backgroundImage = `url('${resolveAssetPath(role.image)}'), url('${resolveAssetPath('assets/img/token-BqDQdWeO.webp')}')`;
              tokenDiv.style.backgroundSize = '68% 68%, cover';
            tokenDiv.style.backgroundColor = 'transparent';
            tokenDiv.classList.add('has-character');
             if (charNameDiv) charNameDiv.textContent = role.name;
              // Add curved label on the token
              const svg = createCurvedLabelSvg(`player-arc-${i}`, role.name);
              tokenDiv.appendChild(svg);
              tokenDiv.setAttribute('aria-label', `${role.name}: ${role.ability || ''}`);
              
              // Add tooltip functionality for non-touch devices
              if (!('ontouchstart' in window)) {
                  tokenDiv.addEventListener('mouseenter', (e) => {
                      if (role.ability) {
                          abilityTooltip.textContent = role.ability;
                          abilityTooltip.classList.add('show');
                          positionTooltip(e.target, abilityTooltip);
                      }
                  });
                  
                  tokenDiv.addEventListener('mouseleave', () => {
                      abilityTooltip.classList.remove('show');
                  });
              } else if (role.ability) {
                  // Add info icon for touch mode - will be positioned after circle layout
                  const infoIcon = document.createElement('div');
                  infoIcon.className = 'ability-info-icon';
                  infoIcon.innerHTML = '<i class="fas fa-info-circle"></i>';
                  infoIcon.dataset.playerIndex = i;
                                  // Handle both click and touch events
                const handleInfoClick = (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    showTouchAbilityPopup(infoIcon, role.ability);
                };
                infoIcon.onclick = handleInfoClick;
                infoIcon.addEventListener('touchstart', (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    handleInfoClick(e); // Call the click handler on touch
                });
                  li.appendChild(infoIcon); // Append to li, not tokenDiv
              }
          } else {
            tokenDiv.style.backgroundImage = `url('${resolveAssetPath('assets/img/token-BqDQdWeO.webp')}')`;
            tokenDiv.style.backgroundSize = 'cover';
            tokenDiv.style.backgroundColor = 'rgba(0,0,0,0.2)';
            tokenDiv.classList.remove('has-character');
             if (charNameDiv) charNameDiv.textContent = '';
              // Ensure no leftover arc label remains
              const arc = tokenDiv.querySelector('.icon-reminder-svg');
              if (arc) arc.remove();
          }

          // Add death overlay circle and ribbon indicator
          const overlay = document.createElement('div');
          overlay.className = 'death-overlay';
          overlay.title = player.dead ? 'Click to mark alive' : 'Click to mark dead';
          // overlay is visual only; click is on ribbon
          tokenDiv.appendChild(overlay);

          const ribbon = createDeathRibbonSvg();
          ribbon.classList.add('death-ribbon');
          const handleRibbonToggle = (e) => {
              e.stopPropagation();
              players[i].dead = !players[i].dead;
              updateGrimoire();
              saveAppState();
          };
          // Attach to painted shapes only to avoid transparent hit areas
          try {
              ribbon.querySelectorAll('rect, path').forEach((shape) => {
                  shape.addEventListener('click', handleRibbonToggle);
              });
          } catch (_) {
              // Fallback: still attach on svg
              ribbon.addEventListener('click', handleRibbonToggle);
          }
          tokenDiv.appendChild(ribbon);

          if (player.dead) {
              tokenDiv.classList.add('is-dead');
          } else {
              tokenDiv.classList.remove('is-dead');
          }

          const remindersDiv = li.querySelector('.reminders');
          remindersDiv.innerHTML = '';
          
          // Create reminder elements; positions are handled by positionRadialStack()
          player.reminders.forEach((reminder, idx) => {
              if (reminder.type === 'icon') {
                const iconEl = document.createElement('div');
                iconEl.className = 'icon-reminder';
                iconEl.style.transform = `translate(-50%, -50%) rotate(${reminder.rotation || 0}deg)`;
                iconEl.style.backgroundImage = `url('${resolveAssetPath(reminder.image)}'), url('${resolveAssetPath('assets/img/token-BqDQdWeO.webp')}')`;
                iconEl.title = (reminder.label || '');
                iconEl.addEventListener('click', (e) => {
                  const parentLi = iconEl.closest('li');
                  const isCollapsed = !!(parentLi && parentLi.dataset.expanded !== '1');
                  if (isCollapsed) {
                    e.stopPropagation();
                    try { e.preventDefault(); } catch(_) {}
                    parentLi.dataset.expanded = '1';
                    parentLi.dataset.actionSuppressUntil = String(Date.now() + CLICK_EXPAND_SUPPRESS_MS);
                    positionRadialStack(parentLi, players[i].reminders.length);
                  }
                }, true);

                if (reminder.label) {
                  // Check if this is a custom reminder by ID
                  const isCustom = reminder.id === 'custom-note';
                  
                  if (isCustom) {
                    // For custom reminders, show straight text with dark background
                    const textSpan = document.createElement('span');
                    textSpan.className = 'icon-reminder-content';
                    textSpan.textContent = reminder.label;
                    
                    // Adjust font size based on text length
                    const textLength = reminder.label.length;
                    if (textLength > 40) {
                      textSpan.style.fontSize = 'clamp(7px, calc(var(--token-size) * 0.06), 10px)';
                    } else if (textLength > 20) {
                      textSpan.style.fontSize = 'clamp(8px, calc(var(--token-size) * 0.07), 12px)';
                    }
                    
                    iconEl.appendChild(textSpan);
                  } else {
                    // For other reminders, show curved text at bottom
                    const svg = createCurvedLabelSvg(`arc-${i}-${idx}`, reminder.label);
                    iconEl.appendChild(svg);
                  }
                }

                const delBtn = document.createElement('div');
                delBtn.className = 'reminder-delete-btn';
                delBtn.title = 'Delete';
                delBtn.textContent = '🗑';
                const onDeleteIcon = (e) => {
                  e.stopPropagation();
                  try { e.preventDefault(); } catch(_) {}
                  const parentLi = delBtn.closest('li');
                  // Block action if not expanded or if within suppression window
                  if (parentLi) {
                    const suppressUntil = parseInt(parentLi.dataset.actionSuppressUntil || '0', 10);
                    if (parentLi.dataset.expanded !== '1') {
                      // Expand instead
                      parentLi.dataset.expanded = '1';
                      if (isTouchDevice) parentLi.dataset.actionSuppressUntil = String(Date.now() + CLICK_EXPAND_SUPPRESS_MS);
                      positionRadialStack(parentLi, players[i].reminders.length);
                      return;
                    }
                    if (Date.now() < suppressUntil && isTouchDevice) {
                      return;
                    }
                  }
                  players[i].reminders.splice(idx, 1);
                  updateGrimoire();
                  saveAppState();
                };
                delBtn.addEventListener('click', onDeleteIcon);
                delBtn.addEventListener('touchend', onDeleteIcon, { passive: false });
                iconEl.appendChild(delBtn);

                remindersDiv.appendChild(iconEl);
              } else {
                const reminderEl = document.createElement('div');
                reminderEl.className = 'text-reminder';
                
                // Check if this is actually a text reminder with a label (legacy data)
                // If so, use the label as the display text
                const displayText = reminder.label || reminder.value || '';
                
                // Create a span for the text with dark background
                const textSpan = document.createElement('span');
                textSpan.className = 'text-reminder-content';
                textSpan.textContent = displayText;
                
                // Adjust font size based on text length
                const textLength = displayText.length;
                if (textLength > 40) {
                  textSpan.style.fontSize = 'clamp(7px, calc(var(--token-size) * 0.06), 10px)';
                } else if (textLength > 20) {
                  textSpan.style.fontSize = 'clamp(8px, calc(var(--token-size) * 0.07), 12px)';
                }
                
                reminderEl.appendChild(textSpan);
                
                reminderEl.style.transform = 'translate(-50%, -50%)';
                reminderEl.onclick = (e) => {
                  e.stopPropagation();
                  const parentLi = reminderEl.closest('li');
                  if (parentLi) {
                    const suppressUntil = parseInt(parentLi.dataset.actionSuppressUntil || '0', 10);
                    if (parentLi.dataset.expanded !== '1' || Date.now() < suppressUntil) {
                      // If collapsed, expand instead of acting
                      if (parentLi.dataset.expanded !== '1') {
                        parentLi.dataset.expanded = '1';
                        parentLi.dataset.actionSuppressUntil = String(Date.now() + CLICK_EXPAND_SUPPRESS_MS);
                        positionRadialStack(parentLi, players[i].reminders.length);
                      }
                      return;
                    }
                  }
                  openTextReminderModal(i, idx, reminder.label || reminder.value);
                };
                const delBtn2 = document.createElement('div');
                delBtn2.className = 'reminder-delete-btn';
                delBtn2.title = 'Delete';
                delBtn2.textContent = '🗑';
                const onDeleteText = (e) => {
                  e.stopPropagation();
                  try { e.preventDefault(); } catch(_) {}
                  const parentLi = delBtn2.closest('li');
                  // Block action if not expanded or if within suppression window
                  if (parentLi) {
                    const suppressUntil = parseInt(parentLi.dataset.actionSuppressUntil || '0', 10);
                    if (parentLi.dataset.expanded !== '1') {
                      parentLi.dataset.expanded = '1';
                      if (isTouchDevice) parentLi.dataset.actionSuppressUntil = String(Date.now() + CLICK_EXPAND_SUPPRESS_MS);
                      positionRadialStack(parentLi, players[i].reminders.length);
                      return;
                    }
                    if (Date.now() < suppressUntil && isTouchDevice) {
                      return;
                    }
                  }
                  players[i].reminders.splice(idx, 1);
                  updateGrimoire();
                  saveAppState();
                };
                delBtn2.addEventListener('click', onDeleteText);
                delBtn2.addEventListener('touchend', onDeleteText, { passive: false });
                reminderEl.appendChild(delBtn2);
                remindersDiv.appendChild(reminderEl);
              }
          });

          // After rendering, position all reminders and the plus button in a radial stack
          positionRadialStack(li, player.reminders.length);
      });
      
      // Position info icons after updating grimoire
      if ('ontouchstart' in window) {
          positionInfoIcons();
      }
  }

  // Arrange reminders and plus button along the line from token center to circle center
  function positionRadialStack(li, count) {
      // Use the visual token circle as the anchor, not the whole container with name tag
      const tokenEl = li.querySelector('.player-token') || li;
      const tokenRadiusPx = tokenEl.offsetWidth / 2;
      const angle = parseFloat(li.dataset.angle || '0');
      const isExpanded = li.dataset.expanded === '1';
      const remindersContainer = li.querySelector('.reminders');
      if (remindersContainer) {
          const touchUntil = parseInt(li.dataset.touchSuppressUntil || '0', 10);
          const actionUntil = parseInt(li.dataset.actionSuppressUntil || '0', 10);
          const suppressUntil = Math.max(touchUntil, actionUntil);
          const inSuppressWindow = Date.now() < suppressUntil;
          // Allow pointer events for reminders only when expanded. During suppression window,
          // keep them disabled to avoid immediate action on first click/tap.
          remindersContainer.style.pointerEvents = isExpanded ? (inSuppressWindow ? 'none' : 'auto') : 'none';
      }
      
      // Compute the actual distance from circle center to this token center (runtime radius)
      const container = li.parentElement;
      const cRect = container ? container.getBoundingClientRect() : null;
      const liRect = li.getBoundingClientRect();
      const tRect = tokenEl.getBoundingClientRect();
      const centerX = cRect ? (cRect.left + cRect.width / 2) : (tRect.left + tRect.width / 2);
      const centerY = cRect ? (cRect.top + cRect.height / 2) : (tRect.top + tRect.height / 2);
      const tokenCenterX = tRect.left + tRect.width / 2;
      const tokenCenterY = tRect.top + tRect.height / 2;
      const vx = centerX - tokenCenterX;
      const vy = centerY - tokenCenterY;
      const runtimeRadius = Math.hypot(vx, vy);
      const ux = vx / (runtimeRadius || 1);
      const uy = vy / (runtimeRadius || 1);

             const reminderDiameter = Math.max(34, tokenEl.offsetWidth * 0.36);
      const reminderRadius = reminderDiameter / 2;
             const plusRadius = (tokenEl.offsetWidth * 0.28) / 2; // from CSS: width: token-size * 0.28
      const edgeGap = Math.max(8, tokenRadiusPx * 0.08);
      const spacing = reminderDiameter + edgeGap;

      const reminderEls = li.querySelectorAll('.reminders .icon-reminder, .reminders .text-reminder');
      
      // Create or update hover zone to prevent janking
      let hoverZone = li.querySelector('.reminder-hover-zone');
      if (!hoverZone) {
          hoverZone = document.createElement('div');
          hoverZone.className = 'reminder-hover-zone';
          li.querySelector('.reminders').appendChild(hoverZone);
      }
      
      if (isExpanded) {
          // Expanded state: position reminders in radial stack
          const firstReminderOffsetFromToken = tokenRadiusPx + edgeGap + reminderRadius;
          reminderEls.forEach((el, idx) => {
              // Target absolute point along the true vector from token center towards circle center
              const offset = firstReminderOffsetFromToken + idx * spacing;
              const absX = tokenCenterX + ux * offset;
              const absY = tokenCenterY + uy * offset;
              const cx = absX - liRect.left; // center within li
              const cy = absY - liRect.top;
              el.style.left = `${cx}px`;
              el.style.top = `${cy}px`;
              el.style.transform = 'translate(-50%, -50%)';
              el.style.zIndex = '5';

              // Place delete button to the "east" side relative to the radial (plus) direction
              const del = el.querySelector('.reminder-delete-btn');
              if (del) {
                const eastX = -uy;
                const eastY = ux;
                const deleteOffset = reminderRadius + Math.max(6, edgeGap * 0.25);
                del.style.left = '50%';
                del.style.top = '50%';
                del.style.transform = `translate(-50%, -50%) translate(${eastX * deleteOffset}px, ${eastY * deleteOffset}px)`;
              }
          });
          
                  // Position hover zone as a rectangle along the radial line
        const hoverZoneStart = tokenRadiusPx + edgeGap; // Start from token edge
        // Limit hover zone to not exceed the circle center (runtime radius is distance from center to token center)
        const maxHoverZoneEnd = Math.min(
          tokenRadiusPx + 200,
          Math.max(tokenRadiusPx + edgeGap + 20, runtimeRadius - Math.max(12, tokenRadiusPx * 0.25))
        ); // Stay away from center
        const hoverZoneEnd = Math.max(hoverZoneStart + 20, maxHoverZoneEnd); // Ensure minimum width of 20px
        const hoverZoneWidth = hoverZoneEnd - hoverZoneStart; // Width along the radial line
        const hoverZoneHeight = reminderDiameter; // Match reminder size to prevent overlap
          
          // Calculate the center of the hover zone along the radial line
          const hoverZoneCenterOffset = (hoverZoneStart + hoverZoneEnd) / 2;
          const hoverZoneCenterX = tokenCenterX + ux * hoverZoneCenterOffset;
          const hoverZoneCenterY = tokenCenterY + uy * hoverZoneCenterOffset;
          
          // Calculate the rotation angle for the hover zone
          const rotationAngle = Math.atan2(uy, ux) * (180 / Math.PI);
          
          // Position the hover zone
          const hx = hoverZoneCenterX - liRect.left;
          const hy = hoverZoneCenterY - liRect.top;
          
          hoverZone.style.left = `${hx - hoverZoneWidth / 2}px`;
          hoverZone.style.top = `${hy - hoverZoneHeight / 2}px`;
          hoverZone.style.width = `${hoverZoneWidth}px`;
          hoverZone.style.height = `${hoverZoneHeight}px`;
          hoverZone.style.transform = `translate(0, 0) rotate(${rotationAngle}deg)`;
          hoverZone.style.transformOrigin = 'center center';
          
                  // Debug logging
        console.log(`Hover zone for player ${li.querySelector('.player-name')?.textContent || 'unknown'}:`, {
            left: hoverZone.style.left,
            top: hoverZone.style.top,
            width: hoverZone.style.width,
            height: hoverZone.style.height,
            rotation: rotationAngle,
            isExpanded: isExpanded,
            runtimeRadius: runtimeRadius,
            hoverZoneEnd: hoverZoneEnd,
            maxAllowed: runtimeRadius - 10
        });
      } else {
          // Collapsed state: stack reminders tightly behind the token
          const collapsedOffset = tokenRadiusPx + edgeGap + reminderRadius;
          const collapsedSpacing = reminderRadius * 0.3; // Very tight spacing when collapsed
          
          reminderEls.forEach((el, idx) => {
              // Position reminders in a tight stack behind the token
              const offset = collapsedOffset + (idx * collapsedSpacing);
              const absX = tokenCenterX + ux * offset;
              const absY = tokenCenterY + uy * offset;
              const cx = absX - liRect.left;
              const cy = absY - liRect.top;
              el.style.left = `${cx}px`;
              el.style.top = `${cy}px`;
              el.style.transform = 'translate(-50%, -50%) scale(0.8)';
              el.style.zIndex = '2';

              // Place delete button to the "east" side relative to the radial (plus) direction
              const del = el.querySelector('.reminder-delete-btn');
              if (del) {
                const eastX = -uy;
                const eastY = ux;
                const deleteOffset = reminderRadius + Math.max(6, edgeGap * 0.25);
                del.style.left = '50%';
                del.style.top = '50%';
                del.style.transform = `translate(-50%, -50%) translate(${eastX * deleteOffset}px, ${eastY * deleteOffset}px)`;
              }
          });
          
                  // Position hover zone as a rectangle along the radial line (same as expanded state)
        const hoverZoneStart = tokenRadiusPx + edgeGap; // Start from token edge
        // Limit hover zone to not exceed the circle center (runtime radius is distance from center to token center)
        const maxHoverZoneEnd = Math.min(
          tokenRadiusPx + 200,
          Math.max(tokenRadiusPx + edgeGap + 20, runtimeRadius - Math.max(12, tokenRadiusPx * 0.25))
        ); // Stay away from center
        const hoverZoneEnd = Math.max(hoverZoneStart + 20, maxHoverZoneEnd); // Ensure minimum width of 20px
        const hoverZoneWidth = hoverZoneEnd - hoverZoneStart; // Width along the radial line
        const hoverZoneHeight = reminderDiameter; // Match reminder size to prevent overlap
          
          // Calculate the center of the hover zone along the radial line
          const hoverZoneCenterOffset = (hoverZoneStart + hoverZoneEnd) / 2;
          const hoverZoneCenterX = tokenCenterX + ux * hoverZoneCenterOffset;
          const hoverZoneCenterY = tokenCenterY + uy * hoverZoneCenterOffset;
          
          // Calculate the rotation angle for the hover zone
          const rotationAngle = Math.atan2(uy, ux) * (180 / Math.PI);
          
          // Position the hover zone
          const hx = hoverZoneCenterX - liRect.left;
          const hy = hoverZoneCenterY - liRect.top;
          
          hoverZone.style.left = `${hx - hoverZoneWidth / 2}px`;
          hoverZone.style.top = `${hy - hoverZoneHeight / 2}px`;
          hoverZone.style.width = `${hoverZoneWidth}px`;
          hoverZone.style.height = `${hoverZoneHeight}px`;
          hoverZone.style.transform = `translate(0, 0) rotate(${rotationAngle}deg)`;
          hoverZone.style.transformOrigin = 'center center';
      }

      const plus = li.querySelector('.reminder-placeholder');
             if (plus) {
           if (isExpanded) {
               // Expanded state: place plus button just beyond the last reminder with a small gap
               const smallGap = Math.max(4, edgeGap * 0.25);
               let offsetFromEdge = tokenRadiusPx + edgeGap + plusRadius;
               if (count > 0) {
                   // From token edge -> last reminder center -> last reminder edge -> small gap -> plus center
                   offsetFromEdge = tokenRadiusPx + edgeGap + reminderRadius + ((count - 1) * spacing) + reminderRadius + smallGap + plusRadius;
               }
               const targetOffset = Math.min(offsetFromEdge, Math.max(tokenRadiusPx + edgeGap + plusRadius + 8, runtimeRadius - Math.max(12, plusRadius)));
               const absPX = tokenCenterX + ux * targetOffset;
               const absPY = tokenCenterY + uy * targetOffset;
               const px = absPX - liRect.left;
               const py = absPY - liRect.top;
               plus.style.left = `${px}px`;
               plus.style.top = `${py}px`;
               plus.style.transform = 'translate(-50%, -50%)';
               plus.style.zIndex = '6';
           } else {
              // Collapsed state: position plus button at the back of the collapsed stack
              const collapsedSpacing = reminderRadius * 0.3; // must match collapsed stack spacing above
              const smallGap = Math.max(2, edgeGap * 0.25);
              let collapsedOffset = tokenRadiusPx + edgeGap + plusRadius;
              if (count > 0) {
                  const firstCenter = tokenRadiusPx + edgeGap + reminderRadius;
                  const lastCenter = firstCenter + ((count - 1) * collapsedSpacing);
                  collapsedOffset = lastCenter + reminderRadius + smallGap + plusRadius;
              }
              const targetOffsetCollapsed = Math.min(collapsedOffset, Math.max(tokenRadiusPx + edgeGap + plusRadius + 6, runtimeRadius - Math.max(10, plusRadius)));
              const absPX = tokenCenterX + ux * targetOffsetCollapsed;
              const absPY = tokenCenterY + uy * targetOffsetCollapsed;
              const px = absPX - liRect.left;
              const py = absPY - liRect.top;
              plus.style.left = `${px}px`;
              plus.style.top = `${py}px`;
              plus.style.transform = 'translate(-50%, -50%) scale(0.9)';
              plus.style.zIndex = '6';
          }
      }
  }

  // Ensure an SVG layer exists to render radial guide lines and the center marker
  function ensureGuidesSvg() {
    const circleEl = document.getElementById('player-circle');
    if (!circleEl) return null;
    let svg = circleEl.querySelector('#radial-guides');
    if (!svg) {
      svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('id', 'radial-guides');
      svg.setAttribute('preserveAspectRatio', 'none');
      svg.style.position = 'absolute';
      svg.style.left = '0';
      svg.style.top = '0';
      svg.style.width = '100%';
      svg.style.height = '100%';
      svg.style.pointerEvents = 'none';
      svg.style.zIndex = '-1';
      // Insert behind token <li> elements
      if (circleEl.firstChild) {
        circleEl.insertBefore(svg, circleEl.firstChild);
      } else {
        circleEl.appendChild(svg);
      }
    }
    return svg;
  }

  // Draw lines from each token center to the center of the big circle and a visible center mark
  function drawRadialGuides() {
    const circleEl = document.getElementById('player-circle');
    if (!circleEl) return;
    const svg = ensureGuidesSvg();
    if (!svg) return;

    const width = circleEl.offsetWidth || 0;
    const height = circleEl.offsetHeight || 0;
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

    // Clear previous
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    // Center point
    const cx = width / 2;
    const cy = height / 2;

    // Add subtle center mark
    const centerOuter = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    centerOuter.setAttribute('cx', String(cx));
    centerOuter.setAttribute('cy', String(cy));
    centerOuter.setAttribute('r', '10');
    centerOuter.setAttribute('fill', 'rgba(0,0,0,0.35)');
    centerOuter.setAttribute('stroke', '#D4AF37');
    centerOuter.setAttribute('stroke-width', '2');
    svg.appendChild(centerOuter);

    const centerInner = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    centerInner.setAttribute('cx', String(cx));
    centerInner.setAttribute('cy', String(cy));
    centerInner.setAttribute('r', '3');
    centerInner.setAttribute('fill', '#D4AF37');
    svg.appendChild(centerInner);

    // Lines to each token
    const containerRect = circleEl.getBoundingClientRect();
    const lis = circleEl.querySelectorAll('li');
    lis.forEach(li => {
      const token = li.querySelector('.player-token');
      const rect = token ? token.getBoundingClientRect() : li.getBoundingClientRect();
      const tx = (rect.left - containerRect.left) + rect.width / 2;
      const ty = (rect.top - containerRect.top) + rect.height / 2;
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', String(cx));
      line.setAttribute('y1', String(cy));
      line.setAttribute('x2', String(tx));
      line.setAttribute('y2', String(ty));
      line.setAttribute('stroke', 'rgba(255,255,255,0.25)');
      line.setAttribute('stroke-width', '2');
      line.setAttribute('shape-rendering', 'geometricPrecision');
      svg.appendChild(line);
    });
  }
  
  function openCharacterModal(playerIndex) {
      if (!scriptData) {
          alert("Please load a script first.");
          return;
      }
      selectedPlayerIndex = playerIndex;
      characterModalPlayerName.textContent = players[playerIndex].name;
      populateCharacterGrid();
      characterModal.style.display = 'flex';
      characterSearch.value = '';
      characterSearch.focus();
  }

  function populateCharacterGrid() {
      characterGrid.innerHTML = '';
      const filter = characterSearch.value.toLowerCase();
      
      const filteredRoles = Object.values(allRoles)
          .filter(role => role.name.toLowerCase().includes(filter));
      
      console.log(`Showing ${filteredRoles.length} characters for filter: "${filter}"`);
      
      filteredRoles.forEach(role => {
          const tokenEl = document.createElement('div');
          tokenEl.className = 'token';
          tokenEl.style.backgroundImage = `url('${role.image}'), url('./assets/img/token-BqDQdWeO.webp')`;
          tokenEl.style.backgroundSize = '68% 68%, cover';
          tokenEl.style.position = 'relative';
          tokenEl.style.overflow = 'visible';
          tokenEl.title = role.name;
          tokenEl.onclick = () => assignCharacter(role.id);
          // Add curved bottom text on the token preview
          const svg = createCurvedLabelSvg(`picker-role-arc-${role.id}` , role.name);
          tokenEl.appendChild(svg);
          characterGrid.appendChild(tokenEl);
      });
  }

  function assignCharacter(roleId) {
      if (selectedPlayerIndex > -1) {
          players[selectedPlayerIndex].character = roleId;
          console.log(`Assigned character ${roleId} to player ${selectedPlayerIndex}`);
          updateGrimoire();
          characterModal.style.display = 'none';
          saveAppState();
      }
  }

  function openTextReminderModal(playerIndex, reminderIndex = -1, existingText = '') {
      editingReminder = { playerIndex, reminderIndex };
      reminderTextInput.value = existingText;
      textReminderModal.style.display = 'flex';
      reminderTextInput.focus();
  }

  saveReminderBtn.onclick = () => {
      const text = reminderTextInput.value.trim();
      const { playerIndex, reminderIndex } = editingReminder;
      if (text) {
          if (reminderIndex > -1) {
              // Update existing reminder - preserve label if it exists
              players[playerIndex].reminders[reminderIndex].value = text;
              if (players[playerIndex].reminders[reminderIndex].label !== undefined) {
                  players[playerIndex].reminders[reminderIndex].label = text;
              }
          } else {
              players[playerIndex].reminders.push({ type: 'text', value: text });
          }
      } else if (reminderIndex > -1) {
          players[playerIndex].reminders.splice(reminderIndex, 1);
      }
      updateGrimoire();
      saveAppState();
      textReminderModal.style.display = 'none';
  };

  closeCharacterModalBtn.onclick = () => characterModal.style.display = 'none';
  cancelReminderBtn.onclick = () => textReminderModal.style.display = 'none';
  characterSearch.oninput = populateCharacterGrid;
  closeReminderTokenModalBtn && (closeReminderTokenModalBtn.onclick = () => reminderTokenModal.style.display = 'none');
  reminderTokenSearch && (reminderTokenSearch.oninput = populateReminderTokenGrid);

  // Close modals by tapping outside content
  characterModal.addEventListener('click', (e) => { if (e.target === characterModal) characterModal.style.display = 'none'; });
  textReminderModal.addEventListener('click', (e) => { if (e.target === textReminderModal) textReminderModal.style.display = 'none'; });
  reminderTokenModal && reminderTokenModal.addEventListener('click', (e) => { if (e.target === reminderTokenModal) reminderTokenModal.style.display = 'none'; });

  function createCurvedLabelSvg(uniqueId, labelText) {
      const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
      svg.setAttribute('viewBox','0 0 100 100');
      svg.setAttribute('preserveAspectRatio','xMidYMid meet');
      svg.classList.add('icon-reminder-svg');
      const defs = document.createElementNS('http://www.w3.org/2000/svg','defs');
      const path = document.createElementNS('http://www.w3.org/2000/svg','path');
      path.setAttribute('id', uniqueId);
      // Perfect bottom half-circle inside the token rim
      path.setAttribute('d','M10,50 A40,40 0 0,0 90,50');
      defs.appendChild(path);
      svg.appendChild(defs);
          const text = document.createElementNS('http://www.w3.org/2000/svg','text');
    text.setAttribute('class','icon-reminder-text');
    text.setAttribute('text-anchor','middle');
    const textPath = document.createElementNS('http://www.w3.org/2000/svg','textPath');
    textPath.setAttributeNS('http://www.w3.org/1999/xlink','xlink:href',`#${uniqueId}`);
    textPath.setAttribute('startOffset','50%');
      // Truncate display on token to avoid overcrowding, but keep tooltip full
      const full = String(labelText || '');
      const maxChars = 14;
      const display = full.length > maxChars ? full.slice(0, maxChars - 1) + '…' : full;
      const len = display.length;
      // Dynamic font size based on length
      let fontSize = 12;
      if (len > 12 && len <= 16) fontSize = 11.5;
      else if (len > 16) fontSize = 11;
      text.style.fontSize = `${fontSize}px`;
      text.style.letterSpacing = '0.1px';
      text.setAttribute('lengthAdjust','spacingAndGlyphs');
      // Force the displayed text to fit exactly along the arc
      const targetLength = 92; // tweakable to the visual arc length
      textPath.setAttribute('textLength', String(targetLength));
      textPath.textContent = display;
      text.appendChild(textPath);
      svg.appendChild(text);
      return svg;
  }

  // Create a black ribbon SVG similar to the reference image
  function createDeathRibbonSvg() {
      const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
      svg.setAttribute('viewBox','0 0 100 140');
      svg.setAttribute('preserveAspectRatio','xMidYMid meet');
      svg.style.pointerEvents = 'none';
      const defs = document.createElementNS('http://www.w3.org/2000/svg','defs');
      const pattern = document.createElementNS('http://www.w3.org/2000/svg','pattern');
      pattern.setAttribute('id','deathPattern');
      pattern.setAttribute('patternUnits','userSpaceOnUse');
      pattern.setAttribute('width','12');
      pattern.setAttribute('height','12');
      const pbg = document.createElementNS('http://www.w3.org/2000/svg','rect');
      pbg.setAttribute('width','12');
      pbg.setAttribute('height','12');
      pbg.setAttribute('fill','#0f0f10');
      const p1 = document.createElementNS('http://www.w3.org/2000/svg','path');
      p1.setAttribute('d','M0 12 L12 0 M-3 9 L3 3 M9 15 L15 9');
      p1.setAttribute('stroke','#1b1b1d');
      p1.setAttribute('stroke-width','2');
      defs.appendChild(pattern);
      pattern.appendChild(pbg);
      pattern.appendChild(p1);
      svg.appendChild(defs);

      // Main banner
      const rect = document.createElementNS('http://www.w3.org/2000/svg','rect');
      rect.setAttribute('x','22');
      rect.setAttribute('y','0');
      rect.setAttribute('rx','6');
      rect.setAttribute('ry','6');
      rect.setAttribute('width','56');
      rect.setAttribute('height','88');
      rect.setAttribute('fill','url(#deathPattern)');
      rect.setAttribute('stroke','#000');
      rect.setAttribute('stroke-width','6');
      rect.setAttribute('pointer-events','visiblePainted');

      // Notch
      const notch = document.createElementNS('http://www.w3.org/2000/svg','path');
      notch.setAttribute('d','M22 88 L50 120 L78 88 Z');
      notch.setAttribute('fill','url(#deathPattern)');
      notch.setAttribute('stroke','#000');
      notch.setAttribute('stroke-width','6');
      notch.setAttribute('pointer-events','visiblePainted');

      // Subtle inner shadow
      const shadow = document.createElementNS('http://www.w3.org/2000/svg','rect');
      shadow.setAttribute('x','26');
      shadow.setAttribute('y','4');
      shadow.setAttribute('rx','6');
      shadow.setAttribute('ry','6');
      shadow.setAttribute('width','48');
      shadow.setAttribute('height','78');
      shadow.setAttribute('fill','rgba(255,255,255,0.03)');
      shadow.setAttribute('pointer-events','none');

      svg.appendChild(rect);
      svg.appendChild(notch);
      svg.appendChild(shadow);
      return svg;
  }

  function openReminderTokenModal(playerIndex) {
      selectedPlayerIndex = playerIndex;
      if (reminderTokenModalPlayerName) reminderTokenModalPlayerName.textContent = players[playerIndex].name;
      reminderTokenModal.style.display = 'flex';
      if (reminderTokenSearch) reminderTokenSearch.value = '';
      populateReminderTokenGrid();
  }

    async function populateReminderTokenGrid() {
       if (!reminderTokenGrid) return;
      reminderTokenGrid.innerHTML = '';
      try {
         const res = await fetch('./tokens.json?v=reminders', { cache: 'no-store' });
        if (!res.ok) throw new Error('Failed to load tokens.json');
                 const json = await res.json();
                   let reminderTokens = Array.isArray(json.reminderTokens) ? json.reminderTokens : [];
          if (reminderTokens.length === 0) {
          // Fallback set if tokens.json has no reminderTokens
          reminderTokens = [
            { id: 'drunk-isthedrunk', image: '/assets/reminders/drunk_g--QNmv0ZY.webp', label: 'Is The Drunk' },
            { id: 'good-good', image: '/assets/reminders/good-D9wGdnv9.webp', label: 'Good' },
            { id: 'evil-evil', image: '/assets/reminders/evil-CDY3e2Qm.webp', label: 'Evil' },
            { id: 'custom-note', image: '/assets/reminders/custom-CLofFTEi.webp', label: 'Custom note' },
            { id: 'virgin-noability', image: '/assets/reminders/virgin_g-DfRSMLSj.webp', label: 'No Ability' }
          ];
        }
         const filter = (reminderTokenSearch && reminderTokenSearch.value || '').toLowerCase();
         // Normalize image paths for gh-pages subpath
         reminderTokens = reminderTokens.map(t => ({ ...t, image: resolveAssetPath(t.image) }));
         // Put custom option at the top
         const isCustom = (t) => /custom/i.test(t.label || '') || /custom/i.test(t.id || '');
         reminderTokens.sort((a, b) => (isCustom(a) === isCustom(b)) ? 0 : (isCustom(a) ? -1 : 1));
                                       const filtered = reminderTokens.filter(t => (t.label || '').toLowerCase().includes(filter));
          (filtered.length ? filtered : reminderTokens).forEach((token, idx) => {
            const tokenEl = document.createElement('div');
            tokenEl.className = 'token';
            tokenEl.style.backgroundImage = `url('${resolveAssetPath(token.image)}'), url('${resolveAssetPath('assets/img/token-BqDQdWeO.webp')}')`;
            tokenEl.style.backgroundSize = 'cover, cover';
            tokenEl.style.position = 'relative';
            tokenEl.style.overflow = 'visible';
            tokenEl.style.zIndex = '1';
            tokenEl.title = token.label || '';
            const handleSelect = (ev) => {
                try { ev.preventDefault(); } catch(_) {}
                ev.stopPropagation();
                let label = token.label;
                if ((label || '').toLowerCase().includes('custom')) {
                  const input = prompt('Enter reminder text:', '');
                  if (input === null) return;
                  label = input;
                }
                players[selectedPlayerIndex].reminders.push({ type: 'icon', id: token.id, image: token.image, label, rotation: 0 });
                updateGrimoire();
                saveAppState();
                reminderTokenModal.style.display = 'none';
            };
            tokenEl.addEventListener('click', handleSelect);
            tokenEl.addEventListener('touchend', handleSelect, { passive: false });

            // Add curved bottom text to preview
            if (token.label) {
              const svg = createCurvedLabelSvg(`picker-arc-${idx}`, token.label);
              tokenEl.appendChild(svg);
            }
            reminderTokenGrid.appendChild(tokenEl);
        });
      } catch (e) {
        console.error(e);
        // As a last resort, show a simple message
        const msg = document.createElement('div');
        msg.style.color = '#ccc';
        msg.textContent = 'No reminder tokens available.';
        reminderTokenGrid.appendChild(msg);
      }
  }
  
  // Handle container resize to reposition players
  let resizeObserver;
  if ('ResizeObserver' in window) {
    resizeObserver = new ResizeObserver((entries) => {
      if (players.length > 0) {
        console.log('Container resized, repositioning players...');
        requestAnimationFrame(repositionPlayers);
      }
    });
    
    // Observe the player circle container for size changes
    const playerCircle = document.getElementById('player-circle');
    if (playerCircle) {
      resizeObserver.observe(playerCircle);
    }
  } else {
    // Fallback to window resize for older browsers
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        if (players.length > 0) {
          console.log('Window resized, repositioning players...');
          requestAnimationFrame(repositionPlayers);
        }
      }, 250);
    });
  }
  
  // Also reposition players when the page becomes visible (in case of tab switching)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && players.length > 0) {
      requestAnimationFrame(repositionPlayers);
    }
  });
  
  function displayScript(data) {
    console.log('Displaying script with', data.length, 'characters');
    characterSheet.innerHTML = '';
    
    // Group characters by team if we have resolved role data
    const teamGroups = {};
    Object.values(allRoles).forEach(role => {
        if (!teamGroups[role.team]) {
            teamGroups[role.team] = [];
        }
        teamGroups[role.team].push(role);
    });
    
    // Display grouped by team if we have team information
    if (Object.keys(teamGroups).length > 0) {
        const teamOrder = ['townsfolk', 'outsider', 'minion', 'demon', 'travellers', 'fabled'];
        teamOrder.forEach(team => {
            if (teamGroups[team] && teamGroups[team].length > 0) {
                const teamHeader = document.createElement('h3');
                teamHeader.textContent = team.charAt(0).toUpperCase() + team.slice(1);
                teamHeader.className = `team-${team}`;
                characterSheet.appendChild(teamHeader);
                
                teamGroups[team].forEach(role => {
                    const roleEl = document.createElement('div');
                    roleEl.className = 'role';
         roleEl.innerHTML = `
                         <span class="icon" style="background-image: url('${role.image}'), url('./assets/img/token-BqDQdWeO.webp'); background-size: cover, cover;"></span>
                         <span class="name">${role.name}</span>
                         <div class="ability">${role.ability || 'No ability description available'}</div>
                     `;
                    // Add click handler to toggle ability display
                    roleEl.addEventListener('click', () => {
                        roleEl.classList.toggle('show-ability');
                    });
                    characterSheet.appendChild(roleEl);
                });
            }
        });
    } else {
        // Fallback: show all characters in a single list
        const header = document.createElement('h3');
        header.textContent = 'Characters';
        header.className = 'team-townsfolk';
        characterSheet.appendChild(header);
        
        data.forEach((characterItem, index) => {
            if (typeof characterItem === 'string' && characterItem !== '_meta') {
                const roleEl = document.createElement('div');
                roleEl.className = 'role';
                 roleEl.innerHTML = `
                     <span class="icon" style="background-image: url('./assets/img/token-BqDQdWeO.webp'); background-size: cover;"></span>
                     <span class="name">${characterItem.charAt(0).toUpperCase() + characterItem.slice(1)}</span>
                 `;
                characterSheet.appendChild(roleEl);
            } else if (typeof characterItem === 'object' && characterItem !== null && characterItem.id && characterItem.id !== '_meta') {
                // Display custom character objects
                const roleEl = document.createElement('div');
                roleEl.className = 'role';
                const image = characterItem.image ? resolveAssetPath(characterItem.image) : './assets/img/token-BqDQdWeO.webp';
                roleEl.innerHTML = `
                    <span class="icon" style="background-image: url('${image}'), url('./assets/img/token-BqDQdWeO.webp'); background-size: cover, cover;"></span>
                    <span class="name">${characterItem.name || characterItem.id}</span>
                    <div class="ability">${characterItem.ability || 'No ability description available'}</div>
                `;
                // Add click handler to toggle ability display
                roleEl.addEventListener('click', () => {
                    roleEl.classList.toggle('show-ability');
                });
                characterSheet.appendChild(roleEl);
            }
        });
    }
  }

  // Auto-load default tokens when the page is ready
  function autoLoadTokens() {
    // Check if service worker is ready
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      console.log('Service worker ready');
    } else {
      // Wait for service worker to be ready
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('Service worker controller changed');
      });
      
      // Fallback: if no service worker after a reasonable time, load anyway
      const fallbackTimer = setTimeout(() => {
        if (!navigator.serviceWorker.controller) {
          console.log('Service worker not ready');
        }
      }, 2000);
      
      // Clear fallback if service worker becomes ready
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        clearTimeout(fallbackTimer);
      });
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoLoadTokens);
  } else {
    autoLoadTokens();
  }

  // Sidebar resizer: drag to adjust width
  (function initSidebarResize() {
    if (!sidebarResizer || !sidebarEl) return;
    // Load persisted width
    const saved = localStorage.getItem('sidebarWidthPx');
    if (saved) {
      document.documentElement.style.setProperty('--sidebar-width', `${Math.max(220, Math.min(parseInt(saved,10), 600))}px`);
    }
    let isDragging = false;
    let startX = 0;
    let startWidth = 0;
    const minW = 220;
    const maxW = 800;
    const onMove = (e) => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const newW = Math.max(minW, Math.min(startWidth + dx, maxW));
      document.documentElement.style.setProperty('--sidebar-width', `${newW}px`);
    };
    const onUp = () => {
      if (!isDragging) return;
      isDragging = false;
      document.body.classList.remove('resizing');
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      const val = getComputedStyle(sidebarEl).width;
      localStorage.setItem('sidebarWidthPx', parseInt(val, 10));
    };
    sidebarResizer.addEventListener('mousedown', (e) => {
      isDragging = true;
      startX = e.clientX;
      startWidth = sidebarEl.getBoundingClientRect().width;
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
      document.body.classList.add('resizing');
    });

    // Touch support for resizing
    const onTouchMove = (e) => {
      if (!isDragging) return;
      if (e.touches && e.touches.length) {
        e.preventDefault();
        const dx = e.touches[0].clientX - startX;
        const newW = Math.max(minW, Math.min(startWidth + dx, maxW));
        document.documentElement.style.setProperty('--sidebar-width', `${newW}px`);
      }
    };
    const onTouchEnd = () => {
      if (!isDragging) return;
      isDragging = false;
      document.body.classList.remove('resizing');
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
      const val = getComputedStyle(sidebarEl).width;
      localStorage.setItem('sidebarWidthPx', parseInt(val, 10));
    };
    sidebarResizer.addEventListener('touchstart', (e) => {
      if (!e.touches || !e.touches.length) return;
      isDragging = true;
      startX = e.touches[0].clientX;
      startWidth = sidebarEl.getBoundingClientRect().width;
      document.addEventListener('touchmove', onTouchMove, { passive: false });
      document.addEventListener('touchend', onTouchEnd);
      document.body.classList.add('resizing');
    }, { passive: true });
  })();

  // Sidebar open/close toggle with persistence
  (function initSidebarToggle() {
    if (!sidebarToggleBtn || !sidebarEl) return;
    const COLLAPSE_KEY = 'sidebarCollapsed';
    const applyCollapsed = (collapsed) => {
      document.body.classList.toggle('sidebar-collapsed', collapsed);
      const useOverlay = prefersOverlaySidebar.matches;
      document.body.classList.toggle('sidebar-open', !collapsed && useOverlay);
      if (sidebarBackdrop) sidebarBackdrop.style.display = (!collapsed && useOverlay) ? 'block' : 'none';
      // Button label + visibility
      sidebarToggleBtn.textContent = 'Open Sidebar';
      sidebarToggleBtn.style.display = collapsed ? 'inline-block' : 'none';
      sidebarToggleBtn.setAttribute('aria-pressed', String(!collapsed));
      // Save state
      localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0');
      // Trigger layout recalculation
      requestAnimationFrame(() => repositionPlayers());
    };
    // Initialize from stored state
    const stored = localStorage.getItem(COLLAPSE_KEY);
    const startCollapsed = stored === '1' || prefersOverlaySidebar.matches; // default collapsed on small screens
    applyCollapsed(startCollapsed);
    // Open button (in grimoire)
    sidebarToggleBtn.addEventListener('click', () => {
      applyCollapsed(false);
    });
    // Close button (in sidebar)
    if (sidebarCloseBtn) {
      sidebarCloseBtn.addEventListener('click', () => {
        applyCollapsed(true);
      });
    }
    // Backdrop click closes
    if (sidebarBackdrop) {
      sidebarBackdrop.addEventListener('click', () => applyCollapsed(true));
    }
    // React to viewport changes
    prefersOverlaySidebar.addEventListener('change', () => {
      const collapsed = document.body.classList.contains('sidebar-collapsed');
      applyCollapsed(collapsed);
    });
    
    // Add outside click handler for touch devices when not using overlay
    if (isTouchDevice) {
      const handleOutsideClick = (event) => {
        const useOverlay = prefersOverlaySidebar.matches;
        if (useOverlay) return; // overlay/backdrop handles closing on mobile
        // Check if sidebar is currently open
        if (document.body.classList.contains('sidebar-collapsed')) {
          return; // Sidebar is already closed
        }
        
        // Check if click is outside sidebar and sidebar resizer
        const clickedInSidebar = sidebarEl.contains(event.target);
        const clickedOnResizer = sidebarResizer && sidebarResizer.contains(event.target);
        const clickedOnToggleButton = sidebarToggleBtn.contains(event.target);
        
        if (!clickedInSidebar && !clickedOnResizer && !clickedOnToggleButton) {
          // Click is outside sidebar, close it
          applyCollapsed(true);
        }
      };
      
      // Add both click and touchstart event listeners for better touch support
      document.addEventListener('click', handleOutsideClick, true);
      document.addEventListener('touchstart', handleOutsideClick, { passive: true, capture: true });
    }
  })();

  // Load histories and render lists
  loadHistories();
  renderScriptHistory();
  renderGrimoireHistory();

  // Restore previous session (script and grimoire)
  loadAppState();

  // Simple in-app tour system
  (function initInAppTour() {
    const startButton = document.getElementById('start-tour');
    const sidebar = document.getElementById('sidebar');
    const sidebarToggleBtn = document.getElementById('sidebar-toggle');

    if (!startButton || !sidebar || !sidebarToggleBtn) return;

    // Create overlay elements once
    const backdrop = document.createElement('div');
    backdrop.className = 'tour-backdrop';
    const highlight = document.createElement('div');
    highlight.className = 'tour-highlight';
    const pop = document.createElement('div');
    pop.className = 'tour-popover';
    pop.setAttribute('role', 'dialog');
    pop.setAttribute('aria-live', 'polite');
    document.body.appendChild(backdrop);
    document.body.appendChild(highlight);
    document.body.appendChild(pop);

    // Helper to read current sidebar collapsed state
    const isSidebarCollapsed = () => document.body.classList.contains('sidebar-collapsed');
    // Helper to open/close sidebar programmatically using existing logic
    function setSidebarCollapsed(collapsed) {
      const stored = localStorage.getItem('sidebarCollapsed');
      const currently = stored === '1';
      // If desired state differs from effective class, toggle via UI to ensure all side effects
      const classCollapsed = isSidebarCollapsed();
      if (collapsed && !classCollapsed) {
        const closeBtn = document.getElementById('sidebar-close');
        if (closeBtn) closeBtn.click();
        else document.body.classList.add('sidebar-collapsed');
      } else if (!collapsed && classCollapsed) {
        sidebarToggleBtn.click();
      }
    }

    // Utility to ensure element is visible and sidebar state appropriate
    function ensureVisibilityForStep(step) {
      if (step.requiresSidebarOpen) {
        setSidebarCollapsed(false);
      } else if (step.requiresSidebarClosed) {
        setSidebarCollapsed(true);
      }
    }

    // Wait for ongoing CSS transitions/animations to complete before measuring
    function waitForAnimationsToFinish(element, fallbackMs = 400) {
      return new Promise((resolve) => {
        let resolved = false;
        function finish() {
          if (resolved) return;
          resolved = true;
          resolve();
        }
        try {
          const nodes = [document.body, sidebar, element].filter(Boolean);
          const animations = [];
          for (let i = 0; i < nodes.length; i += 1) {
            const node = nodes[i];
            if (node && typeof node.getAnimations === 'function') {
              const arr = node.getAnimations({ subtree: true });
              for (let j = 0; j < arr.length; j += 1) animations.push(arr[j]);
            }
          }
          if (animations.length > 0) {
            const timeoutId = setTimeout(finish, Math.max(250, fallbackMs));
            Promise.all(animations.map((a) => a.finished.catch(() => {}))).then(() => {
              clearTimeout(timeoutId);
              // Wait two frames to allow layout to fully settle
              requestAnimationFrame(() => requestAnimationFrame(finish));
            });
          } else {
            setTimeout(finish, Math.max(250, fallbackMs));
          }
        } catch(_) {
          setTimeout(finish, Math.max(250, fallbackMs));
        }
      });
    }

    // Compute popover position near target rect
    function positionPopoverNear(rect) {
      const margin = 12;
      const popRect = pop.getBoundingClientRect();
      let top = rect.bottom + margin;
      let left = rect.left;
      if (left + popRect.width > window.innerWidth - 8) {
        left = Math.max(8, window.innerWidth - popRect.width - 8);
      }
      if (top + popRect.height > window.innerHeight - 8) {
        top = Math.max(8, rect.top - popRect.height - margin);
      }
      pop.style.top = `${Math.max(8, top)}px`;
      pop.style.left = `${Math.max(8, left)}px`;
    }

    // Highlight a DOM rect
    function showHighlight(rect) {
      const radius = 12;
      highlight.style.display = 'block';
      highlight.style.left = `${rect.left - 8}px`;
      highlight.style.top = `${rect.top - 8}px`;
      highlight.style.width = `${rect.width + 16}px`;
      highlight.style.height = `${rect.height + 16}px`;
      highlight.style.borderRadius = `${radius}px`;
    }

    function hideUI() {
      backdrop.style.display = 'none';
      highlight.style.display = 'none';
      pop.style.display = 'none';
    }

    // Steps definition
    const steps = [
      {
        id: 'welcome',
        title: 'Quick Tour',
        body: 'Learn the basics: set players, load a script, assign characters, add reminders. Use Next/Back or ←/→. Press Esc to exit.',
        target: () => document.getElementById('sidebar-toggle'),
        requiresSidebarClosed: true
      },
      {
        id: 'open-sidebar',
        title: 'Open the sidebar',
        body: 'Open the sidebar to set up and load a script.',
        target: () => document.getElementById('sidebar-toggle'),
        requiresSidebarClosed: true,
        onBeforeNext: () => setSidebarCollapsed(false)
      },
      {
        id: 'game-setup',
        title: 'Set players',
        body: 'Choose the player count and press Start Game to create tokens.',
        target: () => document.getElementById('start-game'),
        requiresSidebarOpen: true
      },
      {
        id: 'scripts',
        title: 'Load a script',
        body: 'Load a built-in script to populate roles.',
        target: () => document.querySelector('#sidebar .script-buttons') || document.getElementById('load-status'),
        requiresSidebarOpen: true
      },
      {
        id: 'assign-character',
        title: 'Assign a character',
        body: 'Tap a player token to choose and assign a character.',
        target: () => {
          const li = document.querySelector('#player-circle li .player-token');
          return li || document.getElementById('player-circle');
        },
        requiresSidebarClosed: true,
        onEnter: () => setSidebarCollapsed(true)
      },
      {
        id: 'reminders',
        title: 'Reminders',
        body: 'Use the + near a player to add a reminder token or text note.',
        target: () => document.querySelector('#player-circle li .reminder-placeholder') || document.getElementById('player-circle'),
        requiresSidebarClosed: true
      },
      {
        id: 'offline',
        title: 'Use it offline',
        body: () => {
          const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
          const isMacSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent) && /Mac/i.test(navigator.platform);
          if (isIOS) {
            return 'On iPhone/iPad: tap Share, then "Add to Home Screen" to install. The app works offline once installed.';
          }
          if (isMacSafari) {
            return 'On Mac (Safari): in the Share menu, choose "Add to Dock" to install. The app will be available offline.';
          }
          return 'Install this app for offline use: on mobile, use "Add to Home Screen"; on desktop browsers, use "Install app" or create a shortcut.';
        },
        target: () => document.getElementById('sidebar-toggle'),
        requiresSidebarClosed: true
      },
      {
        id: 'finish',
        title: "You're ready!",
        body: 'You can restart this tour from the sidebar any time.',
        target: () => document.getElementById('center'),
        requiresSidebarClosed: true
      }
    ];

    let idx = 0;

    function renderStep() {
      ensureVisibilityForStep(steps[idx]);

      // If the step wants sidebar closed/open, ensure it immediately
      if (steps[idx].onEnter) {
        try { steps[idx].onEnter(); } catch(_) {}
      }

      const targetEl = steps[idx].target && steps[idx].target();

      const doRender = () => {
        const rect = targetEl ? targetEl.getBoundingClientRect() : { left: 16, top: 16, width: 300, height: 60, right: 316, bottom: 76 };

        // Show overlay
        backdrop.style.display = 'block';
        showHighlight(rect);

        // Build popover content
        pop.innerHTML = '';

        const title = document.createElement('div');
        title.className = 'title';
        title.textContent = steps[idx].title;

        const body = document.createElement('div');
        body.className = 'body';
        const bodyText = (typeof steps[idx].body === 'function') ? steps[idx].body() : steps[idx].body;
        body.textContent = bodyText;

        const actions = document.createElement('div');
        actions.className = 'actions';

        const skipBtn = document.createElement('button');
        skipBtn.className = 'button';
        skipBtn.textContent = 'Skip';
        skipBtn.onclick = endTour;

        const prevBtn = document.createElement('button');
        prevBtn.className = 'button';
        prevBtn.textContent = 'Back';
        prevBtn.disabled = idx === 0;
        prevBtn.onclick = () => { idx = Math.max(0, idx - 1); renderStep(); };

        const nextBtn = document.createElement('button');
        nextBtn.className = 'button';
        nextBtn.textContent = idx === steps.length - 1 ? 'Finish' : 'Next';
        nextBtn.onclick = () => {
          if (steps[idx].onBeforeNext) {
            try { steps[idx].onBeforeNext(); } catch(_) {}
          }
          if (idx < steps.length - 1) { idx += 1; renderStep(); } else { endTour(); }
        };

        const progress = document.createElement('div');
        progress.className = 'progress';
        progress.textContent = `Step ${idx + 1} of ${steps.length}`;

        actions.appendChild(skipBtn);
        actions.appendChild(prevBtn);
        actions.appendChild(nextBtn);

        pop.appendChild(title);
        pop.appendChild(body);
        pop.appendChild(actions);
        pop.appendChild(progress);

        pop.style.display = 'block';
        // Position after contents are added
        positionPopoverNear(rect);
      };

      // If the target is inside the sidebar, scroll it into view so it's visible
      if (targetEl && sidebar.contains(targetEl)) {
        try { targetEl.scrollIntoView({ block: 'center', inline: 'nearest' }); } catch(_) {}
      }

      // Wait for transitions/animations to finish, then render highlight
      waitForAnimationsToFinish(targetEl, 400).then(() => {
        requestAnimationFrame(() => requestAnimationFrame(doRender));
      });
    }

    function endTour() {
      hideUI();
      window.removeEventListener('resize', handleResize, true);
      window.removeEventListener('orientationchange', handleResize, true);
      document.removeEventListener('keydown', handleKey, true);
    }

    function handleResize() {
      if (pop.style.display !== 'block') return;
      const targetEl = steps[idx].target && steps[idx].target();
      if (!targetEl) return;
      const rect = targetEl.getBoundingClientRect();
      showHighlight(rect);
      positionPopoverNear(rect);
    }

    function handleKey(e) {
      if (pop.style.display !== 'block') return;
      if (e.key === 'Escape') { endTour(); }
      if (e.key === 'ArrowRight') { const was = idx; idx = Math.min(steps.length - 1, idx + 1); if (idx !== was) renderStep(); }
      if (e.key === 'ArrowLeft') { const was = idx; idx = Math.max(0, idx - 1); if (idx !== was) renderStep(); }
    }

    startButton.addEventListener('click', () => {
      // Start at first step; adapt to current UI state
      idx = 0;
      renderStep();
      // Add listeners for responsiveness and touch
      window.addEventListener('resize', handleResize, true);
      window.addEventListener('orientationchange', handleResize, true);
      document.addEventListener('keydown', handleKey, true);
      // Allow tapping the backdrop to advance
      backdrop.onclick = () => {
        if (idx < steps.length - 1) { idx += 1; renderStep(); } else { endTour(); }
      };
      // Prevent scrolling on touch backdrop
      backdrop.addEventListener('touchmove', (e) => { e.preventDefault(); }, { passive: false });
    });
  })();
});

// Tooltip positioning function
function positionTooltip(targetElement, tooltip) {
    const rect = targetElement.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    
    // Position above the element by default
    let top = rect.top - tooltipRect.height - 10;
    let left = rect.left + (rect.width - tooltipRect.width) / 2;
    
    // Adjust if tooltip would go off screen
    if (top < 10) {
        // Position below instead
        top = rect.bottom + 10;
    }
    
    if (left < 10) {
        left = 10;
    } else if (left + tooltipRect.width > window.innerWidth - 10) {
        left = window.innerWidth - tooltipRect.width - 10;
    }
    
    tooltip.style.top = top + 'px';
    tooltip.style.left = left + 'px';
}

// Touch ability popup functions
function showTouchAbilityPopup(targetElement, ability) {
    const popup = document.getElementById('touch-ability-popup');
    if (!popup) return;
    popup.textContent = ability;
    popup.classList.add('show');
    
    // If targetElement is the info icon, find the token for better positioning
    const isInfoIcon = targetElement.classList.contains('ability-info-icon');
    const referenceElement = isInfoIcon ? targetElement.parentElement.querySelector('.player-token') : targetElement;
    
    const rect = referenceElement.getBoundingClientRect();
    const popupRect = popup.getBoundingClientRect();
    
    // Position above the token
    let top = rect.top - popupRect.height - 20;
    let left = rect.left + (rect.width - popupRect.width) / 2;
    
    // Adjust if popup would go off screen
    if (top < 10) {
        // Position below instead
        top = rect.bottom + 20;
    }
    
    if (left < 10) {
        left = 10;
    } else if (left + popupRect.width > window.innerWidth - 10) {
        left = window.innerWidth - popupRect.width - 10;
    }
    
    popup.style.top = top + 'px';
    popup.style.left = left + 'px';
}

function hideTouchAbilityPopup() {
    const touchAbilityPopup = document.getElementById('touch-ability-popup');
    if (touchAbilityPopup) {
        touchAbilityPopup.classList.remove('show');
    }
}

// Hide touch popup when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.ability-info-icon') && !e.target.closest('.touch-ability-popup')) {
        hideTouchAbilityPopup();
    }
});

// Position info icons on a larger circle outside the character tokens
function positionInfoIcons() {
    const circle = document.getElementById('player-circle');
    if (!circle) return;
    
    const circleRect = circle.getBoundingClientRect();
    const circleWidth = circle.offsetWidth;
    const circleHeight = circle.offsetHeight;
    const centerX = circleWidth / 2;
    const centerY = circleHeight / 2;
    
    // Get all info icons
    const infoIcons = circle.querySelectorAll('.ability-info-icon');
    
    infoIcons.forEach(icon => {
        const playerIndex = parseInt(icon.dataset.playerIndex);
        const li = icon.parentElement;
        const angle = parseFloat(li.dataset.angle || '0');
        
        // Calculate radius for info icons (add 20% of token radius)
        const tokenEl = li.querySelector('.player-token');
        const tokenRadius = tokenEl ? tokenEl.offsetWidth / 2 : 50;
        const infoRadius = tokenRadius * 1.2;
        
        // Calculate position on the outer circle
        const x = infoRadius * Math.cos(angle);
        const y = infoRadius * Math.sin(angle);
        
        // Position the info icon
        icon.style.left = `calc(50% + ${x}px)`;
        icon.style.top = `calc(50% + ${y}px)`;
    });
}
