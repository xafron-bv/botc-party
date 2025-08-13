if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/service-worker.js'));
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
      
      const response = await fetch('./tokens.json');
      if (!response.ok) {
        throw new Error('Failed to load tokens.json');
      }
      
      const tokens = await response.json();
      processScriptData(tokens);
      
      loadStatus.textContent = 'Default tokens loaded successfully!';
      loadStatus.className = 'status';
    } catch (error) {
      console.error('Error loading default tokens:', error);
      loadStatus.textContent = 'Error loading default tokens: ' + error.message;
      loadStatus.className = 'error';
    }
  });

  scriptFileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target.result);
        processScriptData(json);
        loadStatus.textContent = 'Custom script loaded successfully!';
        loadStatus.className = 'status';
      } catch (error) { 
        loadStatus.textContent = 'Invalid JSON file.';
        loadStatus.className = 'error';
      }
    };
    reader.readAsText(file);
  });

  function processScriptData(data) {
      scriptData = data;
      allRoles = {};
      for (const team in data) {
          if (Array.isArray(data[team])) {
              data[team].forEach(role => {
                  allRoles[role.id] = { ...role, team };
              });
          }
      }
      displayScript(data);
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
      
      setTimeout(repositionPlayers, 0);
      updateGrimoire();
  }

  function repositionPlayers() {
      const count = players.length;
      if (count === 0) return;
      const circle = document.getElementById('player-circle');
      const radius = circle.offsetWidth / 2.8; 
      const angleStep = (2 * Math.PI) / count;

      const listItems = circle.querySelectorAll('li');
      listItems.forEach((listItem, i) => {
          const angle = i * angleStep - (Math.PI / 2);
          const x = (circle.offsetWidth / 2) + radius * Math.cos(angle);
          const y = (circle.offsetHeight / 2) + radius * Math.sin(angle);
          listItem.style.position = 'absolute';
          listItem.style.left = `${x}px`;
          listItem.style.top = `${y}px`;
      });
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
      
      Object.values(allRoles)
          .filter(role => role.name.toLowerCase().includes(filter))
          .forEach(role => {
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
  window.addEventListener('resize', repositionPlayers);
  
  function displayScript(data) {
    characterSheet.innerHTML = '';
    const teamOrder = ['townsfolk', 'outsider', 'minion', 'demon', 'travellers', 'fabled'];
    
    teamOrder.forEach(team => {
        if (data[team] && Array.isArray(data[team]) && data[team].length > 0) {
            const teamHeader = document.createElement('h3');
            teamHeader.textContent = team.charAt(0).toUpperCase() + team.slice(1);
            teamHeader.className = `team-${team}`;
            characterSheet.appendChild(teamHeader);
            
            data[team].forEach(role => {
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
  }

  // Auto-load default tokens on page load
  window.addEventListener('load', () => {
    setTimeout(() => {
      loadDefaultTokensBtn.click();
    }, 1000);
  });
});
