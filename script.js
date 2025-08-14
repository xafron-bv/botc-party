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
  const sidebarToggleBtn = document.getElementById('sidebar-toggle');

  let scriptData = null;
  let allRoles = {};
  let players = [];
  let selectedPlayerIndex = -1;
  let editingReminder = { playerIndex: -1, reminderIndex: -1 };
  const isTouchDevice = (window.matchMedia && window.matchMedia('(hover: none) and (pointer: coarse)').matches) || ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  const TOUCH_EXPAND_SUPPRESS_MS = 350;
  let outsideCollapseHandlerInstalled = false;

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
    const playerCount = parseInt(playerCountInput.value, 10);
    if (playerCount >= 5 && playerCount <= 20) {
      setupGrimoire(playerCount);
    } else {
      alert('Player count must be an integer from 5 to 20.');
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
              if (isTouchDevice) {
                  openReminderTokenModal(i);
              } else if (e.altKey) {
                  openTextReminderModal(i);
              } else {
                  openReminderTokenModal(i);
              }
          };

          // Hover expand/collapse for reminder stack positioning
          listItem.dataset.expanded = '0';
          const expand = () => { listItem.dataset.expanded = '1'; positionRadialStack(listItem, players[i].reminders.length); };
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
      // Size the circle container to fully contain tokens
      const requiredContainerSize = Math.ceil(2 * (radius + tokenRadius + 12));
      circle.style.width = requiredContainerSize + 'px';
      circle.style.height = requiredContainerSize + 'px';

      const circleWidth = requiredContainerSize;
      const circleHeight = requiredContainerSize;
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

          // keep default CSS centering behavior for token

          // Reposition the player's reminder stack and plus button to match new angle
          const count = (players[i] && players[i].reminders) ? players[i].reminders.length : 0;
          positionRadialStack(listItem, count);

          // Debug visuals removed
      });

      // Draw guide lines from each token to the center after positioning
      drawRadialGuides();

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
                  const parentLi = delBtn.closest('li');
                  if (isTouchDevice && parentLi && parentLi.dataset.expanded !== '1') {
                    return;
                  }
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
                  const parentLi = reminderEl.closest('li');
                  if (isTouchDevice && parentLi && parentLi.dataset.expanded !== '1') {
                    parentLi.dataset.expanded = '1';
                    positionRadialStack(parentLi, players[i].reminders.length);
                    return;
                  }
                  openTextReminderModal(i, idx, reminder.value);
                };
                const delBtn2 = document.createElement('div');
                delBtn2.className = 'reminder-delete-btn';
                delBtn2.title = 'Delete';
                delBtn2.textContent = '🗑';
                delBtn2.onclick = (e) => {
                  e.stopPropagation();
                  const parentLi = delBtn2.closest('li');
                  if (isTouchDevice && parentLi && parentLi.dataset.expanded !== '1') {
                    return;
                  }
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

  // Arrange reminders and plus button along the line from token center to circle center
  function positionRadialStack(li, count) {
      // Use the visual token circle as the anchor, not the whole container with name tag
      const tokenEl = li.querySelector('.player-token') || li;
      const tokenRadiusPx = tokenEl.offsetWidth / 2;
      const angle = parseFloat(li.dataset.angle || '0');
      const isExpanded = li.dataset.expanded === '1';
      const remindersContainer = li.querySelector('.reminders');
      if (remindersContainer && isTouchDevice) {
          const suppressUntil = parseInt(li.dataset.touchSuppressUntil || '0', 10);
          const inSuppressWindow = Date.now() < suppressUntil;
          // Allow pointer events for reminders only when expanded. During suppression window,
          // keep them disabled to avoid immediate action on first tap.
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

      const reminderDiameter = Math.max(56, tokenEl.offsetWidth / 3);
      const reminderRadius = reminderDiameter / 2;
      const plusRadius = (tokenEl.offsetWidth / 4) / 2; // from CSS: width: token-size/4
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
          });
          
          // Position hover zone as a rectangle along the radial line
          const hoverZoneStart = tokenRadiusPx + edgeGap; // Start from token edge
          const hoverZoneEnd = tokenRadiusPx + 200; // Extend towards circle center (200px max)
          const hoverZoneWidth = hoverZoneEnd - hoverZoneStart; // Width along the radial line
          const hoverZoneHeight = 100; // Height perpendicular to radial line (increased for visibility)
          
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
              isExpanded: isExpanded
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
          });
          
          // Position hover zone as a rectangle along the radial line (same as expanded state)
          const hoverZoneStart = tokenRadiusPx + edgeGap; // Start from token edge
          const hoverZoneEnd = tokenRadiusPx + 200; // Extend towards circle center (200px max)
          const hoverZoneWidth = hoverZoneEnd - hoverZoneStart; // Width along the radial line
          const hoverZoneHeight = 100; // Height perpendicular to radial line (increased for visibility)
          
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
              const targetOffset = offsetFromEdge;
              const absPX = tokenCenterX + ux * targetOffset;
              const absPY = tokenCenterY + uy * targetOffset;
              const px = absPX - liRect.left;
              const py = absPY - liRect.top;
              plus.style.left = `${px}px`;
              plus.style.top = `${py}px`;
              plus.style.transform = 'translate(-50%, -50%)';
              plus.style.zIndex = '6';
          } else {
              // Collapsed state: position plus button close to the token
              const collapsedOffset = tokenRadiusPx + edgeGap + plusRadius;
              const absPX = tokenCenterX + ux * collapsedOffset;
              const absPY = tokenCenterY + uy * collapsedOffset;
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
            const handleSelect = (ev) => {
                try { ev.preventDefault(); } catch(_) {}
                ev.stopPropagation();
                let label = token.label;
                if ((label || '').toLowerCase().includes('custom')) {
                  const input = prompt('Enter reminder text:', '');
                  if (input === null) return;
                  label = input;
                }
                players[selectedPlayerIndex].reminders.push({ type: 'icon', image: token.image, label, rotation: 0 });
                updateGrimoire();
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
      // Update button label and aria
      sidebarToggleBtn.textContent = collapsed ? 'Open Sidebar' : 'Close Sidebar';
      sidebarToggleBtn.setAttribute('aria-pressed', String(!collapsed));
      // Save state
      localStorage.setItem(COLLAPSE_KEY, collapsed ? '1' : '0');
      // Trigger layout recalculation
      requestAnimationFrame(() => repositionPlayers());
    };
    // Initialize from stored state
    const stored = localStorage.getItem(COLLAPSE_KEY);
    const startCollapsed = stored === '1';
    applyCollapsed(startCollapsed);
    // Toggle handler
    sidebarToggleBtn.addEventListener('click', () => {
      const collapsed = !document.body.classList.contains('sidebar-collapsed');
      applyCollapsed(collapsed);
    });
  })();
});
