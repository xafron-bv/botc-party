import { snapshotCurrentGrimoire } from "./history/grimoire.js";
import { repositionPlayers, positionRadialStack } from "./layout.js";
import { CLICK_EXPAND_SUPPRESS_MS, TOUCH_EXPAND_SUPPRESS_MS, isTouchDevice, INCLUDE_TRAVELLERS_KEY, BG_STORAGE_KEY } from "../constants.js";
import { createCurvedLabelSvg } from "./svg.js";
import { resolveAssetPath } from "../utils.js";
import { positionTooltip, showTouchAbilityPopup, positionInfoIcons } from "./tooltip.js";
import { createDeathRibbonSvg } from "./svg.js";
import { saveAppState } from "./app.js";

function getRoleById({ grimoireState, roleId }) {
  return grimoireState.allRoles[roleId] || grimoireState.baseRoles[roleId] || grimoireState.extraTravellerRoles[roleId] || null;
}

export function setupGrimoire({ grimoireState, grimoireHistoryList, openCharacterModal, showPlayerContextMenu, openReminderTokenModal, openTextReminderModal, count }) {
  const playerCircle = document.getElementById('player-circle');
  try {
    if (!grimoireState.isRestoringState && Array.isArray(grimoireState.players) && grimoireState.players.length > 0) {
      snapshotCurrentGrimoire({ players: grimoireState.players, scriptMetaName: grimoireState.scriptMetaName, scriptData: grimoireState.scriptData, grimoireHistoryList });
    }
  } catch (_) { }
  console.log('Setting up grimoire with', count, 'players');
  playerCircle.innerHTML = '';
  grimoireState.players = Array.from({ length: count }, (_, i) => ({
    name: `Player ${i + 1}`,
    character: null,
    reminders: [],
    dead: false
  }));

  grimoireState.players.forEach((player, i) => {
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
      if (target && target.classList.contains('ability-info-icon')) {
        return; // handled by info icon
      }
      openCharacterModal(i);
    };
    // Player context menu: right-click
    listItem.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      showPlayerContextMenu(e.clientX, e.clientY, i);
    });
    // Long-press on token to open context menu on touch devices
    const tokenForMenu = listItem.querySelector('.player-token');
    tokenForMenu.addEventListener('pointerdown', (e) => {
      if (!isTouchDevice) return;
      try { e.preventDefault(); } catch (_) { }
      clearTimeout(grimoireState.longPressTimer);
      const x = (e && (e.clientX || (e.touches && e.touches[0] && e.touches[0].clientX))) || 0;
      const y = (e && (e.clientY || (e.touches && e.touches[0] && e.touches[0].clientY))) || 0;
      grimoireState.longPressTimer = setTimeout(() => {
        showPlayerContextMenu(x, y, i);
      }, 600);
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(evt => {
      tokenForMenu.addEventListener(evt, () => { clearTimeout(grimoireState.longPressTimer); });
    });
    listItem.querySelector('.player-name').onclick = (e) => {
      e.stopPropagation();
      const newName = prompt("Enter player name:", player.name);
      if (newName) {
        grimoireState.players[i].name = newName;
        updateGrimoire({ grimoireState });
        saveAppState({ grimoireState });
      }
    };
    listItem.querySelector('.reminder-placeholder').onclick = (e) => {
      e.stopPropagation();
      const thisLi = listItem;
      if (thisLi.dataset.expanded !== '1') {
        const allLis = document.querySelectorAll('#player-circle li');
        let someoneExpanded = false;
        allLis.forEach(el => {
          if (el !== thisLi && el.dataset.expanded === '1') {
            someoneExpanded = true;
            el.dataset.expanded = '0';
            const idx = Array.from(allLis).indexOf(el);
            positionRadialStack(el, (grimoireState.players[idx]?.reminders || []).length, grimoireState.players);
          }
        });
        if (someoneExpanded) {
          thisLi.dataset.expanded = '1';
          thisLi.dataset.actionSuppressUntil = String(Date.now() + CLICK_EXPAND_SUPPRESS_MS);
          positionRadialStack(thisLi, grimoireState.players[i].reminders.length, grimoireState.players);
          return;
        }
      }
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
    const expand = () => {
      const wasExpanded = listItem.dataset.expanded === '1';
      const allLis = document.querySelectorAll('#player-circle li');
      allLis.forEach(el => {
        if (el !== listItem && el.dataset.expanded === '1') {
          el.dataset.expanded = '0';
          const idx = Array.from(allLis).indexOf(el);
          positionRadialStack(el, (grimoireState.players[idx]?.reminders || []).length, grimoireState.players);
        }
      });
      listItem.dataset.expanded = '1';
      // Only set suppression on touch, and only when changing from collapsed -> expanded
      if (isTouchDevice && !wasExpanded) {
        listItem.dataset.actionSuppressUntil = String(Date.now() + CLICK_EXPAND_SUPPRESS_MS);
      }
      positionRadialStack(listItem, grimoireState.players[i].reminders.length, grimoireState.players);
    };
    const collapse = () => { listItem.dataset.expanded = '0'; positionRadialStack(listItem, grimoireState.players[i].reminders.length, grimoireState.players); };
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
        try { e.preventDefault(); } catch (_) { }
        listItem.dataset.touchSuppressUntil = String(Date.now() + TOUCH_EXPAND_SUPPRESS_MS);
      }
      expand();
      positionRadialStack(listItem, grimoireState.players[i].reminders.length, grimoireState.players);
    }, { passive: false });

    // (desktop) no extra mousedown handler; rely on hover/pointerenter and explicit clicks on reminders

    // Install one-time outside click/tap collapse for touch devices
    if (isTouchDevice && !grimoireState.outsideCollapseHandlerInstalled) {
      grimoireState.outsideCollapseHandlerInstalled = true;
      const maybeCollapseOnOutside = (ev) => {
        const target = ev.target;
        // Ignore clicks/taps inside the player circle to allow in-circle interactions (like + gating)
        const playerCircleEl = document.getElementById('player-circle');
        if (playerCircleEl && playerCircleEl.contains(target)) return;
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
            positionRadialStack(el, (grimoireState.players[Array.from(allLis).indexOf(el)]?.reminders || []).length, grimoireState.players);
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
    repositionPlayers({ players: grimoireState.players });
    updateGrimoire({ grimoireState });
    saveAppState({ grimoireState });
    renderSetupInfo({ grimoireState });
  });
}

