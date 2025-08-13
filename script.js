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

  // Load default tokens from local JSON file
  loadDefaultTokensBtn.addEventListener('click', async () => {
    try {
      loadStatus.textContent = 'Loading default tokens...';
      loadStatus.className = 'status';
      
      console.log('Attempting to load tokens.json...');
      const response = await fetch('./tokens.json');
      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const tokens = await response.json();
      console.log('Tokens loaded successfully:', tokens);
      console.log('Number of teams:', Object.keys(tokens).length);
      
      await processScriptData(Object.keys(allRoles).length ? Object.keys(allRoles) : ['_meta']);
      
      loadStatus.textContent = 'Default tokens loaded successfully!';
      loadStatus.className = 'status';
    } catch (error) {
      console.error('Error loading default tokens:', error);
      loadStatus.textContent = `Error loading default tokens: ${error.message}`;
      loadStatus.className = 'error';
      
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        loadStatus.textContent = 'Network error: Check if the server is running and tokens.json is accessible';
      } else if (error.name === 'SyntaxError') {
        loadStatus.textContent = 'JSON parsing error: tokens.json may be corrupted';
      }
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
      displayScript(data);
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
                      image: '/assets/img/token-BqDQdWeO.webp',
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
              if (e.altKey) {
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
            tokenDiv.style.backgroundImage = `url('${role.image}'), url('/assets/img/token-BqDQdWeO.webp')`;
            tokenDiv.style.backgroundSize = 'cover, cover';
            tokenDiv.style.backgroundColor = 'transparent';
            tokenDiv.classList.add('has-character');
          } else {
            tokenDiv.style.backgroundImage = `url('/assets/img/token-BqDQdWeO.webp')`;
            tokenDiv.style.backgroundSize = 'cover';
            tokenDiv.style.backgroundColor = 'rgba(0,0,0,0.2)';
            tokenDiv.classList.remove('has-character');
          }

          const remindersDiv = li.querySelector('.reminders');
          remindersDiv.innerHTML = '';
          
          // Position reminders on a smaller circle in front (towards center) of the player
          const angle = parseFloat(li.dataset.angle || '0');
          const tokenRadiusPx = li.offsetWidth / 2;
          const inwardDistance = tokenRadiusPx * 0.9; // distance from token center towards circle center
          const baseX = -Math.cos(angle) * inwardDistance;
          const baseY = -Math.sin(angle) * inwardDistance;
          
          const smallRadius = tokenRadiusPx * 0.5; // radius of the small reminder fan
          const count = player.reminders.length;
          const visible = Math.min(count, 6);
          const step = (Math.PI) / Math.max(visible, 1); // half-circle fan facing centre
          const start = -Math.PI / 2 - (step * (visible - 1)) / 2;
          
          player.reminders.forEach((reminder, idx) => {
              const theta = start + idx * step;
              const rx = baseX + smallRadius * Math.cos(theta);
              const ry = baseY + smallRadius * Math.sin(theta);
              
               if (reminder.type === 'icon') {
                const iconEl = document.createElement('div');
                iconEl.className = 'icon-reminder';
                iconEl.style.left = `calc(50% + ${rx}px)`;
                iconEl.style.top = `calc(50% + ${ry}px)`;
                iconEl.style.transform = `translate(-50%, -50%) rotate(${reminder.rotation || 0}deg)`;
                iconEl.style.backgroundImage = `url('${reminder.image}'), url('/assets/img/token-BqDQdWeO.webp')`;
                iconEl.title = reminder.label || '';

                if (reminder.label) {
                  const labelEl = document.createElement('div');
                  labelEl.className = 'icon-reminder-label';
                  labelEl.textContent = reminder.label;
                  iconEl.appendChild(labelEl);
                }

                const delBtn = document.createElement('div');
                delBtn.className = 'reminder-delete-btn';
                delBtn.title = 'Delete';
                delBtn.textContent = '🗑';
                delBtn.onclick = (e) => {
                  e.stopPropagation();
                  players[i].reminders.splice(idx, 1);
                  updateGrimoire();
                };
                iconEl.appendChild(delBtn);

                remindersDiv.appendChild(iconEl);
              } else {
                const reminderEl = document.createElement('div');
                reminderEl.className = 'text-reminder';
                reminderEl.textContent = reminder.value ? String(reminder.value).slice(0, 2) : '';
                reminderEl.style.left = `calc(50% + ${rx}px)`;
                reminderEl.style.top = `calc(50% + ${ry}px)`;
                reminderEl.style.transform = 'translate(-50%, -50%)';
                reminderEl.onclick = (e) => {
                  e.stopPropagation();
                  openTextReminderModal(i, idx, reminder.value);
                };
                const delBtn2 = document.createElement('div');
                delBtn2.className = 'reminder-delete-btn';
                delBtn2.title = 'Delete';
                delBtn2.textContent = '🗑';
                delBtn2.onclick = (e) => {
                  e.stopPropagation();
                  players[i].reminders.splice(idx, 1);
                  updateGrimoire();
                };
                reminderEl.appendChild(delBtn2);
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
          tokenEl.style.backgroundImage = `url('${role.image}'), url('/assets/img/token-BqDQdWeO.webp')`;
          tokenEl.style.backgroundSize = 'cover, cover';
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
  closeReminderTokenModalBtn && (closeReminderTokenModalBtn.onclick = () => reminderTokenModal.style.display = 'none');
  reminderTokenSearch && (reminderTokenSearch.oninput = populateReminderTokenGrid);

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
        const filtered = reminderTokens.filter(t => (t.label || '').toLowerCase().includes(filter));
        (filtered.length ? filtered : reminderTokens).forEach(token => {
            const tokenEl = document.createElement('div');
            tokenEl.className = 'token';
            tokenEl.style.backgroundImage = `url('${token.image}'), url('/assets/img/token-BqDQdWeO.webp')`;
            tokenEl.style.backgroundSize = 'cover, cover';
            tokenEl.title = token.label;
            tokenEl.onclick = () => {
                let label = token.label;
                if ((label || '').toLowerCase().includes('custom')) {
                  const input = prompt('Enter short reminder text (max 10 chars):', '');
                  if (input === null) return;
                  label = input.slice(0, 10);
                }
                players[selectedPlayerIndex].reminders.push({ type: 'icon', image: token.image, label, rotation: 0 });
                updateGrimoire();
                reminderTokenModal.style.display = 'none';
            };
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
                         <span class="icon" style="background-image: url('${role.image}'), url('/assets/img/token-BqDQdWeO.webp'); background-size: cover, cover;"></span>
                         <span class="name">${role.name}</span>
                     `;
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
        
        data.forEach((characterId, index) => {
            if (typeof characterId === 'string' && characterId !== '_meta') {
                const roleEl = document.createElement('div');
                roleEl.className = 'role';
                 roleEl.innerHTML = `
                     <span class="icon" style="background-image: url('/assets/img/token-BqDQdWeO.webp'); background-size: cover;"></span>
                     <span class="name">${characterId.charAt(0).toUpperCase() + characterId.slice(1)}</span>
                 `;
                characterSheet.appendChild(roleEl);
            }
        });
    }
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
