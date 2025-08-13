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
      
      processScriptData(tokens);
      
      loadStatus.textContent = 'Default tokens loaded successfully!';
      loadStatus.className = 'status';
    } catch (error) {
      console.error('Error loading default tokens:', error);
      loadStatus.textContent = `Error loading default tokens: ${error.message}`;
      loadStatus.className = 'error';
      
      // Try to provide more helpful error information
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        loadStatus.textContent = 'Network error: Check if the server is running and tokens.json is accessible';
      } else if (error.name === 'SyntaxError') {
        loadStatus.textContent = 'JSON parsing error: tokens.json may be corrupted';
      }
    }
  });

  scriptFileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    console.log('File selected:', file.name, 'Size:', file.size);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        console.log('Parsing uploaded file...');
        const json = JSON.parse(e.target.result);
        console.log('Uploaded script parsed successfully:', json);
        
        processScriptData(json);
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

  function processScriptData(data) {
      console.log('Processing script data:', data);
      scriptData = data;
      allRoles = {};
      
      // Handle the standard script format (array of character IDs like tb.json)
      if (Array.isArray(data)) {
          console.log('Processing script with', data.length, 'characters');
          processScriptCharacters(data);
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
          
          // Create a lookup map of all available roles
          const roleLookup = {};
          Object.values(tokens).forEach(team => {
              if (Array.isArray(team)) {
                  team.forEach(role => {
                      roleLookup[role.id] = { ...role, team };
                  });
              }
          });
          
          console.log('Role lookup created with', Object.keys(roleLookup).length, 'roles');
          
          // Process the character IDs from the script
          characterIds.forEach((characterId, index) => {
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
          // Fallback: create basic role objects from the IDs
          characterIds.forEach((characterId, index) => {
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
              openTextReminderModal(i);
          };
      });
      
      // Use a longer delay to ensure DOM is fully rendered
      setTimeout(repositionPlayers, 100);
      updateGrimoire();
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
      
      // Ensure the circle container has proper dimensions
      const circleWidth = circle.offsetWidth || 800;
      const circleHeight = circle.offsetHeight || 600;
      
      // Calculate radius based on the smaller dimension to ensure all players fit
      const radius = Math.min(circleWidth, circleHeight) / 3;
      const angleStep = (2 * Math.PI) / count;
      
      console.log(`Positioning ${count} players with radius ${radius} and angle step ${angleStep}`);

      const listItems = circle.querySelectorAll('li');
      listItems.forEach((listItem, i) => {
          const angle = i * angleStep - (Math.PI / 2); // Start from top
          const x = (circleWidth / 2) + radius * Math.cos(angle);
          const y = (circleHeight / 2) + radius * Math.sin(angle);
          
          console.log(`Player ${i}: angle=${angle.toFixed(2)}, x=${x.toFixed(0)}, y=${y.toFixed(0)}`);
          
          listItem.style.position = 'absolute';
          listItem.style.left = `${x}px`;
          listItem.style.top = `${y}px`;
          listItem.style.transform = 'translate(-50%, -50%)'; // Center the player on the calculated position
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
            tokenDiv.style.backgroundImage = `url('https://botc.app/assets/token-blank-05128509.webp')`;
            tokenDiv.style.backgroundSize = '80%';
            tokenDiv.style.backgroundColor = 'rgba(0,0,0,0.2)';
            tokenDiv.classList.remove('has-character');
          }

          const remindersDiv = li.querySelector('.reminders');
          remindersDiv.innerHTML = '';
          player.reminders.forEach((reminder, reminderIndex) => {
              const reminderEl = document.createElement('div');
              reminderEl.className = 'text-reminder';
              reminderEl.textContent = reminder.value;
              reminderEl.onclick = (e) => {
                  e.stopPropagation();
                  openTextReminderModal(i, reminderIndex, reminder.value);
              };
              remindersDiv.appendChild(reminderEl);
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
  
  // Handle window resize to reposition players
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      if (players.length > 0) {
        console.log('Window resized, repositioning players...');
        repositionPlayers();
      }
    }, 250);
  });
  
  // Also reposition players when the page becomes visible (in case of tab switching)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && players.length > 0) {
      setTimeout(repositionPlayers, 100);
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
                        <span class="icon" style="background-image: url('${role.image}')"></span>
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
                    <span class="icon" style="background-image: url('https://script.bloodontheclocktower.com/images/icon/1%20-%20Trouble%20Brewing/townsfolk/${characterId}_icon.webp')"></span>
                    <span class="name">${characterId.charAt(0).toUpperCase() + characterId.slice(1)}</span>
                `;
                characterSheet.appendChild(roleEl);
            }
        });
    }
  }

  // Auto-load default tokens on page load
  window.addEventListener('load', () => {
    console.log('Page loaded, auto-loading tokens in 1 second...');
    setTimeout(() => {
      loadDefaultTokensBtn.click();
    }, 1000);
  });
});