function lookupCountsForPlayers({ grimoireState, count }) {
  if (!Array.isArray(grimoireState.playerSetupTable)) return null;
  const row = grimoireState.playerSetupTable.find(r => Number(r.players) === Number(count));
  return row || null;
}

export function renderSetupInfo({ grimoireState }) {
  const setupInfoEl = document.getElementById('setup-info');
  if (!setupInfoEl) return;
  const count = grimoireState.players.length;
  const row = lookupCountsForPlayers({ grimoireState, count });
  // Prefer parsed meta name; otherwise keep any existing hint
  let scriptName = grimoireState.scriptMetaName || '';
  if (!scriptName && Array.isArray(grimoireState.scriptData)) {
    const meta = grimoireState.scriptData.find(x => x && typeof x === 'object' && x.id === '_meta');
    if (meta && meta.name) scriptName = String(meta.name);
  }
  if (!row && !scriptName) { setupInfoEl.textContent = 'Select a script and add players from the sidebar.'; return; }
  const parts = [];
  if (scriptName) parts.push(scriptName);
  if (row) parts.push(`${row.townsfolk}/${row.outsiders}/${row.minions}/${row.demons}`);
  setupInfoEl.textContent = parts.join(' ');
}

export function updateGrimoire({ grimoireState }) {
  const abilityTooltip = document.getElementById('ability-tooltip');
  const playerCircle = document.getElementById('player-circle');
  const listItems = playerCircle.querySelectorAll('li');
  listItems.forEach((li, i) => {
    const player = grimoireState.players[i];
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

    if (player.character) {
      const role = getRoleById({ grimoireState, roleId: player.character });
      if (role) {
        tokenDiv.style.backgroundImage = `url('${resolveAssetPath(role.image)}'), url('${resolveAssetPath('assets/img/token-BqDQdWeO.webp')}')`;
        tokenDiv.style.backgroundSize = '68% 68%, cover';
        tokenDiv.style.backgroundColor = 'transparent';
        tokenDiv.classList.add('has-character');
        if (charNameDiv) charNameDiv.textContent = role.name;
        // Add curved label on the token
        const svg = createCurvedLabelSvg(`player-arc-${i}`, role.name);
        tokenDiv.appendChild(svg);

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
      grimoireState.players[i].dead = !grimoireState.players[i].dead;
      updateGrimoire({ grimoireState });
      saveAppState({ grimoireState });
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
            try { e.preventDefault(); } catch (_) { }
            parentLi.dataset.expanded = '1';
            parentLi.dataset.actionSuppressUntil = String(Date.now() + CLICK_EXPAND_SUPPRESS_MS);
            positionRadialStack(parentLi, grimoireState.players[i].reminders.length);
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

        // Desktop hover actions on icon reminders
        if (!isTouchDevice) {
          const editBtn = document.createElement('div');
          editBtn.className = 'reminder-action edit';
          editBtn.title = 'Edit';
          editBtn.innerHTML = '<i class="fa-solid fa-pen"></i>';
          editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            try { e.preventDefault(); } catch (_) { }
            const parentLi = editBtn.closest('li');
            if (parentLi) {
              const suppressUntil = parseInt(parentLi.dataset.actionSuppressUntil || '0', 10);
              if (parentLi.dataset.expanded !== '1' || Date.now() < suppressUntil) {
                if (parentLi.dataset.expanded !== '1') {
                  parentLi.dataset.expanded = '1';
                  parentLi.dataset.actionSuppressUntil = String(Date.now() + CLICK_EXPAND_SUPPRESS_MS);
                  positionRadialStack(parentLi, grimoireState.players[i].reminders.length);
                }
                return;
              }
            }
            const current = grimoireState.players[i].reminders[idx]?.label || grimoireState.players[i].reminders[idx]?.value || '';
            const next = prompt('Edit reminder', current);
            if (next !== null) {
              grimoireState.players[i].reminders[idx].label = next;
              updateGrimoire({ grimoireState });
              saveAppState({ grimoireState });
            }
          });
          iconEl.appendChild(editBtn);

          const delBtn = document.createElement('div');
          delBtn.className = 'reminder-action delete';
          delBtn.title = 'Delete';
          delBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
          delBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            try { e.preventDefault(); } catch (_) { }
            const parentLi = delBtn.closest('li');
            if (parentLi) {
              const suppressUntil = parseInt(parentLi.dataset.actionSuppressUntil || '0', 10);
              if (parentLi.dataset.expanded !== '1' || Date.now() < suppressUntil) {
                if (parentLi.dataset.expanded !== '1') {
                  parentLi.dataset.expanded = '1';
                  parentLi.dataset.actionSuppressUntil = String(Date.now() + CLICK_EXPAND_SUPPRESS_MS);
                  positionRadialStack(parentLi, grimoireState.players[i].reminders.length);
                }
                return;
              }
            }
            grimoireState.players[i].reminders.splice(idx, 1);
            updateGrimoire({ grimoireState });
            saveAppState({ grimoireState });
          });
          iconEl.appendChild(delBtn);
        }

        // Touch long-press for reminder context menu (iOS Safari, Android)
        if (isTouchDevice) {
          const onPressStart = (e) => {
            try { e.preventDefault(); } catch (_) { }
            clearTimeout(grimoireState.longPressTimer);
            try { iconEl.classList.add('press-feedback'); } catch (_) { }
            const x = (e && (e.clientX || (e.touches && e.touches[0] && e.touches[0].clientX))) || 0;
            const y = (e && (e.clientY || (e.touches && e.touches[0] && e.touches[0].clientY))) || 0;
            grimoireState.longPressTimer = setTimeout(() => {
              try { iconEl.classList.remove('press-feedback'); } catch (_) { }
              showReminderContextMenu(x, y, i, idx);
            }, 600);
          };
          const onPressEnd = () => { clearTimeout(grimoireState.longPressTimer); try { iconEl.classList.remove('press-feedback'); } catch (_) { } };
          iconEl.addEventListener('pointerdown', onPressStart);
          iconEl.addEventListener('pointerup', onPressEnd);
          iconEl.addEventListener('pointercancel', onPressEnd);
          iconEl.addEventListener('pointerleave', onPressEnd);
          iconEl.addEventListener('touchstart', onPressStart, { passive: false });
          iconEl.addEventListener('touchend', onPressEnd);
          iconEl.addEventListener('touchcancel', onPressEnd);
          iconEl.addEventListener('contextmenu', (e) => { try { e.preventDefault(); } catch (_) { } });
        }

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
                positionRadialStack(parentLi, grimoireState.players[i].reminders.length);
              }
              return;
            }
          }
          // No-op on desktop; use hover edit icon instead
        };
        // Desktop hover actions on text reminders
        if (!isTouchDevice) {
          const editBtn2 = document.createElement('div');
          editBtn2.className = 'reminder-action edit';
          editBtn2.title = 'Edit';
          editBtn2.innerHTML = '<i class="fa-solid fa-pen"></i>';
          editBtn2.addEventListener('click', (e) => {
            e.stopPropagation();
            try { e.preventDefault(); } catch (_) { }
            const parentLi = editBtn2.closest('li');
            if (parentLi) {
              const suppressUntil = parseInt(parentLi.dataset.actionSuppressUntil || '0', 10);
              if (parentLi.dataset.expanded !== '1' || Date.now() < suppressUntil) {
                if (parentLi.dataset.expanded !== '1') {
                  parentLi.dataset.expanded = '1';
                  parentLi.dataset.actionSuppressUntil = String(Date.now() + CLICK_EXPAND_SUPPRESS_MS);
                  positionRadialStack(parentLi, grimoireState.players[i].reminders.length);
                }
                return;
              }
            }
            const current = grimoireState.players[i].reminders[idx]?.label || grimoireState.players[i].reminders[idx]?.value || '';
            const next = prompt('Edit reminder', current);
            if (next !== null) {
              grimoireState.players[i].reminders[idx].value = next;
              if (grimoireState.players[i].reminders[idx].label !== undefined) {
                grimoireState.players[i].reminders[idx].label = next;
              }
              updateGrimoire({ grimoireState });
              saveAppState({ grimoireState });
            }
          });
          reminderEl.appendChild(editBtn2);

          const delBtn2 = document.createElement('div');
          delBtn2.className = 'reminder-action delete';
          delBtn2.title = 'Delete';
          delBtn2.innerHTML = '<i class="fa-solid fa-trash"></i>';
          delBtn2.addEventListener('click', (e) => {
            e.stopPropagation();
            try { e.preventDefault(); } catch (_) { }
            const parentLi = delBtn2.closest('li');
            if (parentLi) {
              const suppressUntil = parseInt(parentLi.dataset.actionSuppressUntil || '0', 10);
              if (parentLi.dataset.expanded !== '1' || Date.now() < suppressUntil) {
                if (parentLi.dataset.expanded !== '1') {
                  parentLi.dataset.expanded = '1';
                  parentLi.dataset.actionSuppressUntil = String(Date.now() + CLICK_EXPAND_SUPPRESS_MS);
                  positionRadialStack(parentLi, grimoireState.players[i].reminders.length);
                }
                return;
              }
            }
            grimoireState.players[i].reminders.splice(idx, 1);
            updateGrimoire({ grimoireState });
            saveAppState({ grimoireState });
          });
          reminderEl.appendChild(delBtn2);
        }
        // Touch long-press for reminder context menu
        if (isTouchDevice) {
          const onPressStart2 = (e) => {
            try { e.preventDefault(); } catch (_) { }
            clearTimeout(grimoireState.longPressTimer);
            try { reminderEl.classList.add('press-feedback'); } catch (_) { }
            const x = (e && (e.clientX || (e.touches && e.touches[0] && e.touches[0].clientX))) || 0;
            const y = (e && (e.clientY || (e.touches && e.touches[0] && e.touches[0].clientY))) || 0;
            grimoireState.longPressTimer = setTimeout(() => {
              try { reminderEl.classList.remove('press-feedback'); } catch (_) { }
              showReminderContextMenu(x, y, i, idx);
            }, 600);
          };
          const onPressEnd2 = () => { clearTimeout(grimoireState.longPressTimer); try { reminderEl.classList.remove('press-feedback'); } catch (_) { } };
          reminderEl.addEventListener('pointerdown', onPressStart2);
          reminderEl.addEventListener('pointerup', onPressEnd2);
          reminderEl.addEventListener('pointercancel', onPressEnd2);
          reminderEl.addEventListener('pointerleave', onPressEnd2);
          reminderEl.addEventListener('touchstart', onPressStart2, { passive: false });
          reminderEl.addEventListener('touchend', onPressEnd2);
          reminderEl.addEventListener('touchcancel', onPressEnd2);
          reminderEl.addEventListener('contextmenu', (e) => { try { e.preventDefault(); } catch (_) { } });
        }

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
export function startGame({ grimoireState, grimoireHistoryList, playerCountInput, openCharacterModal, showPlayerContextMenu, openReminderTokenModal, openTextReminderModal }) {
  const playerCount = parseInt(playerCountInput.value, 10);
  if (playerCount >= 5 && playerCount <= 20) {
    setupGrimoire({ grimoireState, grimoireHistoryList, openCharacterModal, showPlayerContextMenu, openReminderTokenModal, openTextReminderModal, count: playerCount });
  } else {
    alert('Player count must be an integer from 5 to 20.');
  }
}

export function applyGrimoireBackground(value) {
  const centerEl = document.getElementById('center');
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

export function initGrimoireBackground() {
  const centerEl = document.getElementById('center');
  const backgroundSelect = document.getElementById('background-select');
  if (!centerEl) return;
  try {
    const savedBg = localStorage.getItem(BG_STORAGE_KEY) || 'background4-C7TzDZ7M.webp';
    applyGrimoireBackground(savedBg);
    if (backgroundSelect) backgroundSelect.value = savedBg === 'none' ? 'none' : savedBg;
  } catch (_) { }
}

export function handleGrimoireBackgroundChange() {
  const backgroundSelect = document.getElementById('background-select');
  const val = backgroundSelect.value;
  applyGrimoireBackground(val);
  try { localStorage.setItem(BG_STORAGE_KEY, val); } catch (_) { }
}