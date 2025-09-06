// In-app tour system (browser-native ES module)

export function initInAppTour() {
  const startButton = document.getElementById('start-tour');
  const sidebar = document.getElementById('sidebar');
  const sidebarToggleBtn = document.getElementById('sidebar-toggle');
  if (!startButton || !sidebar || !sidebarToggleBtn) return;

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

  const isSidebarCollapsed = () => document.body.classList.contains('sidebar-collapsed');
  function setSidebarCollapsed(collapsed) {
    const classCollapsed = isSidebarCollapsed();
    if (collapsed && !classCollapsed) {
      const closeBtn = document.getElementById('sidebar-close');
      if (closeBtn) closeBtn.click();
      else document.body.classList.add('sidebar-collapsed');
    } else if (!collapsed && classCollapsed) {
      sidebarToggleBtn.click();
    }
  }

  function ensureVisibilityForStep(step) {
    if (step.requiresSidebarOpen) setSidebarCollapsed(false);
    else if (step.requiresSidebarClosed) setSidebarCollapsed(true);
  }

  function waitForAnimationsToFinish(element, fallbackMs = 400) {
    return new Promise((resolve) => {
      let resolved = false;
      function finish() { if (resolved) return; resolved = true; resolve(); }
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
          Promise.all(animations.map((a) => a.finished.catch(() => { }))).then(() => {
            clearTimeout(timeoutId);
            requestAnimationFrame(() => requestAnimationFrame(finish));
          });
        } else {
          setTimeout(finish, Math.max(250, fallbackMs));
        }
      } catch (_) { setTimeout(finish, Math.max(250, fallbackMs)); }
    });
  }

  function positionPopoverNear(rect) {
    const margin = 12;
    const popRect = pop.getBoundingClientRect();
    let top = rect.bottom + margin;
    let left = rect.left;
    if (left + popRect.width > window.innerWidth - 8) left = Math.max(8, window.innerWidth - popRect.width - 8);
    if (top + popRect.height > window.innerHeight - 8) top = Math.max(8, rect.top - popRect.height - margin);
    pop.style.top = `${Math.max(8, top)}px`;
    pop.style.left = `${Math.max(8, left)}px`;
  }

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

  const steps = [
    { id: 'welcome', title: 'Quick Tour', body: 'Learn the basics: set players, load a script, assign characters, add reminders. Use Next/Back or ←/→. Press Esc to exit.', target: () => document.getElementById('sidebar-toggle'), requiresSidebarClosed: true },
    { id: 'open-sidebar', title: 'Open the sidebar', body: 'Open the sidebar to set up and load a script.', target: () => document.getElementById('sidebar-toggle'), requiresSidebarClosed: true, onBeforeNext: () => setSidebarCollapsed(false) },
    { id: 'game-setup', title: 'Set players', body: 'Choose the player count and press Reset Grimoire to create tokens.', target: () => document.getElementById('reset-grimoire'), requiresSidebarOpen: true },
    { id: 'scripts', title: 'Load a script', body: 'Load a built-in script to populate roles.', target: () => document.querySelector('#sidebar .script-buttons') || document.getElementById('load-status'), requiresSidebarOpen: true },
    { id: 'assign-character', title: 'Assign a character', body: 'Tap a player token to choose and assign a character.', target: () => document.querySelector('#player-circle li .player-token') || document.getElementById('player-circle'), requiresSidebarClosed: true, onEnter: () => setSidebarCollapsed(true) },
    { id: 'player-management', title: 'Add/Remove Players', body: 'right-click (or long-touch on mobile) a player to add new players before/after or remove them.', target: () => document.querySelector('#player-circle li') || document.getElementById('player-circle'), requiresSidebarClosed: true },
    { id: 'reminders', title: 'Reminders', body: 'Use the + near a player to add a reminder token or text note.', target: () => document.querySelector('#player-circle li .reminder-placeholder') || document.getElementById('player-circle'), requiresSidebarClosed: true },
    { id: 'bluff-tokens', title: 'Bluff Tokens', body: 'At the bottom left are three bluff tokens. These are characters not in play that the Storyteller gives to the Demon to help the evil team. Click a bluff token to assign a character to it.', target: () => document.querySelector('#bluff-tokens-container .bluff-token') || document.getElementById('bluff-tokens-container'), requiresSidebarClosed: true },
    { id: 'day-night-toggle', title: 'Day/Night Tracking', body: 'Track day and night phases with the toggle button. Click it to enable phase tracking and use the slider to navigate between phases. During night phases, characters with night abilities will show their wake order as numbers.', target: () => document.getElementById('day-night-toggle'), requiresSidebarClosed: true },
    { id: 'offline', title: 'Use it offline', body: () => { const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent); const isMacSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent) && /Mac/i.test(navigator.platform); if (isIOS) return 'On iPhone/iPad: tap Share, then "Add to Home Screen" to install. The app works offline once installed.'; if (isMacSafari) return 'On Mac (Safari): in the Share menu, choose "Add to Dock" to install. The app will be available offline.'; return 'Install this app for offline use: on mobile, use "Add to Home Screen"; on desktop browsers, use "Install app" or create a shortcut.'; }, target: () => document.getElementById('sidebar-toggle'), requiresSidebarClosed: true },
    { id: 'finish', title: "You're ready!", body: 'You can restart this tour from the sidebar any time.', target: () => document.getElementById('center'), requiresSidebarClosed: true }
  ];

  let idx = 0;
  function renderStep() {
    ensureVisibilityForStep(steps[idx]);
    if (steps[idx].onEnter) { try { steps[idx].onEnter(); } catch (_) { } }
    const targetEl = steps[idx].target && steps[idx].target();
    const doRender = () => {
      const rect = targetEl ? targetEl.getBoundingClientRect() : { left: 16, top: 16, width: 300, height: 60, right: 316, bottom: 76 };
      backdrop.style.display = 'block';
      showHighlight(rect);
      pop.innerHTML = '';
      const title = document.createElement('div'); title.className = 'title'; title.textContent = steps[idx].title;
      const body = document.createElement('div'); body.className = 'body'; const bodyText = (typeof steps[idx].body === 'function') ? steps[idx].body() : steps[idx].body; body.textContent = bodyText;
      const actions = document.createElement('div'); actions.className = 'actions';
      const skipBtn = document.createElement('button'); skipBtn.className = 'button'; skipBtn.textContent = 'Skip'; skipBtn.onclick = endTour;
      const prevBtn = document.createElement('button'); prevBtn.className = 'button'; prevBtn.textContent = 'Back'; prevBtn.disabled = idx === 0; prevBtn.onclick = () => { idx = Math.max(0, idx - 1); renderStep(); };
      const nextBtn = document.createElement('button'); nextBtn.className = 'button'; nextBtn.textContent = idx === steps.length - 1 ? 'Finish' : 'Next'; nextBtn.onclick = () => { if (steps[idx].onBeforeNext) { try { steps[idx].onBeforeNext(); } catch (_) { } } if (idx < steps.length - 1) { idx += 1; renderStep(); } else { endTour(); } };
      const progress = document.createElement('div'); progress.className = 'progress'; progress.textContent = `Step ${idx + 1} of ${steps.length}`;
      actions.appendChild(skipBtn); actions.appendChild(prevBtn); actions.appendChild(nextBtn);
      pop.appendChild(title); pop.appendChild(body); pop.appendChild(actions); pop.appendChild(progress);
      pop.style.display = 'block';
      positionPopoverNear(rect);
    };
    if (targetEl && sidebar.contains(targetEl)) {
      try { targetEl.scrollIntoView({ block: 'center', inline: 'nearest' }); } catch (_) { }
    }
    waitForAnimationsToFinish(targetEl, 400).then(() => requestAnimationFrame(() => requestAnimationFrame(doRender)));
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
    idx = 0;
    renderStep();
    window.addEventListener('resize', handleResize, true);
    window.addEventListener('orientationchange', handleResize, true);
    document.addEventListener('keydown', handleKey, true);
    backdrop.onclick = () => { if (idx < steps.length - 1) { idx += 1; renderStep(); } else { endTour(); } };
    backdrop.addEventListener('touchmove', (e) => { e.preventDefault(); }, { passive: false });
  });
}

