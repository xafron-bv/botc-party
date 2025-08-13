if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        console.log('Service worker registered successfully:', registration);
      })
      .catch(error => {
        console.error('Service worker registration failed:', error);
      });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const startGameBtn = document.getElementById('start-game');
  const loadDefaultTokensBtn = document.getElementById('load-default-tokens');
  const scriptFileInput = document.getElementById('script-file');
  const playerCountInput = document.getElementById('player-count');
  const playerCircle = document.getElementById('player-circle');
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

  const reminderTokenModal = document.getElementById('reminder-token-modal');
  const closeReminderTokenModalBtn = document.getElementById('close-reminder-token-modal');
  const reminderTokenGrid = document.getElementById('reminder-token-grid');
  const reminderTokenSearch = document.getElementById('reminder-token-search');
  const reminderTokenModalPlayerName = document.getElementById('reminder-token-modal-player-name');

  let scriptData = null;
  let allRoles = {};
  let players = [];
  let selectedPlayerIndex = -1;
  let editingReminder = { playerIndex: -1, reminderIndex: -1 };
  let reminderTokens = [];

  // Load default tokens from local JSON file
  loadDefaultTokensBtn.addEventListener('click', async () => {
    try {
      loadStatus.textContent = 'Loading default tokens...';
      loadStatus.className = 'status';
      // default behavior: build sheet from tokens.json (library), not a script
      const response = await fetch('./tokens.json');
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      const tokens = await response.json();
      reminderTokens = Array.isArray(tokens.reminderTokens) ? tokens.reminderTokens : [];

      // Build a role lookup and expose entire library in character sheet
      allRoles = {};
      Object.entries(tokens).forEach(([teamName, teamArray]) => {
        if (Array.isArray(teamArray)) {
          teamArray.forEach(role => {
            allRoles[role.id] = { ...role, team: teamName };
          });
        }
      });
      renderCharacterSheet();
      loadStatus.textContent = 'Default tokens loaded successfully!';
      loadStatus.className = 'status';
    } catch (error) {
      console.error('Error loading default tokens:', error);
      loadStatus.textContent = `Error loading default tokens: ${error.message}`;
      loadStatus.className = 'error';
    }
  });

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
        
        await processScriptData(json);
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

  async function processScriptData(data) {
      console.log('Processing script data:', data);
      scriptData = data;
      allRoles = {};
      
      if (Array.isArray(data)) {
          console.log('Processing script with', data.length, 'characters');
          await processScriptCharacters(data);
      } else {
          console.error('Unexpected script format:', typeof data);
          return;
      }
      
      console.log('Total roles processed:', Object.keys(allRoles).length);
      renderCharacterSheet();
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
           reminderTokens = Array.isArray(tokens.reminderTokens) ? tokens.reminderTokens : [];
          
          // Create a lookup map of all available roles with correct team names
          const roleLookup = {};
          Object.entries(tokens).forEach(([teamName, teamArray]) => {
              if (Array.isArray(teamArray)) {
                  teamArray.forEach(role => {
                      roleLookup[role.id] = { ...role, team: teamName };
                  });
              }
          });
          
          console.log('Role lookup created with', Object.keys(roleLookup).length, 'roles');
          
          // Process the character IDs from the script
          characterIds.forEach((characterId) => {
              if (typeof characterId === 'string' && characterId !== '_meta') {
                  if (roleLookup[characterId]) {
                      allRoles[characterId] = roleLookup[characterId];
                      console.log(`Resolved character ${characterId} (${roleLookup[characterId].name})`);
                  } else {
                      console.warn(`Character ID not found: ${characterId}`);
                  }
              }
          });
          
          console.log('Script processing completed');
          
      } catch (error) {
          console.error('Error processing script:', error);
          characterIds.forEach((characterId) => {
              if (typeof characterId === 'string' && characterId !== '_meta') {
                  allRoles[characterId] = {
                      id: characterId,
                      name: characterId.charAt(0).toUpperCase() + characterId.slice(1),
                      image: `https://script.bloodontheclocktower.com/images/icon/1%20-%20Trouble%20Brewing/townsfolk/${characterId}_icon.webp`,
                      team: 'unknown'
                  };
              }
          });
      }
  }

  startGameBtn.addEventListener('click', () => {
    const playerCount = parseInt(playerCountInput.value);
    if (playerCount >= 5 && playerCount <= 20) {
      setupGrimoire(playerCount);
    } else {
      alert('Player count must be between 5 and 20.');
    }
  });

  function setupGrimoire(count) {
      console.log('Setting up grimoire with', count, 'players');
      playerCircle.innerHTML = '';
      players = Array.from({ length: count }, (_, i) => ({
          name: `Player ${i + 1}`,
          character: null,
          reminders: []
      }));
      
      players.forEach((player, i) => {
          const listItem = document.createElement('li');
          listItem.innerHTML = `
              <div class="reminders"></div>
              <div class="player-token" title="Assign character"></div>
              <div class="player-name" title="Edit name">${player.name}</div>
              <div class="reminder-placeholder" title="Add text reminder">+</div>
          `;
          playerCircle.appendChild(listItem);

          listItem.querySelector('.player-token').onclick = () => openCharacterModal(i);
          listItem.querySelector('.player-name').onclick = (e) => {
              e.stopPropagation();
              const newName = prompt("Enter player name:", player.name);
              if (newName) {
                  players[i].name = newName;
                  updateGrimoire();
              }
          };
          listItem.querySelector('.reminder-placeholder').onclick = (e) => {
              e.stopPropagation();
              if (confirm('Add a text reminder? Click Cancel to add a token reminder.')) {
                  openTextReminderModal(i);
              } else {
                  openReminderTokenModal(i);
              }
          };
      });
      
      // Use requestAnimationFrame to ensure DOM is fully rendered
      requestAnimationFrame(() => {
          repositionPlayers();
          updateGrimoire();
      });
  }

  function repositionPlayers() {
      const count = players.length;
      if (count === 0) return;
      
      const circle = document.getElementById('player-circle');
      if (!circle) {
          console.error('Player circle element not found');
          return;
      }
      
      console.log('Repositioning players. Circle dimensions:', circle.offsetWidth, 'x', circle.offsetHeight);
      
      const circleWidth = circle.offsetWidth || 800;
      const circleHeight = circle.offsetHeight || 600;
      const radius = Math.min(circleWidth, circleHeight) / 3;
      const angleStep = (2 * Math.PI) / count;

      const listItems = circle.querySelectorAll('li');
      listItems.forEach((listItem, i) => {
          const angle = i * angleStep - (Math.PI / 2);
          const x = (circleWidth / 2) + radius * Math.cos(angle);
          const y = (circleHeight / 2) + radius * Math.sin(angle);
          
          listItem.style.position = 'absolute';
          listItem.style.left = `${x}px`;
          listItem.style.top = `${y}px`;
          listItem.style.transform = 'translate(-50%, -50%)';
          listItem.dataset.angle = String(angle);
      });

      console.log('Player positioning completed');
  }

  function updateGrimoire() {
      const listItems = playerCircle.querySelectorAll('li');
      listItems.forEach((li, i) => {
          const player = players[i];
          li.querySelector('.player-name').textContent = player.name;
          const tokenDiv = li.querySelector('.player-token');
          
          if (player.character && allRoles[player.character]) {
            const role = allRoles[player.character];
            tokenDiv.style.backgroundImage = `url('${role.image}')`;
            tokenDiv.style.backgroundSize = 'cover';
            tokenDiv.style.backgroundColor = 'transparent';
            tokenDiv.classList.add('has-character');
          } else {
            tokenDiv.style.backgroundImage = `url('/assets/img/token-blank-05128509.webp')`;
            tokenDiv.style.backgroundSize = '80%';
            tokenDiv.style.backgroundColor = 'rgba(0,0,0,0.2)';
            tokenDiv.classList.remove('has-character');
          }

          const remindersDiv = li.querySelector('.reminders');
          remindersDiv.innerHTML = '';
          remindersDiv.style.zIndex = '3';
          
          const angle = parseFloat(li.dataset.angle || '0');
          const tokenRadiusPx = li.offsetWidth / 2;
          const inwardDistance = tokenRadiusPx * 0.9;
          const baseX = -Math.cos(angle) * inwardDistance;
          const baseY = -Math.sin(angle) * inwardDistance;
          
          const smallRadius = tokenRadiusPx * 0.5;
          const count = player.reminders.length;
          const spread = Math.min(count, 5);
          const step = (Math.PI) / Math.max(spread, 1); // half circle fan
          const start = -Math.PI / 2 - (step * (spread - 1)) / 2; // centered fan
          
          player.reminders.forEach((reminder, idx) => {
              const theta = start + idx * step;
              const rx = baseX + smallRadius * Math.cos(theta);
              const ry = baseY + smallRadius * Math.sin(theta);
              
              if (reminder.type === 'icon') {
                  const iconEl = document.createElement('div');
                  iconEl.className = 'icon-reminder';
                  iconEl.style.position = 'absolute';
                  iconEl.style.left = `calc(50% + ${rx}px)`;
                  iconEl.style.top = `calc(50% + ${ry}px)`;
                  iconEl.style.transform = 'translate(-50%, -50%)';
                  iconEl.style.zIndex = '3';
                  iconEl.style.backgroundImage = `url('${reminder.image}')`;
                  iconEl.title = reminder.label || '';
                  iconEl.onclick = (e) => {
                      e.stopPropagation();
                      if (confirm('Remove reminder token?')) {
                        players[i].reminders.splice(idx, 1);
                        updateGrimoire();
                      }
                  };
                  remindersDiv.appendChild(iconEl);
              } else {
                  const reminderEl = document.createElement('div');
                  reminderEl.className = 'text-reminder';
                  reminderEl.textContent = (reminder.value || '').toString().slice(0, 2);
                  reminderEl.style.position = 'absolute';
                  reminderEl.style.left = `calc(50% + ${rx}px)`;
                  reminderEl.style.top = `calc(50% + ${ry}px)`;
                  reminderEl.style.transform = 'translate(-50%, -50%)';
                  reminderEl.style.zIndex = '3';
                  reminderEl.onclick = (e) => {
                      e.stopPropagation();
                      openTextReminderModal(i, idx, reminder.value);
                  };
                  remindersDiv.appendChild(reminderEl);
              }
          });
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
          tokenEl.style.backgroundImage = `url('${role.image}')`;
          tokenEl.title = role.name;
          tokenEl.onclick = () => assignCharacter(role.id);
          characterGrid.appendChild(tokenEl);
      });
  }

  function assignCharacter(roleId) {
      if (selectedPlayerIndex > -1) {
          players[selectedPlayerIndex].character = roleId;
          console.log(`Assigned character ${roleId} to player ${selectedPlayerIndex}`);
          updateGrimoire();
          characterModal.style.display = 'none';
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
              players[playerIndex].reminders[reminderIndex].value = text;
          } else {
              players[playerIndex].reminders.push({ type: 'text', value: text });
          }
      } else if (reminderIndex > -1) {
          players[playerIndex].reminders.splice(reminderIndex, 1);
      }
      updateGrimoire();
      textReminderModal.style.display = 'none';
  };

  closeCharacterModalBtn.onclick = () => characterModal.style.display = 'none';
  cancelReminderBtn.onclick = () => textReminderModal.style.display = 'none';
  characterSearch.oninput = populateCharacterGrid;

  function openReminderTokenModal(playerIndex) {
      selectedPlayerIndex = playerIndex;
      reminderTokenModalPlayerName.textContent = players[playerIndex].name;
      populateReminderTokenGrid();
      reminderTokenModal.style.display = 'flex';
      reminderTokenSearch.value = '';
      reminderTokenSearch.focus();
  }

  function populateReminderTokenGrid() {
      reminderTokenGrid.innerHTML = '';
      const filter = (reminderTokenSearch.value || '').toLowerCase();
      const filtered = reminderTokens.filter(t => (t.label || '').toLowerCase().includes(filter));
      filtered.forEach(token => {
          const tokenEl = document.createElement('div');
          tokenEl.className = 'token';
          tokenEl.style.backgroundImage = `url('${token.image}')`;
          tokenEl.title = token.label;
          tokenEl.onclick = () => {
              if (selectedPlayerIndex > -1) {
                  players[selectedPlayerIndex].reminders.push({ type: 'icon', image: token.image, label: token.label });
                  updateGrimoire();
                  reminderTokenModal.style.display = 'none';
              }
          };
          reminderTokenGrid.appendChild(tokenEl);
      });
  }

  closeReminderTokenModalBtn.onclick = () => reminderTokenModal.style.display = 'none';
  reminderTokenSearch.oninput = populateReminderTokenGrid;
  
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
  
  function renderCharacterSheet() {
    const container = characterSheet;
    container.innerHTML = '';
    const grouped = {};
    Object.values(allRoles).forEach(role => {
      const team = role.team || 'unknown';
      if (!grouped[team]) grouped[team] = [];
      grouped[team].push(role);
    });
    const teamOrder = ['townsfolk', 'outsider', 'minion', 'demon', 'travellers', 'fabled', 'unknown'];
    teamOrder.forEach(team => {
      const roles = grouped[team];
      if (!roles || roles.length === 0) return;
      const header = document.createElement('h3');
      header.textContent = team.charAt(0).toUpperCase() + team.slice(1);
      header.className = `team-${team}`;
      container.appendChild(header);
      roles.forEach(role => {
        const roleEl = document.createElement('div');
        roleEl.className = 'role';
        roleEl.innerHTML = `
          <span class="icon" style="background-image: url('${role.image}')"></span>
          <span class="name">${role.name}</span>
        `;
        container.appendChild(roleEl);
      });
    });
  }

  // Auto-load default tokens when the page is ready
  function autoLoadTokens() {
    // Check if service worker is ready
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      console.log('Service worker ready, auto-loading tokens...');
      loadDefaultTokensBtn.click();
    } else {
      // Wait for service worker to be ready
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('Service worker controller changed, auto-loading tokens...');
        loadDefaultTokensBtn.click();
      });
      
      // Fallback: if no service worker after a reasonable time, load anyway
      const fallbackTimer = setTimeout(() => {
        if (!navigator.serviceWorker.controller) {
          console.log('Service worker not ready, loading tokens anyway...');
          loadDefaultTokensBtn.click();
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
});
