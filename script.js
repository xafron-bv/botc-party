if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js')
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
  const loadTbBtn = document.getElementById('load-tb');
  const loadBmrBtn = document.getElementById('load-bmr');
  const loadSavBtn = document.getElementById('load-sav');
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
  const sidebarResizer = document.getElementById('sidebar-resizer');
  const sidebarEl = document.getElementById('sidebar');
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

  function resolveAssetPath(path) {
      if (!path) return path;
      if (/^https?:\/\//.test(path)) return path;
      if (path.startsWith('/')) return `.${path}`;
      return path;
  }

  async function loadScriptFromFile(path) {
    try {
      loadStatus.textContent = `Loading script from ${path}...`;
      loadStatus.className = 'status';
      const res = await fetch(path, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      await processScriptData(json);
      loadStatus.textContent = 'Script loaded successfully!';
      loadStatus.className = 'status';
    } catch (e) {
      console.error('Failed to load script:', e);
      loadStatus.textContent = `Failed to load ${path}: ${e.message}`;
      loadStatus.className = 'error';
    }
  }
  loadTbBtn && loadTbBtn.addEventListener('click', () => loadScriptFromFile('./Trouble Brewing.json'));
  loadBmrBtn && loadBmrBtn.addEventListener('click', () => loadScriptFromFile('./Bad Moon Rising.json'));
  loadSavBtn && loadSavBtn.addEventListener('click', () => loadScriptFromFile('./Sects and Violets.json'));

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
                      const image = resolveAssetPath(role.image);
                      roleLookup[role.id] = { ...role, image, team: teamName };
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
          reminders: [],
          dead: false
      }));
      
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
          listItem.querySelector('.player-token').onclick = (e) => {
              const target = e.target;
              if (target && (target.closest('.death-ribbon') || target.classList.contains('death-ribbon'))) {
                  return; // handled by ribbon click
              }
              openCharacterModal(i);
          };
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

          // Hover expand/collapse for reminder stack positioning
          listItem.dataset.expanded = '0';
          listItem.addEventListener('mouseenter', () => {
              listItem.dataset.expanded = '1';
              positionRadialStack(listItem, players[i].reminders.length);
          });
          listItem.addEventListener('mouseleave', () => {
              listItem.dataset.expanded = '0';
              positionRadialStack(listItem, players[i].reminders.length);
          });
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

          // Reposition the player's reminder stack and plus button to match new angle
          const count = (players[i] && players[i].reminders) ? players[i].reminders.length : 0;
          positionRadialStack(listItem, count);
      });

      console.log('Player positioning completed');
  }

  function updateGrimoire() {
      const listItems = playerCircle.querySelectorAll('li');
      listItems.forEach((li, i) => {
          const player = players[i];
          li.querySelector('.player-name').textContent = player.name;
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
          ribbon.addEventListener('click', (e) => {
              e.stopPropagation();
              players[i].dead = !players[i].dead;
              updateGrimoire();
          });
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

                if (reminder.label) {
                  const svg = createCurvedLabelSvg(`arc-${i}-${idx}`, reminder.label);
                  iconEl.appendChild(svg);
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

          // After rendering, position all reminders and the plus button in a radial stack
          positionRadialStack(li, player.reminders.length);
      });
  }

  // Arrange reminders and plus button in a consistent radial stack using true concentric geometry
  function positionRadialStack(li, count) {
      const tokenRadiusPx = li.offsetWidth / 2;
      const angle = parseFloat(li.dataset.angle || '0');
      // Unit vector from token towards center
      const dirX = -Math.cos(angle);
      const dirY = -Math.sin(angle);

      // Compute the actual distance from circle center to this token center (runtime radius)
      const container = li.parentElement;
      const cRect = container ? container.getBoundingClientRect() : null;
      const lRect = li.getBoundingClientRect();
      const centerX = cRect ? (cRect.left + cRect.width / 2) : (lRect.left + lRect.width / 2 - dirX);
      const centerY = cRect ? (cRect.top + cRect.height / 2) : (lRect.top + lRect.height / 2 - dirY);
      const tokenCenterX = lRect.left + lRect.width / 2;
      const tokenCenterY = lRect.top + lRect.height / 2;
      const runtimeRadius = Math.hypot(tokenCenterX - centerX, tokenCenterY - centerY);

      const reminderDiameter = Math.max(56, li.offsetWidth / 3);
      const reminderRadius = reminderDiameter / 2;
      const plusRadius = (li.offsetWidth / 4) / 2; // from CSS: width: token-size/4
      const edgeGap = Math.max(8, tokenRadiusPx * 0.08);

      const spacingCollapsed = reminderDiameter * 0.9; // center-to-center
      const spacingExpanded = reminderDiameter * 1.12;
      const isExpanded = li.dataset.expanded === '1';
      const spacing = isExpanded ? spacingExpanded : spacingCollapsed;

      // Distance from center for first reminder's center
      const firstReminderRadiusFromCenter = runtimeRadius - (tokenRadiusPx + edgeGap + reminderRadius);
      const reminderEls = li.querySelectorAll('.reminders .icon-reminder, .reminders .text-reminder');
      reminderEls.forEach((el, idx) => {
          // Target absolute distance from center for this reminder's center
          const targetRadius = firstReminderRadiusFromCenter - idx * spacing;
          const absX = centerX + (-dirX) * targetRadius; // -dirX points from center to token
          const absY = centerY + (-dirY) * targetRadius;
          const rx = absX - tokenCenterX;
          const ry = absY - tokenCenterY;
          el.style.left = `calc(50% + ${rx}px)`;
          el.style.top = `calc(50% + ${ry}px)`;
      });

      const plus = li.querySelector('.reminder-placeholder');
      if (plus) {
          // Offset from token edge for the plus center
          let offsetFromEdge = edgeGap + plusRadius;
          if (count > 0) {
              offsetFromEdge = edgeGap + reminderRadius + (count * spacing) + edgeGap + plusRadius;
          }
          const targetRadiusPlus = runtimeRadius - (tokenRadiusPx + offsetFromEdge);
          const absPX = centerX + (-dirX) * targetRadiusPlus;
          const absPY = centerY + (-dirY) * targetRadiusPlus;
          const px = absPX - tokenCenterX;
          const py = absPY - tokenCenterY;
          plus.style.left = `calc(50% + ${px}px)`;
          plus.style.top = `calc(50% + ${py}px)`;
      }
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

  function createCurvedLabelSvg(uniqueId, labelText) {
      const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
      svg.setAttribute('viewBox','0 0 100 100');
      svg.setAttribute('preserveAspectRatio','xMidYMid meet');
      svg.classList.add('icon-reminder-svg');
      const defs = document.createElementNS('http://www.w3.org/2000/svg','defs');
      const path = document.createElementNS('http://www.w3.org/2000/svg','path');
      path.setAttribute('id', uniqueId);
      // Widen and raise arc so full string fits and stays inside the rim
      path.setAttribute('d','M16,72 A34,34 0 0,0 84,72');
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

      // Notch
      const notch = document.createElementNS('http://www.w3.org/2000/svg','path');
      notch.setAttribute('d','M22 88 L50 120 L78 88 Z');
      notch.setAttribute('fill','url(#deathPattern)');
      notch.setAttribute('stroke','#000');
      notch.setAttribute('stroke-width','6');

      // Subtle inner shadow
      const shadow = document.createElementNS('http://www.w3.org/2000/svg','rect');
      shadow.setAttribute('x','26');
      shadow.setAttribute('y','4');
      shadow.setAttribute('rx','6');
      shadow.setAttribute('ry','6');
      shadow.setAttribute('width','48');
      shadow.setAttribute('height','78');
      shadow.setAttribute('fill','rgba(255,255,255,0.03)');

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
            tokenEl.onclick = () => {
                let label = token.label;
                if ((label || '').toLowerCase().includes('custom')) {
                  const input = prompt('Enter reminder text:', '');
                  if (input === null) return;
                  label = input; // no hard truncation; SVG arc will scale to fit
                }
                players[selectedPlayerIndex].reminders.push({ type: 'icon', image: token.image, label, rotation: 0 });
                updateGrimoire();
                reminderTokenModal.style.display = 'none';
            };

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
  })();
});
